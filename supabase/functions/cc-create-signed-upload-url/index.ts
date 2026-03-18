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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { recording_id, org_id, chunk_index, mime_type = "audio/webm" } = await req.json();
    if (!recording_id || !org_id || chunk_index == null) {
      return new Response(JSON.stringify({ error: "recording_id, org_id, and chunk_index required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Validate recording exists and belongs to org
    const { data: recording, error: recErr } = await userClient
      .from("voice_recordings")
      .select("id, org_id")
      .eq("id", recording_id)
      .single();
    if (recErr || !recording) {
      return new Response(JSON.stringify({ error: "Recording not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (recording.org_id && recording.org_id !== org_id) {
      return new Response(JSON.stringify({ error: "Access denied" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Generate path
    const ext = mime_type === "audio/mp4" ? "mp4" : "webm";
    const path = `org/${org_id}/recording/${recording_id}/chunks/${chunk_index}.${ext}`;

    // Use service role to create signed upload URL
    const serviceClient = createClient(supabaseUrl, serviceKey);
    const { data: signedData, error: signErr } = await serviceClient.storage
      .from("voice-recordings")
      .createSignedUploadUrl(path);

    if (signErr || !signedData) {
      console.error("Signed URL error:", signErr);
      return new Response(JSON.stringify({ error: "Failed to create upload URL" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({
      path,
      signed_url: signedData.signedUrl,
      token: signedData.token,
      expires_in: 3600,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("cc-create-signed-upload-url error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
