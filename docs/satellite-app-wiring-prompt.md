# Satellite App Wiring Prompt — Comprehensive Backend Reference

> **Shared Supabase project ID:** `yboqqmkghwhlhhnsegje`
> **Generated from:** NovaTrack Core on 2026-03-05
> **Purpose:** Paste the relevant section into Teacher Hub or Student Connect to ensure all tables, RPCs, views, and schemas are properly wired. No "table not found" errors.

---

## IMPORTANT: Data Boundary Rules

- **Teacher-collected data** (from Teacher Hub / Beacon) is **non-clinical**. It lives in `teacher_frequency_entries`, `teacher_duration_entries`, and `teacher_messages`. It does **NOT** feed into NovaTrack Core's clinical intelligence (CI) dashboard or behavior/skill session data.
- **NovaTrack Core data** collected directly on the Students page (behavior session data, skill trials) **IS** clinical and feeds into CI alerts, behavior analytics, and the Supervisor Signal system.
- These are **two separate notification streams** that do not cross-pollinate unless a BCBA explicitly reviews and promotes teacher data.

---

# SECTION A — Teacher Hub Wiring Prompt

> Paste this entire section into Teacher Hub when features are broken or tables aren't found.

---

## 1. Connection & Identity

```
Supabase Project ID: yboqqmkghwhlhhnsegje
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlib3FxbWtnaHdobGhobnNlZ2plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NDc4ODMsImV4cCI6MjA4NTEyMzg4M30.F2RPn-0nNx6sqje7P7W2Jfz9mXAXBFNy6xzbV4vf-Fs
App Slug: teacherhub
App Handshake ID: 4
Auth Method: Email + Password (NO PIN login)
```

## 2. Backend Guard

```typescript
const EXPECTED_APP_SLUG = 'teacherhub';
// Query: supabase.from('app_handshake').select('*').eq('id', 4).single()
const ALLOWED_URL_PATTERNS = ['yboqqmkghwhlhhnsegje.supabase.co'];
```

## 3. App Access Gating

```typescript
const { data } = await supabase.rpc('has_app_access', {
  _user_id: user.id,
  _app_slug: 'teacherhub',
});
// If false → show "Access Not Configured" screen
```

## 4. Student Filtering

```typescript
const { data } = await supabase
  .from('student_app_visibility')
  .select('student_id, students(*)')
  .eq('app_slug', 'teacherhub')
  .eq('is_active', true);
```

## 5. Existing Tables Available to Teacher Hub

All these tables exist in the shared backend. Do NOT create them — just query them.

### 5a. `teacher_messages` (public schema)

Two-way threaded messaging between BCBAs and teachers, scoped per student.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | gen_random_uuid() | |
| student_id | uuid | — | Required, FK→students |
| agency_id | uuid | — | Optional, FK→agencies |
| sender_id | uuid | — | Required, auth user who sent |
| recipient_id | uuid | — | Nullable |
| thread_id | uuid | — | Group messages into threads |
| message_type | text | 'message' | `message`, `task_assignment`, `data_share`, `pdf_share`, `summary` |
| subject | text | — | Optional subject line |
| content | text | — | Required, message body |
| metadata | jsonb | '{}' | Attachments, references, etc. |
| is_read | boolean | false | Recipient has read |
| read_at | timestamptz | — | When read |
| is_reviewed | boolean | false | Teacher marked reviewed |
| reviewed_at | timestamptz | — | When reviewed |
| is_completed | boolean | false | Teacher marked completed |
| completed_at | timestamptz | — | When completed |
| parent_message_id | uuid | — | FK→self, for threaded replies |
| app_source | text | 'teacherhub' | `teacherhub` or `novatrack` |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

**RLS Policies:**
- `sender or recipient can view`: SELECT where `sender_id = auth.uid() OR recipient_id = auth.uid()`
- `sender can insert`: INSERT where `sender_id = auth.uid()`
- `recipient can update`: UPDATE where `recipient_id = auth.uid()` (for is_read, is_reviewed, is_completed)
- `admins can view all`: SELECT for admin role users

**Realtime:** Enabled. Subscribe to `teacher_messages` for live updates.

### 5b. `teacher_message_attachments` (public schema)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| message_id | uuid FK→teacher_messages | Required |
| file_name | text | Required |
| file_url | text | Optional |
| file_type | text | Optional |
| storage_path | text | Optional |
| attachment_type | text | `file`, `pdf_report`, `data_snapshot`, `assessment_result` |
| metadata | jsonb | Optional |
| created_at | timestamptz | |

**RLS:** Can view if you can view the parent teacher_message. Can insert if you're the sender of the parent message.

### 5c. `pending_student_changes` (public schema)

When a teacher edits a Core-owned student field, create a pending record for BCBA review.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| student_id | uuid FK→students | Required |
| agency_id | uuid | Optional |
| submitted_by | uuid | Required, auth.uid() |
| field_changes | jsonb | `{ "grade": { "from": "3rd", "to": "4th", "label": "Grade" } }` |
| status | text | `pending`, `approved`, `rejected` |
| reviewed_by | uuid | Admin who reviewed |
| reviewed_at | timestamptz | |
| review_note | text | Rejection reason |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**RLS:**
- Teachers INSERT with `submitted_by = auth.uid()`
- Teachers SELECT their own submissions
- Admins SELECT all, UPDATE to approve/reject

### 5d. `staff_messages` (public schema)

Internal staff messaging (BCBA-to-BCBA or BCBA-to-RBT). Also accessible from Teacher Hub for cross-role messaging.

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| id | uuid PK | gen_random_uuid() | |
| student_id | uuid | — | Required |
| agency_id | uuid | — | Optional |
| sender_id | uuid | — | Required |
| recipient_id | uuid | — | Nullable |
| message_type | text | 'message' | Same types as teacher_messages |
| subject | text | — | Optional |
| content | text | — | Required |
| metadata | jsonb | '{}' | |
| is_read | boolean | false | |
| read_at | timestamptz | — | |
| parent_message_id | uuid | — | FK→self |
| app_source | text | 'novatrack' | |
| created_at | timestamptz | now() | |
| updated_at | timestamptz | now() | |

**RLS:** sender/recipient can view; sender can insert; recipient can update read status.

### 5e. `classrooms` (public schema)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| school_id | uuid FK→schools | Required |
| name | text | Required |
| grade_level | text | Optional |
| classroom_type | text | Optional |
| settings | jsonb | Optional |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### 5f. `classroom_members` (public schema)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| classroom_id | uuid FK→classrooms | |
| user_id | uuid | Teacher/staff user |
| student_id | uuid | Or student |
| role | text | `teacher`, `aide`, `student` |
| created_at | timestamptz | |

### 5g. `classroom_groups` / `classroom_group_students` / `classroom_group_members`

Sub-groupings within classrooms (reading groups, etc.)

### 5h. `ci_signals` (public schema)

Supervisor signals for real-time safety monitoring. **Read-only from Teacher Hub** — signals are generated by NovaTrack Core's CI engine.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| agency_id | uuid | Required |
| client_id | uuid | Student |
| rule_id | uuid | FK→ci_signal_rules |
| signal_type | text | `escalation`, `incident`, `risk`, `pattern`, `reinforcement_gap` |
| severity | text | `watch`, `action`, `critical` |
| title | text | |
| message | text | |
| context_json | jsonb | |
| source | text | |
| created_at | timestamptz | |
| resolved_at | timestamptz | |
| resolved_by | uuid | |
| resolved_note | text | |

### 5i. `ai_teacher_coach_logs` (public schema)

For AI coaching features in Teacher Hub.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid | Required |
| student_id | uuid | Optional |
| agency_id | uuid | Optional |
| school_id | uuid | Optional |
| district_id | uuid | Optional |
| input_description | text | Required |
| ai_response | jsonb | Required |
| model_used | text | Optional |
| created_at | timestamptz | |

## 6. Available RPCs / Functions

These functions exist and can be called via `supabase.rpc(...)`:

| Function | Arguments | Returns | Notes |
|----------|-----------|---------|-------|
| `has_app_access` | `_user_id uuid, _app_slug text, _agency_id uuid DEFAULT NULL` | boolean | Check if user can access this app |
| `insert_supervisor_signal` | `p_student_id, p_agency_id, p_signal_type, p_severity, p_title, p_message, p_context_json, p_source` | uuid | Insert a signal from any app |

## 7. Available Edge Functions

| Function | Endpoint | JWT Required | Notes |
|----------|----------|-------------|-------|
| `check-user-access` | `/functions/v1/check-user-access` | Yes | Returns user_id, roles, agency memberships, authorized student IDs |

### `check-user-access` Usage

```typescript
const { data } = await supabase.functions.invoke('check-user-access', {
  body: { email: user.email, app_slug: 'teacherhub' }
});
// Returns: { user_id, roles, agencies, student_ids }
```

## 8. Messaging Usage Examples

**Send a message to BCBA:**
```typescript
await supabase.from('teacher_messages').insert({
  student_id: studentId,
  sender_id: user.id,
  recipient_id: bcbaUserId,
  message_type: 'message',
  content: 'Student showed great progress today!',
  app_source: 'teacherhub',
});
```

**Listen for new messages (realtime):**
```typescript
supabase.channel('teacher-inbox')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'teacher_messages',
    filter: `recipient_id=eq.${user.id}`,
  }, (payload) => { /* handle new message */ })
  .subscribe();
```

**Mark message as read:**
```typescript
await supabase.from('teacher_messages')
  .update({ is_read: true, read_at: new Date().toISOString() })
  .eq('id', messageId);
```

**Submit a pending student change:**
```typescript
await supabase.from('pending_student_changes').insert({
  student_id: studentId,
  agency_id: agencyId,
  submitted_by: user.id,
  field_changes: {
    grade: { from: "3rd", to: "4th", label: "Grade" },
    school_name: { from: "Oak Elementary", to: "Pine Elementary", label: "School" }
  }
});
```

## 9. Schema Cache Refresh

**CRITICAL:** After pasting this prompt, run a no-op migration or add this to any migration:

```sql
NOTIFY pgrst, 'reload schema';
```

This ensures the PostgREST API layer recognizes all tables and RPCs from the shared backend.

---

# SECTION B — Student Connect Wiring Prompt

> Paste this entire section into Student Connect when features are broken or tables aren't found.

---

## 1. Connection & Identity

```
Supabase Project ID: yboqqmkghwhlhhnsegje
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlib3FxbWtnaHdobGhobnNlZ2plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NDc4ODMsImV4cCI6MjA4NTEyMzg4M30.F2RPn-0nNx6sqje7P7W2Jfz9mXAXBFNy6xzbV4vf-Fs
App Slug: student_connect
App Handshake ID: 2
Auth Method: Email + Password AND 6-digit PIN
```

## 2. Backend Guard

```typescript
const EXPECTED_APP_SLUG = 'student_connect';
// Query: supabase.from('app_handshake').select('*').eq('id', 2).single()
const ALLOWED_URL_PATTERNS = ['yboqqmkghwhlhhnsegje.supabase.co'];
```

## 3. App Access Gating

```typescript
const { data } = await supabase.rpc('has_app_access', {
  _user_id: user.id,
  _app_slug: 'student_connect',
});
```

## 4. Student Filtering

```typescript
const { data } = await supabase
  .from('student_app_visibility')
  .select('student_id, students(*)')
  .eq('app_slug', 'student_connect')
  .eq('is_active', true);
```

## 5. PIN Login

The `pin-auth` edge function is already deployed with `verify_jwt = false`.

**Endpoint:** `POST /functions/v1/pin-auth`

```typescript
const { data, error } = await supabase.functions.invoke('pin-auth', {
  body: { pin: '123456', email: 'user@example.com' } // email optional
});

if (data?.access_token && data?.refresh_token) {
  await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
}
```

**Error codes:** 400 (invalid format), 401 (wrong PIN), 403 (pending approval), 429 (rate limited), 404 (not found), 409 (non-unique PIN-only)

## 6. Existing Tables Available to Student Connect

All tables from Section A (Teacher Hub) are also available here, plus:

### 6a. `staff_messages` — Same schema as Section A, 5d

Used for supervisor-to-staff and staff-to-staff messaging in the Student Connect context.

### 6b. `teacher_messages` — Same schema as Section A, 5a

Student Connect supervisors can view/send teacher messages for their caseload students.

### 6c. `ci_signals` — Same schema as Section A, 5h

Supervisor signal feed for real-time safety monitoring. Student Connect supervisors can view and resolve signals.

### 6d. `pending_student_changes` — Same schema as Section A, 5c

Supervisors in Student Connect can review and approve/reject teacher-submitted changes.

### 6e. Supervision-specific tables

These tables also exist and are available:

- `supervision_logs` — Supervision session records
- `supervision_feedback` — Feedback entries
- `session_data` — Clinical session data (behavior + skill trials)
- `behavior_session_data` — Behavior frequency/duration per session
- `skill_trials` — Individual skill trial records
- `sessions` — Session metadata

### 6f. `behavior_intelligence.behavior_events` (behavior_intelligence schema)

Unified event stream for clinical intelligence. **This is in the `behavior_intelligence` schema, not `public`.**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| student_id | uuid | Required (column name in DB) |
| client_id | uuid | Alias/legacy column |
| agency_id | uuid | Optional |
| classroom_id | uuid | Optional |
| school_id | uuid | Optional |
| district_id | uuid | Optional |
| source_app | text | `beacon`, `novatrack`, `student_connect` |
| source_table | text | Which table this came from |
| source_id | uuid | Original record ID |
| source_event_key | text | Dedup key |
| event_type | text | `behavior`, `skill_trial`, `reinforcement`, `prompt`, `incident`, `context`, `intervention`, `ai` |
| event_name | text | `aggression`, `refusal`, `FP`, `token_delivered`, etc. |
| value | numeric | |
| intensity | int | |
| phase | text | `baseline`, `acquisition`, `probe`, `generalization`, `maintenance` |
| prompt_code | text | `FP`, `PP`, `G`, `M`, `VP` |
| correctness | text | `+` or `-` |
| metadata | jsonb | Default '{}' |
| occurred_at | timestamptz | Required |
| recorded_by | uuid | |
| created_at | timestamptz | |

**To insert events:**
```typescript
const { data } = await supabase.rpc('behavior_intelligence.insert_event', {
  p_client_id: studentId,
  p_event_type: 'behavior',
  p_event_name: 'aggression',
  p_occurred_at: new Date().toISOString(),
  p_source_app: 'student_connect',
  p_source_table: 'behavior_session_data',
  p_source_id: originalRecordId,
  p_recorded_by: user.id,
});
```

**Note:** The `insert_event` function is idempotent — if `source_table + source_id` already exists, it returns the existing ID without duplicating.

## 7. Available RPCs / Functions

Everything from Teacher Hub Section A.6, plus:

| Function | Arguments | Returns | Notes |
|----------|-----------|---------|-------|
| `has_app_access` | `_user_id, _app_slug, _agency_id` | boolean | |
| `verify_pin` | `_user_id uuid, _pin text` | boolean | Used internally by pin-auth edge function |
| `check_pin_rate_limit` | `_email text, _ip_address text` | boolean | |
| `insert_supervisor_signal` | See Section A | uuid | |
| `behavior_intelligence.insert_event` | See 6f above | uuid | Insert into unified event stream |
| `behavior_intelligence.get_storyboard_json` | `p_client_id, p_start, p_end` | jsonb | Color-coded timeline |
| `behavior_intelligence.export_timeline_json` | `p_client_id, p_start, p_end, p_audience` | jsonb | Audience-filtered export (`staff`, `supervisor`, `parent`) |

## 8. Available Edge Functions

| Function | Endpoint | JWT Required | Notes |
|----------|----------|-------------|-------|
| `pin-auth` | `/functions/v1/pin-auth` | **No** | PIN login |
| `check-user-access` | `/functions/v1/check-user-access` | Yes | User identity resolution |

## 9. Supervisor Signals — CI Engine Functions

These run on the backend and can be invoked via RPC for manual signal generation:

| Function | Schema | What it does |
|----------|--------|-------------|
| `ci.generate_escalation_signals(p_window_minutes, p_min_count, p_behavior_name)` | ci | Detects behavior spikes in time windows |
| `ci.generate_risk_threshold_signals(p_threshold)` | ci | Flags clients with risk_score ≥ threshold |
| `ci.generate_pattern_signals(p_trigger_event, p_behavior_event, p_min_conf)` | ci | Sequence detection (e.g., transition → aggression) |

**Trigger:** `trg_incident_to_signal` auto-fires on INSERT to `public.incidents` when severity ≥ 3.

## 10. Views Available

| View | Schema | Purpose |
|------|--------|---------|
| `v_storyboard_events` | behavior_intelligence | Color-coded event timeline |
| `v_staff_timeline` | behavior_intelligence | Staff-appropriate event view |
| `v_supervisor_timeline` | behavior_intelligence | Full event view for supervisors |
| `v_parent_timeline` | behavior_intelligence | Sanitized view for parents (no staff notes, peer names) |
| `v_teacher_roster` | public | Teacher's student roster |
| `v_teacher_roster_sources` | public | Roster with source metadata |
| `v_teacher_abc_recent` | public | Recent ABC log entries for teachers |

## 11. Schema Cache Refresh

**CRITICAL:** After pasting this prompt, run a no-op migration:

```sql
NOTIFY pgrst, 'reload schema';
```

---

# SECTION C — Common Troubleshooting

## "Table not found" / "relation does not exist"

1. Run `NOTIFY pgrst, 'reload schema';` as a migration
2. Check you're querying the right schema — `behavior_intelligence.*` tables are NOT in `public`
3. For `behavior_intelligence` schema functions, call them as: `supabase.rpc('insert_event', { ... })` — PostgREST may need the function exposed via `search_path`

## "Permission denied" / Empty results

1. Check RLS policies — most tables require `auth.uid()` to match sender_id or recipient_id
2. Ensure the user has an active record in `user_app_access` for the correct `app_slug`
3. Ensure students are visible via `student_app_visibility` for the correct `app_slug`

## "Function not found"

1. Run the schema cache refresh
2. Check if the function is in a non-public schema (ci, behavior_intelligence) — you may need to call it with the schema prefix or ensure `search_path` includes it

## Realtime not working

1. Ensure the table has been added to the `supabase_realtime` publication: `ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_messages;`
2. Use the correct filter syntax: `filter: \`recipient_id=eq.\${user.id}\``

---

# SECTION D — App Summary

| App | Slug | Handshake ID | PIN Login | Auth Method |
|-----|------|-------------|-----------|-------------|
| Nova Track | novatrack | 1 | ✅ | Email + PIN |
| Student Connect | student_connect | 2 | ✅ | Email + PIN |
| Behavior Decoded | behaviordecoded | 3 | ❌ | Email + Password |
| Teacher Hub | teacherhub | 4 | ❌ | Email + Password |
