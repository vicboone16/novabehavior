import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: authData, error: claimsErr } = await authSupabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !authData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = authData.claims.sub as string;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { client_id, agency_id, week_start } = await req.json();

    // Verify user belongs to the requested agency
    if (agency_id) {
      const { data: membership } = await supabase
        .from("agency_memberships")
        .select("id")
        .eq("user_id", userId)
        .eq("agency_id", agency_id)
        .eq("status", "active")
        .maybeSingle();
      if (!membership) {
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // If client_id provided, verify user has access to that student
    if (client_id && !agency_id) {
      const { data: access } = await supabase
        .from("user_student_access")
        .select("id")
        .eq("user_id", userId)
        .eq("student_id", client_id)
        .maybeSingle();
      if (!access) {
        // Also check agency membership via student's agency
        const { data: student } = await supabase
          .from("students")
          .select("agency_id")
          .eq("id", client_id)
          .maybeSingle();
        if (student?.agency_id) {
          const { data: membership } = await supabase
            .from("agency_memberships")
            .select("id")
            .eq("user_id", userId)
            .eq("agency_id", student.agency_id)
            .eq("status", "active")
            .maybeSingle();
          if (!membership) {
            return new Response(JSON.stringify({ error: "Access denied" }), {
              status: 403,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          return new Response(JSON.stringify({ error: "Access denied" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Default to current week if not provided
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const weekStartDate = week_start ? new Date(week_start) : monday;
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);
    weekEndDate.setHours(23, 59, 59, 999);

    const wsISO = weekStartDate.toISOString();
    const weISO = weekEndDate.toISOString();
    const wsDate = wsISO.split("T")[0];
    const weDate = weISO.split("T")[0];

    // Build filter: either single client or all clients in agency
    let clientIds: string[] = [];
    if (client_id) {
      clientIds = [client_id];
    } else if (agency_id) {
      const { data: students } = await supabase
        .from("students")
        .select("id")
        .eq("agency_id", agency_id);
      clientIds = (students ?? []).map((s: any) => s.id);
    }

    if (!clientIds.length) {
      return new Response(JSON.stringify({ error: "No clients found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const cid of clientIds) {
      const { data: freqEntries } = await supabase
        .from("teacher_frequency_entries")
        .select("*")
        .eq("client_id", cid)
        .gte("session_date", wsDate)
        .lte("session_date", weDate);

      const { data: abcEvents } = await supabase
        .from("teacher_abc_events")
        .select("*")
        .eq("client_id", cid)
        .gte("occurred_at", wsISO)
        .lte("occurred_at", weISO);

      const { data: dataEvents } = await supabase
        .from("teacher_data_events")
        .select("*")
        .eq("client_id", cid)
        .gte("occurred_at", wsISO)
        .lte("occurred_at", weISO);

      const { data: durEntries } = await supabase
        .from("teacher_duration_entries")
        .select("*")
        .eq("client_id", cid)
        .gte("session_date", wsDate)
        .lte("session_date", weDate);

      const { data: sessions } = await supabase
        .from("teacher_data_sessions")
        .select("*, teacher_data_points(*)")
        .eq("client_id", cid)
        .gte("started_at", wsISO)
        .lte("started_at", weISO);

      const { data: intervalSessions } = await supabase
        .from("teacher_interval_sessions")
        .select("*")
        .eq("client_id", cid)
        .gte("started_at", wsISO)
        .lte("started_at", weISO);

      const behaviorMap: Record<string, number> = {};
      (freqEntries ?? []).forEach((e: any) => {
        behaviorMap[e.behavior_name] = (behaviorMap[e.behavior_name] || 0) + (e.count || 0);
      });
      (abcEvents ?? []).forEach((e: any) => {
        behaviorMap[e.behavior] = (behaviorMap[e.behavior] || 0) + 1;
      });
      const behavior_totals = Object.entries(behaviorMap).map(([behavior, count]) => ({ behavior, count }));

      const antecedentMap: Record<string, number> = {};
      (abcEvents ?? []).forEach((e: any) => {
        if (e.antecedent) {
          antecedentMap[e.antecedent] = (antecedentMap[e.antecedent] || 0) + 1;
        }
      });
      const top_antecedents = Object.entries(antecedentMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([antecedent, count]) => ({ antecedent, count }));

      let engagement_pct: number | null = null;
      const allIntervals = intervalSessions ?? [];
      if (allIntervals.length > 0) {
        const totalExpected = allIntervals.reduce((a: number, s: any) => a + (s.expected_intervals || 0), 0);
        const totalCompleted = allIntervals.reduce((a: number, s: any) => a + (s.completed_intervals || 0), 0);
        engagement_pct = totalExpected > 0 ? (totalCompleted / totalExpected) * 100 : null;
      }

      const targetMap: Record<string, { correct: number; total: number }> = {};
      (sessions ?? []).forEach((s: any) => {
        const points = s.teacher_data_points ?? [];
        const targetLabel = s.mode || "probe";
        if (!targetMap[targetLabel]) targetMap[targetLabel] = { correct: 0, total: 0 };
        points.forEach((p: any) => {
          targetMap[targetLabel].total++;
          if (p.value_bool === true) targetMap[targetLabel].correct++;
        });
      });
      const skill_probe_summary = Object.entries(targetMap).map(([target, v]) => ({
        target, correct: v.correct, total: v.total,
      }));

      let prompt_completion_pct: number | null = null;
      const promptEvents = (dataEvents ?? []).filter((e: any) => e.event_type === "prompt");
      if (promptEvents.length > 0) {
        const completed = promptEvents.filter((e: any) => e.value_number === 1).length;
        prompt_completion_pct = (completed / promptEvents.length) * 100;
      }

      const resolvedAgencyId = agency_id ||
        (freqEntries?.[0] as any)?.agency_id ||
        (abcEvents?.[0] as any)?.agency_id ||
        "00000000-0000-0000-0000-000000000000";

      const { data: upserted, error } = await supabase
        .from("teacher_weekly_summaries")
        .upsert(
          {
            client_id: cid,
            agency_id: resolvedAgencyId,
            week_start: wsDate,
            week_end: weDate,
            behavior_totals,
            top_antecedents,
            engagement_pct,
            prompt_completion_pct,
            skill_probe_summary,
            summary_data: {
              frequency_entry_count: (freqEntries ?? []).length,
              abc_event_count: (abcEvents ?? []).length,
              data_event_count: (dataEvents ?? []).length,
              duration_entry_count: (durEntries ?? []).length,
              session_count: (sessions ?? []).length,
              interval_session_count: allIntervals.length,
            },
            status: "draft",
            created_by: "00000000-0000-0000-0000-000000000000",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "client_id,week_start" }
        )
        .select();

      if (error) {
        console.error("Upsert error for client", cid, error);
      } else {
        results.push({ client_id: cid, summary: upserted?.[0] });
      }
    }

    return new Response(JSON.stringify({ success: true, count: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
