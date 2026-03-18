import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub as string;

    const { recording_id, org_id, duration_seconds, merged_audio_storage_path } = await req.json();
    if (!recording_id || !org_id) {
      return new Response(JSON.stringify({ error: "recording_id and org_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate recording exists and belongs to org
    const { data: recording, error: recErr } = await supabase
      .from("voice_recordings")
      .select("id, org_id, status, created_by")
      .eq("id", recording_id)
      .single();

    if (recErr || !recording) {
      return new Response(JSON.stringify({ error: "Recording not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (recording.org_id && recording.org_id !== org_id) {
      return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Finalize recording
    const updatePayload: Record<string, unknown> = {
      status: "audio_secured",
      finalized_at: new Date().toISOString(),
      upload_status: "completed",
    };
    if (duration_seconds != null) updatePayload.duration_seconds = duration_seconds;
    if (merged_audio_storage_path) updatePayload.secure_storage_path = merged_audio_storage_path;

    const { error: updateErr } = await supabase
      .from("voice_recordings")
      .update(updatePayload)
      .eq("id", recording_id);

    if (updateErr) {
      console.error("Finalize update error:", updateErr);
      return new Response(JSON.stringify({ error: "Failed to finalize recording" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Audit
    await supabase.from("voice_audit_log").insert({
      recording_id,
      user_id: userId,
      action_type: "recording_finalized",
      metadata_json: { duration_seconds, merged_audio_storage_path },
    });

    // Trigger processing (fire-and-forget)
    try {
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (serviceKey) {
        fetch(`${supabaseUrl}/functions/v1/cc-process-recording`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
            apikey: supabaseAnonKey,
          },
          body: JSON.stringify({ recording_id, org_id }),
        }).catch((e) => console.error("Failed to trigger processing:", e));
      }
    } catch (e) {
      console.error("Trigger error:", e);
    }

    return new Response(JSON.stringify({
      ok: true,
      recording_id,
      status: "audio_secured",
      next_step: "cc-process-recording",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("cc-finalize-recording error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
