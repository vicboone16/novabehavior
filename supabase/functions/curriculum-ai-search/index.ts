import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, age_band, setting, learner_profile, curriculum_type } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. RPC-based search first
    const { data: rpcResults } = await supabase.rpc("search_vbmapp_curricula", {
      p_query: query,
      p_domain: null,
      p_level: null,
      p_age_tag: age_band ?? null,
    });

    const goalPool = (rpcResults ?? []).slice(0, 30);

    if (goalPool.length === 0) {
      // Fallback: fetch all goals for AI to reason over
      const { data: allGoals } = await supabase
        .from("clinical_curricula_goals")
        .select("id, key, title, clinical_goal, objective_text, vbmapp_domain, vbmapp_level, age_group_tags, setting_tags, skill_tags")
        .eq("is_active", true)
        .limit(200);
      if (allGoals) goalPool.push(...allGoals.map((g: any) => ({
        goal_id: g.id,
        goal_title: g.title,
        clinical_goal: g.clinical_goal,
        objective_text: g.objective_text,
        domain_title: g.vbmapp_domain,
        vbmapp_level: g.vbmapp_level,
        age_group_tags: g.age_group_tags,
        setting_tags: g.setting_tags,
        skill_tags: g.skill_tags,
        benchmarks: null,
      })));
    }

    // 2. AI re-rank and match
    const systemPrompt = `You are matching a user query to the best curriculum goals in a clinical ABA library.

Given the user query and optional filters, analyze the provided goal candidates and return a structured match result.

Prioritize:
- exact skill match
- age appropriateness
- setting fit
- replacement behavior fit if behavior-related
- adaptive functioning relevance if assessment-linked

Return JSON with this structure:
{
  "top_matching_goals": [
    {
      "goal_id": "uuid",
      "goal_title": "string",
      "match_score": 0-100,
      "why_matches": "brief explanation"
    }
  ],
  "top_matching_domains": ["domain names"],
  "suggested_related_tags": ["tag1", "tag2"],
  "suggested_related_search_terms": ["term1", "term2"]
}

Return at most 10 goals, sorted by match_score descending.`;

    const userPrompt = `User query: "${query}"
${age_band ? `Age band: ${age_band}` : ""}
${setting ? `Setting: ${setting}` : ""}
${learner_profile ? `Learner profile: ${learner_profile}` : ""}
${curriculum_type ? `Curriculum type: ${curriculum_type}` : ""}

Goal candidates:
${JSON.stringify(goalPool.map((g: any) => ({
  goal_id: g.goal_id,
  title: g.goal_title,
  clinical_goal: g.clinical_goal,
  domain: g.domain_title,
  level: g.vbmapp_level,
  age_tags: g.age_group_tags,
  setting_tags: g.setting_tags,
  skill_tags: g.skill_tags,
})), null, 0)}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_matches",
              description: "Return the structured goal match results",
              parameters: {
                type: "object",
                properties: {
                  top_matching_goals: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        goal_id: { type: "string" },
                        goal_title: { type: "string" },
                        match_score: { type: "number" },
                        why_matches: { type: "string" },
                      },
                      required: ["goal_id", "goal_title", "match_score", "why_matches"],
                    },
                  },
                  top_matching_domains: { type: "array", items: { type: "string" } },
                  suggested_related_tags: { type: "array", items: { type: "string" } },
                  suggested_related_search_terms: { type: "array", items: { type: "string" } },
                },
                required: ["top_matching_goals", "top_matching_domains", "suggested_related_tags", "suggested_related_search_terms"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_matches" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", status, await aiResponse.text());
      // Return RPC results as fallback
      return new Response(
        JSON.stringify({
          top_matching_goals: goalPool.slice(0, 10).map((g: any) => ({
            goal_id: g.goal_id,
            goal_title: g.goal_title,
            match_score: 50,
            why_matches: "Text match (AI unavailable)",
          })),
          top_matching_domains: [...new Set(goalPool.map((g: any) => g.domain_title))],
          suggested_related_tags: [],
          suggested_related_search_terms: [],
          fallback: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let matchResult;

    if (toolCall?.function?.arguments) {
      matchResult = JSON.parse(toolCall.function.arguments);
    } else {
      // Try parsing from content
      const content = aiData.choices?.[0]?.message?.content ?? "";
      try {
        matchResult = JSON.parse(content);
      } catch {
        matchResult = {
          top_matching_goals: goalPool.slice(0, 10).map((g: any) => ({
            goal_id: g.goal_id,
            goal_title: g.goal_title,
            match_score: 50,
            why_matches: "Fallback match",
          })),
          top_matching_domains: [...new Set(goalPool.map((g: any) => g.domain_title))],
          suggested_related_tags: [],
          suggested_related_search_terms: [],
        };
      }
    }

    return new Response(JSON.stringify(matchResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("curriculum-ai-search error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
