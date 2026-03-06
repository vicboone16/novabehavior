import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const { email, app_slug } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // 1. Resolve email → user_id via profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("user_id, display_name, first_name, last_name, email")
      .eq("email", email)
      .maybeSingle();

    if (profileError) {
      console.error("Profile lookup error:", profileError);
      return new Response(
        JSON.stringify({ error: "Profile lookup failed", details: profileError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!profile) {
      // Try auth.users as fallback for users whose profile email may differ
      const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
      const authUser = (authData?.users || []).find(
        (u: any) => u.email?.toLowerCase() === email.toLowerCase()
      );

      if (!authUser) {
        return new Response(
          JSON.stringify({ error: "No user found for this email", email }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Profile row missing — return minimal access so login succeeds
      return new Response(
        JSON.stringify({
          user_id: authUser.id,
          email: authUser.email,
          display_name: authUser.user_metadata?.display_name || null,
          first_name: authUser.user_metadata?.first_name || null,
          last_name: authUser.user_metadata?.last_name || null,
          roles: [],
          is_super_admin: false,
          is_admin: false,
          agencies: [],
          current_agency_id: null,
          visible_student_ids: [],
          students: [],
          training_assignments: [],
          app_slug: app_slug || "behavior_decoded",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = profile.user_id;

    // 2. Check user roles (super_admin / admin get global access)
    const { data: roleRows } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = (roleRows || []).map((r: any) => r.role);
    const isSuperAdmin = roles.includes("super_admin");
    const isAdmin = roles.includes("admin");

    // 3. Fetch agencies from user_agency_access
    const { data: agencyAccess, error: agencyError } = await supabaseAdmin
      .from("user_agency_access")
      .select("agency_id, role")
      .eq("user_id", userId);

    if (agencyError) {
      console.error("Agency access lookup error:", agencyError);
    }

    // Deduplicate agency IDs and fetch agency details
    const uniqueAgencyIds = [...new Set((agencyAccess || []).map((a: any) => a.agency_id))];
    let agencyDetails: any[] = [];
    if (uniqueAgencyIds.length > 0) {
      const { data: agencyRows } = await supabaseAdmin
        .from("agencies")
        .select("id, name, slug, status, logo_url, coverage_mode, primary_entity_label")
        .in("id", uniqueAgencyIds);
      agencyDetails = agencyRows || [];
    }

    const agencyMap = Object.fromEntries(agencyDetails.map((a: any) => [a.id, a]));
    const seenAgencyIds = new Set<string>();
    const agencies = (agencyAccess || [])
      .filter((a: any) => {
        if (seenAgencyIds.has(a.agency_id)) return false;
        seenAgencyIds.add(a.agency_id);
        return true;
      })
      .map((a: any) => ({
        agency_id: a.agency_id,
        role: a.role,
        agency: agencyMap[a.agency_id] || null,
      }));

    // 4. Fetch visible student IDs
    const slugAliases: Record<string, string> = {
      behaviordecoded: "behavior_decoded",
      behavior_decoded: "behavior_decoded",
      studentconnect: "student_connect",
      student_connect: "student_connect",
      teacherhub: "teacher_hub",
      teacher_hub: "teacher_hub",
      novatrack: "novatrack",
    };
    const inputSlug = (app_slug || "behavior_decoded").toLowerCase().replace(/[\s-]/g, "");
    const resolvedSlug = slugAliases[inputSlug] || inputSlug;

    let visibleStudentIds: string[] = [];

    if (isSuperAdmin || isAdmin) {
      const { data: visRows } = await supabaseAdmin
        .from("student_app_visibility")
        .select("student_id")
        .eq("app_slug", resolvedSlug)
        .eq("is_active", true);

      visibleStudentIds = (visRows || []).map((r: any) => r.student_id);
    } else {
      // Fetch app visibility, user_student_access, AND owned students in parallel
      const [visRes, accessRes, ownedRes] = await Promise.all([
        supabaseAdmin
          .from("student_app_visibility")
          .select("student_id")
          .eq("app_slug", resolvedSlug)
          .eq("is_active", true),
        supabaseAdmin
          .from("user_student_access")
          .select("student_id")
          .eq("user_id", userId)
          .eq("app_scope", resolvedSlug),
        // Independent mode: users who directly own students (no agency required)
        supabaseAdmin
          .from("students")
          .select("id")
          .eq("user_id", userId)
          .eq("is_archived", false),
      ]);

      const visSet = new Set((visRes.data || []).map((r: any) => r.student_id));
      const accessIds = (accessRes.data || []).map((r: any) => r.student_id);
      const ownedIds = (ownedRes.data || []).map((r: any) => r.id);

      // Combine explicit access + owned students, filtered by app visibility
      const allAccessIds = new Set([...accessIds, ...ownedIds]);
      visibleStudentIds = Array.from(allAccessIds).filter((id: string) => visSet.has(id));

      // Fallback: if user has agency memberships but no explicit assignments, show all visible
      if (visibleStudentIds.length === 0 && agencies.length > 0) {
        visibleStudentIds = Array.from(visSet);
      }

      // Fallback for independent users who own students not yet in visibility table
      if (visibleStudentIds.length === 0 && ownedIds.length > 0) {
        visibleStudentIds = ownedIds;
      }
    }

    // 5. Fetch student details for visible students
    let students: any[] = [];
    if (visibleStudentIds.length > 0) {
      const { data: studentRows } = await supabaseAdmin
        .from("students")
        .select("id, name, display_name, date_of_birth, is_archived")
        .in("id", visibleStudentIds)
        .eq("is_archived", false);

      students = studentRows || [];
    }

    // 6. Get active agency context
    const { data: agencyContext } = await supabaseAdmin
      .from("user_agency_context")
      .select("current_agency_id")
      .eq("user_id", userId)
      .maybeSingle();

    // 7. Fetch parent training assignments (for Behavior Decoded integration)
    let trainingAssignments: any[] = [];
    try {
      const { data: assignmentRows } = await supabaseAdmin
        .from("academy_module_assignments")
        .select(`
          assignment_id,
          module_id,
          status,
          due_date,
          academy_modules (
            title,
            short_description,
            audience,
            est_minutes,
            skill_tags
          )
        `)
        .eq("coach_user_id", userId)
        .in("status", ["assigned", "in_progress"]);

      trainingAssignments = (assignmentRows || []).map((a: any) => ({
        assignment_id: a.assignment_id,
        module_id: a.module_id,
        status: a.status,
        due_date: a.due_date,
        module: a.academy_modules || null,
      }));
    } catch (e) {
      console.error("Training assignments lookup (non-fatal):", e);
    }

    return new Response(
      JSON.stringify({
        user_id: userId,
        email: profile.email,
        display_name: profile.display_name,
        first_name: profile.first_name,
        last_name: profile.last_name,
        roles,
        is_super_admin: isSuperAdmin,
        is_admin: isAdmin,
        agencies,
        current_agency_id: agencyContext?.current_agency_id || agencies[0]?.agency_id || null,
        visible_student_ids: visibleStudentIds,
        students,
        training_assignments: trainingAssignments,
        app_slug: resolvedSlug,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("check-user-access error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
