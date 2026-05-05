

## Unified Session Data Collection — Plan

A single, configurable in-session workspace that handles **behaviors + skills together**, works on **phone / tablet / desktop**, supports **1 to many clients**, and lets the user pick the layout that fits the moment.

---

### 1. New top-level component: `SessionWorkspace`

Route: `/session` (and embedded inside `Clinical` Sessions tab). Replaces the scattered `MobileDataMode` + `ActiveStudentSessions` + `CompactStudentCard` flows with one cohesive shell.

```text
┌────────────────────────────────────────────────────────────┐
│ Session Header — timer · totals · rate/min · end session   │ ← sticky stats
├──────────┬─────────────────────────────────────────────────┤
│ Client   │  Filter chips: All · Behaviors · Skills        │
│ Switcher │  ─────────────────────────────────────────────  │
│  ● Kai   │                                                 │
│  ● Mia   │   [ Active workspace — layout user-chosen ]    │
│  ● Sam   │                                                 │
│  + All   │                                                 │
├──────────┴─────────────────────────────────────────────────┤
│  Quick-tally bar (top 3–5 pinned behaviors)  ·  + Note FAB │
└────────────────────────────────────────────────────────────┘
```

### 2. Three layout modes (user picks, persisted per user)

Toggle in header: **Grid · List · Split**

- **Grid** — IMG_2250 style. 2-col on phone, 3–4 on tablet, 5+ on desktop. One card per behavior/skill, color-coded, big tap targets.
- **List** — IMG_2252 style. Stacked rows with abbreviation badge, name, current value, and contextual action (▶ for duration/latency, + for frequency, % for skill).
- **Split** — Welina style. Skills left, behaviors right. Auto-collapses to tabbed grid below ~900px.

Filter chips (`All · Behaviors · Skills`) work in every layout.

### 3. Client switcher (1 → many)

Left rail (desktop) / horizontal scroll tab strip (mobile):

- **1 client**: switcher hidden, full width.
- **2–N clients**: tabs with initials + colored dot + unread-count style badge for new entries.
- **"All" tab**: aggregated roll-up — every client's running counters/timers in compact cards, grouped by client. Tapping any card jumps into that client's focused view.
- **Split-screen toggle** on tablet/desktop only: pin two clients side-by-side (great for groups of 2).
- **Drag to reorder** tabs (dnd-kit, already in deps).

### 4. Session-wide stats header (sticky)

Single row, always visible while session active:

```
⏱ 12:34   |   🎯 8 trials · 75%   |   📊 5 freq · 0.4/min   |   ⏲ 2 timers running   |   [End]
```

Updates live from the `dataStore`. On phone, collapses to: timer · "tap for details".

### 5. Floating quick-tally bar

Pinned bottom strip with the 3–5 most-used (or user-pinned) behaviors for the **active client**. Each pill shows abbreviation + count + tap-to-increment. Survives across filter/layout changes so a clinician can keep tallying aggression while reviewing a skill target.

- Long-press a behavior card → "Pin to quick bar"
- Auto-suggests top 3 by frequency in last 7 days if user hasn't pinned any.

### 6. Universal quick-add FAB

Bottom-right floating button, context-aware menu:
- **+ Note** (tied to active client + current target if any)
- **+ ABC entry** (uses existing `EnhancedABCPopup`)
- **+ Behavior on the fly** (uses `MobileAddBehaviorSheet`)
- **+ Voice note** (uses `VoiceNoteRecorder`)

### 7. Drag-to-reorder

- Client tabs (left rail or top strip) — order persists per user.
- Behavior/skill cards within each layout — order persists per client per user.
- Implemented with `@dnd-kit/core` (already used elsewhere).

### 8. Where existing code plugs in

| Need                        | Reuse                                          |
|-----------------------------|------------------------------------------------|
| Frequency tally             | `MobileFrequencyTally`                         |
| Duration / latency timers   | `MobileDurationTracker`, `MobileLatencyTracker`|
| Interval                    | `MobileIntervalTracker` + `SyncedIntervalController` |
| ABC                         | `MobileABCEntry` / `EnhancedABCPopup`          |
| Skill trials                | `SkillSessionRunner` internals (extracted to a `<SkillTargetCard>`) |
| Session lifecycle           | existing `dataStore`, `SessionTimer`, `EndAllSessionsButton` |
| Cross-device sync           | existing realtime listeners on `sessions`      |

No new database tables needed — purely a UI/UX consolidation layer over current data hooks.

### 9. New files to create

- `src/components/session-workspace/SessionWorkspace.tsx` (shell)
- `src/components/session-workspace/SessionStatsHeader.tsx`
- `src/components/session-workspace/ClientSwitcher.tsx` (tabs + reorder + "All")
- `src/components/session-workspace/AllClientsOverview.tsx`
- `src/components/session-workspace/WorkspaceLayoutToggle.tsx`
- `src/components/session-workspace/layouts/GridLayout.tsx`
- `src/components/session-workspace/layouts/ListLayout.tsx`
- `src/components/session-workspace/layouts/SplitLayout.tsx`
- `src/components/session-workspace/cards/BehaviorCard.tsx` (one card, all 4 methods)
- `src/components/session-workspace/cards/SkillTargetCard.tsx`
- `src/components/session-workspace/QuickTallyBar.tsx`
- `src/components/session-workspace/QuickAddFab.tsx`
- `src/hooks/useWorkspacePreferences.ts` (layout, pinned behaviors, tab order — persisted to `user_preferences`)

### 10. Rollout

1. **Phase A**: Build `SessionWorkspace` shell + Grid layout + single-client mode → swap into `/session` route behind a "Try new workspace" toggle so old flow stays intact.
2. **Phase B**: Add List + Split layouts, layout toggle, sticky stats header.
3. **Phase C**: Multi-client switcher, "All" overview, split-screen pinning.
4. **Phase D**: Quick-tally bar, quick-add FAB, drag-to-reorder, persisted preferences.
5. **Phase E**: Make new workspace the default; keep legacy `MobileDataMode` accessible via "Classic mode" for one release, then deprecate.

### 11. Out of scope (flag for later)

- New analytics/graphs in-session (use existing post-session views).
- Offline queue rework (keeps current IndexedDB sync infra).
- Tablet-specific gestures (swipe-between-clients) — easy to add in Phase C.

