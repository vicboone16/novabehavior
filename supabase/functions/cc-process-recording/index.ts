import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Internal orchestration function — called with service-role key only.
 * Does NOT call auth.getClaims. Validates via service-role DB access.
 */
async function invokeStage(
  supabaseUrl: string,
  serviceKey: string,
  anonKey: string,
  fnName: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/${fnName}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        apikey: anonKey,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data.error || `${fnName} failed with ${res.status}` };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Internal orchestration: accept service-role bearer — no getClaims
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Service-role client for all DB ops
    const supabase = createClient(supabaseUrl, serviceKey);

    const { recording_id, org_id } = await req.json();
    if (!recording_id || !org_id) {
      return new Response(JSON.stringify({ error: "recording_id and org_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Load recording
    const { data: recording, error: recErr } = await supabase
      .from("voice_recordings")
      .select("*")
      .eq("id", recording_id)
      .single();

    if (recErr || !recording) {
      return new Response(JSON.stringify({ error: "Recording not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (recording.org_id && recording.org_id !== org_id) {
      return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Idempotency: skip if already review_ready or posted
    if (recording.status === "review_ready" || recording.status === "posted" || recording.status === "saved_draft") {
      return new Response(JSON.stringify({
        stage_results: {},
        final_status: recording.status,
        message: "Recording already processed",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Only process if in appropriate state
    const processableStatuses = ["audio_secured", "transcript_failed_retryable", "ai_failed_retryable", "processing"];
    if (!processableStatuses.includes(recording.status)) {
      return new Response(JSON.stringify({ error: `Cannot process recording in status: ${recording.status}` }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create orchestration AI run
    const { data: orchRun } = await supabase.from("voice_ai_runs").insert({
      recording_id,
      run_type: "orchestration",
      model_name: "pipeline",
      status: "running",
      started_at: new Date().toISOString(),
    }).select("id").single();

    // Set processing status
    await supabase.from("voice_recordings").update({
      status: "processing",
      ai_status: "running",
    }).eq("id", recording_id);

    const stageResults: Record<string, any> = {};

    // ── Stage 1: Transcription ──
    const transcriptionResult = await invokeStage(supabaseUrl, serviceKey, supabaseAnonKey, "cc-run-transcription", {
      recording_id,
      org_id,
      transcript_version: 1,
      audio_storage_path: recording.secure_storage_path,
    });
    stageResults.transcription = transcriptionResult;

    if (!transcriptionResult.ok) {
      await supabase.from("voice_recordings").update({
        status: "transcript_failed_retryable",
        transcript_status: "failed",
      }).eq("id", recording_id);
      if (orchRun) {
        await supabase.from("voice_ai_runs").update({
          status: "failed",
          error_message: transcriptionResult.error,
          completed_at: new Date().toISOString(),
        }).eq("id", orchRun.id);
      }
      return new Response(JSON.stringify({ stage_results: stageResults, final_status: "transcript_failed_retryable" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const transcriptId = transcriptionResult.data?.transcript_id;

    // ── Stage 2: Extraction ──
    const extractionResult = await invokeStage(supabaseUrl, serviceKey, supabaseAnonKey, "cc-run-extraction", {
      recording_id,
      org_id,
      transcript_id: transcriptId,
      encounter_type: recording.encounter_type,
      save_intent: recording.save_intent,
    });
    stageResults.extraction = extractionResult;

    if (!extractionResult.ok) {
      await supabase.from("voice_recordings").update({
        status: "ai_failed_retryable",
        ai_status: "failed",
      }).eq("id", recording_id);
      if (orchRun) {
        await supabase.from("voice_ai_runs").update({
          status: "failed",
          error_message: extractionResult.error,
          completed_at: new Date().toISOString(),
        }).eq("id", orchRun.id);
      }
      return new Response(JSON.stringify({ stage_results: stageResults, final_status: "ai_failed_retryable" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Stage 3: Drafts ──
    const draftsResult = await invokeStage(supabaseUrl, serviceKey, supabaseAnonKey, "cc-run-drafts", {
      recording_id,
      org_id,
      transcript_id: transcriptId,
      encounter_type: recording.encounter_type,
    });
    stageResults.drafts = draftsResult;

    if (!draftsResult.ok) {
      await supabase.from("voice_recordings").update({
        status: "ai_failed_retryable",
        ai_status: "failed",
      }).eq("id", recording_id);
      if (orchRun) {
        await supabase.from("voice_ai_runs").update({
          status: "failed",
          error_message: draftsResult.error,
          completed_at: new Date().toISOString(),
        }).eq("id", orchRun.id);
      }
      return new Response(JSON.stringify({ stage_results: stageResults, final_status: "ai_failed_retryable" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── All stages complete — mark review_ready ──
    await supabase.from("voice_recordings").update({
      status: "review_ready",
      ai_status: "completed",
      transcript_status: "completed",
    }).eq("id", recording_id);

    if (orchRun) {
      await supabase.from("voice_ai_runs").update({
        status: "completed",
        completed_at: new Date().toISOString(),
      }).eq("id", orchRun.id);
    }

    // Audit
    await supabase.from("voice_audit_log").insert({
      recording_id,
      user_id: recording.created_by,
      action_type: "processing_completed",
      metadata_json: { stages: Object.keys(stageResults) },
    });

    return new Response(JSON.stringify({
      stage_results: stageResults,
      final_status: "review_ready",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("cc-process-recording error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
