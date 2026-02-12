

# Insurance & School Report Templates + Export Fix Overhaul

## Overview
This plan addresses two intertwined problems: (1) broken export buttons across the platform that show a toast but never produce a downloadable file, and (2) a new payer-specific report template system that generates professional Word (.docx) documents matching the uploaded insurance formats.

---

## Part 1: Fix All Broken Exports

### Problem
Four export features show "Report Generated" toasts but never produce a downloadable file:

1. **EnhancedExportOptions** -- `handleGenerateReport()` only calls `toast()` (line 175)
2. **IEP Meeting Prep Wizard** -- saves to database but has no download button
3. **WhiteLabelReportGenerator** -- saves a `generated_reports` record but no file download
4. **SessionReportGenerator** -- only uses `window.print()`

### Fix Approach
Each will be wired up to use the `docx` library (already installed) + `file-saver` (already installed), matching the pattern already working in `FBAReportGenerator.tsx`.

**EnhancedExportOptions**: Replace the toast-only handler with a function that builds a Word document using `Document`, `Packer`, and `saveAs`. The document will contain the selected report type content (weekly summary, monthly, IEP progress, etc.) populated from the student's data store.

**IEP Meeting Prep Wizard**: Add a "Download Report" button in the final step that generates a Word document containing all 6 wizard steps' data (Meeting Details, Data Review, Goal Progress, Recommendations, Documents, Attendees).

**WhiteLabelReportGenerator**: After saving to `generated_reports`, immediately generate and download the branded Word document using the selected branding (logo, colors, footer).

**SessionReportGenerator**: Add a "Download .docx" button alongside the existing print option.

---

## Part 2: Payer Report Template System

### Database Schema

**New table: `payer_report_templates`**

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | |
| name | text | Display name (e.g., "L.A. Care FBA/Progress Report") |
| payer_ids | text[] | Array of payer IDs this template applies to (from payer directory) |
| payer_names | text[] | Human-readable payer names for display |
| report_type | text | "initial_assessment" or "progress_report" |
| is_default | boolean | Whether this is the fallback template |
| sections | jsonb | Ordered array of section definitions (see below) |
| agency_id | uuid | Org ownership |
| created_at | timestamptz | |
| updated_at | timestamptz | |

The `sections` JSONB stores the template structure:
```text
[
  {
    "key": "identifying_info",
    "title": "I. IDENTIFYING INFORMATION",
    "enabled": true,
    "fields": [
      { "key": "patient_name", "label": "Patient's Last/First Name", "type": "text", "required": true },
      { "key": "dob", "label": "Date of Birth", "type": "date", "required": true },
      { "key": "health_plan", "label": "Health Plan Name", "type": "text", "prefill": "L.A. Care Health Plan" },
      ...
    ]
  },
  {
    "key": "reason_for_referral",
    "title": "II. REASON FOR REFERRAL",
    "enabled": true,
    "fields": [...]
  },
  ...
]
```

### Template Definitions (Pre-seeded)

**1. HC General Template (DEFAULT)**
- report_type: both (one row for initial, one for progress)
- Sections: Background/Methodology, Developmental History, Family Constellation, Birth/Medical History, Review of Records, Preference Assessment, Developmental Assessment (Vineland), VB-MAPP Results, Behavior Reduction Goals, Skill Acquisition Goals, Recommendations, Signatures
- Mapped to: Default fallback

**2. L.A. Care Template**
- report_type: both
- Sections: Identifying Information (with L.A. Care-specific fields like Medical ID, PCP, 10-day timeline), Reason for Referral (checkbox grid), Background Information (Family Structure, Availability, Health History, School History, Care Coordination), Clinical Interview, Direct Assessment Procedures, Preference Assessment, Outcome Measurements, Measurable Goals by Domain (Communication, Learning Skills, Daily Living, Social/Community/Play), Problem Behaviors, Treatment Recommendations, Signatures
- Mapped to: L.A. Care Health Plan payer records

**3. CalOptima Template**
- report_type: both
- Sections: Identification (with CIN#, Tax ID, NPI), Session Information (CPT code utilization table), School Information, Medical Information, Coordination of Care, Barriers to Progress, Adaptive Testing (Vineland-3), DSM-V, Target Behavior Goals (with graph placeholders), Skill Acquisition Goals by Intervention Area, Parent/Caregiver Goals, Report Summary, Treatment Recommendations
- Mapped to: CalOptima + regional center payers

**4. Cigna/Commercial Template**
- report_type: both
- Sections: Reason for Referral, Background/Methodology, Developmental History, Birth/Medical, ABA Treatment History, Other Services, Review of Records, Preference Assessment, Developmental Assessment (Vineland + PDD-BI + SRS-2), VB-MAPP Milestones Grid, Behavior Reduction Goals (with definitions, baselines, functions, interventions), Skill Acquisition Goals, Recommendations
- Mapped to: Cigna + other commercial plans

### Section Toggle System
Each template's sections can be toggled on/off at export time. The UI will show all available sections as checkboxes, pre-checked based on the template default, but the clinician can customize which sections to include for any individual report.

---

## Part 3: Report Generation UI

### New Component: `InsuranceReportGenerator`
Located at: `src/components/reports/InsuranceReportGenerator.tsx`

This replaces the current "Export Reports" button on the Reports page and is also accessible from individual student profiles.

**Workflow:**
1. Select student
2. System auto-detects the student's primary payer and selects the matching template
3. Clinician can override the template selection via a dropdown
4. Choose report type: Initial Assessment or Progress Report
5. Select date range
6. Toggle sections on/off
7. Fill in any template-specific fields not auto-populated from data
8. Preview the report structure
9. Click "Generate .docx" to download

### Auto-Population Logic
The generator pulls data from existing stores:
- Student demographics from student profile
- Behavior data from `frequencyEntries`, `abcEntries`
- Assessment results from `student_assessments` (VB-MAPP, Vineland scores)
- Goals from `behaviorGoals` and skill programs
- Session data from `sessions`
- Branding from `report_branding` (logo, agency name, contact info)
- Payer info from `payer_directory` / student's insurance records

Fields that cannot be auto-populated will show as editable text inputs in the generation form.

---

## Part 4: Word Document Generation Engine

### New Utility: `src/lib/insuranceReportExport.ts`

A centralized .docx generation engine that:
- Takes a template definition + populated data + branding
- Produces a professional Word document matching the uploaded format
- Handles tables, headers, checkboxes, numbered sections, page headers/footers
- Applies branding (logo in header, agency info, footer text)
- Embeds graph images as base64 (behavior trend charts, VB-MAPP grids)

Each template format gets a dedicated builder function:
- `buildLACareReport(data, branding)`
- `buildCalOptimaReport(data, branding)`
- `buildCignaReport(data, branding)`
- `buildHCGeneralReport(data, branding)`

---

## Part 5: School FBA Template (Placeholder)

A placeholder entry will be created for the school version template. The user mentioned they will send school FBA samples separately. When those are uploaded, a school-specific template will be added with reduced sections (no insurance/billing fields, simplified clinical language).

---

## Files to Create
- `src/components/reports/InsuranceReportGenerator.tsx` -- Main UI component
- `src/lib/insuranceReportExport.ts` -- Word document generation engine
- `src/types/reportTemplates.ts` -- TypeScript types for template system

## Files to Modify
- `src/components/EnhancedExportOptions.tsx` -- Wire up actual .docx generation
- `src/components/iep/IEPMeetingPrepWizard.tsx` -- Add download button
- `src/components/reports/WhiteLabelReportGenerator.tsx` -- Add file download after save
- `src/components/SessionReportGenerator.tsx` -- Add .docx download option
- `src/pages/Reports.tsx` -- Add Insurance Report Generator entry card

## Database Migration
- Create `payer_report_templates` table with RLS policies
- Seed the 4 template definitions (HC General, LA Care, CalOptima, Cigna)

## Execution Order
1. Database migration (create table + seed templates)
2. Create TypeScript types
3. Build the .docx generation engine
4. Fix the 4 broken export components
5. Build the InsuranceReportGenerator UI
6. Wire up to Reports page and student profiles
