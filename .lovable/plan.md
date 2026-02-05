

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

