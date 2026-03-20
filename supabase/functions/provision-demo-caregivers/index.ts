import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_AGENCY_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

const DEMO_PAIRS = [
  { email: "demo-maria@behaviordecoded.app", password: "DemoParent1!", parentName: "Maria Santos", learnerFirst: "Ethan", learnerLast: "Santos", dob: "2019-03-15" },
  { email: "demo-david@behaviordecoded.app", password: "DemoParent2!", parentName: "David Chen", learnerFirst: "Lily", learnerLast: "Chen", dob: "2020-07-22" },
  { email: "demo-aisha@behaviordecoded.app", password: "DemoParent3!", parentName: "Aisha Johnson", learnerFirst: "Marcus", learnerLast: "Johnson", dob: "2018-11-08" },
  { email: "demo-rachel@behaviordecoded.app", password: "DemoParent4!", parentName: "Rachel Kim", learnerFirst: "Sofia", learnerLast: "Kim", dob: "2021-01-30" },
  { email: "demo-james@behaviordecoded.app", password: "DemoParent5!", parentName: "James Okafor", learnerFirst: "Amara", learnerLast: "Okafor", dob: "2019-09-12" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const results: any[] = [];

  // Ensure demo agency exists
  await admin.from("agencies").upsert({
    id: DEMO_AGENCY_ID,
    name: "Demo Hybrid Agency",
    type: "multi_service",
  }, { onConflict: "id" });

  for (const pair of DEMO_PAIRS) {
    try {
      // 1) Create or get auth user
      let userId: string;
      const { data: existing } = await admin.from("profiles").select("user_id").eq("email", pair.email).maybeSingle();

      if (existing?.user_id) {
        userId = existing.user_id;
        results.push({ email: pair.email, status: "exists", userId });
      } else {
        const { data: authData, error: authErr } = await admin.auth.admin.createUser({
          email: pair.email,
          password: pair.password,
          email_confirm: true,
          user_metadata: { display_name: pair.parentName, full_name: pair.parentName },
        });
        if (authErr) {
          // User might exist in auth but not profiles
          const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 });
          const found = listData?.users?.find((u: any) => u.email === pair.email);
          if (found) {
            userId = found.id;
            // Ensure profile exists
            await admin.from("profiles").upsert({
              user_id: userId,
              email: pair.email,
              display_name: pair.parentName,
            }, { onConflict: "user_id" });
          } else {
            results.push({ email: pair.email, status: "error", detail: authErr.message });
            continue;
          }
        } else {
          userId = authData.user.id;
        }
        // Wait a moment for trigger to fire, then ensure profile has email
        await admin.from("profiles").upsert({
          user_id: userId,
          email: pair.email,
          display_name: pair.parentName,
        }, { onConflict: "user_id" });
        results.push({ email: pair.email, status: "created", userId });
      }

      // 2) Create student
      const studentName = `${pair.learnerFirst} ${pair.learnerLast}`;
      const { data: existingStudent } = await admin.from("students")
        .select("id").eq("user_id", userId).eq("name", studentName).maybeSingle();

      let studentId: string;
      if (existingStudent) {
        studentId = existingStudent.id;
      } else {
        const { data: newStudent, error: sErr } = await admin.from("students").insert({
          user_id: userId,
          name: studentName,
          first_name: pair.learnerFirst,
          last_name: pair.learnerLast,
          display_name: pair.learnerFirst,
          date_of_birth: pair.dob,
          agency_id: DEMO_AGENCY_ID,
          is_archived: false,
        }).select("id").single();
        if (sErr) { results.push({ email: pair.email, student: "error", detail: sErr.message }); continue; }
        studentId = newStudent.id;
      }

      // 3) user_app_access
      await admin.from("user_app_access").upsert({
        user_id: userId,
        app_slug: "behavior_decoded",
        agency_id: DEMO_AGENCY_ID,
        role: "caregiver",
        is_active: true,
        email: pair.email,
      }, { onConflict: "user_id,app_slug,agency_id" });

      // 4) student_app_visibility
      await admin.from("student_app_visibility").upsert({
        student_id: studentId,
        app_slug: "behavior_decoded",
        is_active: true,
      }, { onConflict: "student_id,app_slug" });

      // 5) user_student_access
      await admin.from("user_student_access").upsert({
        user_id: userId,
        student_id: studentId,
        permission_level: "full",
        can_view_notes: true,
        can_view_documents: true,
        can_collect_data: true,
        can_edit_profile: false,
        can_generate_reports: false,
        app_scope: "behavior_decoded",
      }, { onConflict: "user_id,student_id,app_scope" });

    } catch (err) {
      results.push({ email: pair.email, status: "exception", detail: String(err) });
    }
  }

  return new Response(JSON.stringify({ success: true, results }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
