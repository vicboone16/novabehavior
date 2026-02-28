import { serve } from "https://deno.land/std/http/server.ts";

serve(async (_req) => new Response("OK", { status: 200 }));
