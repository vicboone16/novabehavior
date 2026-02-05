

## Plan: Add Export/Print for Indirect Assessment Tools

### Overview

This plan adds the ability to export and print completed assessments from the Indirect Assessment Tools. Users will be able to export rating scales (FAST, MAS, QABF), Brief Teacher Interview responses, and Record Reviews to professional Word documents (.docx) or print them directly.

---

### Assessment Types Covered

| Assessment Type | Data Location | Export Format |
|-----------------|---------------|---------------|
| FAST Rating Scale | `student.indirectAssessments` | Word (.docx) with scores and function analysis |
| MAS Rating Scale | `student.indirectAssessments` | Word (.docx) with scores and function analysis |
| QABF Rating Scale | `student.indirectAssessments` | Word (.docx) with scores and function analysis |
| Brief Teacher Input | `student.briefTeacherInputs` | Word (.docx) with behavior details and inferred functions |
| Brief Record Review | `student.briefRecordReview` | Word (.docx) with all 6 sections and tables |

---

### User Experience

**Rating Scales (FAST, MAS, QABF)**
- Export button appears in the saved assessments list (top card)
- Each saved assessment row gets a dropdown menu with "Export to Word" and "Print" options
- Exports include: student name, target behavior, respondent, date, all item responses, function scores with percentages, and primary function indicated

**Brief Teacher Input**
- Export button added to the response detail dialog
- Also available from the response list row (dropdown)
- Exports include: student info, respondent, date, strengths, problem behaviors, frequency/duration/intensity, triggers, consequences, inferred functions, and notes

**Brief Record Review**
- Export button added to the main card and the form dialog header
- Exports include: all 6 sections with reviewed checkboxes, academic assessment tables, discipline tables, and IEP information

---

### Files to Create

**`src/lib/assessmentExport.ts`** (new file)

This utility file will contain export functions for all assessment types:

```text
Functions:
- exportRatingScaleToDocx(assessment, student, items): Exports FAST/MAS/QABF
- exportBriefTeacherInputToDocx(response, student): Exports Brief Teacher Input
- exportBriefRecordReviewToDocx(review, student): Exports Brief Record Review
- printAssessment(contentRef): Triggers browser print for a component
```

Document structure for rating scales:
```text
FUNCTIONAL BEHAVIOR ASSESSMENT - INDIRECT ASSESSMENT
[FAST / MAS / QABF] Rating Scale

Student: [Name]
Target Behavior: [Behavior]
Completed By: [Respondent]
Date: [Date]

FUNCTION SCORES
-------------------------------------
| Function          | Score | Max | % |
|-------------------|-------|-----|---|
| Social Attention  |   12  |  16 | 75% |
| Escape/Avoidance  |    8  |  16 | 50% |
| Tangible/Access   |    4  |  16 | 25% |
| Sensory/Automatic |    2  |  16 | 13% |
-------------------------------------

PRIMARY FUNCTION: Social Attention

ITEM RESPONSES
[List of all items with responses]

NOTES
[Any clinical notes]
```

Document structure for Brief Teacher Input:
```text
BRIEF FBA TEACHER/STAFF INTERVIEW

Student: [Name]
Respondent: [Name]
Date: [Date]

STUDENT STRENGTHS
- Strength 1
- Strength 2

PROBLEM BEHAVIORS
[Checkbox list with selected items]
Description: [text]
Frequency: [text] | Duration: [text] | Intensity: [text]

ANTECEDENTS (TRIGGERS)
[List of selected triggers]

CONSEQUENCES
Things Obtained: [list]
Things Avoided: [list]

INFERRED FUNCTIONS
[Based on analysis: Attention, Escape, etc.]

ADDITIONAL NOTES
[text]
```

Document structure for Brief Record Review:
```text
BRIEF RECORD REVIEW - FBA

Student: [Name] | Grade: [Grade]
Reviewer: [Name] | Date: [Date]

1. HEALTH INFORMATION [✓ Reviewed]
   Health History: [text]
   Medical Diagnoses: [text]
   Mental Health Diagnoses: [text]
   Medications: [text]

2. ACADEMIC/BENCHMARK ASSESSMENTS [✓ Reviewed]
   [Table of assessments with BOY/MOY/EOY scores]

3. PREVIOUS INTERVENTIONS [✓ Reviewed]
   Behavior: [text]
   Academic: [text]
   Previous FBA/BIP: [text]

4. ATTENDANCE [✓ Reviewed]
   Previous Concerns: Yes/No
   Tardy: [text] | Early Dismissal: [text] | Absent: [text]

5. DISCIPLINE [✓ Reviewed]
   [Table of discipline records]
   Notes: [text]

6. IEP REVIEW [✓ Reviewed]
   Eligibility/Disability: [text]
   Services: [text]
   Program Modifications: [text]
   Other Information: [text]
```

---

### Files to Modify

**`src/components/IndirectAssessmentTools.tsx`**
- Add import for `Download`, `Printer` icons from lucide-react
- Add import for export functions from `assessmentExport.ts`
- Add import for `DropdownMenu` components
- Modify the saved assessments list (lines 288-319) to include a dropdown menu per row with Export/Print options
- Add an "Export All" button to the Saved Assessments card header

**`src/components/assessment/BriefTeacherInputManager.tsx`**
- Add import for export function
- Add "Export" button to the response detail dialog footer (line 483-495)
- Add dropdown menu to each response row in the list

**`src/components/assessment/BriefRecordReviewManager.tsx`**
- Add import for export function
- Add "Export" button to the main card header (next to "Edit Review" button)
- Add "Export" button to the form dialog footer when viewing existing review

---

### Implementation Details

**Export Utility Functions (assessmentExport.ts)**

The file will use the existing `docx` library pattern from `pdfExport.ts`:
- Import `Document`, `Packer`, `Paragraph`, `TextRun`, `Table`, `TableRow`, `TableCell` from docx
- Import `saveAs` from file-saver
- Import `format` from date-fns

For tables (academic assessments, discipline records), use the Table/TableRow/TableCell pattern with proper borders and cell widths.

**Dropdown Menu Pattern**

Each assessment row will have:
```text
[Assessment Info] [Function Badge] [MoreHorizontal Icon]
                                          |
                                   ┌──────────────┐
                                   │ Export Word  │
                                   │ Print        │
                                   │ Delete       │
                                   └──────────────┘
```

---

### Technical Implementation Order

1. Create `src/lib/assessmentExport.ts` with all export functions
2. Update `IndirectAssessmentTools.tsx` to add export/print for saved rating scales
3. Update `BriefTeacherInputManager.tsx` to add export/print for teacher input responses
4. Update `BriefRecordReviewManager.tsx` to add export/print for record review

---

### Dependencies

Uses existing installed packages:
- `docx` (already installed, version ^9.5.1)
- `file-saver` (already installed, version ^2.0.5)
- `date-fns` (already installed, version ^3.6.0)

---

### Expected UI Changes

**Saved Assessments Card (Rating Scales)**

Before:
```text
┌─────────────────────────────────────────────────┐
│ ✓ Saved Assessments (2)              [▲ Expand] │
├─────────────────────────────────────────────────┤
│ [FAST] Hitting  Jan 15, 2025  [Attention] [🗑] │
│ [MAS]  Yelling  Jan 20, 2025  [Escape]    [🗑] │
└─────────────────────────────────────────────────┘
```

After:
```text
┌─────────────────────────────────────────────────┐
│ ✓ Saved Assessments (2)    [Export All] [▲]    │
├─────────────────────────────────────────────────┤
│ [FAST] Hitting  Jan 15, 2025  [Attention] [⋮]  │
│ [MAS]  Yelling  Jan 20, 2025  [Escape]    [⋮]  │
└─────────────────────────────────────────────────┘
                                           │
                                    ┌──────┴──────┐
                                    │ Export Word │
                                    │ Print       │
                                    │ Delete      │
                                    └─────────────┘
```

**Brief Teacher Input Response Dialog**

Before:
```text
┌────────────────────────────────────┐
│ Response Details                   │
├────────────────────────────────────┤
│ [Response content...]              │
├────────────────────────────────────┤
│              [Delete] [Close]      │
└────────────────────────────────────┘
```

After:
```text
┌────────────────────────────────────┐
│ Response Details                   │
├────────────────────────────────────┤
│ [Response content...]              │
├────────────────────────────────────┤
│ [Export Word] [Print]  [Delete] [Close] │
└────────────────────────────────────┘
```

**Brief Record Review Card**

Before:
```text
┌─────────────────────────────────────────────────┐
│ Brief Record Review                [Edit Review]│
└─────────────────────────────────────────────────┘
```

After:
```text
┌─────────────────────────────────────────────────┐
│ Brief Record Review      [Export] [Edit Review] │
└─────────────────────────────────────────────────┘
```

---
---

## Plan: Behavior Intervention Tracker – Guided Tunnel Upgrade

### Overview

This plan upgrades the existing Behavior Intervention Tracker to add a guided step-by-step "tunnel" flow while preserving the current multi-column layout. The upgrade introduces auto-population of recommended goals, custom overrides, multi-select objectives, integration with Skill Acquisition, and export connections to BIP and FBA Report generators.

---

### Current Architecture Summary

**Existing Components:**
- `InterventionWizard.tsx` - 4-step dialog wizard (Problem → Objective → Strategies → Confirm)
- `StudentBxPlanView.tsx` - Tab-based view of student's intervention links
- `BxInterventionLibrary.tsx` - 3-column library browser (Domains → Problems → Detail)
- `BxProblemList.tsx` - Problem search and list display
- `BxProblemDetail.tsx` - Problem overview with objectives and strategies tabs

**Database Tables:**
- `bx_presenting_problems` - Presenting problems with domains, functions, triggers
- `bx_objectives` - Objectives (replacement goals)
- `bx_strategies` - Intervention strategies
- `bx_problem_objective_links` - Problem → Objective mappings
- `bx_objective_strategy_links` - Objective → Strategy mappings
- `student_bx_plan_links` - Student's assigned interventions

---

### Technical Changes

#### A) Discovery + Auto-Population

| File | Change |
|------|--------|
| `src/components/behavior-interventions/BxProblemList.tsx` | Enhance search with loose matching using Levenshtein distance or fuzzy search via lowercase includes on title, definition, examples, and trigger tags |
| `src/components/behavior-interventions/InterventionWizard.tsx` | When problem is selected, auto-fetch linked objectives for selection |

**Fuzzy Search Implementation:**
```text
Filter problems where:
  - title.toLowerCase().includes(query) OR
  - definition.toLowerCase().includes(query) OR
  - problem_code.toLowerCase().includes(query) OR
  - examples.some(ex => ex.toLowerCase().includes(query)) OR
  - trigger_tags.some(tag => tag.toLowerCase().includes(query)) OR
  - domain label includes query
```

---

#### B) Step-by-Step Tunnel Flow with Locked Steps

| File | Change |
|------|--------|
| `src/components/behavior-interventions/GuidedInterventionTracker.tsx` (new) | Create new component with 4-step visible columns that lock until "Continue" is clicked |

**Flow Structure:**
```text
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ Step 1: Problem    │ Step 2: Objective  │ Step 3: Replacement Goal │ Step 4: Interventions │
│ [ACTIVE]           │ [LOCKED]           │ [LOCKED]                 │ [LOCKED]              │
│                    │                    │                          │                       │
│ Search problems... │ Dropdown + Other   │ Auto-populated           │ Recommended strategies│
│ [Problem cards]    │ Custom objective   │ + Custom override        │ + Custom intervention │
│                    │                    │                          │                       │
│ [Continue →]       │ [Continue →]       │ [Continue →]             │ [Assign to Student]   │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

**Step State Management:**
```typescript
interface TunnelState {
  currentStep: 1 | 2 | 3 | 4;
  selectedProblem: BxPresentingProblem | null;
  selectedObjective: { type: 'library' | 'custom'; objectiveId?: string; title: string } | null;
  additionalObjectives: Array<{ type: 'library' | 'custom'; objectiveId?: string; title: string }>;
  selectedReplacementGoal: { type: 'library' | 'custom'; value: string } | null;
  selectedInterventions: Array<{ type: 'library' | 'custom'; strategyId?: string; name: string; phase?: string }>;
}
```

---

#### C) Objective Selection + Custom Override (Step 2)

| File | Change |
|------|---------|
| `src/components/behavior-interventions/ObjectiveStep.tsx` (new) | Create objective selection step with dropdown of linked objectives and custom text input |

**UI Specifications:**
- Dropdown showing linked objectives from the selected problem (ordered by priority)
- First linked objective is auto-selected as default
- Text input labeled "Other objective (custom)" 
- When user types in custom field and confirms, it becomes the selected objective
- Custom objectives saved to student's skill program, not the library
- Optional: "Add Additional Objectives" section with checkbox list of remaining linked objectives

---

#### D) Replacement Goal Selection + Custom Override (Step 3)

| File | Change |
|------|---------|
| `src/components/behavior-interventions/ReplacementGoalStep.tsx` (new) | Create replacement goal selection step with dropdown and custom text input |

**UI Specifications:**
- Dropdown showing auto-suggested replacement goals based on the selected objective
- First linked goal is pre-selected as default
- Text input labeled "Other replacement goal (custom)"
- When user types in custom field, it becomes the selected goal
- Custom goals saved to student profile, not the library

---

#### E) Recommended Interventions Multi-Select (Step 4)

| File | Change |
|------|---------|
| `src/components/behavior-interventions/InterventionsStep.tsx` (new) | Create interventions selection with auto-recommendations |

**Auto-Population Logic:**
1. Fetch strategies linked to selected objectives
2. Match strategies where `strategy_type` tags align with selected objective tags
3. Display grouped by phase (Prevention, Teaching, Reinforcement, Maintenance, Crisis)

**UI Specifications:**
- Multi-select checklist with phase badges
- Strategy type tags displayed (antecedent/teaching/reinforcement/etc.)
- "Add custom intervention" free text input

---

#### F) Assign to Student + Skill Program Creation

| File | Change |
|------|---------|
| `src/types/behavior.ts` | Add `BxSkillProgram` interface |
| `src/store/dataStore.ts` | Add `addBxSkillProgram` action |
| `src/components/behavior-interventions/GuidedInterventionTracker.tsx` | Implement assign action creating skill program record |

**New Type:**
```typescript
interface BxSkillProgram {
  id: string;
  studentId: string;
  problemId: string;
  problemTitle: string;
  selectedObjective: {
    objectiveId?: string;
    title: string;
    isCustom: boolean;
  };
  additionalObjectives: Array<{
    objectiveId?: string;
    title: string;
    isCustom: boolean;
  }>;
  replacementGoal: string;
  isCustomGoal: boolean;
  interventions: Array<{
    strategyId?: string;
    name: string;
    phase?: string;
    isCustom: boolean;
  }>;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}
```

**Save Logic:**
1. Create `BxSkillProgram` record in student profile (`student.bxSkillPrograms[]`)
2. For each objective, optionally create a corresponding SkillTarget for data collection
3. Toast success: "Skill program saved"

**Linked Skill Target Section on Behavior Cards:**
| File | Change |
|------|---------|
| `src/components/ABCTracker.tsx` | Add "Linked Skill Target" section showing goal + objectives if behavior has a linked program |
| `src/components/FrequencyTracker.tsx` | Same as above |
| `src/components/StudentDataCard.tsx` | Pass linked skill programs to child trackers |

---

#### G) BIP Generator Integration

| File | Change |
|------|---------|
| `src/components/BIPGenerator.tsx` | Add import from BxSkillPrograms, display replacement goals and objectives |

**Integration Points:**
1. Add "Import from Skill Programs" button in the Import step
2. When clicked, populate:
   - Target behaviors from `program.problemTitle`
   - Replacement behaviors from `program.selectedObjective` + `program.additionalObjectives`
   - Teaching strategies from `program.interventions.filter(i => i.phase === 'teaching')`
   - Preventative from `phase === 'prevention'`
   - Reinforcement from `phase === 'reinforcement'`
   - Reactive from `phase === 'crisis' || phase === 'maintenance'`

---

#### H) FBA Report Generator Integration

| File | Change |
|------|---------|
| `src/components/FBAReportGenerator.tsx` | Add "Replacement Skill Plan" section pulling from BxSkillPrograms |

**New Export Section:**
```text
REPLACEMENT SKILL PLAN

Target Behavior: [problem.title]
Primary Objective: [program.selectedObjective.title]
Replacement Goal: [program.replacementGoal]

Additional Objectives:
  • [objective 1]
  • [objective 2]

Recommended Interventions:
  Prevention:
    • [intervention 1]
  Teaching:
    • [intervention 2]
  Reinforcement:
    • [intervention 3]
```

Add checkbox in `includeSections`: `replacementPlan: true`

---

#### I) Backward Compatibility

| Consideration | Approach |
|---------------|----------|
| Existing `student_bx_plan_links` | Continue to work; new system adds `bxSkillPrograms` as a parallel structure |
| Existing wizard usage | Keep `InterventionWizard.tsx` for quick add; new `GuidedInterventionTracker` for full tunnel |
| Column-based library | `BxInterventionLibrary.tsx` unchanged, can launch guided flow from "Add to Student" |

---

### Database Changes

**No new tables required** - storing `bxSkillPrograms` in student profile JSON field (similar to existing `bx_problem_links` pattern in `background_info`).

**Optional Future Migration:**
If needed, can migrate to a dedicated `bx_skill_programs` table with columns matching the interface above.

---

### New Files to Create

| File | Purpose |
|------|---------|
| `src/components/behavior-interventions/GuidedInterventionTracker.tsx` | Main container for 4-step guided flow |
| `src/components/behavior-interventions/ObjectiveStep.tsx` | Step 2: Objective selection with dropdown + custom override |
| `src/components/behavior-interventions/ReplacementGoalStep.tsx` | Step 3: Goal selection with custom override |
| `src/components/behavior-interventions/InterventionsStep.tsx` | Step 4: Multi-select interventions |
| `src/components/behavior-interventions/TunnelSummaryPanel.tsx` | Summary sidebar showing all selections |
| `src/components/behavior-interventions/LinkedSkillProgramCard.tsx` | Card component showing linked program on behavior trackers |

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/types/behavior.ts` | Add `BxSkillProgram` interface |
| `src/store/dataStore.ts` | Add `addBxSkillProgram`, `updateBxSkillProgram`, `getBxSkillProgramsForStudent` actions |
| `src/components/behavior-interventions/BxProblemList.tsx` | Enhance fuzzy search |
| `src/components/behavior-interventions/InterventionWizard.tsx` | Auto-populate recommended objective from problem |
| `src/components/BIPGenerator.tsx` | Add import from skill programs section |
| `src/components/FBAReportGenerator.tsx` | Add Replacement Skill Plan section |
| `src/components/ABCTracker.tsx` | Add Linked Skill Target section |
| `src/components/FrequencyTracker.tsx` | Add Linked Skill Target section |
| `src/components/behavior-interventions/index.ts` | Export new components |
| `src/hooks/useBehaviorInterventions.ts` | Add `useBxSkillPrograms` hook |

---

### Implementation Order

1. **Phase 1: Type Definitions**
   - Add `BxSkillProgram` interface to types
   - Add store actions for skill programs

2. **Phase 2: Guided Tunnel Flow**
   - Create `GuidedInterventionTracker.tsx` shell
   - Implement step 1 (Problem) with enhanced search
   - Implement step 2 (Objective) with dropdown + custom override
   - Implement step 3 (Replacement Goal) with auto-populate and custom override
   - Implement step 4 (Interventions) with auto-recommendations
   - Add summary panel

3. **Phase 3: Assign to Student**
   - Implement save logic creating `BxSkillProgram`
   - Add student selector if not in student context
   - Create `LinkedSkillProgramCard` component
   - Integrate into behavior trackers (ABC, Frequency)

4. **Phase 4: Report Integration**
   - Update `BIPGenerator.tsx` with skill program import
   - Update `FBAReportGenerator.tsx` with Replacement Skill Plan section
   - Update Word export templates

5. **Phase 5: Testing & Polish**
   - End-to-end test the full tunnel flow
   - Verify backward compatibility with existing interventions
   - Add "Go to Skill Program" navigation button

---

### UX Summary

- **Locked Steps**: Later steps show dimmed content with "Complete previous step" message until user clicks "Continue"
- **Summary Panel**: Right sidebar showing: Problem → Objective → Replacement Goal → Interventions as user progresses
- **Navigation**: "Continue" buttons advance to next step; "Back" buttons allow revision
- **Final Screen**: Clear summary with "Assign to Student" button
- **Post-Save**: Toast notification, option to "Go to Skill Program" or "Add Another"

### Testing Checklist

After implementation, verify:
- [ ] FAST assessment exports with correct 16 items and 4 function scores
- [ ] MAS assessment exports with correct items and scoring
- [ ] QABF assessment exports with correct 25 items and scoring
- [ ] Brief Teacher Input exports all sections including multi-select fields
- [ ] Brief Record Review exports all 6 sections with tables
- [ ] Print functionality opens browser print dialog with formatted content
- [ ] Export filenames include student name and date
- [ ] Tables render correctly in Word with borders and alignment

