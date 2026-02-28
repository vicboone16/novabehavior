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
    const userId = claimsData.claims.sub;

    const body = await req.json();
    const { templateId, clientId, orgId, subject, message, signers } = body;

    if (!templateId || !clientId || !orgId || !signers?.length) {
      return new Response(JSON.stringify({ error: "Missing required fields: templateId, clientId, orgId, signers" }), {
        status: 400, headers: corsHeaders,
      });
    }

    // Get BoldSign template ID from our DB
    const { data: template, error: tmplErr } = await supabase
      .from("esign_document_templates")
      .select("boldsign_template_id, name")
      .eq("id", templateId)
      .single();

    if (tmplErr || !template?.boldsign_template_id) {
      return new Response(JSON.stringify({ error: "Template not found or missing BoldSign template ID" }), {
        status: 404, headers: corsHeaders,
      });
    }

    // Send document via BoldSign API
    const boldSignBody = {
      templateId: template.boldsign_template_id,
      title: subject || template.name,
      message: message || `Please sign: ${template.name}`,
      roles: signers.map((s: any, i: number) => ({
        roleIndex: i + 1,
        signerName: s.name,
        signerEmail: s.email,
        signerOrder: s.signerOrder || i + 1,
      })),
    };

    const bsResponse = await fetch("https://api.boldsign.com/v1/template/send", {
      method: "POST",
      headers: {
        "X-API-KEY": BOLDSIGN_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(boldSignBody),
    });

    const bsData = await bsResponse.json();
    if (!bsResponse.ok) {
      throw new Error(`BoldSign API error [${bsResponse.status}]: ${JSON.stringify(bsData)}`);
    }

    // Create envelope record
    const { data: envelope, error: envErr } = await supabase
      .from("esign_envelopes")
      .insert({
        org_id: orgId,
        client_id: clientId,
        template_id: templateId,
        provider: "boldsign",
        provider_document_id: bsData.documentId,
        status: "sent",
        subject: subject || template.name,
        message: message || null,
        sent_at: new Date().toISOString(),
        created_by: userId,
      })
      .select("id")
      .single();

    if (envErr) throw envErr;

    // Create recipient records
    const recipientRows = signers.map((s: any, i: number) => ({
      envelope_id: envelope.id,
      role: s.role || "signer",
      name: s.name,
      email: s.email,
      signing_order: s.signerOrder || i + 1,
      status: "pending",
    }));

    const { error: recipErr } = await supabase.from("esign_recipients").insert(recipientRows);
    if (recipErr) throw recipErr;

    return new Response(
      JSON.stringify({
        success: true,
        envelopeId: envelope.id,
        boldsignDocumentId: bsData.documentId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error sending document:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
