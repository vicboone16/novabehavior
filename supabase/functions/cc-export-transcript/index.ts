import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * User-facing function — validates JWT via getClaims.
 * Exports transcript, drafts (approved only for approved_draft mode), and extractions.
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
    const userId = claimsData.claims.sub as string;

    const { recording_id, org_id, export_type = "transcript" } = await req.json();
    if (!recording_id || !org_id) {
      return new Response(JSON.stringify({ error: "recording_id and org_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Service-role client for DB reads
    const supabase = createClient(supabaseUrl, serviceKey);

    // Validate
    const { data: recording, error: recErr } = await supabase
      .from("voice_recordings")
      .select("id, org_id, encounter_type")
      .eq("id", recording_id)
      .single();
    if (recErr || !recording) {
      return new Response(JSON.stringify({ error: "Recording not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (recording.org_id && recording.org_id !== org_id) {
      return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const validTypes = ["transcript", "transcript_with_speakers", "approved_draft", "full_export"];
    if (!validTypes.includes(export_type)) {
      return new Response(JSON.stringify({ error: `Invalid export_type. Must be one of: ${validTypes.join(", ")}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let exportPayload: Record<string, unknown> = { recording_id, export_type, exported_at: new Date().toISOString() };

    if (export_type === "transcript" || export_type === "transcript_with_speakers" || export_type === "full_export") {
      const { data: trans } = await supabase.from("voice_transcripts").select("id, full_text, speaker_count").eq("recording_id", recording_id).order("version_number", { ascending: false }).limit(1).single();
      exportPayload.transcript = trans?.full_text || null;

      if ((export_type === "transcript_with_speakers" || export_type === "full_export") && trans) {
        const { data: segments } = await supabase.from("voice_transcript_segments").select("segment_index, text, start_ms, end_ms, speaker_id, language_code").eq("transcript_id", trans.id).order("segment_index", { ascending: true });
        exportPayload.segments = segments || [];

        const { data: speakers } = await supabase.from("voice_speakers").select("id, speaker_label, speaker_role").eq("recording_id", recording_id);
        exportPayload.speakers = speakers || [];
      }
    }

    if (export_type === "approved_draft") {
      // Only export approved drafts
      const { data: drafts } = await supabase.from("voice_ai_drafts")
        .select("id, draft_type, content, tone, approved_at, approved_by, is_user_edited")
        .eq("recording_id", recording_id)
        .not("approved_at", "is", null);
      exportPayload.drafts = drafts || [];
    } else if (export_type === "full_export") {
      // Full export includes all drafts
      const { data: drafts } = await supabase.from("voice_ai_drafts").select("id, draft_type, content, tone, approved_at, approved_by, is_user_edited").eq("recording_id", recording_id);
      exportPayload.drafts = drafts || [];
    }

    if (export_type === "full_export") {
      const { data: extractions } = await supabase.from("voice_ai_extractions").select("extraction_type, json_payload, confidence_score").eq("recording_id", recording_id);
      exportPayload.extractions = extractions || [];

      const { data: tasks } = await supabase.from("voice_tasks").select("task_text, status, assigned_to, due_date").eq("recording_id", recording_id);
      exportPayload.tasks = tasks || [];
    }

    // Audit
    await supabase.from("voice_audit_log").insert({
      recording_id,
      user_id: userId,
      action_type: "exported",
      metadata_json: { export_type },
    });

    return new Response(JSON.stringify(exportPayload), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("cc-export-transcript error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
