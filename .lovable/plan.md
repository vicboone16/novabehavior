# Plan: Canonical Behavior Verification + Multi-Student Session Setup

## Part 1 — Verify canonical behaviors propagate (Lorenzo + ongoing)

1. Run a verification query against the DB to confirm:
   - Lorenzo has 11 canonical `nt_learner_behavior_assignments` rows joined to `nt_behaviors`
   - Each of the 7 newly-linked behaviors resolves to a name (no UUID fallback) via `behaviorNameResolver.ts`
   - `behavior_session_data.behavior_id` for Lorenzo maps to a canonical name
2. Trace the resolver path used by graphs/profiles (`src/lib/behaviorNameResolver.ts`):
   - It already queries `behaviors` → `student_behavior_map` → `nt_behaviors`. Confirm `nt_behaviors` is reached for newly-canonical IDs.
   - If graph components cache names per-student, clear cache on canonical sync (`clearStudentBehaviorNameMap`) when a behavior is registered/linked.
3. Add an **ongoing safeguard**: a lightweight DB trigger or scheduled function so that whenever a row is inserted into `student_behavior_map` with a `behavior_subtype` that doesn't yet exist in `nt_behaviors` + `nt_learner_behavior_assignments`, it is auto-registered (mirrors the manual fix we just ran for Lorenzo).
   - Trigger: `AFTER INSERT ON student_behavior_map` → `nt_register_canonical_behavior(student_id, behavior_subtype, behavior_entry_id)`.
   - Idempotent via `NOT EXISTS` checks.
4. After verification, refresh the resolver cache for Lorenzo on next page load (no UI change needed beyond cache bust on assignment insert).

## Part 2 — Multi-student / multi-behavior session setup UI

### New component: `MultiStudentSessionBuilder`
Path: `src/components/sessions/MultiStudentSessionBuilder.tsx`

Layout (3 stages, one screen with progressive disclosure):

```text
[ Stage 1: Select Students ]   ← checkbox list w/ search
[ Stage 2: Per-student behaviors ]  ← expandable rows; each shows that student's canonical behaviors
[ Stage 3: Per-behavior config ]   ← inline config card under each selected behavior
[ Start Session ] button
```

### Per-behavior configuration card
For each (student, behavior) pair the clinician can configure:

- **Methods** (multi-select): Frequency, Duration, Interval, ABC, Latency
- **If Interval selected:**
  - Interval type: Whole / Partial / **Momentary**
  - Sampling time (seconds) — applies to Momentary
  - Interval length (seconds)
  - Total session length (minutes)
  - Sync with other students? (toggle)
- **If Frequency selected:**
  - Count rule: per-occurrence vs. bouts
  - Min IRT (seconds) for new bout
- **If Duration selected:**
  - Stopwatch behavior: cumulative vs. per-episode
  - Auto-stop after N seconds (optional)

### State model
```ts
type PerBehaviorConfig = {
  studentId: string;
  behaviorId: string;
  methods: DataCollectionMethod[];
  interval?: { type: 'whole'|'partial'|'momentary'; samplingSec: number; intervalSec: number; totalMin: number; sync: boolean };
  frequency?: { mode: 'occurrence'|'bouts'; minIrtSec?: number };
  duration?: { mode: 'cumulative'|'per_episode'; autoStopSec?: number };
};
```
Persisted to `data_store` as a draft session config (`useDataStore.setMultiStudentDraft`).

### Session launch
- On Start Session: creates a single shared session record per student; session view renders existing `StudentDataCard` per student in a grid; each `IntervalTracker`/`FrequencyTracker`/`DurationTracker` is initialized with the per-behavior config.
- Sync mode: if any (student, behavior) has `interval.sync = true`, route them through `SyncedIntervalController` with a shared timer.

### Integration points
- Add a "New Multi-Student Session" entry on `/sessions` (or wherever sessions are launched). Confirm route by reading the sessions page next.
- Reuse `addBehaviorWithMethods` from `dataStore` for any ad-hoc method overrides.
- Extend `IntervalTracker` props with optional `samplingSec` and `intervalType`; default to existing behavior when not provided.

## Part 3 — Validation

1. Run the canonical verification SQL and paste counts in chat.
2. Manually open a Lorenzo behavior profile page in the preview to confirm names render (no UUIDs).
3. Open the new builder, select 2 students × 2 behaviors each with mixed methods, start a session, confirm trackers render with per-behavior configs.

## Out of scope
- Reworking existing single-student session UI
- Backfilling other students' historical non-canonical behaviors (the new trigger handles them going forward; happy to backfill on request)
