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
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Use service role for compute — this is a backend job
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Parse optional params
    let agencyId: string | null = null;
    let dataSourceId: string | null = null;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        agencyId = body.agency_id || null;
        dataSourceId = body.data_source_id || null;
      } catch {
        // No body is fine — runs for all agencies
      }
    }

    // Call the SQL function ci_refresh_all (returns run_id uuid)
    const { data: runId, error } = await supabase.rpc("ci_refresh_all", {
      _agency_id: agencyId,
      _data_source_id: dataSourceId,
    });

    if (error) {
      console.error("[CIE] Compute error:", error);
      return new Response(
        JSON.stringify({ error: "Computation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the run record for response
    const { data: run } = await supabase
      .from("ci_compute_runs")
      .select("*")
      .eq("run_id", runId)
      .single();

    console.log("[CIE] Compute completed, run_id:", runId);

    return new Response(
      JSON.stringify({ success: true, run_id: runId, run }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[CIE] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
