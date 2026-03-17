import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  studentId: string;
  amount: number;
  paymentType: 'copay' | 'coinsurance' | 'deductible' | 'self_pay' | 'balance' | 'prepayment';
  description?: string;
  claimId?: string;
  payerId?: string;
  savePaymentMethod?: boolean;
  storedPaymentMethodId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    
    // Check if Stripe is configured
    if (!STRIPE_SECRET_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Payment processing not configured",
          message: "Stripe API key not configured. Please add STRIPE_SECRET_KEY to enable payments.",
          configurationRequired: true,
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

    const body: PaymentRequest = await req.json();
    const { studentId, amount, paymentType, description, claimId, payerId, savePaymentMethod, storedPaymentMethodId } = body;

    if (!studentId || !amount || !paymentType) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: studentId, amount, paymentType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authorization: check billing access or student access
    const { data: hasBilling } = await supabase.rpc('has_billing_access', { check_user_id: user.id });
    if (!hasBilling) {
      const { data: hasStudentAccess } = await supabase.rpc('has_student_access', { _student_id: studentId, _user_id: user.id });
      if (!hasStudentAccess) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized: billing or student access required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Get or create Stripe customer
    let stripeCustomerId: string | null = null;
    
    // Check for existing stored payment method
    if (storedPaymentMethodId) {
      const { data: storedMethod } = await supabase
        .from('stored_payment_methods')
        .select('stripe_customer_id, stripe_payment_method_id')
        .eq('id', storedPaymentMethodId)
        .eq('student_id', studentId)
        .single();
      
      if (storedMethod) {
        stripeCustomerId = storedMethod.stripe_customer_id;
      }
    }

    // Create payment intent with Stripe
    const stripeResponse = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: Math.round(amount * 100).toString(), // Convert to cents
        currency: "usd",
        automatic_payment_methods: JSON.stringify({ enabled: true }),
        ...(stripeCustomerId && { customer: stripeCustomerId }),
        ...(description && { description }),
        "metadata[student_id]": studentId,
        "metadata[payment_type]": paymentType,
        ...(claimId && { "metadata[claim_id]": claimId }),
      }),
    });

    if (!stripeResponse.ok) {
      const stripeError = await stripeResponse.json();
      console.error("Stripe error:", stripeError);
      return new Response(
        JSON.stringify({ success: false, error: "Payment initiation failed", details: stripeError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentIntent = await stripeResponse.json();

    // Record payment in database
    const { data: payment, error: insertError } = await supabase
      .from('billing_payments')
      .insert({
        student_id: studentId,
        payer_id: payerId || null,
        claim_id: claimId || null,
        amount,
        payment_type: paymentType,
        payment_method: 'card',
        stripe_payment_intent_id: paymentIntent.id,
        stripe_customer_id: stripeCustomerId,
        status: 'pending',
        description,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database error:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to record payment" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: payment.id,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Payment processing error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
