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
    const { query, item_type } = await req.json();
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

    // 1. Fetch all tags to give AI context
    const { data: allTags } = await supabase
      .from("bx_tags")
      .select("tag_key, tag_label, tag_type")
      .eq("is_active", true)
      .limit(500);

    // 2. Fetch all items with their existing tag arrays for text matching
    const [problemsRes, goalsRes, objectivesRes, strategiesRes] = await Promise.all([
      !item_type || item_type === "problem"
        ? supabase.from("bx_presenting_problems").select("id, title, definition, domain, function_tags, trigger_tags, topics").eq("status", "active").limit(500)
        : Promise.resolve({ data: [] }),
      !item_type || item_type === "goal"
        ? supabase.from("bx_replacement_goals").select("id, goal_title, domain, tags").eq("status", "active").limit(500)
        : Promise.resolve({ data: [] }),
      !item_type || item_type === "objective"
        ? supabase.from("bx_objectives").select("id, objective_title, operational_definition, replacement_skill_tags").eq("status", "active").limit(500)
        : Promise.resolve({ data: [] }),
      !item_type || item_type === "strategy"
        ? supabase.from("bx_strategies").select("id, strategy_name, short_description, function_tags, setting_tags, tier_tags, grade_band_tags, role_tags").eq("status", "active").limit(500)
        : Promise.resolve({ data: [] }),
    ]);

    // 3. Fetch bx_item_tags for all items
    const { data: itemTags } = await supabase
      .from("bx_item_tags")
      .select("item_id, item_type, tag_id, bx_tags(tag_key, tag_label)")
      .limit(5000);

    // Build a map of item_id -> tag labels
    const tagMap: Record<string, string[]> = {};
    (itemTags || []).forEach((it: any) => {
      const key = it.item_id;
      if (!tagMap[key]) tagMap[key] = [];
      if (it.bx_tags?.tag_label) tagMap[key].push(it.bx_tags.tag_label);
    });

    // 4. Build item summaries for AI
    const items: Array<{ id: string; type: string; name: string; tags: string[]; description: string }> = [];

    ((problemsRes as any).data || []).forEach((p: any) => {
      items.push({
        id: p.id, type: "problem", name: p.title,
        tags: [...(p.function_tags || []), ...(p.trigger_tags || []), ...(p.topics || []), ...(tagMap[p.id] || [])],
        description: p.definition || "",
      });
    });
    ((goalsRes as any).data || []).forEach((g: any) => {
      items.push({
        id: g.id, type: "goal", name: g.goal_title,
        tags: [...(g.tags || []), ...(tagMap[g.id] || [])],
        description: g.domain || "",
      });
    });
    ((objectivesRes as any).data || []).forEach((o: any) => {
      items.push({
        id: o.id, type: "objective", name: o.objective_title,
        tags: [...(o.replacement_skill_tags || []), ...(tagMap[o.id] || [])],
        description: o.operational_definition || "",
      });
    });
    ((strategiesRes as any).data || []).forEach((s: any) => {
      items.push({
        id: s.id, type: "strategy", name: s.strategy_name,
        tags: [...(s.function_tags || []), ...(s.setting_tags || []), ...(s.tier_tags || []), ...(s.grade_band_tags || []), ...(s.role_tags || []), ...(tagMap[s.id] || [])],
        description: s.short_description || "",
      });
    });

    // 5. Ask AI to rank items by relevance to query
    const systemPrompt = `You are a clinical behavior library search engine. Given a user search query and a list of behavior library items (problems, goals, objectives, strategies) with their tags and descriptions, return the IDs of the most relevant items ranked by relevance.

Return a JSON array of objects with: id, type, relevance_score (0-100), reason (one sentence).
Return at most 20 results. Only include items with relevance_score >= 30.
Consider tag matching, semantic similarity of names/descriptions, and clinical relevance.`;

    const userPrompt = `Search query: "${query}"

Items (${items.length} total):
${items.map(i => `- [${i.type}] ${i.name} | tags: ${i.tags.join(", ") || "none"} | desc: ${i.description.slice(0, 100)}`).join("\n")}

Return JSON array of matches.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_search_results",
            description: "Return ranked search results",
            parameters: {
              type: "object",
              properties: {
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      type: { type: "string", enum: ["problem", "goal", "objective", "strategy"] },
                      relevance_score: { type: "number" },
                      reason: { type: "string" },
                    },
                    required: ["id", "type", "relevance_score", "reason"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["results"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_search_results" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let results: any[] = [];

    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        results = parsed.results || [];
      } catch {
        results = [];
      }
    }

    // Enrich results with full item data
    const enriched = results
      .filter((r: any) => r.relevance_score >= 30)
      .map((r: any) => {
        const item = items.find(i => i.id === r.id && i.type === r.type);
        return {
          ...r,
          name: item?.name || "Unknown",
          tags: item?.tags || [],
          description: item?.description || "",
        };
      });

    return new Response(JSON.stringify({ results: enriched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("bx-ai-search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
