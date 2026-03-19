/**
 * Nova AI Copilot — Real-Time Spotting Engine
 * Analyzes transcript chunks and extracts clinical events using Lovable AI.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WORKFLOW_PROMPTS: Record<string, string> = {
  direct_session: `You are a clinical ABA copilot. Extract: behaviors, replacement behaviors, prompts used, reinforcement, transitions, task demands, compliance/noncompliance, duration references, frequency references, skill targets practiced. For each item provide: type, value, confidence (high/medium/low), and a suggested note sentence.`,
  parent_training: `You are a parent training copilot. Extract: strategies reviewed, caregiver participation level, caregiver questions, barriers to implementation, homework/next steps, modeling/coaching moments. For each item provide: type, value, confidence, and a suggested note sentence.`,
  supervision: `You are a supervision copilot. Extract: feedback delivered, fidelity/integrity concerns, strengths, corrective coaching moments, next steps. For each item provide: type, value, confidence, and a suggested note sentence.`,
  teacher_consult: `You are a teacher consult copilot. Extract: teacher concerns, classroom triggers, environmental/schedule issues, support recommendations, follow-up items. For each item provide: type, value, confidence, and a suggested note sentence.`,
  fba_observation: `You are an FBA observation copilot. Extract: observable behavior, antecedents, consequences, environmental variables. Use neutral observation language. Only note tentative function clues when strongly supported. For each item provide: type, value, confidence, and a suggested note sentence.`,
  fba_interview: `You are an FBA interview copilot. Extract: reported behaviors, settings, antecedents, consequences, motivating operations, previous interventions tried, informant perspective. For each item provide: type, value, confidence, and a suggested note sentence.`,
  narrative_note: `You are a clinical documentation copilot. Extract: key observations, clinical impressions, recommendations, follow-up items. For each item provide: type, value, confidence, and a suggested note sentence.`,
  quick_note: `You are a clinical documentation copilot. Extract any clinically relevant items: behaviors, concerns, recommendations, follow-ups. For each item provide: type, value, confidence, and a suggested note sentence.`,
  classroom_observation: `You are a classroom observation copilot. Extract: student behaviors, environmental triggers, peer interactions, teacher responses, support strategies observed. For each item provide: type, value, confidence, and a suggested note sentence.`,
  unknown: `You are a clinical documentation copilot. Extract any clinically relevant items mentioned. For each item provide: type, value, confidence, and a suggested note sentence.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, workflowType, existingItems, noteType } = await req.json();

    if (!transcript || typeof transcript !== "string" || transcript.trim().length < 10) {
      return new Response(
        JSON.stringify({ items: [], draftLines: [], flags: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const workflowPrompt = WORKFLOW_PROMPTS[workflowType] || WORKFLOW_PROMPTS.unknown;

    const systemPrompt = `${workflowPrompt}

IMPORTANT RULES:
- Distinguish between: directly_stated, observed, inferred, unclear
- Do NOT overstate functions or clinical conclusions
- If uncertain, mark confidence as "low" and add a flag
- Return valid JSON only

Respond with this exact JSON structure:
{
  "items": [
    { "type": "behavior|antecedent|consequence|prompt|reinforcement|duration|frequency|skill_target|caregiver_concern|teacher_concern|follow_up|strategy|strength|coaching|barrier|other", "value": "...", "confidence": "high|medium|low", "basis": "directly_stated|observed|inferred|unclear", "noteSentence": "..." }
  ],
  "draftLines": ["sentence for note draft..."],
  "flags": [
    { "type": "uncertain|missing_info|clarification_needed", "message": "..." }
  ]
}`;

    const existingContext = existingItems?.length
      ? `\n\nItems already extracted (avoid duplicates): ${JSON.stringify(existingItems.map((i: any) => i.value))}`
      : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Transcript chunk:\n"${transcript}"${existingContext}\n\nNote type target: ${noteType || "narrative"}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_clinical_events",
              description: "Extract clinical events from transcript",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string" },
                        value: { type: "string" },
                        confidence: { type: "string", enum: ["high", "medium", "low"] },
                        basis: { type: "string", enum: ["directly_stated", "observed", "inferred", "unclear"] },
                        noteSentence: { type: "string" },
                      },
                      required: ["type", "value", "confidence", "basis", "noteSentence"],
                    },
                  },
                  draftLines: { type: "array", items: { type: "string" } },
                  flags: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["uncertain", "missing_info", "clarification_needed"] },
                        message: { type: "string" },
                      },
                      required: ["type", "message"],
                    },
                  },
                },
                required: ["items", "draftLines", "flags"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_clinical_events" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please wait" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway returned ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    let extracted = { items: [], draftLines: [], flags: [] };

    if (toolCall?.function?.arguments) {
      try {
        extracted = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error("Failed to parse tool call arguments");
      }
    }

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("nova-copilot-spot error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
