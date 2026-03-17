import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateSignature(sdkKey: string, sdkSecret: string, meetingNumber: string, role: number): string {
  const iat = Math.round(Date.now() / 1000) - 30;
  const exp = iat + 60 * 60 * 2; // 2 hours

  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sdkKey,
    mn: meetingNumber,
    role,
    iat,
    exp,
    tokenExp: exp,
  };

  const encodePart = (obj: Record<string, unknown>) => {
    const json = new TextEncoder().encode(JSON.stringify(obj));
    return base64Encode(json)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  };

  const headerB64 = encodePart(header);
  const payloadB64 = encodePart(payload);
  const message = `${headerB64}.${payloadB64}`;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(sdkSecret);
  const msgData = encoder.encode(message);

  // Use Web Crypto API for HMAC-SHA256
  return crypto.subtle
    .importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    .then((key) => crypto.subtle.sign("HMAC", key, msgData))
    .then((sig) => {
      const sigB64 = base64Encode(new Uint8Array(sig))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      return `${message}.${sigB64}`;
    });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !data?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sdkKey = Deno.env.get("ZOOM_SDK_KEY");
    const sdkSecret = Deno.env.get("ZOOM_SDK_SECRET");

    if (!sdkKey || !sdkSecret) {
      return new Response(
        JSON.stringify({ error: "Zoom SDK credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { meetingNumber, role = 0 } = await req.json();

    if (!meetingNumber) {
      return new Response(
        JSON.stringify({ error: "Meeting number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const signature = await generateSignature(sdkKey, sdkSecret, String(meetingNumber), role);

    return new Response(
      JSON.stringify({ signature, sdkKey }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Zoom signature error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
