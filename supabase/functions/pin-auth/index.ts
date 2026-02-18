import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to get client IP from request headers
function getClientIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
         req.headers.get("x-real-ip") ||
         req.headers.get("cf-connecting-ip") ||
         "unknown";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, pin } = await req.json();
    const clientIP = getClientIP(req);

    if (!pin) {
      return new Response(
        JSON.stringify({ error: "PIN is required" }),
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

    const normalizedEmail = typeof email === "string" ? email.toLowerCase().trim() : "";

    // Check rate limiting before proceeding
    const { data: isAllowed, error: rateLimitError } = await supabaseAdmin.rpc(
      "check_pin_rate_limit",
      { _email: normalizedEmail || "unknown", _ip_address: clientIP }
    );

    // Fail closed: if the rate limit check errors OR returns anything other than true,
    // deny the request. This prevents brute force during system degradation.
    if (rateLimitError || isAllowed !== true) {
      if (rateLimitError) {
        console.error("Rate limit check error (failing closed):", rateLimitError);
      }
      return new Response(
        JSON.stringify({ 
          error: isAllowed === false
            ? "Too many failed attempts. Please try again later."
            : "Authentication temporarily unavailable. Please try again.",
          rateLimited: true 
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // PIN hash for PIN-only lookup
    const pinHashBuf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(pin),
    );
    const pinHash = Array.from(new Uint8Array(pinHashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Find user by email (optional) OR by PIN hash
    let profile: { user_id: string; pin_hash: string | null; is_approved: boolean | null; email: string | null } | null = null;
    let profileError: any = null;

    if (normalizedEmail) {
      const res = await supabaseAdmin
        .from("profiles")
        .select("user_id, pin_hash, is_approved, email")
        .eq("email", normalizedEmail)
        .single();
      profile = res.data as any;
      profileError = res.error;
    } else {
      const res = await supabaseAdmin
        .from("profiles")
        .select("user_id, pin_hash, is_approved, email")
        .eq("pin_hash", pinHash)
        .limit(2);

      profileError = res.error;
      if (!profileError) {
        if (!res.data || res.data.length === 0) {
          profile = null;
        } else if (res.data.length > 1) {
          // Record failed attempt for non-unique PIN
          await supabaseAdmin.rpc("record_pin_attempt", {
            _user_id: null,
            _email: normalizedEmail || "unknown",
            _ip_address: clientIP,
            _success: false
          });
          return new Response(
            JSON.stringify({ error: "PIN is not unique. Please use email + password login." }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        } else {
          profile = res.data[0] as any;
        }
      }
    }

    if (profileError || !profile) {
      // Record failed attempt
      await supabaseAdmin.rpc("record_pin_attempt", {
        _user_id: null,
        _email: normalizedEmail || "unknown",
        _ip_address: clientIP,
        _success: false
      });
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile.pin_hash) {
      // Record failed attempt
      await supabaseAdmin.rpc("record_pin_attempt", {
        _user_id: profile.user_id,
        _email: profile.email || normalizedEmail || "unknown",
        _ip_address: clientIP,
        _success: false
      });
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
      // Record failed attempt
      await supabaseAdmin.rpc("record_pin_attempt", {
        _user_id: profile.user_id,
        _email: profile.email || normalizedEmail || "unknown",
        _ip_address: clientIP,
        _success: false
      });
      return new Response(
        JSON.stringify({ error: "Invalid PIN" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record successful attempt
    await supabaseAdmin.rpc("record_pin_attempt", {
      _user_id: profile.user_id,
      _email: profile.email || normalizedEmail || "unknown",
      _ip_address: clientIP,
      _success: true
    });

    // PIN is valid - get the user from auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
    
    if (userError || !userData.user) {
      console.error("User lookup error:", userError);
      return new Response(
        JSON.stringify({ error: "User lookup failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailForAuth = (profile.email || normalizedEmail).toLowerCase();

    // Generate a new session for this user using the admin API
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: emailForAuth,
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
    const token = sessionData.properties?.hashed_token;

    if (!token) {
      const redirectUrl = new URL(sessionData.properties?.action_link || "");
      const verificationToken = redirectUrl.searchParams.get("token");
      const type = redirectUrl.searchParams.get("type");

      if (verificationToken && type) {
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
