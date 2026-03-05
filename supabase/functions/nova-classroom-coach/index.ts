import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { behavior_description, student_id, context } = await req.json();

    if (!behavior_description) {
      return new Response(
        JSON.stringify({ error: "behavior_description is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch relevant knowledge base entries
    const { data: knowledge } = await supabase
      .from("behavior_knowledge_base")
      .select("category, title, content")
      .limit(10);

    // Fetch relevant decision trees
    const { data: trees } = await supabase
      .from("behavior_decision_trees")
      .select("behavior_type, trigger_context, function_of_behavior, recommended_response, replacement_behavior, reinforcement_strategy")
      .limit(10);

    const knowledgeContext = (knowledge || [])
      .map((k: any) => `[${k.category}] ${k.title}: ${k.content}`)
      .join("\n\n");

    const treeContext = (trees || [])
      .map(
        (t: any) =>
          `Behavior: ${t.behavior_type} | Trigger: ${t.trigger_context} | Function: ${t.function_of_behavior} | Response: ${t.recommended_response} | Replacement: ${t.replacement_behavior}`
      )
      .join("\n");

    const systemPrompt = `You are Nova Classroom Coach, an AI behavior support assistant for teachers in school settings.

Your role is to help teachers understand and respond to student behavior using evidence-based Applied Behavior Analysis (ABA) principles.

When a teacher describes a behavior, you MUST return a JSON response with these exact fields:
- likely_function: The most probable function of behavior (escape, attention, access, sensory)
- explanation: A brief, teacher-friendly explanation of WHY this behavior is occurring (2-3 sentences)
- immediate_steps: An array of 3-5 concrete, actionable steps the teacher should take RIGHT NOW
- reinforcement_suggestion: What to reinforce and how
- replacement_behavior: What skill to teach instead
- data_to_collect: An array of data types the teacher should track

CRITICAL RULES:
- All responses must be trauma-informed and respectful toward the student
- Never suggest punitive approaches, restraint, or seclusion
- Use plain classroom language, not clinical ABA jargon
- Prioritize student dignity and staff safety
- Keep responses concise and immediately actionable

BEHAVIOR SCIENCE KNOWLEDGE BASE:
${knowledgeContext}

DECISION TREE REFERENCE:
${treeContext}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userMessage = context
      ? `Behavior: ${behavior_description}\nContext: ${context}`
      : `Behavior: ${behavior_description}`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "behavior_analysis",
                description:
                  "Return structured behavior analysis for a teacher",
                parameters: {
                  type: "object",
                  properties: {
                    likely_function: {
                      type: "string",
                      enum: ["escape", "attention", "access", "sensory"],
                    },
                    explanation: { type: "string" },
                    immediate_steps: {
                      type: "array",
                      items: { type: "string" },
                    },
                    reinforcement_suggestion: { type: "string" },
                    replacement_behavior: { type: "string" },
                    data_to_collect: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                  required: [
                    "likely_function",
                    "explanation",
                    "immediate_steps",
                    "reinforcement_suggestion",
                    "replacement_behavior",
                    "data_to_collect",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "behavior_analysis" },
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    let analysis: any = {};

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        analysis = JSON.parse(toolCall.function.arguments);
      } catch {
        analysis = { error: "Failed to parse AI response" };
      }
    }

    // Log the interaction
    await supabase.from("ai_teacher_coach_logs").insert({
      user_id: user.id,
      student_id: student_id || null,
      input_description: behavior_description,
      ai_response: analysis,
      model_used: "google/gemini-3-flash-preview",
    });

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Coach error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
