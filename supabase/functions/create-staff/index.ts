import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface StudentPermission {
  student_id: string;
  can_view_notes: boolean;
  can_view_documents: boolean;
  can_collect_data: boolean;
  can_edit_profile: boolean;
  can_generate_reports: boolean;
  permission_level: string;
}

interface AppAccessEntry {
  agency_id: string;
  app_slug: string;
  role: string;
  student_permissions?: StudentPermission[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
      agency_id,
      student_permissions,
      app_access,
    }: {
      email: string;
      password: string;
      pin?: string;
      first_name: string;
      last_name: string;
      phone?: string;
      credential?: string;
      npi?: string;
      supervisor_id?: string;
      title?: string;
      role?: string;
      agency_id?: string;
      student_permissions?: StudentPermission[];
      app_access?: AppAccessEntry[];
    } = await req.json();

    if (!email || !password || !first_name || !last_name) {
      return new Response(
        JSON.stringify({ error: "Email, password, first name, and last name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (pin && !/^\d{6}$/.test(pin)) {
      return new Response(
        JSON.stringify({ error: "PIN must be exactly 6 digits" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify caller is an admin
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

    const { data: isAdmin } = await supabaseAdmin.rpc("is_admin", { _user_id: callerUser.id });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const displayName = `${first_name.trim()} ${last_name.trim().charAt(0)}.`;

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        display_name: displayName,
      },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message || "Failed to create user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = newUser.user.id;

    // Hash PIN if provided
    let pinHash: string | null = null;
    if (pin) {
      const pinHashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin));
      pinHash = Array.from(new Uint8Array(pinHashBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");

      const { data: duplicatePin } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("pin_hash", pinHash);

      if (duplicatePin && duplicatePin.length > 0) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return new Response(
          JSON.stringify({ error: "PIN is already in use by another user" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Update profile (include email for cross-app lookups)
    await supabaseAdmin
      .from("profiles")
      .update({
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        display_name: displayName,
        email: normalizedEmail,
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

    // Assign role
    if (role) {
      await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
    }

    // Assign to agency (membership)
    if (agency_id) {
      const { error: membershipError } = await supabaseAdmin
        .from("agency_memberships")
        .insert({
          user_id: userId,
          agency_id,
          role: role === "admin" ? "admin" : "staff",
          status: "active",
          is_primary: true,
          joined_at: new Date().toISOString(),
          invited_by: callerUser.id,
        });

      if (membershipError) {
        console.error("Agency membership error:", membershipError);
      }

      // Upsert user_agency_access with email for cross-app lookups
      await supabaseAdmin
        .from("user_agency_access")
        .upsert({
          user_id: userId,
          agency_id,
          role: role === "admin" ? "admin" : "staff",
          email: normalizedEmail,
          created_at: new Date().toISOString(),
        }, { onConflict: "user_id,agency_id" });

      // Set user agency context
      await supabaseAdmin
        .from("user_agency_context")
        .upsert({ user_id: userId, current_agency_id: agency_id, last_switched_at: new Date().toISOString() }, { onConflict: "user_id" });
    }

    // Insert per-student access permissions
    if (student_permissions && student_permissions.length > 0) {
      const accessRecords = student_permissions.map((sp) => ({
        user_id: userId,
        student_id: sp.student_id,
        permission_level: sp.permission_level || "view",
        can_view_notes: sp.can_view_notes ?? false,
        can_view_documents: sp.can_view_documents ?? false,
        can_collect_data: sp.can_collect_data ?? false,
        can_edit_profile: sp.can_edit_profile ?? false,
        can_generate_reports: sp.can_generate_reports ?? false,
        granted_by: callerUser.id,
      }));

      const { error: accessError } = await supabaseAdmin
        .from("user_student_access")
        .upsert(accessRecords, { onConflict: "user_id,student_id" });

      if (accessError) {
        console.error("Student access error:", accessError);
      }
    }

    // Insert per-app access records
    if (app_access && app_access.length > 0) {
      const appAccessRecords = app_access.map((aa) => ({
        user_id: userId,
        app_slug: aa.app_slug,
        agency_id: aa.agency_id,
        role: aa.role || "staff",
        is_active: true,
        email: email.toLowerCase().trim(),
        granted_by: callerUser.id,
        granted_at: new Date().toISOString(),
      }));

      const { error: appAccessError } = await supabaseAdmin
        .from("user_app_access")
        .upsert(appAccessRecords, { onConflict: "user_id,app_slug,agency_id" });

      if (appAccessError) {
        console.error("App access error:", appAccessError);
      }

      // Insert per-app student permissions
      for (const aa of app_access) {
        if (aa.student_permissions && aa.student_permissions.length > 0) {
          const perAppStudentRecords = aa.student_permissions.map((sp) => ({
            user_id: userId,
            student_id: sp.student_id,
            app_scope: aa.app_slug,
            permission_level: sp.permission_level || "view",
            can_view_notes: sp.can_view_notes ?? false,
            can_view_documents: sp.can_view_documents ?? false,
            can_collect_data: sp.can_collect_data ?? false,
            can_edit_profile: sp.can_edit_profile ?? false,
            can_generate_reports: sp.can_generate_reports ?? false,
            granted_by: callerUser.id,
            granted_at: new Date().toISOString(),
          }));

          const { error: perAppError } = await supabaseAdmin
            .from("user_student_access")
            .upsert(perAppStudentRecords, { onConflict: "user_id,student_id,app_scope" });

          if (perAppError) {
            console.error(`Per-app student access error (${aa.app_slug}):`, perAppError);
          }
        }
      }
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
