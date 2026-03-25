import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * generate-parent-insight
 *
 * Aggregates behavior_daily_aggregates + beacon_points_ledger for a student,
 * translates clinical terms via behavior_translations, and upserts a
 * parent-friendly daily insight into parent_insights.
 *
 * Body:
 *   { student_id: uuid, date?: "YYYY-MM-DD" }        — single student
 *   { agency_id: uuid, date?: "YYYY-MM-DD" }          — bulk for agency
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json().catch(() => ({}));
    const targetDate = body.date || new Date().toISOString().split("T")[0];

    // ── Resolve student list ──
    let studentIds: string[] = [];

    if (body.student_id) {
      studentIds = [body.student_id];
    } else if (body.agency_id) {
      // Get all active students in agency
      const { data: students } = await supabase
        .from("students")
        .select("id")
        .eq("agency_id", body.agency_id)
        .eq("status", "active");
      studentIds = (students || []).map((s: any) => s.id);
    } else {
      return new Response(
        JSON.stringify({ error: "Provide student_id or agency_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (studentIds.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: "No students found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Load behavior translations (cached for all students) ──
    const { data: translations } = await supabase
      .from("behavior_translations")
      .select("*")
      .eq("is_default", true);

    const txMap = new Map<string, any>();
    for (const t of translations || []) {
      txMap.set(t.clinical_term.toLowerCase(), t);
      txMap.set(t.function_category.toLowerCase(), t);
    }

    // ── Process each student ──
    const results: any[] = [];

    for (const studentId of studentIds) {
      try {
        const insight = await generateInsight(supabase, studentId, targetDate, txMap);
        results.push({ student_id: studentId, status: "ok", id: insight?.id });
      } catch (err: any) {
        console.error(`Error for student ${studentId}:`, err.message);
        results.push({ student_id: studentId, status: "error", error: err.message });
      }
    }

    return new Response(
      JSON.stringify({ processed: results.length, date: targetDate, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("generate-parent-insight error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ──────────────────────────────────────────────────
// Core insight generation for a single student/date
// ──────────────────────────────────────────────────

async function generateInsight(
  supabase: any,
  studentId: string,
  date: string,
  txMap: Map<string, any>
) {
  // 1. Fetch today's behavior aggregates
  const { data: aggs } = await supabase
    .from("behavior_daily_aggregates")
    .select("*")
    .eq("student_id", studentId)
    .eq("service_date", date);

  // 2. Fetch today's points
  const dayStart = `${date}T00:00:00Z`;
  const dayEnd = `${date}T23:59:59Z`;

  const { data: pointRows } = await supabase
    .from("beacon_points_ledger")
    .select("points_delta")
    .eq("student_id", studentId)
    .gte("created_at", dayStart)
    .lte("created_at", dayEnd);

  const pointsEarned = (pointRows || [])
    .filter((r: any) => r.points_delta > 0)
    .reduce((sum: number, r: any) => sum + r.points_delta, 0);
  const pointsRedeemed = (pointRows || [])
    .filter((r: any) => r.points_delta < 0)
    .reduce((sum: number, r: any) => sum + Math.abs(r.points_delta), 0);

  // 3. Fetch previous 7 days for trend
  const weekAgo = new Date(date);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];

  const { data: priorAggs } = await supabase
    .from("behavior_daily_aggregates")
    .select("behavior_name, total_count, service_date")
    .eq("student_id", studentId)
    .gte("service_date", weekAgoStr)
    .lt("service_date", date);

  // 4. Build behavior summary with translations
  const behaviorSummary = (aggs || []).map((a: any) => {
    const tx =
      txMap.get(a.behavior_name?.toLowerCase()) ||
      txMap.get(a.behavior_category?.toLowerCase());

    // Compute 7-day average for this behavior
    const priorCounts = (priorAggs || [])
      .filter((p: any) => p.behavior_name === a.behavior_name)
      .map((p: any) => p.total_count);
    const priorAvg =
      priorCounts.length > 0
        ? priorCounts.reduce((s: number, c: number) => s + c, 0) / priorCounts.length
        : null;

    return {
      behavior_name: a.behavior_name,
      parent_label: tx?.parent_friendly || a.behavior_name,
      learning_frame: tx?.learning_frame || null,
      count: a.total_count,
      prior_avg: priorAvg !== null ? Math.round(priorAvg * 10) / 10 : null,
      trend: priorAvg !== null
        ? a.total_count > priorAvg * 1.3
          ? "up"
          : a.total_count < priorAvg * 0.7
          ? "down"
          : "stable"
        : "no_data",
      category: a.behavior_category,
    };
  });

  // 5. Generate headline
  const totalIncidents = behaviorSummary.reduce(
    (s: number, b: any) => s + (b.count || 0),
    0
  );
  const improving = behaviorSummary.filter((b: any) => b.trend === "down");
  const worsening = behaviorSummary.filter((b: any) => b.trend === "up");

  let headline: string;
  if (totalIncidents === 0) {
    headline = "Great day! No behavioral concerns recorded.";
  } else if (improving.length > 0 && worsening.length === 0) {
    headline = "Positive progress today — keep up the great work!";
  } else if (worsening.length > 0 && improving.length === 0) {
    headline = "A tougher day — here's what might help.";
  } else {
    headline = "A mixed day with some wins and some challenges.";
  }

  // 6. Generate "what this means"
  let whatThisMeans: string;
  if (totalIncidents === 0) {
    whatThisMeans =
      "Your child had a smooth day with no concerning behaviors. This is a great sign of progress!";
  } else {
    const topBehavior = behaviorSummary.sort(
      (a: any, b: any) => (b.count || 0) - (a.count || 0)
    )[0];
    const frame = topBehavior?.learning_frame || "developing self-regulation skills";
    whatThisMeans = `Today's main focus area was ${topBehavior?.parent_label || "behavior management"}. Your child is ${frame}. ${
      totalIncidents <= 3
        ? "The number of incidents was low, which suggests progress."
        : "There were several incidents, which is normal as children learn new skills."
    }`;
  }

  // 7. Generate "what you can do" strategies from translations
  const strategies: string[] = [];
  for (const b of behaviorSummary) {
    const tx =
      txMap.get(b.behavior_name?.toLowerCase()) ||
      txMap.get(b.category?.toLowerCase());
    if (tx?.home_strategies) {
      const strats = Array.isArray(tx.home_strategies)
        ? tx.home_strategies
        : [];
      for (const s of strats.slice(0, 2)) {
        if (!strategies.includes(s)) strategies.push(s);
      }
    }
  }
  if (strategies.length === 0) {
    strategies.push(
      "Praise specific positive behaviors you notice at home.",
      "Keep consistent routines during transitions."
    );
  }

  // 8. Build trend data
  const trendData: Record<string, any> = {};
  for (const b of behaviorSummary) {
    const priorByDay = (priorAggs || [])
      .filter((p: any) => p.behavior_name === b.behavior_name)
      .map((p: any) => ({ date: p.service_date, count: p.total_count }));

    trendData[b.behavior_name] = {
      today: b.count,
      prior_avg: b.prior_avg,
      trend: b.trend,
      daily: [...priorByDay, { date, count: b.count }],
    };
  }

  // 9. Upsert into parent_insights
  const row = {
    student_id: studentId,
    insight_date: date,
    insight_type: "daily",
    headline,
    behavior_summary: behaviorSummary,
    what_this_means: whatThisMeans,
    what_you_can_do: strategies,
    rewards_summary: {
      points_earned: pointsEarned,
      points_redeemed: pointsRedeemed,
    },
    points_earned: pointsEarned,
    points_redeemed: pointsRedeemed,
    trend_data: trendData,
    status: "draft",
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("parent_insights")
    .upsert(row, { onConflict: "student_id,insight_date,insight_type" })
    .select("id")
    .single();

  if (error) throw error;
  return data;
}
