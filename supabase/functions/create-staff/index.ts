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
    const {
      email,
      password,
      pin,
      first_name,
      last_name,
      phone,
      credential,
      npi,
      supervisor_id,
      title,
      role,
    } = await req.json();

    // Validate required fields
    if (!email || !password || !first_name || !last_name) {
      return new Response(
        JSON.stringify({ error: "Email, password, first name, and last name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate PIN format if provided
    if (pin && !/^\d{6}$/.test(pin)) {
      return new Response(
        JSON.stringify({ error: "PIN must be exactly 6 digits" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is admin
    const { data: isAdmin } = await supabaseAdmin.rpc("is_admin", { _user_id: callerUser.id });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate display name in standard format
    const displayName = `${first_name.trim()} ${last_name.trim().charAt(0)}.`;

    // Create the user with Supabase Admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true, // Auto-confirm since admin is creating
      user_metadata: {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        display_name: displayName,
      },
    });

    if (createError) {
      console.error("User creation error:", createError);
      return new Response(
        JSON.stringify({ error: createError.message || "Failed to create user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = newUser.user.id;

    // Hash PIN if provided
    let pinHash: string | null = null;
    if (pin) {
      // Check PIN uniqueness
      const { data: existingPin } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .not("pin_hash", "is", null);

      // Hash the PIN
      const pinHashBuf = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(pin)
      );
      pinHash = Array.from(new Uint8Array(pinHashBuf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Check if PIN hash already exists
      const { data: duplicatePin } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("pin_hash", pinHash);

      if (duplicatePin && duplicatePin.length > 0) {
        // Delete the user we just created since PIN is duplicate
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return new Response(
          JSON.stringify({ error: "PIN is already in use by another user" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Update the profile with additional info
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        display_name: displayName,
        phone: phone || null,
        credential: credential || null,
        npi: npi || null,
        supervisor_id: supervisor_id || null,
        title: title || "Clinician",
        is_approved: true,
        approved_at: new Date().toISOString(),
        approved_by: callerUser.id,
        pin_hash: pinHash,
      })
      .eq("user_id", userId);

    if (profileError) {
      console.error("Profile update error:", profileError);
      // Don't fail the whole operation, profile might be created by trigger
    }

    // Assign role if provided
    if (role) {
      await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: userId,
          role: role,
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        email: email.toLowerCase().trim(),
        display_name: displayName,
        message: "Staff member created successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Create staff error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
