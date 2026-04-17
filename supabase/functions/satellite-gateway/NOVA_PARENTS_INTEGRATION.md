# Nova Parents ↔ Nova Core Integration Status

**Last updated:** 2026-04-17
**Spec source:** Nova Parents engineering team (branch `claude/audit-nova-parents-app-DVX2H`)

This document tracks the implementation status of every item in the Nova Parents Backend Requirements spec, and flags every schema decision where the Nova Core implementation differs from the spec's nominal example.

---

## Item 1 — Range Filter Support (`gte/lte/gt/lt`) ✅ DONE

`satellite-gateway` `query` action now accepts:
```json
"range_filters": [{ "col": "insight_date", "op": "gte", "val": "2025-04-10" }]
```
Supported on `select`, `update`, and `delete`. Applied after `eq_filters` and `in_filters`.

**Compatibility note:** the gateway accepts BOTH the legacy wrapped shape (`{ action, params: { table, ... } }`) and the new flat shape (`{ action, table, ... }`). Nova Parents can send either.

---

## Item 2 — `parent_insights` ✅ ALREADY EXISTS — RLS added

Table was already provisioned. Schema differences vs spec:

| Spec column          | Nova Core column     | Notes                                  |
|----------------------|----------------------|----------------------------------------|
| `headline` NOT NULL  | `headline` NULLABLE  | Many existing rows have NULL headlines |
| —                    | `insight_type`       | Extra column                           |
| —                    | `rewards_summary`    | Extra jsonb                            |
| —                    | `points_redeemed`    | Extra integer                          |
| —                    | `trend_data`         | Extra jsonb                            |
| —                    | `status`             | `draft|published|reviewed`             |
| —                    | `reviewed_by`, `reviewed_at` | Audit trail                    |

All spec-required columns exist with matching names and types: `id`, `student_id`, `insight_date`, `headline`, `points_earned`, `behavior_summary` (jsonb), `what_this_means`, `what_you_can_do` (jsonb), `teacher_note`, `created_at`.

**RLS added:**
- `parent_insights_parent_select` — parents linked via `user_student_access` can SELECT
- `parent_insights_coach_write` — coach/supervisor/agency_admin/super_admin/admin can ALL
- Unique key `(student_id, insight_date)` for upsert support

---

## Item 3 — `abc_logs` ⚠️ EXISTS — Schema differs from spec

Table was already provisioned but uses different column names:

| Spec column          | Nova Core column           | Action required by Nova Parents       |
|----------------------|----------------------------|---------------------------------------|
| `student_id`         | **`client_id`**            | Rename in DAL                         |
| `date` (date)        | derived from `logged_at`   | Use `logged_at` (timestamptz)         |
| `time` (text)        | embedded in `logged_at`    | Use `logged_at`                       |
| `setting` (text)     | not present                | Store in `notes` or omit              |

**RLS added:**
- `abc_logs_owner` — parent owns rows where `user_id = auth.uid()`
- `abc_logs_coach_read` — coach with access to the linked `client_id` can SELECT

**Gateway behavior:** when upserting to `abc_logs`, the gateway **always overrides `user_id`** with the verified JWT subject (security invariant #3).

---

## Item 4 — `coach_engagement_events` ✅ NEW — Provisioned

Created exactly per spec. RLS:
- `cee_self_insert` — users can insert their own events
- `cee_self_read` — users can read their own events
- `cee_admin_read` — supervisor/agency_admin/super_admin/admin can read all

**Gateway behavior:** when upserting/inserting, the gateway **always overrides `user_id`** with the verified JWT subject. The client-supplied `user_id` is discarded.

---

## Item 5 — `recover_streak` Atomic RPC ✅ DONE

**Dependency:** `user_streaks` table did not exist on Nova Core; created with the schema the spec implied (`user_id PK`, `current_streak`, `longest_streak`, `last_activity_date`).

**RPC created:** `public.recover_streak(p_user_id uuid) RETURNS jsonb`.
- `SECURITY DEFINER`, `search_path = public`
- Locks `user_streaks` row with `FOR UPDATE` to prevent concurrent recoveries
- Validates: streak exists, `current_streak = 0`, gap from `last_activity_date` is exactly 2 days, total `xp_earned >= 50`
- Deducts 50 XP from `academy_module_progress` rows ordered by `completed_at DESC`
- Restores `current_streak` to previous `longest_streak`, returns JSON summary
- `EXECUTE` granted only to `service_role`

**⚠️ Schema note:** `academy_module_progress` uses `coach_user_id` (not `user_id`) and primary key `progress_id` (not `id`). The RPC was adapted accordingly. If Nova Parents queries this table directly, use `coach_user_id`.

**Gateway behavior:**
- `recover_streak` added to `ALLOWED_RPCS`
- Gateway **always overrides `p_user_id`** with the verified JWT subject (security invariant #3)
- Postgres exceptions are mapped to friendly error strings:
  - `no_streak_found` → "No streak record found for this user."
  - `streak_not_broken` → "Your streak is still active — no recovery needed."
  - `recovery_window_expired` → "The 24-hour recovery window has passed."
  - `insufficient_xp` → "Not enough XP to recover your streak."

---

## Item 6 — `enabled_features` in `check_app_access` ✅ DONE

**Schema decision:** Nova Core's existing `agency_feature_flags` table is **single-row-per-agency with boolean columns**, not the `(agency_id, feature_key)` pair model the spec proposed. We reused the existing table and added 4 boolean columns:

| Column                          | Default | Maps to feature key |
|---------------------------------|---------|---------------------|
| `parent_beacon_rewards_enabled` | `false` | `beacon_rewards`    |
| `parent_behavior_logs_enabled`  | `true`  | `behavior_logs`     |
| `parent_progress_chart_enabled` | `true`  | `progress_chart`    |
| `parent_messaging_enabled`      | `false` | `messaging`         |

**Response shape:**
```json
{
  "hasAccess": true,
  "role": "parent",
  "enabled_features": ["behavior_logs", "progress_chart"]
}
```

**Fallback:** if the parent has no `user_agency_access` row yet, `enabled_features` defaults to `["behavior_logs", "progress_chart"]` (rewards and messaging stay off).

---

## Item 7 — Schema Contract Tests ✅ DONE

`supabase/functions/satellite-gateway/contract_test.ts` runs the spec's required smoke tests via Deno:

```bash
GATEWAY_URL=... TEST_PARENT_JWT=... TEST_STUDENT_ID=... \
  deno test --allow-net --allow-env supabase/functions/satellite-gateway/contract_test.ts
```

Covers: handshake, `check_app_access` shape, `parent_insights` columns, `range_filters` behavior, `weekly_snapshots` columns, beacon rewards view, disallowed table rejection, unknown RPC rejection.

**Wire-up needed in Nova Core CI:** add this file to a GitHub Actions job triggered on PRs that touch `supabase/migrations/**` or `supabase/functions/satellite-gateway/**`.

---

## Item 8 — Inventory Cross-Check

| Table / View                          | Status      | Notes                                                                          |
|---------------------------------------|-------------|--------------------------------------------------------------------------------|
| `parent_insights`                     | ✅ exists   | RLS added; schema delta noted above                                            |
| `abc_logs`                            | ✅ exists   | Uses `client_id` not `student_id`; no `date/time/setting` columns              |
| `coach_engagement_events`             | ✅ created  | Per spec                                                                       |
| `user_streaks`                        | ✅ created  | Per spec                                                                       |
| `academy_module_progress`             | ✅ exists   | Uses `coach_user_id` + `progress_id`                                           |
| `weekly_snapshots`                    | ✅ exists   | Has both `client_id` AND `student_id`; also has `integrity_score`, `active_seconds` |
| `coach_evidence_packets`              | ✅ exists   | Has both `client_id` AND `student_id`                                          |
| `v_beacon_student_available_rewards`  | ✅ created  | Aliases: `name→title`, `cost→point_cost`, `active→is_active`                   |
| `v_beacon_student_reward_summary`     | ✅ exists   | Has `student_id`, `agency_id`, `balance`, `total_earned`, `total_spent`        |
| `behavior_translations`               | ✅ exists   | Uses `function_category`/`parent_friendly`/`home_strategies` (not `function_key`/`parent_label`) |
| `user_student_access`                 | ✅ exists   | No `agency_id` column — resolve via `user_agency_access`                       |
| `user_agency_access`                  | ✅ exists   | Has `agency_id`, `client_id`, `role`                                           |
| `students`                            | ✅ exists   | Has `agency_id`, `classroom_id`, `school_id`, `first_name`, `last_name`        |
| `agency_feature_flags`                | ✅ exists   | Boolean column model; 4 parent-app columns added                               |

---

## Item 9 — Gateway Security Invariants ✅ VERIFIED + ENFORCED

1. **JWT verification** — every action except `check_handshake` requires a valid Bearer token. Unverified tokens return 401.
2. **Table allowlist** — `TABLE_CONFIG` explicitly enumerates which tables and operations are permitted. `parent_insights`, `abc_logs`, `coach_engagement_events`, `v_beacon_student_available_rewards`, `v_beacon_student_reward_summary`, `behavior_translations`, `agency_feature_flags` are now allowlisted.
3. **`user_id` override on writes** — `abc_logs` and `coach_engagement_events` insert/upsert payloads have their `user_id` field overwritten with `auth.uid()` server-side.
4. **`parent_insights` write protection** — only `coach/supervisor/agency_admin/super_admin/admin` roles may insert/update via the RLS `parent_insights_coach_write` policy.
5. **Cross-org isolation on rewards view** — `v_beacon_student_available_rewards` joins through `students.agency_id = beacon_rewards.agency_id`. A student can only ever see rewards configured for their own agency.
6. **RPC `p_user_id` override** — `recover_streak` parameters always have `p_user_id` overwritten with the verified JWT subject.

---

## Open Questions for Nova Parents Team

1. **`abc_logs.date/time/setting`**: do you want us to add these as plain columns, or is consolidating into `logged_at` + `notes` acceptable? (Adding three nullable text columns is trivial if needed.)
2. **`parent_insights.headline`**: spec marks NOT NULL but existing data has nulls. Should new inserts via the gateway enforce NOT NULL at the application layer?
3. **`agency_feature_flags`**: would you like us to add a backwards-compat view that exposes the boolean columns as `(agency_id, feature_key, enabled)` rows for any tool that needs the row-based shape?
