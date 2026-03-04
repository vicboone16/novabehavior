# Teacher Hub — Quick Add (Simplified Teacher Data Entry) Integration Spec

**Target Project**: [NovaTrack Teacher Hub](/projects/6055da66-0f22-4b0d-8c81-4947579c8bc5)  
**Also Referenced**: [Project Hub Connect](/projects/c672d626-314b-42d2-b4fa-198cc852cb94) (bottom-of-page addition)  
**Backend**: Shared Supabase (`yboqqmkghwhlhhnsegje`)  
**Date**: 2026-03-04

---

## 1. Overview

"Quick Add" is a simplified data entry mode for teachers that does **NOT** sync directly with Nova Track's behavior data streams. Instead, teacher-entered data:
- Gets stored in teacher-specific tables (`teacher_frequency_entries`, `teacher_duration_entries`, `teacher_targets`)
- Is included in the teacher's **weekly data summary**
- Gets sent to the assigned BCBA via the **messaging system** as part of summary reports

This maintains the clinical data integrity boundary while still capturing valuable classroom observations.

---

## 2. Features for Teacher Hub

### Quick Add Interface (Bottom of Page)
A persistent, collapsible data entry panel at the bottom of the Teacher Hub interface:

1. **Frequency Counter** — Tap-to-count for selected behaviors
   - Student selector (from `v_teacher_roster`)
   - Behavior selector (from student's assigned targets)
   - Large tap target with haptic feedback
   - Auto-saves on student switch or timer

2. **Duration Timer** — Start/stop timer for duration behaviors
   - Visual running timer
   - Pause/resume support

3. **Quick Note** — Free-text observation entry
   - Timestamps automatically
   - Tags to student + optional behavior

4. **ABC Quick Log** — Simplified ABC entry
   - Common antecedent/consequence presets
   - Behavior auto-populated from student profile

### Data Flow
```
Teacher enters data → teacher_* tables → Weekly Summary → staff_messages → BCBA reviews
```

Data does NOT flow to:
- `session_data` (clinical session table)
- `sessions` (clinical sessions)
- Nova Track dashboard directly

---

## 3. Weekly Summary Integration

Teacher data is aggregated into weekly summaries that include:
- Frequency counts per behavior per day
- Duration totals
- ABC patterns observed
- Teacher notes/observations

These summaries are:
1. Available in the Teacher Hub "Data Summary" tab
2. Automatically included when the teacher sends a weekly report to the BCBA
3. Stored as `staff_messages` with `message_type: 'data_summary'` and `app_source: 'teacher_hub'`

---

## 4. Messaging Sync

The Teacher Hub messaging uses `teacher_messages` table:
- `app_source: 'teacher_hub'`
- Supports `is_reviewed` and `is_completed` flags for BCBA workflow
- Realtime subscriptions for instant notifications
- Thread support via `parent_message_id` and `thread_id`

BCBAs see these messages in:
- Nova Track → Teacher Comms dashboard
- Student Connect → Messages section

---

## 5. Project Hub Connect Addition

On [Project Hub Connect](/projects/c672d626-314b-42d2-b4fa-198cc852cb94), add a "Quick Add" section at the bottom of the main page:

### UI Design
- Collapsible bottom panel with a "Quick Add" toggle button
- When expanded: shows student selector + behavior counter + note field
- Minimal, mobile-optimized layout
- Uses the same `check-user-access` pattern for student resolution

### Data Destination
- Writes to `teacher_frequency_entries`, `teacher_duration_entries`
- Included in weekly summaries sent via `teacher_messages`

---

## Copy-Paste Prompt for Teacher Hub

```
Add a "Quick Add" data entry panel to the bottom of the Teacher Hub interface with:
1. Collapsible bottom panel with toggle button
2. Student selector from v_teacher_roster view
3. Frequency counter - large tap targets for counting behaviors, auto-saves on student switch
4. Duration timer - start/stop/pause for duration behaviors
5. Quick note field with auto-timestamp
6. Simplified ABC quick log with common presets
7. Data saves to teacher_frequency_entries and teacher_duration_entries tables (NOT to clinical session_data)
8. Weekly data summary that aggregates teacher entries and sends to assigned BCBA via teacher_messages table with message_type 'data_summary' and app_source 'teacher_hub'
9. Cross-app messaging using teacher_messages with realtime subscriptions, threading via parent_message_id/thread_id
10. Use check-user-access edge function for identity resolution

Reference docs/teacher-hub-quick-add-spec.md in the Nova Track project.
```

---

## Copy-Paste Prompt for Project Hub Connect

```
Add a "Quick Add" section at the bottom of the main page:
1. Collapsible bottom panel with a "Quick Add" toggle button
2. Student selector using the check-user-access edge function to resolve authorized students
3. Behavior frequency counter with large mobile-friendly tap targets
4. Quick note field with automatic timestamps
5. Data writes to teacher_frequency_entries and teacher_duration_entries on the shared backend (yboqqmkghwhlhhnsegje)
6. Include entries in weekly summaries sent via teacher_messages table

This is a simplified version of the Teacher Hub's data entry - no clinical session data sync.
```
