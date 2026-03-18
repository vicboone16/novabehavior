import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * User-facing function — validates JWT via getClaims.
 * Retries a specific failed stage, then checks if all stages are complete.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate user JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { recording_id, org_id, failed_stage } = await req.json();
    if (!recording_id || !org_id || !failed_stage) {
      return new Response(JSON.stringify({ error: "recording_id, org_id, and failed_stage required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const validStages = ["transcription", "extraction", "drafts"];
    if (!validStages.includes(failed_stage)) {
      return new Response(JSON.stringify({ error: `Invalid stage. Must be one of: ${validStages.join(", ")}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Service-role client for all DB/orchestration
    const supabase = createClient(supabaseUrl, serviceKey);

    // Validate recording
    const { data: recording, error: recErr } = await supabase
      .from("voice_recordings")
      .select("id, org_id, encounter_type, save_intent, secure_storage_path, language_mode")
      .eq("id", recording_id)
      .single();
    if (recErr || !recording) {
      return new Response(JSON.stringify({ error: "Recording not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (recording.org_id && recording.org_id !== org_id) {
      return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const fnMap: Record<string, string> = {
      transcription: "cc-run-transcription",
      extraction: "cc-run-extraction",
      drafts: "cc-run-drafts",
    };

    // Build payload based on stage
    let payload: Record<string, unknown> = { recording_id, org_id };

    if (failed_stage === "transcription") {
      payload.audio_storage_path = recording.secure_storage_path;
    } else {
      // Get transcript_id for extraction/drafts
      const { data: trans } = await supabase.from("voice_transcripts")
        .select("id")
        .eq("recording_id", recording_id)
        .order("version_number", { ascending: false })
        .limit(1)
        .single();
      if (trans) payload.transcript_id = trans.id;
      payload.encounter_type = recording.encounter_type;
      if (failed_stage === "extraction") payload.save_intent = recording.save_intent;
    }

    // Invoke the specific stage using service-role key (internal orchestration)
    const res = await fetch(`${supabaseUrl}/functions/v1/${fnMap[failed_stage]}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(payload),
    });
    const result = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({
        retried_stage: failed_stage,
        stage_result: result,
        current_status: "retry_failed",
      }), { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify all stages are truly complete by checking latest AI run statuses
    const { data: latestRuns } = await supabase.from("voice_ai_runs")
      .select("run_type, status, completed_at")
      .eq("recording_id", recording_id)
      .in("run_type", ["transcription", "summary_generation", "structured_extraction", "draft_generation"])
      .order("created_at", { ascending: false });

    // Group by run_type and check latest status
    const latestByType: Record<string, string> = {};
    if (latestRuns) {
      for (const run of latestRuns) {
        if (!latestByType[run.run_type]) {
          latestByType[run.run_type] = run.status;
        }
      }
    }

    const transcriptionOk = latestByType["transcription"] === "completed";
    const extractionOk = (latestByType["summary_generation"] === "completed" || latestByType["structured_extraction"] === "completed");
    const draftsOk = latestByType["draft_generation"] === "completed";
    const allComplete = transcriptionOk && extractionOk && draftsOk;

    if (allComplete) {
      await supabase.from("voice_recordings").update({
        status: "review_ready",
        ai_status: "completed",
        transcript_status: "completed",
      }).eq("id", recording_id);
    }

    return new Response(JSON.stringify({
      retried_stage: failed_stage,
      stage_result: result,
      current_status: allComplete ? "review_ready" : "partially_complete",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("cc-retry-processing error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
