// Concurrency safety tests for billing RPCs.
//
// Verifies:
//   1. increment_authorization_units is atomic under concurrent calls
//      (no lost updates — final units_used == sum of all increments).
//   2. rpc_finalize_and_post_session is idempotent / safe under concurrent
//      invocation against the same session (no double-posting of time entries,
//      no double-deduction of authorization units).
//
// Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env. Skipped otherwise.
//
// Run: deno test --allow-net --allow-env supabase/functions/_db_concurrency_tests/concurrency_test.ts

import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? "https://yboqqmkghwhlhhnsegje.supabase.co";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SKIP = !SERVICE_ROLE;

const admin = SKIP
  ? (null as any)
  : createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

// ─── Helpers ───────────────────────────────────────────────
async function createTempAuthorization(): Promise<string> {
  const { data: student, error: sErr } = await admin
    .from("students")
    .insert({ name: `concurrency-test-${crypto.randomUUID().slice(0, 8)}` })
    .select("id")
    .single();
  if (sErr) throw sErr;

  const { data: auth, error: aErr } = await admin
    .from("authorizations")
    .insert({
      student_id: student.id,
      units_authorized: 100000,
      units_used: 0,
      status: "active",
      is_default: true,
      start_date: "2020-01-01",
      end_date: "2099-12-31",
    })
    .select("id")
    .single();
  if (aErr) throw aErr;
  return auth.id;
}

async function cleanupAuthorization(authId: string) {
  try {
    const { data } = await admin
      .from("authorizations")
      .select("student_id")
      .eq("id", authId)
      .single();
    await admin.from("authorizations").delete().eq("id", authId);
    if (data?.student_id) {
      await admin.from("students").delete().eq("id", data.student_id);
    }
  } catch { /* best effort */ }
}

// ─── Test 1: atomic increment ──────────────────────────────
Deno.test({
  name: "increment_authorization_units: concurrent calls sum atomically (no lost updates)",
  ignore: SKIP,
  fn: async () => {
    const authId = await createTempAuthorization();
    try {
      const N = 50;
      const PER_CALL = 3;
      const calls = Array.from({ length: N }, () =>
        admin.rpc("increment_authorization_units", {
          p_authorization_id: authId,
          p_units: PER_CALL,
        })
      );
      const results = await Promise.all(calls);
      results.forEach((r, i) => {
        assert(!r.error, `call ${i} errored: ${r.error?.message}`);
      });

      const { data, error } = await admin
        .from("authorizations")
        .select("units_used")
        .eq("id", authId)
        .single();
      assert(!error, error?.message);
      assertEquals(
        data!.units_used,
        N * PER_CALL,
        `Expected ${N * PER_CALL} units; got ${data!.units_used}. ` +
          `If lower, an UPDATE was lost (non-atomic).`,
      );
    } finally {
      await cleanupAuthorization(authId);
    }
  },
});

// ─── Test 2: increment with mixed positive/negative units ──
Deno.test({
  name: "increment_authorization_units: mixed deltas net correctly under contention",
  ignore: SKIP,
  fn: async () => {
    const authId = await createTempAuthorization();
    try {
      const deltas = [5, 10, -3, 7, 2, -4, 6, 1, 8, -5, 3, 12, -2, 4, 9];
      const expected = deltas.reduce((a, b) => a + b, 0);
      await Promise.all(
        deltas.map((d) =>
          admin.rpc("increment_authorization_units", {
            p_authorization_id: authId,
            p_units: d,
          })
        ),
      );
      const { data } = await admin
        .from("authorizations")
        .select("units_used")
        .eq("id", authId)
        .single();
      assertEquals(data!.units_used, expected);
    } finally {
      await cleanupAuthorization(authId);
    }
  },
});

// ─── Test 3: finalize_and_post_session concurrent safety ────
Deno.test({
  name: "rpc_finalize_and_post_session: concurrent invocations do not double-post or double-deduct",
  ignore: SKIP,
  fn: async () => {
    const authId = await createTempAuthorization();
    const { data: authRow } = await admin
      .from("authorizations")
      .select("student_id, units_used")
      .eq("id", authId)
      .single();
    const studentId = authRow!.student_id as string;
    const startUnits = authRow!.units_used as number;

    // Create a session + 2 draft time entries
    const { data: session, error: seErr } = await admin
      .from("sessions")
      .insert({
        student_id: studentId,
        session_length_minutes: 60,
        billing_status: "draft",
      })
      .select("id")
      .single();
    if (seErr) throw seErr;

    const { error: teErr } = await admin.from("time_entries").insert([
      {
        session_id: session!.id,
        student_id: studentId,
        duration_minutes: 30,
        status: "draft",
        is_billable: true,
      },
      {
        session_id: session!.id,
        student_id: studentId,
        duration_minutes: 45,
        status: "draft",
        is_billable: true,
      },
    ]);
    if (teErr) throw teErr;

    try {
      // Fire 5 finalize calls in parallel against the same session
      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          admin.rpc("rpc_finalize_and_post_session", {
            p_session_id: session!.id,
            p_authorization_id: authId,
            p_force_billable: true,
          }),
        ),
      );
      results.forEach((r, i) => {
        // RPC may return ok=false for a stray auth issue; surface for debug
        assert(!r.error, `call ${i} errored: ${r.error?.message}`);
      });

      // Exactly 2 postings should exist for this session (one per time_entry)
      const { count: postingCount } = await admin
        .from("session_postings")
        .select("*", { count: "exact", head: true })
        .eq("session_id", session!.id);
      assertEquals(
        postingCount,
        2,
        `Expected 2 session_postings; got ${postingCount}. Concurrent finalize duplicated rows.`,
      );

      // Ledger entries: should not exceed posted entries (2)
      const { count: ledgerCount } = await admin
        .from("unit_deduction_ledger")
        .select("*", { count: "exact", head: true })
        .eq("session_id", session!.id);
      assert(
        (ledgerCount ?? 0) <= 2,
        `Expected ≤2 unit_deduction_ledger rows; got ${ledgerCount}.`,
      );

      // units_used delta should equal ceil(30/15)+ceil(45/15) = 2 + 3 = 5
      const { data: finalAuth } = await admin
        .from("authorizations")
        .select("units_used")
        .eq("id", authId)
        .single();
      const delta = (finalAuth!.units_used as number) - startUnits;
      assertEquals(
        delta,
        5,
        `Expected units_used to grow by exactly 5; grew by ${delta} (over-deduction means non-atomic).`,
      );
    } finally {
      // Cleanup
      await admin.from("unit_deduction_ledger").delete().eq("session_id", session!.id);
      await admin.from("session_postings").delete().eq("session_id", session!.id);
      await admin.from("time_entries").delete().eq("session_id", session!.id);
      await admin.from("sessions").delete().eq("id", session!.id);
      await cleanupAuthorization(authId);
    }
  },
});
