

# Comprehensive Feature Build Plan: 8 Features

## Overview

This plan covers the implementation of 8 major features in a single build cycle, organized into logical groups to manage dependencies and minimize conflicts.

---

## Feature 1: Payroll Integration & Timesheet Management

### What It Does
Automatically generates timesheets from completed sessions, tracks drive time and mileage, calculates billable vs. non-billable hours, and exports to common payroll formats (CSV for QuickBooks, Gusto, ADP).

### Database Tables

**`staff_timesheets`** - Weekly/biweekly timesheet records
- Links to staff user, pay period dates, status (draft/submitted/approved/exported)
- Tracks total hours, billable hours, non-billable hours, drive time, mileage

**`timesheet_entries`** - Individual time entries within a timesheet
- Links to appointment/session, entry type (session/drive/admin/training/meeting)
- Tracks clock-in/out, duration, mileage, billable flag, pay rate

**`payroll_exports`** - Export history for audit trail
- Stores format, date range, staff included, file reference

### UI Components
- **Timesheets Tab** added to the Billing page - view/approve/export timesheets
- **TimesheetGenerator** - auto-populate from completed appointments for a pay period
- **TimesheetApproval** - admin review with edit capability
- **PayrollExportDialog** - choose format (QuickBooks CSV, Gusto CSV, ADP CSV, Generic)
- **MileageTracker** - staff can log drive time between appointments

### Key Files
- `src/types/payroll.ts`
- `src/hooks/useTimesheets.ts`
- `src/components/payroll/TimesheetDashboard.tsx`
- `src/components/payroll/TimesheetGenerator.tsx`
- `src/components/payroll/TimesheetEntryEditor.tsx`
- `src/components/payroll/PayrollExportDialog.tsx`
- `src/components/payroll/MileageTracker.tsx`

---

## Feature 2: ERA/835 Processing

### What It Does
Parses Electronic Remittance Advice (ERA/835) files to auto-match payments to claims, identify underpayments and denials, and post payments with one-click reconciliation.

### Database Tables

**`era_remittances`** - Parsed ERA file records (already partially typed in `billing.ts`)
- Expands to include: payer info, provider info, check/EFT number, total paid, adjustments

**`era_line_items`** - Individual service line payments from ERAs
- Links to claim line items, paid amount, allowed amount, adjustment reason codes, patient responsibility, remark codes

**`era_imports`** - Import history and file tracking
- Stores raw file content, parse status, match results

### Implementation
- **835 Parser** - Edge function that parses standard ANSI X12 835 file format
- **Auto-Matching Engine** - matches ERA line items to existing claims by claim number, patient, dates, CPT codes
- **Payment Posting** - updates claim status and amounts from matched ERA data
- **Discrepancy Alerts** - flags underpayments, unexpected denials, and unmatched lines

### UI Components
- **ERA Processing Tab** added to Billing page
- **ERAImportDialog** - upload and parse 835 files
- **ERAMatchingReview** - review auto-matched payments before posting
- **PaymentPostingDashboard** - one-click post or manual review
- **RemittanceSummary** - overview of payment batches

### Key Files
- `src/types/era.ts`
- `src/hooks/useERAProcessing.ts`
- `src/components/billing/ERAImportDialog.tsx`
- `src/components/billing/ERAMatchingReview.tsx`
- `src/components/billing/PaymentPostingDashboard.tsx`
- `supabase/functions/parse-era-835/index.ts`

---

## Feature 3: Office Ally Clearinghouse Integration

### What It Does
Generates ANSI X12 837P (Professional) claim files for electronic submission, tracks claim status, and manages the submission workflow through Office Ally.

### Implementation Approach
Since direct API integration with Office Ally requires a vendor agreement, we will:
1. Generate properly formatted 837P files that can be uploaded to Office Ally's portal
2. Track submission status within the app
3. Support batch claim generation
4. Provide a claim status tracking workflow

### Database Tables

**`clearinghouse_submissions`** - Batch submission tracking
- Stores batch ID, submission date, claim count, file reference, status, response data

**`claim_submission_history`** - Per-claim submission tracking
- Links to billing claim, submission batch, clearinghouse status, rejection reasons

### UI Components
- **Clearinghouse Tab** added to Billing page
- **ClaimBatchBuilder** - select claims for batch submission, validate completeness
- **Generate837PDialog** - creates downloadable 837P file
- **SubmissionTracker** - track batches and individual claim status
- **ClaimValidationChecklist** - pre-submission validation (NPI, taxonomy codes, required fields)

### Key Files
- `src/types/clearinghouse.ts`
- `src/hooks/useClearinghouse.ts`
- `src/components/billing/ClaimBatchBuilder.tsx`
- `src/components/billing/Generate837PDialog.tsx`
- `src/components/billing/SubmissionTracker.tsx`
- `supabase/functions/generate-837p/index.ts`

---

## Feature 4: Curriculum & Protocol Library

### What It Does
Provides built-in curriculum frameworks (ABLLS-R, PEAK, AFLS, EFL, TOPS-2, TOPL-3) with protocol templates, step-by-step instructions, and automatic target selection based on prerequisites.

### Approach
The existing `curriculum_systems`, `curriculum_items`, and `domains` tables already support this architecture. We will:
1. Seed the database with framework metadata for all 6 systems
2. Build a Protocol Template system for step-by-step teaching procedures
3. Add protocol fidelity tracking tied to specific programs
4. Enhance the existing Skills tab with protocol views

### Database Tables

**`protocol_templates`** - Teaching procedure templates
- Links to curriculum item, includes steps (JSONB), materials needed, prompt hierarchy, error correction procedure, mastery criteria, generalization guidelines

**`protocol_assignments`** - Assigned protocols per student
- Links student + protocol template, tracks status, customizations, assigned staff

### Curriculum Systems to Seed
| System | Type | Description |
|--------|------|-------------|
| ABLLS-R | Assessment | Assessment of Basic Language and Learning Skills - Revised |
| PEAK | Curriculum | Promoting the Emergence of Advanced Knowledge |
| AFLS | Assessment | Assessment of Functional Living Skills |
| EFL | Curriculum | Essential for Living |
| TOPS-2 | Assessment | Test of Problem Solving - 2nd Edition |
| TOPL-3 | Assessment | Test of Pragmatic Language - 3rd Edition |

### UI Components
- **ProtocolLibrary** - browse/search/filter protocols by curriculum, domain, level
- **ProtocolTemplateBuilder** - create custom teaching protocols
- **ProtocolViewer** - step-by-step view during sessions
- **ProtocolAssignmentManager** - assign protocols to students
- Enhanced **CurriculumSubTab** with protocol integration

### Key Files
- `src/types/protocol.ts`
- `src/hooks/useProtocols.ts`
- `src/components/curriculum/ProtocolLibrary.tsx`
- `src/components/curriculum/ProtocolTemplateBuilder.tsx`
- `src/components/curriculum/ProtocolViewer.tsx`
- `src/components/curriculum/ProtocolAssignmentManager.tsx`

---

## Feature 5: Advanced Graphing & Visual Analysis Engine

### What It Does
Adds ABA-specific graphing capabilities: phase change lines, trend/celeration lines, aim lines, multi-element designs, annotations, and publication-quality export.

### Approach
Build on the existing Recharts-based `BehaviorTrendCharts` and `SkillProgressCharts` by adding:
1. Phase change line overlay system
2. Trend line calculations (split-middle, least-squares)
3. Aim line projection
4. Condition labels and annotations
5. Multi-element/alternating treatment graph type
6. High-resolution image export (SVG/PNG)

### Database Tables

**`graph_annotations`** - Phase changes, notes, and condition labels
- Links to student + behavior/target, annotation type (phase_change/condition_label/note/aim_line), position data, label text, styling

**`graph_configurations`** - Saved graph presets
- Stores chart type, data sources, display options, date range, annotations included

### UI Components
- **AdvancedGraphEditor** - interactive graph with drag-to-place annotations
- **PhaseChangeManager** (already exists, needs enhancement) - add/edit phase lines on charts
- **TrendLineControls** - toggle and configure trend/celeration lines
- **AimLineBuilder** - set target and deadline for aim line projection
- **GraphExportDialog** - export as SVG, PNG, or include in reports
- **MultiElementGraph** - alternating treatment design visualization

### Key Files
- `src/types/graphing.ts`
- `src/hooks/useGraphAnnotations.ts`
- `src/components/graphing/AdvancedGraphEditor.tsx`
- `src/components/graphing/TrendLineCalculator.tsx`
- `src/components/graphing/AimLineBuilder.tsx`
- `src/components/graphing/GraphExportDialog.tsx`
- `src/components/graphing/MultiElementGraph.tsx`
- `src/lib/graphCalculations.ts` (split-middle, celeration math)

---

## Feature 6: Caregiver Training Tracking

### What It Does
Tracks parent/caregiver training using Behavioral Skills Training (BST) methodology: instruction, modeling, rehearsal, feedback. Documents competency, training hours, and generalization probes.

### Database Tables

**`caregiver_training_programs`** - Training program definitions
- Program name, target skills, BST steps, competency criteria, estimated duration

**`caregiver_training_sessions`** - Individual training session records
- Links to student, caregiver info, program, date, duration, BST phase (instruction/model/rehearse/feedback), competency rating, notes, staff providing training

**`caregiver_competency_checks`** - Competency assessment records
- Links to training program, checklist items (JSONB), percent correct, setting, passed/failed

**`caregiver_generalization_probes`** - Probes in natural settings
- Links to training program, setting, observer, items observed, fidelity percentage

### UI Components
- **CaregiverTrainingTab** added to Student Profile
- **TrainingProgramBuilder** - create BST-based training programs
- **TrainingSessionLogger** - log training sessions with BST phase tracking
- **CompetencyCheckForm** - checklist-style assessment
- **GeneralizationProbeForm** - natural setting observation
- **CaregiverTrainingDashboard** - progress overview, hours logged, competencies achieved

### Key Files
- `src/types/caregiverTraining.ts`
- `src/hooks/useCaregiverTraining.ts`
- `src/components/caregiver-training/CaregiverTrainingTab.tsx`
- `src/components/caregiver-training/TrainingProgramBuilder.tsx`
- `src/components/caregiver-training/TrainingSessionLogger.tsx`
- `src/components/caregiver-training/CompetencyCheckForm.tsx`
- `src/components/caregiver-training/CaregiverTrainingDashboard.tsx`

---

## Feature 7: Staff Recruiting & Onboarding Pipeline

### What It Does
Manages the hiring pipeline from job posting through onboarding completion, including applicant tracking, digital onboarding checklists, RBT training progress, and mentor pairing.

### Database Tables

**`job_postings`** - Open positions
- Title, description, requirements, credential required, location, status (open/filled/closed), posted date

**`job_applicants`** - Applicant tracking
- Name, email, phone, resume URL, applied date, source, status pipeline (applied/screening/interview/offer/hired/rejected), notes, rating

**`onboarding_templates`** - Checklists for new hire types
- Template name, role type (RBT/BCBA/Admin), items (JSONB array of tasks with due offsets)

**`onboarding_tasks`** - Individual onboarding task assignments
- Links to new hire user, template, task name, category (paperwork/training/compliance/orientation), due date, completed date, status, document URL

**`mentor_assignments`** - Buddy/mentor pairings
- New hire user, mentor user, start date, end date, status, notes

### UI Components
- **RecruitingDashboard** (new page or Admin sub-tab) - pipeline view of applicants
- **JobPostingManager** - create/edit job postings
- **ApplicantTracker** - kanban-style pipeline
- **OnboardingTemplateBuilder** - create role-specific checklists
- **OnboardingProgress** - track new hire completion
- **MentorAssignmentManager** - pair new hires with mentors

### Key Files
- `src/types/recruiting.ts`
- `src/hooks/useRecruiting.ts`
- `src/hooks/useOnboarding.ts`
- `src/components/recruiting/RecruitingDashboard.tsx`
- `src/components/recruiting/ApplicantPipeline.tsx`
- `src/components/recruiting/OnboardingTemplateBuilder.tsx`
- `src/components/recruiting/OnboardingProgress.tsx`
- `src/pages/Recruiting.tsx`

---

## Feature 8: LMS & Custom Form Builder

### What It Does
**LMS**: CEU tracking for BCBAs/RBTs, training module creation, quiz-based assessments, compliance deadline tracking.
**Form Builder**: Drag-and-drop form designer with conditional logic, e-signatures, versioning, and PDF generation.

### Database Tables

**LMS Tables:**

**`training_modules`** - Training content
- Title, description, content type (video/document/quiz/interactive), content URL/data, duration estimate, CEU credits, category, required roles, pass criteria

**`training_assignments`** - Assigned training per staff
- Links to module + staff user, assigned date, due date, status (assigned/in_progress/completed/overdue), completed date, score, attempts

**`ceu_records`** - CEU tracking
- Staff user, activity type, title, provider, credits earned, date completed, expiration date, certificate URL, BACB requirement category

**Form Builder Tables:**

**`custom_forms`** - Form definitions
- Title, description, form schema (JSONB - fields with conditional logic), version, status (draft/published/archived), category, requires signature, created by

**`custom_form_submissions`** - Completed form responses
- Links to form + student (optional), respondent info, responses (JSONB), signature data, submitted at, status

### UI Components

**LMS:**
- **LMSDashboard** (new page) - training assignments, progress, CEU tracker
- **TrainingModuleBuilder** - create modules with content and quizzes
- **TrainingAssignmentManager** - bulk assign training to staff by role
- **CEUTracker** - track credits toward BACB requirements
- **ComplianceDeadlineAlerts** - upcoming expiration warnings

**Form Builder:**
- **FormBuilderCanvas** - drag-and-drop field editor with conditional logic
- **FormFieldPalette** - available field types
- **FormPreview** - live preview of form
- **FormSubmissionViewer** - review responses
- Enhanced from existing `ConsentFormBuilder` patterns

### Key Files
- `src/types/lms.ts`, `src/types/formBuilder.ts`
- `src/hooks/useLMS.ts`, `src/hooks/useFormBuilder.ts`
- `src/components/lms/LMSDashboard.tsx`
- `src/components/lms/TrainingModuleBuilder.tsx`
- `src/components/lms/CEUTracker.tsx`
- `src/components/form-builder/FormBuilderCanvas.tsx`
- `src/components/form-builder/FormPreview.tsx`
- `src/pages/LMS.tsx`

---

## Navigation & Integration Points

### New Pages/Routes
| Route | Page | Access |
|-------|------|--------|
| `/recruiting` | Recruiting & Onboarding | Admin only |
| `/lms` | Learning Management System | All authenticated |

### Billing Page Additions (new tabs)
- **Timesheets** - Payroll/timesheet management
- **ERA Processing** - ERA/835 import and payment posting
- **Clearinghouse** - 837P generation and submission tracking

### Student Profile Additions (new tabs)
- **Caregiver Training** - BST training tracking
- **Protocols** - Assigned teaching protocols

### Main Layout Header Additions
- **Recruiting** button (admin only)
- **LMS** button (all staff)

### Skills Tab Enhancements
- Protocol integration in curriculum sub-tab
- Advanced graphing access from charts

---

## Technical Details

### Database Migration Summary
- ~20 new tables across all features
- RLS policies on all tables (authenticated users, agency-scoped where applicable)
- Indexes on foreign keys and commonly queried columns

### Edge Functions
- `parse-era-835` - Parse ANSI X12 835 files server-side
- `generate-837p` - Generate ANSI X12 837P claim files

### No External API Keys Required
- All features are self-contained or use file-based workflows
- Office Ally integration is file-based (generate 837P for upload)
- Payroll exports are CSV-based (no direct API needed)

### Estimated New Files: ~60-70 files
- 8 type definition files
- 8 hook files
- ~40 component files
- 3 page files
- 2 edge functions
- 1 utility library (graph calculations)

