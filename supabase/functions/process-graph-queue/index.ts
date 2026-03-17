import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Graph Update Queue Processor
 * 
 * Picks up unprocessed rows from graph_update_queue, marks them processed,
 * and triggers any downstream recalculation (currently: mark processed so
 * client-side graph components know fresh data is available).
 * 
 * Called by pg_cron every 2 minutes or on-demand after structured saves.
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

    // Fetch unprocessed queue entries (batch of 50 to avoid timeouts)
    const { data: pending, error: fetchErr } = await supabase
      .from("graph_update_queue")
      .select("id, client_id, target_id, graph_type, event_date, source_request_id")
      .eq("processed", false)
      .order("created_at", { ascending: true })
      .limit(50);

    if (fetchErr) throw fetchErr;

    if (!pending || pending.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: "No pending items" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplicate by client_id + target_id + graph_type + event_date
    const seen = new Set<string>();
    const unique: typeof pending = [];
    for (const item of pending) {
      const key = `${item.client_id}:${item.target_id || "null"}:${item.graph_type}:${item.event_date}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(item);
      }
    }

    // Mark ALL pending rows (including duplicates) as processed in one batch
    const ids = pending.map((r: any) => r.id);
    const now = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from("graph_update_queue")
      .update({ processed: true, processed_at: now })
      .in("id", ids);

    if (updateErr) throw updateErr;

    // For each unique entry, trigger graph-relevant side effects.
    // Currently the graphs are client-side computed from behavior_session_data,
    // so marking processed is sufficient — the UI will pick up fresh data on
    // next render. Future: materialized view refresh, push notification, etc.
    const results = unique.map((item: any) => ({
      client_id: item.client_id,
      target_id: item.target_id,
      graph_type: item.graph_type,
      event_date: item.event_date,
      status: "processed",
    }));

    return new Response(
      JSON.stringify({
        processed: ids.length,
        unique_graphs: unique.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Graph queue processor error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
