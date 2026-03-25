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
 * Aggregates beacon_points_ledger + behavior_daily_aggregates for a student,
 * translates clinical terms via behavior_translations, and upserts a
 * parent-friendly daily insight into parent_insights.
 *
 * Body:
 *   { student_id, date? }        — single student
 *   { agency_id, date? }         — bulk for agency
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
      txMap.set(t.clinical_term?.toLowerCase(), t);
      txMap.set(t.function_category?.toLowerCase(), t);
    }

    // ── Fetch student first names ──
    const { data: studentRows } = await supabase
      .from("students")
      .select("id, first_name")
      .in("id", studentIds);
    const nameMap = new Map<string, string>();
    for (const s of studentRows || []) {
      nameMap.set(s.id, s.first_name || "Your child");
    }

    // ── Process each student ──
    const results: any[] = [];

    for (const studentId of studentIds) {
      try {
        const firstName = nameMap.get(studentId) || "Your child";
        const insight = await generateInsight(supabase, studentId, targetDate, txMap, firstName);
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
  txMap: Map<string, any>,
  firstName: string
) {
  // 1. Fetch today's points from beacon_points_ledger
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

  // 2. Fetch 7-day behavior window for trends
  const windowEnd = new Date(date);
  const windowStart = new Date(date);
  windowStart.setDate(windowStart.getDate() - 6); // last 7 days including today
  const windowStartStr = windowStart.toISOString().split("T")[0];

  const { data: aggs } = await supabase
    .from("behavior_daily_aggregates")
    .select("behavior_name, behavior_category, total_count, service_date")
    .eq("student_id", studentId)
    .gte("service_date", windowStartStr)
    .lte("service_date", date)
    .order("service_date", { ascending: true });

  // Group by behavior
  const behaviorMap = new Map<string, { name: string; category: string; daily: { date: string; count: number }[] }>();
  for (const a of aggs || []) {
    const key = a.behavior_name;
    if (!behaviorMap.has(key)) {
      behaviorMap.set(key, { name: key, category: a.behavior_category || "", daily: [] });
    }
    behaviorMap.get(key)!.daily.push({ date: a.service_date, count: a.total_count });
  }

  // 3. Calculate trends: last 3 days vs prior 4 days
  const behaviorSummary: any[] = [];
  const trendData: Record<string, any> = {};

  for (const [, beh] of behaviorMap) {
    const sorted = beh.daily.sort((a, b) => a.date.localeCompare(b.date));
    const recent = sorted.slice(-3);
    const prior = sorted.slice(0, -3);

    const recentAvg = recent.length > 0
      ? recent.reduce((s, d) => s + d.count, 0) / recent.length
      : 0;
    const priorAvg = prior.length > 0
      ? prior.reduce((s, d) => s + d.count, 0) / prior.length
      : null;

    let trend = "stable";
    if (priorAvg !== null && priorAvg > 0) {
      const change = (recentAvg - priorAvg) / priorAvg;
      if (change <= -0.2) trend = "improving";
      else if (change >= 0.2) trend = "worsening";
    }

    // Translate clinical terms
    const tx =
      txMap.get(beh.name?.toLowerCase()) ||
      txMap.get(beh.category?.toLowerCase());

    const parentLabel = tx?.parent_friendly || beh.name;
    const todayCount = sorted.find(d => d.date === date)?.count || 0;

    behaviorSummary.push({
      behavior: beh.name,
      label: parentLabel,
      learning_frame: tx?.learning_frame || null,
      trend,
      count_today: todayCount,
      avg_recent: Math.round(recentAvg * 10) / 10,
      category: beh.category,
    });

    trendData[beh.name] = {
      today: todayCount,
      recent_avg: Math.round(recentAvg * 10) / 10,
      prior_avg: priorAvg !== null ? Math.round(priorAvg * 10) / 10 : null,
      trend,
      daily: sorted,
    };
  }

  // 4. Build headline — uses firstName and points
  let headline: string;
  const improving = behaviorSummary.filter(b => b.trend === "improving");
  const worsening = behaviorSummary.filter(b => b.trend === "worsening");
  const totalToday = behaviorSummary.reduce((s, b) => s + (b.count_today || 0), 0);

  if (pointsEarned > 0 && totalToday === 0) {
    headline = `${firstName} earned ${pointsEarned} points today — great day!`;
  } else if (pointsEarned > 0 && improving.length > 0 && worsening.length === 0) {
    headline = `${firstName} earned ${pointsEarned} points and showed real progress today!`;
  } else if (pointsEarned > 0) {
    headline = `${firstName} earned ${pointsEarned} points today!`;
  } else if (totalToday === 0) {
    headline = `${firstName} had a smooth day — no behavioral concerns!`;
  } else if (improving.length > 0 && worsening.length === 0) {
    headline = `${firstName} is making positive progress — keep it up!`;
  } else if (worsening.length > 0 && improving.length === 0) {
    headline = `A tougher day for ${firstName} — here's what might help.`;
  } else {
    headline = `A mixed day for ${firstName} with some wins and some challenges.`;
  }

  // 5. What this means — from primary behavior translation
  let whatThisMeans: string;
  const primaryBehavior = behaviorSummary.sort(
    (a, b) => (b.count_today || 0) - (a.count_today || 0)
  )[0];

  if (totalToday === 0) {
    whatThisMeans =
      `${firstName} had a smooth day with no concerning behaviors. This is a great sign of progress!`;
  } else if (primaryBehavior?.learning_frame) {
    whatThisMeans = `${firstName} is ${primaryBehavior.learning_frame}. ${
      totalToday <= 3
        ? "The number of incidents was low, which suggests progress."
        : "There were several incidents, which is normal as children learn new skills."
    }`;
  } else {
    whatThisMeans = `${firstName} is working on developing self-regulation skills. ${
      totalToday <= 3
        ? "Today had few incidents — a positive sign."
        : "There were some challenges today, but this is part of the learning process."
    }`;
  }

  // 6. What you can do — home strategies from translations
  const strategies: string[] = [];
  for (const b of behaviorSummary) {
    const tx =
      txMap.get(b.behavior?.toLowerCase()) ||
      txMap.get(b.category?.toLowerCase());
    if (tx?.home_strategies) {
      const strats = Array.isArray(tx.home_strategies) ? tx.home_strategies : [];
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

  // 7. Daily points trend (last 7 days)
  const dailyPoints: { date: string; earned: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(date);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().split("T")[0];
    const dStart = `${ds}T00:00:00Z`;
    const dEnd = `${ds}T23:59:59Z`;

    // Only fetch for today (already have), approximate others as 0 for speed
    if (ds === date) {
      dailyPoints.push({ date: ds, earned: pointsEarned });
    } else {
      dailyPoints.push({ date: ds, earned: 0 }); // filled by historical runs
    }
  }

  // 8. Upsert into parent_insights
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
    trend_data: {
      daily_points: dailyPoints,
      behavior_trends: trendData,
    },
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
