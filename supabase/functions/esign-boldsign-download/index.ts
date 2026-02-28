import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const BOLDSIGN_API_KEY = Deno.env.get("BOLDSIGN_API_KEY");
    if (!BOLDSIGN_API_KEY) throw new Error("BOLDSIGN_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer "))
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const url = new URL(req.url);
    const documentId = url.searchParams.get("documentId");
    const envelopeId = url.searchParams.get("envelopeId");

    if (!documentId || !envelopeId) {
      return new Response(JSON.stringify({ error: "Missing documentId or envelopeId" }), {
        status: 400, headers: corsHeaders,
      });
    }

    // Download from BoldSign
    const bsResponse = await fetch(
      `https://api.boldsign.com/v1/document/download?documentId=${documentId}`,
      {
        method: "GET",
        headers: { "X-API-KEY": BOLDSIGN_API_KEY },
      }
    );

    if (!bsResponse.ok) {
      const errText = await bsResponse.text();
      throw new Error(`BoldSign download error [${bsResponse.status}]: ${errText}`);
    }

    const pdfBlob = await bsResponse.arrayBuffer();
    const fileName = `${envelopeId}/${documentId}-signed.pdf`;

    // Use service role for storage upload
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Upload to storage
    const { error: uploadErr } = await serviceSupabase.storage
      .from("signed-documents")
      .upload(fileName, pdfBlob, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadErr) throw uploadErr;

    // Also store in esign_signed_files if the table exists
    await serviceSupabase.from("esign_signed_files").insert({
      envelope_id: envelopeId,
      storage_path: fileName,
      file_name: `${documentId}-signed.pdf`,
      mime_type: "application/pdf",
      file_size: pdfBlob.byteLength,
    }).then(() => {}).catch(() => {});

    // Get a signed URL for the file
    const { data: signedUrl } = await serviceSupabase.storage
      .from("signed-documents")
      .createSignedUrl(fileName, 3600);

    return new Response(
      JSON.stringify({
        success: true,
        storagePath: fileName,
        signedUrl: signedUrl?.signedUrl || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error downloading document:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
