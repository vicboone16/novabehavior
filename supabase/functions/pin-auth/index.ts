import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, pin } = await req.json();

    if (!email || !pin) {
      return new Response(
        JSON.stringify({ error: "Email and PIN are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate PIN format
    if (!/^\d{6}$/.test(pin)) {
      return new Response(
        JSON.stringify({ error: "Invalid PIN format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Find user by email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("user_id, pin_hash, is_approved")
      .eq("email", email.toLowerCase())
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile.pin_hash) {
      return new Response(
        JSON.stringify({ error: "PIN not set for this user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is approved
    if (!profile.is_approved) {
      return new Response(
        JSON.stringify({ error: "Account pending approval", pending: true }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify PIN using the database function
    const { data: isValid, error: verifyError } = await supabaseAdmin
      .rpc("verify_pin", { _user_id: profile.user_id, _pin: pin });

    if (verifyError || !isValid) {
      return new Response(
        JSON.stringify({ error: "Invalid PIN" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PIN is valid - get the user from auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
    
    if (userError || !userData.user) {
      console.error("User lookup error:", userError);
      return new Response(
        JSON.stringify({ error: "User lookup failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a new session for this user using the admin API
    // We need to generate tokens for the user - use a custom token generation
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: email.toLowerCase(),
      options: {
        redirectTo: Deno.env.get("SUPABASE_URL"),
      }
    });

    if (sessionError) {
      console.error("Session generation error:", sessionError);
      return new Response(
        JSON.stringify({ error: "Session generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract the token from the generated link
    // The properties.hashed_token can be used directly with verifyOtp
    const token = sessionData.properties?.hashed_token;
    const tokenType = sessionData.properties?.email_otp;

    if (!token) {
      // Alternative approach: Sign in the user using admin privilege
      // Create a temporary password-like token based on the verified PIN
      // Since PIN was verified, we trust this session
      
      // Use a workaround: generate a short-lived access token by creating a magic link
      // and immediately verifying it
      const redirectUrl = new URL(sessionData.properties?.action_link || "");
      const verificationToken = redirectUrl.searchParams.get("token");
      const type = redirectUrl.searchParams.get("type");

      if (verificationToken && type) {
        // Verify the OTP to get a session
        const anonClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!
        );

        const { data: verifyData, error: verifyOtpError } = await anonClient.auth.verifyOtp({
          token_hash: verificationToken,
          type: type as any,
        });

        if (verifyOtpError || !verifyData.session) {
          console.error("OTP verification error:", verifyOtpError);
          return new Response(
            JSON.stringify({ error: "Authentication failed" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            access_token: verifyData.session.access_token,
            refresh_token: verifyData.session.refresh_token,
            expires_in: verifyData.session.expires_in,
            token_type: "bearer",
            user: verifyData.user,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Token generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use verifyOtp with the hashed token
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: otpData, error: otpError } = await anonClient.auth.verifyOtp({
      token_hash: token,
      type: "magiclink",
    });

    if (otpError || !otpData.session) {
      console.error("OTP verification error:", otpError);
      return new Response(
        JSON.stringify({ error: "Authentication failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        access_token: otpData.session.access_token,
        refresh_token: otpData.session.refresh_token,
        expires_in: otpData.session.expires_in,
        token_type: "bearer",
        user: otpData.user,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("PIN auth error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
