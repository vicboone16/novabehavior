import { serve } from "https://deno.land/std/http/server.ts";

serve(async (req) => {
  try {
    // 1️⃣ Validate custom header
    const expected = Deno.env.get("NOVATRACK_BOLDSIGN_WEBHOOK_TOKEN") ?? "";
    const received = req.headers.get("X-NovaTrack-Webhook-Token") ?? "";

    if (!expected || received !== expected) {
      return new Response("Unauthorized", { status: 401 });
    }

    // 2️⃣ Only allow POST for real events
    if (req.method !== "POST") {
      return new Response("OK", { status: 200 });
    }

    // 3️⃣ Log raw payload for now
    const raw = await req.text();
    console.log("BoldSign webhook payload:", raw);

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("OK", { status: 200 });
  }
});
