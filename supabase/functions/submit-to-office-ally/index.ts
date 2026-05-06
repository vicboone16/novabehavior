import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Office Ally EDI submission endpoint
// Requires enrollment as a trading partner at https://www.officeally.com
const OA_EDI_URL = "https://edi.officeally.com/EDI_GATEWAY/SendEDI";

interface SubmitRequest {
  batchId: string;
  fileContent: string;  // Pre-generated 837P content from generate-837p function
  filename?: string;
}

interface SubmitResult {
  success: boolean;
  confirmationNumber?: string;
  claimCount?: number;
  error?: string;
  details?: any;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const oaUsername = Deno.env.get("OFFICE_ALLY_USERNAME");
  const oaPassword = Deno.env.get("OFFICE_ALLY_PASSWORD");

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "Invalid token" }, 401);

    // Use service role for DB writes
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: SubmitRequest = await req.json();
    const { batchId, fileContent, filename } = body;

    if (!batchId || !fileContent) {
      return json({ error: "batchId and fileContent are required" }, 400);
    }

    // Verify batch exists and belongs to this user's agency
    const { data: batch, error: batchErr } = await adminSupabase
      .from('claim_batches')
      .select('id, agency_id, item_count, status')
      .eq('id', batchId)
      .maybeSingle();

    if (batchErr || !batch) return json({ error: "Batch not found" }, 404);
    if (batch.status === 'submitted') return json({ error: "Batch already submitted" }, 409);

    let result: SubmitResult;

    if (!oaUsername || !oaPassword) {
      // Office Ally credentials not configured — record as manual upload pending
      result = {
        success: false,
        error: "OFFICE_ALLY_USERNAME and OFFICE_ALLY_PASSWORD environment variables are not set. " +
               "Configure them in Supabase Edge Function secrets to enable direct EDI submission. " +
               "In the meantime, download the 837P file and upload it manually at https://pm.officeally.com.",
      };
    } else {
      // Submit 837P to Office Ally via their EDI gateway
      // Office Ally accepts multipart/form-data POST with the EDI file
      const formData = new FormData();
      const blob = new Blob([fileContent], { type: 'text/plain' });
      formData.append('EDIFile', blob, filename ?? `837P_${batchId.slice(0, 8)}.txt`);
      formData.append('Login', oaUsername);
      formData.append('Password', oaPassword);

      const oaResponse = await fetch(OA_EDI_URL, {
        method: 'POST',
        body: formData,
      });

      const responseText = await oaResponse.text();

      if (oaResponse.ok) {
        // Office Ally returns a confirmation number in the response
        const confirmMatch = responseText.match(/Confirmation[:\s#]+([A-Z0-9-]+)/i);
        const claimMatch = responseText.match(/(\d+)\s+claim/i);
        result = {
          success: true,
          confirmationNumber: confirmMatch?.[1],
          claimCount: claimMatch ? parseInt(claimMatch[1]) : batch.item_count,
          details: responseText.slice(0, 500),
        };
      } else {
        result = {
          success: false,
          error: `Office Ally rejected submission (HTTP ${oaResponse.status}): ${responseText.slice(0, 300)}`,
          details: responseText,
        };
      }
    }

    // Always record the submission attempt
    await adminSupabase.from('clearinghouse_submissions').insert({
      batch_number: `OA-${batchId.slice(0, 8).toUpperCase()}`,
      submission_date: new Date().toISOString(),
      claim_count: batch.item_count,
      total_charges: 0,
      status: result.success ? 'uploaded' : 'generated',
      clearinghouse: 'Office Ally',
      submitted_by: user.id,
      response_data: {
        batch_id: batchId,
        confirmation: result.confirmationNumber,
        error: result.error,
        raw: result.details,
      },
    });

    // Update batch status
    await adminSupabase
      .from('claim_batches')
      .update({
        status: result.success ? 'submitted' : 'generated',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', batchId);

    return json(result, result.success ? 200 : 422);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    console.error('[submit-to-office-ally]', msg);
    return json({ error: msg }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
