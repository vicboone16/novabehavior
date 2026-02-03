import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EligibilityRequest {
  studentId: string;
  payerId?: string;
  clientPayerId?: string;
  serviceDate?: string;
  subscriberInfo?: {
    memberId: string;
    firstName: string;
    lastName: string;
    dob: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PVERIFY_CLIENT_ID = Deno.env.get("PVERIFY_CLIENT_ID");
    const PVERIFY_CLIENT_SECRET = Deno.env.get("PVERIFY_CLIENT_SECRET");
    const PVERIFY_API_URL = Deno.env.get("PVERIFY_API_URL") || "https://api.pverify.com";

    // Check if pVerify is configured
    if (!PVERIFY_CLIENT_ID || !PVERIFY_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Eligibility verification not configured",
          message: "pVerify API credentials not configured. Please add PVERIFY_CLIENT_ID and PVERIFY_CLIENT_SECRET to enable real-time eligibility checks.",
          configurationRequired: true,
          // Return mock data structure for UI development
          mockData: {
            isEligible: null,
            eligibilityStatus: "Not Configured",
            message: "Add pVerify credentials to enable real-time eligibility verification",
          }
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: EligibilityRequest = await req.json();
    const { studentId, payerId, clientPayerId, serviceDate, subscriberInfo } = body;

    if (!studentId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required field: studentId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get client payer info if not provided
    let memberInfo = subscriberInfo;
    if (!memberInfo && clientPayerId) {
      const { data: clientPayer } = await supabase
        .from('client_payers')
        .select(`
          member_id,
          payer_id,
          student:students(first_name, last_name, date_of_birth)
        `)
        .eq('id', clientPayerId)
        .single();
      
      if (clientPayer && clientPayer.student) {
        const student = clientPayer.student as any;
        memberInfo = {
          memberId: clientPayer.member_id || '',
          firstName: student.first_name,
          lastName: student.last_name,
          dob: student.date_of_birth,
        };
      }
    }

    // Get pVerify access token
    const tokenResponse = await fetch(`${PVERIFY_API_URL}/Token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: PVERIFY_CLIENT_ID,
        client_secret: PVERIFY_CLIENT_SECRET,
        grant_type: "client_credentials",
      }),
    });

    if (!tokenResponse.ok) {
      const tokenError = await tokenResponse.text();
      console.error("pVerify token error:", tokenError);
      
      // Record failed check
      await supabase.from('eligibility_checks').insert({
        student_id: studentId,
        payer_id: payerId,
        client_payer_id: clientPayerId,
        check_type: 'realtime',
        service_date: serviceDate || new Date().toISOString().split('T')[0],
        status: 'error',
        error_message: 'Failed to authenticate with pVerify',
        performed_by: user.id,
      });

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Authentication failed with eligibility provider",
          details: "Unable to connect to pVerify API"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Make eligibility request (ANSI 270/271)
    const eligibilityResponse = await fetch(`${PVERIFY_API_URL}/API/EligibilitySummary`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Client-API-Id": PVERIFY_CLIENT_ID,
      },
      body: JSON.stringify({
        payerCode: payerId, // May need payer mapping
        provider: {
          npi: Deno.env.get("AGENCY_NPI") || "",
        },
        subscriber: {
          memberId: memberInfo?.memberId,
          firstName: memberInfo?.firstName,
          lastName: memberInfo?.lastName,
          dob: memberInfo?.dob,
        },
        isSubscriberPatient: "True",
        doS_StartDate: serviceDate || new Date().toISOString().split('T')[0],
        doS_EndDate: serviceDate || new Date().toISOString().split('T')[0],
        serviceCodes: ["97153", "97155", "97156"], // ABA service codes
      }),
    });

    const eligibilityData = await eligibilityResponse.json();

    // Parse pVerify response
    const isEligible = eligibilityData.IsActive === "Y" || eligibilityData.PlanStatus === "Active";
    const planInfo = eligibilityData.PlanCoverageSummary || {};
    const benefitInfo = eligibilityData.ServiceDetails || [];

    // Extract ABA-specific benefits
    let abaBenefits = {
      covered: false,
      authRequired: false,
      visitLimit: null as number | null,
      visitsUsed: null as number | null,
      dollarLimit: null as number | null,
      dollarsUsed: null as number | null,
    };

    // Look for ABA/behavioral health benefits
    for (const service of benefitInfo) {
      if (service.ServiceName?.toLowerCase().includes('behavior') || 
          service.ServiceName?.toLowerCase().includes('aba') ||
          service.ServiceCode?.startsWith('97')) {
        abaBenefits.covered = true;
        abaBenefits.authRequired = service.AuthorizationRequired === "Y";
        abaBenefits.visitLimit = service.MaxVisits || null;
        abaBenefits.visitsUsed = service.VisitsUsed || null;
        break;
      }
    }

    // Record eligibility check
    const { data: checkRecord, error: insertError } = await supabase
      .from('eligibility_checks')
      .insert({
        student_id: studentId,
        payer_id: payerId,
        client_payer_id: clientPayerId,
        check_type: 'realtime',
        service_date: serviceDate || new Date().toISOString().split('T')[0],
        pverify_request_id: eligibilityData.RequestId || null,
        pverify_response: eligibilityData,
        is_eligible: isEligible,
        eligibility_status: eligibilityData.PlanStatus || 'Unknown',
        plan_name: planInfo.PlanName || null,
        plan_number: planInfo.PlanNumber || null,
        group_number: planInfo.GroupNumber || null,
        copay_amount: planInfo.Copay ? parseFloat(planInfo.Copay) : null,
        coinsurance_percent: planInfo.Coinsurance ? parseInt(planInfo.Coinsurance) : null,
        deductible_total: planInfo.DeductibleTotal ? parseFloat(planInfo.DeductibleTotal) : null,
        deductible_remaining: planInfo.DeductibleRemaining ? parseFloat(planInfo.DeductibleRemaining) : null,
        out_of_pocket_max: planInfo.OOPMax ? parseFloat(planInfo.OOPMax) : null,
        out_of_pocket_remaining: planInfo.OOPRemaining ? parseFloat(planInfo.OOPRemaining) : null,
        aba_covered: abaBenefits.covered,
        aba_auth_required: abaBenefits.authRequired,
        aba_visit_limit: abaBenefits.visitLimit,
        aba_visits_used: abaBenefits.visitsUsed,
        aba_dollar_limit: abaBenefits.dollarLimit,
        aba_dollars_used: abaBenefits.dollarsUsed,
        status: 'success',
        performed_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database error:", insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkId: checkRecord?.id,
        eligibility: {
          isEligible,
          status: eligibilityData.PlanStatus,
          planName: planInfo.PlanName,
          groupNumber: planInfo.GroupNumber,
          copay: planInfo.Copay,
          coinsurance: planInfo.Coinsurance,
          deductible: {
            total: planInfo.DeductibleTotal,
            remaining: planInfo.DeductibleRemaining,
          },
          outOfPocket: {
            max: planInfo.OOPMax,
            remaining: planInfo.OOPRemaining,
          },
          abaBenefits,
        },
        rawResponse: eligibilityData,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Eligibility check error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
