import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Service-role admin client ───────────────────────────
function buildAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

// ─── Resolve email → user_id (profiles → ilike → auth.users) ─
async function resolveUserId(
  admin: ReturnType<typeof buildAdmin>,
  email: string
): Promise<{ userId: string; profile: any } | null> {
  const normalized = email.toLowerCase().trim();

  // Exact match
  const { data: exact } = await admin
    .from("profiles")
    .select("user_id, display_name, first_name, last_name, email")
    .eq("email", normalized)
    .maybeSingle();
  if (exact?.user_id) return { userId: exact.user_id, profile: exact };

  // Case-insensitive
  const { data: iMatch } = await admin
    .from("profiles")
    .select("user_id, display_name, first_name, last_name, email")
    .ilike("email", normalized)
    .maybeSingle();
  if (iMatch?.user_id) return { userId: iMatch.user_id, profile: iMatch };

  // auth.users paginated fallback
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data: authData, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !authData?.users?.length) break;
    const match = authData.users.find(
      (u: any) => (u.email ?? "").toLowerCase().trim() === normalized
    );
    if (match) {
      return {
        userId: match.id,
        profile: {
          user_id: match.id,
          email: match.email,
          display_name: match.user_metadata?.display_name || null,
          first_name: match.user_metadata?.first_name || null,
          last_name: match.user_metadata?.last_name || null,
        },
      };
    }
    if (authData.users.length < perPage) break;
    page++;
  }

  return null;
}

// ─── Admin role check ────────────────────────────────────
async function isAdminUser(admin: ReturnType<typeof buildAdmin>, userId: string): Promise<boolean> {
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["super_admin", "admin", "agency_admin", "supervisor"]);
  return !!data && data.length > 0;
}

// ─── Slug resolution ─────────────────────────────────────
const slugAliases: Record<string, string> = {
  behaviordecoded: "behavior_decoded",
  behavior_decoded: "behavior_decoded",
  studentconnect: "student_connect",
  student_connect: "student_connect",
  teacherhub: "teacher_hub",
  teacher_hub: "teacher_hub",
  novatrack: "novatrack",
};

function resolveSlug(slug: string): string {
  const input = (slug || "behavior_decoded").toLowerCase().replace(/[\s-]/g, "");
  return slugAliases[input] || input;
}

// ─── Table access control ────────────────────────────────
interface TableConfig {
  userCol?: string;
  adminOps?: string[];
  readAll?: boolean;
  readOnly?: boolean;
}

const TABLE_CONFIG: Record<string, TableConfig> = {
  profiles:                   { userCol: "user_id" },
  user_roles:                 { userCol: "user_id", readOnly: true },
  user_streaks:               { userCol: "user_id" },
  notification_preferences:   { userCol: "user_id" },
  academy_modules:            { readAll: true, adminOps: ["insert", "update", "delete"] },
  academy_module_versions:    { readAll: true, adminOps: ["insert", "update", "delete"] },
  academy_paths:              { readAll: true, adminOps: ["insert", "update", "delete"] },
  academy_path_modules:       { readAll: true, adminOps: ["insert", "update", "delete"] },
  academy_module_assignments: { userCol: "coach_user_id", adminOps: ["insert"] },
  academy_module_rules:       { readAll: true, adminOps: ["insert", "update", "delete"] },
  academy_module_progress:    { userCol: "coach_user_id" },
  behavior_lab_games:         { readAll: true, adminOps: ["insert", "update", "delete"] },
  behavior_lab_attempts:      { userCol: "user_id" },
  evidence_packets:           { userCol: "user_id", adminOps: ["update"] },
  coach_evidence_packets:     { userCol: "coach_user_id", adminOps: ["update"] },
  weekly_snapshots:           { userCol: "coach_user_id", readOnly: true },
  invite_codes:               { adminOps: ["select", "insert", "update", "delete"] },
  agency_invite_codes:        { adminOps: ["select", "insert", "update", "delete"] },
  user_agency_access:         { userCol: "user_id" },
  user_student_access:        { userCol: "user_id", readOnly: true },
  students:                   { readAll: true, readOnly: true },
  user_app_access:            { userCol: "user_id", readOnly: true },
  student_app_visibility:     { readAll: true, readOnly: true },
  // ── Nova Parents surfaces ──
  parent_insights:                       { readAll: true, adminOps: ["insert", "update", "upsert", "delete"] },
  abc_logs:                              { userCol: "user_id" },
  coach_engagement_events:               { userCol: "user_id" },
  v_beacon_student_available_rewards:    { readAll: true, readOnly: true },
  v_beacon_student_reward_summary:       { readAll: true, readOnly: true },
  behavior_translations:                 { readAll: true, readOnly: true },
  agency_feature_flags:                  { readAll: true, readOnly: true },
};

// ─── Allowed RPCs ────────────────────────────────────────
const ALLOWED_RPCS = new Set([
  "redeem_invite_code",
  "redeem_agency_invite_code",
  "has_role",
  "has_app_access",
  "recover_streak",
]);

// RPCs whose user-id parameter must be overridden with the verified JWT subject
const RPC_USER_ID_OVERRIDE: Record<string, string> = {
  recover_streak: "p_user_id",
};

// ─── Main handler ────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action } = body;
    const admin = buildAdmin();

    // ── Handshake (no auth) ──
    if (action === "check_handshake") {
      const { data, error } = await admin
        .from("app_handshake")
        .select("app_slug")
        .eq("id", 3)
        .single();
      if (error) return json({ error: "handshake_failed", detail: error.message }, 500);
      return json({ app_slug: data?.app_slug ?? null });
    }

    // ── Authenticate caller via JWT ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "not_authenticated" }, 401);
    }

    // Try local (Nova Core) auth first, then known satellite projects
    let authUser: { email?: string | null } | null = null;

    // 1) Local verification
    const localSupa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: localData, error: localErr } = await localSupa.auth.getUser();
    if (!localErr && localData?.user?.email) {
      authUser = localData.user;
    }

    // 2) Satellite project fallback (Behavior Decoded, etc.)
    if (!authUser) {
      const satellites = [
        { url: Deno.env.get("SATELLITE_BD_URL"), key: Deno.env.get("SATELLITE_BD_ANON_KEY") },
      ].filter(s => s.url && s.key);

      for (const sat of satellites) {
        try {
          const satClient = createClient(sat.url!, sat.key!, {
            global: { headers: { Authorization: authHeader } },
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data: satData, error: satErr } = await satClient.auth.getUser();
          if (!satErr && satData?.user?.email) {
            authUser = satData.user;
            break;
          }
        } catch (_) { /* try next */ }
      }
    }

    if (!authUser?.email) {
      return json({ error: "not_authenticated", detail: "JWT not recognized by any known project" }, 401);
    }

    const email = authUser.email.toLowerCase().trim();

    // ── Resolve Nova Core user_id ──
    const resolved = await resolveUserId(admin, email);
    if (!resolved) {
      if (action === "check_user_access") {
        return json({ error: "user_not_provisioned", detail: "No profile found for this email" });
      }
      return json({ error: "user_not_provisioned", detail: "No profile found for this email" }, 403);
    }

    const { userId, profile } = resolved;

    switch (action) {
      // ── Full user access check ──
      case "check_user_access": {
        const appSlug = resolveSlug(body.app_slug || "behavior_decoded");

        // Roles
        const { data: roleRows } = await admin
          .from("user_roles").select("role").eq("user_id", userId);
        const roles = (roleRows || []).map((r: any) => r.role);
        const isSuperAdmin = roles.includes("super_admin");
        const adminUser = await isAdminUser(admin, userId);

        // App access
        const { data: accessRows } = await admin
          .from("user_app_access")
          .select("role, agency_id, is_active")
          .eq("user_id", userId)
          .eq("app_slug", appSlug)
          .eq("is_active", true);
        const hasAccess = !!(accessRows?.length) || adminUser;
        const appRole = accessRows?.[0]?.role ?? (adminUser ? roles[0] : null);

        // Agencies
        const { data: agencyAccess } = await admin
          .from("user_agency_access").select("agency_id, role").eq("user_id", userId);
        const agencies = agencyAccess || [];

        // Visible students
        let visibleStudentIds: string[] = [];
        if (isSuperAdmin || adminUser) {
          const { data: visRows } = await admin
            .from("student_app_visibility").select("student_id")
            .eq("app_slug", appSlug).eq("is_active", true);
          visibleStudentIds = (visRows || []).map((r: any) => r.student_id);
        } else {
          const [visRes, accessRes, ownedRes] = await Promise.all([
            admin.from("student_app_visibility").select("student_id")
              .eq("app_slug", appSlug).eq("is_active", true),
            admin.from("user_student_access").select("student_id")
              .eq("user_id", userId).eq("app_scope", appSlug),
            admin.from("students").select("id")
              .eq("user_id", userId).eq("is_archived", false),
          ]);
          const visSet = new Set((visRes.data || []).map((r: any) => r.student_id));
          const accessIds = (accessRes.data || []).map((r: any) => r.student_id);
          const ownedIds = (ownedRes.data || []).map((r: any) => r.id);
          const allIds = new Set([...accessIds, ...ownedIds]);
          visibleStudentIds = Array.from(allIds).filter((id: string) => visSet.has(id));
          if (visibleStudentIds.length === 0 && agencies.length > 0) {
            visibleStudentIds = Array.from(visSet);
          }
          if (visibleStudentIds.length === 0 && ownedIds.length > 0) {
            visibleStudentIds = ownedIds;
          }
        }

        // Student details
        let students: any[] = [];
        if (visibleStudentIds.length > 0) {
          const { data: sRows } = await admin
            .from("students")
            .select("id, name, display_name, first_name, last_name, date_of_birth, is_archived")
            .in("id", visibleStudentIds)
            .eq("is_archived", false);
          students = sRows || [];
        }

        // Agency context
        const { data: ctx } = await admin
          .from("user_agency_context").select("current_agency_id")
          .eq("user_id", userId).maybeSingle();

        // Training assignments
        let trainingAssignments: any[] = [];
        try {
          const { data: aRows } = await admin
            .from("academy_module_assignments")
            .select("assignment_id, module_id, status, due_date, academy_modules(title, short_description, audience, est_minutes, skill_tags)")
            .eq("coach_user_id", userId)
            .in("status", ["assigned", "in_progress"]);
          trainingAssignments = (aRows || []).map((a: any) => ({
            assignment_id: a.assignment_id, module_id: a.module_id,
            status: a.status, due_date: a.due_date,
            module: a.academy_modules || null,
          }));
        } catch (_) { /* non-fatal */ }

        return json({
          user_id: userId,
          email: profile.email || email,
          display_name: profile.display_name,
          first_name: profile.first_name,
          last_name: profile.last_name,
          roles,
          is_super_admin: isSuperAdmin,
          is_admin: adminUser,
          has_access: hasAccess,
          app_role: appRole,
          agencies,
          current_agency_id: ctx?.current_agency_id || agencies[0]?.agency_id || null,
          visible_student_ids: visibleStudentIds,
          students,
          training_assignments: trainingAssignments,
          app_slug: appSlug,
        });
      }

      // ── Legacy alias ──
      case "check_app_access": {
        const { data: accessRows } = await admin
          .from("user_app_access").select("role, agency_id, is_active")
          .eq("user_id", userId).eq("app_slug", "behavior_decoded").eq("is_active", true);
        if (accessRows?.length) return json({ hasAccess: true, role: accessRows[0]?.role ?? null });
        const isAdm = await isAdminUser(admin, userId);
        if (isAdm) {
          const { data: rr } = await admin.from("user_roles").select("role").eq("user_id", userId).limit(1).maybeSingle();
          return json({ hasAccess: true, role: rr?.role ?? "admin" });
        }
        return json({ hasAccess: false, role: null });
      }

      // ── Legacy alias (extended with enabled_features) ──
      case "check_app_access": {
        const { data: accessRows } = await admin
          .from("user_app_access").select("role, agency_id, is_active")
          .eq("user_id", userId).eq("app_slug", "behavior_decoded").eq("is_active", true);

        let hasAccess = !!(accessRows?.length);
        let role: string | null = accessRows?.[0]?.role ?? null;

        if (!hasAccess) {
          const isAdm = await isAdminUser(admin, userId);
          if (isAdm) {
            const { data: rr } = await admin.from("user_roles")
              .select("role").eq("user_id", userId).limit(1).maybeSingle();
            hasAccess = true;
            role = rr?.role ?? "admin";
          }
        }

        // Resolve agency → feature flags → enabled_features array
        let enabledFeatures: string[] = [];
        try {
          const agencyId =
            accessRows?.[0]?.agency_id ??
            (await admin.from("user_agency_access")
              .select("agency_id").eq("user_id", userId).limit(1).maybeSingle()).data?.agency_id;

          if (agencyId) {
            const { data: flagRow } = await admin
              .from("agency_feature_flags")
              .select("parent_beacon_rewards_enabled, parent_behavior_logs_enabled, parent_progress_chart_enabled, parent_messaging_enabled")
              .eq("agency_id", agencyId)
              .maybeSingle();

            if (flagRow?.parent_beacon_rewards_enabled) enabledFeatures.push("beacon_rewards");
            if (flagRow?.parent_behavior_logs_enabled ?? true) enabledFeatures.push("behavior_logs");
            if (flagRow?.parent_progress_chart_enabled ?? true) enabledFeatures.push("progress_chart");
            if (flagRow?.parent_messaging_enabled) enabledFeatures.push("messaging");
          } else {
            // No agency yet: safe defaults — show non-rewards surfaces
            enabledFeatures = ["behavior_logs", "progress_chart"];
          }
        } catch (_) { /* non-fatal */ }

        return json({ hasAccess, role, enabled_features: enabledFeatures });
      }

      // ── Get my clients ──
      case "get_my_clients": {
        const appSlug = resolveSlug(body.app_slug || "behavior_decoded");
        const { data: accessRows } = await admin
          .from("user_student_access").select("student_id")
          .eq("user_id", userId).eq("app_scope", appSlug);
        if (!accessRows?.length) return json({ clients: [] });
        const ids = accessRows.map((r: any) => r.student_id).filter(Boolean);
        if (!ids.length) return json({ clients: [] });
        const { data: sRows } = await admin
          .from("students").select("id, first_name, last_name, name, display_name")
          .in("id", ids);
        return json({ clients: sRows ?? [] });
      }

      // ── Get my agencies ──
      case "get_my_agencies": {
        const { data: aRows } = await admin
          .from("user_agency_access").select("agency_id, role").eq("user_id", userId);
        return json({ agencies: aRows || [] });
      }

      // ── Generic CRUD ──
      case "query": {
        const params = body.params;
        if (!params?.table || !params?.operation) return json({ error: "missing table or operation" }, 400);

        const config = TABLE_CONFIG[params.table];
        if (!config) return json({ error: `table_not_allowed: ${params.table}` }, 403);
        if (config.readOnly && params.operation !== "select") {
          return json({ error: `table_read_only: ${params.table}` }, 403);
        }
        if (config.adminOps?.includes(params.operation)) {
          const isAdm = await isAdminUser(admin, userId);
          if (!isAdm) return json({ error: "admin_required" }, 403);
        }

        const selectCols = params.select_columns || "*";

        if (params.operation === "select") {
          let q = admin.from(params.table).select(selectCols);
          if (config.userCol && !config.readAll) {
            const isAdm = await isAdminUser(admin, userId);
            if (!isAdm) q = q.eq(config.userCol, userId);
          }
          if (params.eq_filters) for (const f of params.eq_filters) q = q.eq(f.col, f.val);
          if (params.in_filters) for (const f of params.in_filters) q = q.in(f.col, f.vals);
          if (params.order) for (const o of params.order) q = q.order(o.col, { ascending: o.ascending ?? true });
          if (params.limit) q = q.limit(params.limit);
          if (params.single) { const { data, error } = await q.single(); return error ? json({ error: error.message }, 400) : json({ data }); }
          if (params.maybe_single) { const { data, error } = await q.maybeSingle(); return error ? json({ error: error.message }, 400) : json({ data }); }
          const { data, error } = await q;
          return error ? json({ error: error.message }, 400) : json({ data });
        }

        if (params.operation === "insert") {
          let rowData = params.data;
          if (config.userCol && rowData && !Array.isArray(rowData) && !(config.userCol in rowData)) {
            rowData = { ...rowData, [config.userCol]: userId };
          }
          if (config.userCol && Array.isArray(rowData)) {
            rowData = rowData.map((r: any) => config.userCol! in r ? r : { ...r, [config.userCol!]: userId });
          }
          const q = admin.from(params.table).insert(rowData as any).select(selectCols);
          if (params.single || params.maybe_single) { const { data, error } = await q.single(); return error ? json({ error: error.message }, 400) : json({ data }); }
          const { data, error } = await q;
          return error ? json({ error: error.message }, 400) : json({ data });
        }

        if (params.operation === "update") {
          let q = admin.from(params.table).update(params.data as any);
          if (config.userCol) { const isAdm = await isAdminUser(admin, userId); if (!isAdm) q = q.eq(config.userCol, userId); }
          if (params.eq_filters) for (const f of params.eq_filters) q = q.eq(f.col, f.val);
          const { data, error } = await q.select(selectCols);
          return error ? json({ error: error.message }, 400) : json({ data });
        }

        if (params.operation === "upsert") {
          let rowData = params.data;
          if (config.userCol && rowData && !Array.isArray(rowData) && !(config.userCol in rowData)) {
            rowData = { ...rowData, [config.userCol]: userId };
          }
          const { data, error } = await admin.from(params.table)
            .upsert(rowData as any, { onConflict: params.on_conflict }).select(selectCols);
          return error ? json({ error: error.message }, 400) : json({ data: params.single ? data?.[0] : data });
        }

        if (params.operation === "delete") {
          let q = admin.from(params.table).delete();
          if (config.userCol) { const isAdm = await isAdminUser(admin, userId); if (!isAdm) q = q.eq(config.userCol, userId); }
          if (params.eq_filters) for (const f of params.eq_filters) q = q.eq(f.col, f.val);
          const { error } = await q;
          return error ? json({ error: error.message }, 400) : json({ success: true });
        }

        return json({ error: "unknown_operation" }, 400);
      }

      // ── RPC ──
      case "rpc": {
        const { rpc_name, rpc_params } = body;
        if (!rpc_name) return json({ error: "missing rpc_name" }, 400);
        if (!ALLOWED_RPCS.has(rpc_name)) return json({ error: `rpc_not_allowed: ${rpc_name}` }, 403);
        const { data, error } = await admin.rpc(rpc_name, rpc_params || {});
        return error ? json({ error: error.message }, 400) : json({ data });
      }

      default:
        return json({ error: "unknown_action" }, 400);
    }
  } catch (err) {
    console.error("[satellite-gateway]", err);
    return json({ error: "internal_error", detail: String(err) }, 500);
  }
});
