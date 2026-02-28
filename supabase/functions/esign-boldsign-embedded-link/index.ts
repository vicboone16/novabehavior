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

    const body = await req.json();
    const { envelopeId, signerEmail, redirectUrl } = body;

    if (!envelopeId || !signerEmail) {
      return new Response(JSON.stringify({ error: "Missing envelopeId or signerEmail" }), {
        status: 400, headers: corsHeaders,
      });
    }

    // Get envelope
    const { data: envelope, error: envErr } = await supabase
      .from("esign_envelopes")
      .select("provider_document_id")
      .eq("id", envelopeId)
      .single();

    if (envErr || !envelope?.provider_document_id) {
      return new Response(JSON.stringify({ error: "Envelope not found" }), { status: 404, headers: corsHeaders });
    }

    // Get embedded signing link from BoldSign
    const params = new URLSearchParams({
      documentId: envelope.provider_document_id,
      signerEmail: signerEmail,
      ...(redirectUrl ? { redirectUrl } : {}),
    });

    const bsResponse = await fetch(
      `https://api.boldsign.com/v1/document/getEmbeddedSignLink?${params}`,
      {
        method: "GET",
        headers: { "X-API-KEY": BOLDSIGN_API_KEY },
      }
    );

    const bsData = await bsResponse.json();
    if (!bsResponse.ok) {
      throw new Error(`BoldSign API error [${bsResponse.status}]: ${JSON.stringify(bsData)}`);
    }

    return new Response(
      JSON.stringify({ success: true, signLink: bsData.signLink }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error getting embedded link:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
