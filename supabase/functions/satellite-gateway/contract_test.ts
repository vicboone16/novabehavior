// Deno contract tests for satellite-gateway.
// Run: deno test --allow-net --allow-env supabase/functions/satellite-gateway/contract_test.ts
//
// These tests run against a deployed gateway and validate response shapes the
// Nova Parents client depends on. Set GATEWAY_URL (defaults to local edge runtime)
// and TEST_PARENT_JWT (a parent user's verified JWT) in CI secrets.

import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const GATEWAY_URL =
  Deno.env.get("GATEWAY_URL") ??
  "https://yboqqmkghwhlhhnsegje.supabase.co/functions/v1/satellite-gateway";
const TEST_PARENT_JWT = Deno.env.get("TEST_PARENT_JWT") ?? "";
const TEST_STUDENT_ID = Deno.env.get("TEST_STUDENT_ID") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

async function gw(body: unknown, jwt = TEST_PARENT_JWT) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  if (ANON_KEY) headers.apikey = ANON_KEY;
  const res = await fetch(GATEWAY_URL, { method: "POST", headers, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
}

// ── 1. Handshake (no auth) ─────────────────────────────────
Deno.test("handshake returns app_slug string", async () => {
  const r = await gw({ action: "check_handshake" }, "");
  assertEquals(r.status, 200);
  assertEquals(typeof r.body.app_slug, "string");
});

// ── 2. check_app_access shape ──────────────────────────────
Deno.test({
  name: "check_app_access returns hasAccess + role + enabled_features",
  ignore: !TEST_PARENT_JWT,
  fn: async () => {
    const r = await gw({ action: "check_app_access" });
    assertEquals(r.status, 200);
    assertEquals(typeof r.body.hasAccess, "boolean");
    assert(r.body.role === null || typeof r.body.role === "string");
    assert(Array.isArray(r.body.enabled_features), "enabled_features must be array");
  },
});

// ── 3. parent_insights shape ───────────────────────────────
Deno.test({
  name: "parent_insights returns expected columns",
  ignore: !TEST_PARENT_JWT || !TEST_STUDENT_ID,
  fn: async () => {
    const r = await gw({
      action: "query",
      table: "parent_insights",
      operation: "select",
      eq_filters: [{ col: "student_id", val: TEST_STUDENT_ID }],
      maybe_single: true,
    });
    assertEquals(r.status, 200);
    if (r.body.data) {
      const row = r.body.data;
      const expected = [
        "id", "student_id", "insight_date", "headline", "points_earned",
        "behavior_summary", "what_this_means", "what_you_can_do",
        "teacher_note", "created_at",
      ];
      for (const k of expected) assertExists(row[k] !== undefined ? true : null, `missing ${k}`);
      assert(Array.isArray(row.behavior_summary), "behavior_summary must be array");
      assert(Array.isArray(row.what_you_can_do), "what_you_can_do must be array");
    }
  },
});

// ── 4. range_filters work ──────────────────────────────────
Deno.test({
  name: "range_filters gte/lte work on parent_insights",
  ignore: !TEST_PARENT_JWT || !TEST_STUDENT_ID,
  fn: async () => {
    const r = await gw({
      action: "query",
      table: "parent_insights",
      operation: "select",
      eq_filters: [{ col: "student_id", val: TEST_STUDENT_ID }],
      range_filters: [{ col: "insight_date", op: "gte", val: "2000-01-01" }],
      order: [{ col: "insight_date", ascending: false }],
      limit: 7,
    });
    assertEquals(r.status, 200);
    assert(Array.isArray(r.body.data), "data must be array");
  },
});

// ── 5. weekly_snapshots view exposes both id columns ───────
Deno.test({
  name: "weekly_snapshots row has client_id or student_id",
  ignore: !TEST_PARENT_JWT,
  fn: async () => {
    const r = await gw({
      action: "query",
      table: "weekly_snapshots",
      operation: "select",
      limit: 1,
    });
    assertEquals(r.status, 200);
    assert(Array.isArray(r.body.data));
    if (r.body.data.length > 0) {
      const row = r.body.data[0];
      const expected = ["id", "coach_user_id", "title", "description", "status", "created_at"];
      for (const k of expected) assertExists(row[k] !== undefined ? true : null, `missing ${k}`);
      assert("client_id" in row || "student_id" in row, "needs client_id or student_id");
    }
  },
});

// ── 6. v_beacon_student_available_rewards shape ────────────
Deno.test({
  name: "beacon rewards view exposes title + point_cost + is_active",
  ignore: !TEST_PARENT_JWT || !TEST_STUDENT_ID,
  fn: async () => {
    const r = await gw({
      action: "query",
      table: "v_beacon_student_available_rewards",
      operation: "select",
      eq_filters: [
        { col: "student_id", val: TEST_STUDENT_ID },
        { col: "is_active", val: true },
      ],
    });
    assertEquals(r.status, 200);
    assert(Array.isArray(r.body.data));
    if (r.body.data.length > 0) {
      const row = r.body.data[0];
      for (const k of ["id", "title", "point_cost"]) {
        assertExists(row[k], `missing ${k}`);
      }
    }
  },
});

// ── 7. Disallowed table is rejected at gateway ─────────────
Deno.test({
  name: "user_roles UPDATE is rejected by allowlist",
  ignore: !TEST_PARENT_JWT,
  fn: async () => {
    const r = await gw({
      action: "query",
      table: "user_roles",
      operation: "update",
      data: { role: "super_admin" },
      eq_filters: [{ col: "user_id", val: "00000000-0000-0000-0000-000000000000" }],
    });
    assert(r.status === 403, "expected 403 from allowlist");
  },
});

// ── 8. Unknown RPC is rejected ─────────────────────────────
Deno.test({
  name: "unknown RPC is rejected",
  ignore: !TEST_PARENT_JWT,
  fn: async () => {
    const r = await gw({ action: "rpc", rpc_name: "drop_all_tables", rpc_params: {} });
    assert(r.status === 403);
  },
});
