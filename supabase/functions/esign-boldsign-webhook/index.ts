import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as hexEncode } from "https://deno.land/std@0.224.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-boldsign-signature",
};

async function verifyHmac(payload: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const computed = new TextDecoder().decode(hexEncode(new Uint8Array(sig)));
  return computed === signature.toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // GET handler — browser test / health check
  if (req.method === "GET") {
    return new Response("OK", {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  // Use service role for webhook processing (no user auth)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const rawBody = await req.text();
    console.log("[BoldSign Webhook] Raw body received:", rawBody);

    // BoldSign verification event (ping) — respond 200 immediately
    let parsedBody: any;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      // Non-JSON body — still return 200 OK for verification
      console.log("[BoldSign Webhook] Non-JSON body, returning 200 OK");
      return new Response("OK", {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    if (parsedBody?.event?.eventType === "Verification") {
      console.log("BoldSign verification ping received");
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify HMAC signature if secret is configured
    const WEBHOOK_SECRET = Deno.env.get("BOLDSIGN_WEBHOOK_SECRET");
    if (WEBHOOK_SECRET) {
      const signature = req.headers.get("x-boldsign-signature") || req.headers.get("X-BoldSign-Signature");
      if (signature) {
        const valid = await verifyHmac(rawBody, signature, WEBHOOK_SECRET);
        if (!valid) {
          console.error("Invalid webhook signature");
          return new Response(JSON.stringify({ error: "Invalid signature" }), {
            status: 401,
            headers: corsHeaders,
          });
        }
      }
    } else {
      console.log("[BoldSign Webhook] No BOLDSIGN_WEBHOOK_SECRET configured, skipping HMAC verification");
    }

    const event = parsedBody?.event;
    const documentId = event?.documentId || parsedBody?.documentId;
    const eventType = event?.eventType || parsedBody?.eventType || "unknown";

    // Map BoldSign event types to envelope statuses
    const statusMap: Record<string, string> = {
      Sent: "sent",
      Signed: "signed",
      Completed: "completed",
      Declined: "declined",
      Expired: "expired",
      Voided: "voided",
      Viewed: "viewed",
      Reassigned: "reassigned",
      Revoked: "revoked",
    };

    // Find envelope by provider_document_id
    let envelopeId: string | null = null;
    if (documentId) {
      const { data: env } = await supabase
        .from("esign_envelopes")
        .select("id")
        .eq("provider_document_id", documentId)
        .single();
      envelopeId = env?.id || null;
    }

    // Log webhook event
    await supabase.from("esign_audit_log").insert({
      envelope_id: envelopeId,
      provider: "boldsign",
      event_type: eventType,
      raw_payload: parsedBody,
      event_created_at: new Date().toISOString(),
    });

    // Update envelope status
    if (envelopeId && statusMap[eventType]) {
      const updateData: Record<string, any> = {
        status: statusMap[eventType],
        updated_at: new Date().toISOString(),
      };

      if (eventType === "Completed") {
        updateData.completed_at = new Date().toISOString();
      }
      if (eventType === "Expired") {
        updateData.expires_at = new Date().toISOString();
      }

      await supabase
        .from("esign_envelopes")
        .update(updateData)
        .eq("id", envelopeId);
    }

    // Update recipient status if signer info is in payload
    if (envelopeId && event?.signerEmail) {
      const recipientUpdate: Record<string, any> = { updated_at: new Date().toISOString() };

      if (eventType === "Signed") {
        recipientUpdate.status = "signed";
      } else if (eventType === "Declined") {
        recipientUpdate.status = "declined";
      } else if (eventType === "Viewed") {
        recipientUpdate.status = "viewed";
      }

      if (Object.keys(recipientUpdate).length > 1) {
        await supabase
          .from("esign_recipients")
          .update(recipientUpdate)
          .eq("envelope_id", envelopeId)
          .eq("email", event.signerEmail);
      }
    }

    return new Response("OK", {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
