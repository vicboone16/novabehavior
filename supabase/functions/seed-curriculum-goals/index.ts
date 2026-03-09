import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BenchmarkInput {
  benchmark_order: number;
  benchmark_text: string;
}

interface GoalInput {
  domain_key: string;
  goal_key: string;
  title: string;
  clinical_goal: string;
  objective_text?: string;
  vbmapp_domain: string;
  vbmapp_level?: number;
  younger_examples?: string[];
  older_examples?: string[];
  age_group_tags?: string[];
  setting_tags?: string[];
  skill_tags?: string[];
  sort_order?: number;
  benchmarks?: BenchmarkInput[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth check
    const authHeader = req.headers.get("authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      if (token !== anonKey) {
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user }, error } = await userClient.auth.getUser();
        if (error || !user) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const { collection_key, goals } = await req.json() as {
      collection_key: string;
      goals: GoalInput[];
    };

    if (!collection_key || !goals || !Array.isArray(goals) || goals.length === 0) {
      return new Response(JSON.stringify({ error: "collection_key and goals[] required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up collection
    const { data: collection, error: collErr } = await supabase
      .from("clinical_curricula_collections")
      .select("id")
      .eq("key", collection_key)
      .single();

    if (collErr || !collection) {
      return new Response(JSON.stringify({ error: `Collection '${collection_key}' not found` }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cache domain lookups
    const domainCache: Record<string, string> = {};
    const results: { goal_key: string; status: string; benchmarks_inserted: number }[] = [];

    for (const goal of goals) {
      // Resolve domain
      if (!domainCache[goal.domain_key]) {
        const { data: domain } = await supabase
          .from("clinical_curricula_domains")
          .select("id")
          .eq("collection_id", collection.id)
          .eq("key", goal.domain_key)
          .single();

        if (!domain) {
          results.push({ goal_key: goal.goal_key, status: `domain '${goal.domain_key}' not found`, benchmarks_inserted: 0 });
          continue;
        }
        domainCache[goal.domain_key] = domain.id;
      }

      const domainId = domainCache[goal.domain_key];
      const benchmarkCount = goal.benchmarks?.length ?? 0;

      // Upsert goal
      const { data: upsertedGoal, error: goalErr } = await supabase
        .from("clinical_curricula_goals")
        .upsert(
          {
            domain_id: domainId,
            key: goal.goal_key,
            title: goal.title,
            clinical_goal: goal.clinical_goal,
            objective_text: goal.objective_text ?? goal.clinical_goal,
            vbmapp_domain: goal.vbmapp_domain,
            vbmapp_level: goal.vbmapp_level ?? null,
            benchmark_count: benchmarkCount,
            younger_examples: goal.younger_examples ?? [],
            older_examples: goal.older_examples ?? [],
            age_group_tags: goal.age_group_tags ?? [],
            setting_tags: goal.setting_tags ?? [],
            skill_tags: goal.skill_tags ?? [],
            sort_order: goal.sort_order ?? 0,
            is_active: true,
          },
          { onConflict: "domain_id,key" }
        )
        .select("id")
        .single();

      if (goalErr || !upsertedGoal) {
        results.push({ goal_key: goal.goal_key, status: `error: ${goalErr?.message}`, benchmarks_inserted: 0 });
        continue;
      }

      // Replace benchmarks
      let bmInserted = 0;
      if (goal.benchmarks && goal.benchmarks.length > 0) {
        await supabase
          .from("clinical_curricula_benchmarks")
          .delete()
          .eq("goal_id", upsertedGoal.id);

        const bmRows = goal.benchmarks.map((b) => ({
          goal_id: upsertedGoal.id,
          benchmark_order: b.benchmark_order,
          benchmark_text: b.benchmark_text,
        }));

        const { error: bmErr } = await supabase
          .from("clinical_curricula_benchmarks")
          .insert(bmRows);

        if (!bmErr) bmInserted = bmRows.length;
      }

      results.push({ goal_key: goal.goal_key, status: "ok", benchmarks_inserted: bmInserted });
    }

    return new Response(
      JSON.stringify({ inserted: results.filter((r) => r.status === "ok").length, total: goals.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("seed-curriculum-goals error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
