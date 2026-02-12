

# Assessment Report Generator with AI-Powered Narratives and Recommendations

## Overview

This plan adds a professional assessment report export system for VB-MAPP, ABLLS-R, and all 6 AFLS modules. Each report follows the exact formatting from your uploaded templates (cover page with client/provider info, instrument description, domain-by-domain score narratives, graphs, summary, and recommendations). AI (via Lovable AI) generates clinical narratives explaining what each score means for that student and produces individualized recommendations.

---

## What the Templates Show (Common Structure)

All 8 uploaded templates share an identical structure:

1. **Cover page**: Client Information table + Provider Information table (name, DOB, address, diagnosis, evaluator, NPI, Tax ID, etc.)
2. **Standard sections**: Reason for Referral, Background, Parent/Caregiver Interview, Client Interview, Teacher Interview, Behavioral Observations
3. **Instrument description paragraph** (boilerplate text specific to VB-MAPP, ABLLS-R, or AFLS module)
4. **Graph placeholder** ("Add graph here for [module]")
5. **Domain-by-domain score narratives** (one heading per domain/skill area with narrative text below)
6. **Summary**
7. **Recommendations**
8. **Signature block** (BCBA name, NPI, certification number, signature line, date)

---

## Architecture

### 1. New Edge Function: `generate-assessment-report`

This edge function receives the student's scored assessment data and uses Lovable AI to produce:
- **Score explanations**: For each domain, a 2-3 sentence clinical narrative explaining what the raw score and mastery percentage mean functionally for that student
- **Summary**: An overall clinical summary paragraph
- **Recommendations**: 3-8 specific, actionable recommendations based on strengths and priority areas

**Input payload:**
```text
{
  assessmentType: "vbmapp" | "ablls-r" | "afls",
  aflsModule?: "bls" | "hs" | "ss" | "cp" | "ils" | "vs",
  studentName: string,
  studentAge: string,
  domainScores: [{ domain, raw, max, percent, status }],
  overallMastery: number,
  strengths: string[],
  priorities: string[]
}
```

**Output:**
```text
{
  domainNarratives: { [domain]: string },
  summary: string,
  recommendations: string[]
}
```

The prompt instructs the model to write in third-person clinical language, reference specific score percentages, and tie recommendations to the identified priority areas. The model used will be `google/gemini-3-flash-preview` for speed and cost efficiency.

### 2. New Export Utility: `src/lib/assessmentReportExport.ts`

A `.docx` generation engine that produces reports matching the uploaded template formatting:

- **Cover page**: Client Information and Provider Information in a structured table layout
- **Narrative sections**: Reason for Referral, Background, interviews, and behavioral observations as editable text fields
- **Instrument description**: Static boilerplate paragraph matching each assessment type
- **Graph placeholder**: Space reserved for chart images (base64 if available from the tracker grid)
- **Domain sections**: Each domain as a Heading 1 with the AI-generated narrative below
- **Summary and Recommendations**: AI-generated content, editable before export
- **Signature block**: BCBA name, NPI, certification number, signature line, date

Separate builder functions:
- `buildVBMAPPReport()` -- includes Milestones domains, Barriers section, Transitions section
- `buildABLLSRReport()` -- 25 domain headings (A through Z)
- `buildAFLSReport(module)` -- Module-specific skill areas per template

### 3. New UI Component: `src/components/assessment/AssessmentReportExport.tsx`

Added as a button/tab within the existing `InternalTrackerReport` and `VBMAPPGrid` components. Workflow:

1. Click "Generate Report" (the existing "Export PDF" button becomes this)
2. Modal opens showing:
   - **Client Info fields** (pre-filled from student profile, all editable)
   - **Provider Info fields** (pre-filled from agency/user profile, all editable)
   - **Narrative sections** (Reason for Referral, Background, etc.) as editable text areas
   - **"Generate AI Narratives" button** -- calls the edge function, populates domain narratives + summary + recommendations
   - **All AI-generated text is editable** before final export
   - **Section toggles** to include/exclude any section
3. Click "Download .docx" to generate the final document

### 4. Data the System Already Has (Auto-Population)

From the existing `InternalTrackerReport` component and assessment records:
- Student name, DOB from student profile
- All domain scores (raw, max, mastery %) from `results_json` in `student_assessments`
- Strengths and priority areas (already computed in `InternalTrackerReport`)
- Date administered, evaluator name, assessment status
- Agency/provider info from user profile and `report_branding`

### 5. What Needs Manual Input

These fields appear in the templates but are not currently stored:
- Provider Tax ID, NPI (added as editable fields, saved to user profile if desired)
- Parent/guardian names, phone, address
- Diagnosis code
- Reason for Referral narrative
- Background narrative
- Parent/Caregiver Interview narrative
- Client Interview narrative
- Teacher Interview narrative
- Behavioral Observations narrative

All of these will be editable text areas in the generation modal, and the system will remember previously entered values per student for convenience.

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/generate-assessment-report/index.ts` | Edge function calling Lovable AI for narratives and recommendations |
| `src/lib/assessmentReportExport.ts` | Word document generation matching uploaded template formatting |
| `src/components/assessment/AssessmentReportExport.tsx` | UI modal for editing fields and triggering export |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/assessment/InternalTrackerReport.tsx` | Replace "Export PDF" button with AssessmentReportExport trigger |
| `src/components/skills/VBMAPPGrid.tsx` | Add report export button for VB-MAPP assessments |
| `supabase/config.toml` | Register the new edge function |

## Execution Order

1. Create the edge function for AI narrative generation
2. Create the `.docx` export utility with template-matched formatting
3. Create the report export UI component
4. Wire into existing tracker report views (AFLS, ABLLS-R, VB-MAPP)

