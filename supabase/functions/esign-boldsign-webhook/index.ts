import { serve } from "https://deno.land/std/http/server.ts";

serve(async (req) => {
  // GET requests return 200 OK for browser testing
  if (req.method === "GET") {
    return new Response("OK", { status: 200 });
  }

  // Verify webhook token on POST
  const token = req.headers.get("x-novatrack-webhook-token");
  const expected = Deno.env.get("NOVATRACK_BOLDSIGN_WEBHOOK_TOKEN");

  if (!token || token !== expected) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Log raw body for debugging
  const body = await req.text();
  console.log("[boldsign-webhook] payload:", body);

  return new Response("OK", { status: 200 });
});
