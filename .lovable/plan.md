
# Comprehensive Practice Management & Data Collection Expansion

This plan implements 5 major feature modules to expand the ABA Practice Management System with supervision tracking, referral pipeline, mobile data collection, billing/claims, and analytics capabilities.

---

## Overview

| Module | Priority | Key Deliverables |
|--------|----------|------------------|
| 1. Supervision Hours Tracking | High | BCBA/RBT supervision logs, compliance ratios (5%/10%), fieldwork hours |
| 2. Referral & Intake Pipeline | High | Kanban workflow, intake checklists, waitlist management |
| 3. CMS-1500 Claim Generator | High | Billing forms from session data, batch export, denial tracking |
| 4. Analytics Dashboard | Medium | Revenue tracking, utilization reports, productivity metrics |
| 5. Mobile-First Data Collection | Medium | Offline capability, one-hand tally mode, voice notes |

---

## Module 1: Supervision Hours Tracking

### Purpose
Track BCBA supervision of RBTs (5%/10% compliance per BACB requirements), log fieldwork hours for BCBA candidates, and generate compliance reports.

### Database Tables

**supervision_logs**
- Tracks individual supervision sessions between supervisor and supervisee
- Links optionally to students and data collection sessions
- Supports direct, indirect, and group supervision types
- Includes approval workflow for hours verification

**fieldwork_hours**
- Tracks BCBA candidate fieldwork experience
- Categorizes by experience type (unrestricted, restricted, concentrated)
- Links to BACB task list competencies
- Includes supervisor verification

**supervision_requirements**
- Defines compliance requirements per supervisee
- Sets target percentages (5% for experienced RBTs, 10% for new RBTs)
- Tracks billing period windows

### UI Components

1. **Supervision Dashboard** (new Admin tab or standalone page)
   - Compliance cards showing current ratios vs. targets
   - Color-coded status indicators (green/yellow/red)
   - Quick-log supervision entry button
   - Upcoming supervision due alerts

2. **Supervision Log Entry Dialog**
   - Date/time selection
   - Supervisee selection (multi-select for group supervision)
   - Supervision type (direct observation, feedback, training)
   - Activity checklist (modeling, observation, feedback, review)
   - Optional session/student linkage
   - Duration auto-calculation

3. **Staff Profile Integration**
   - Supervision hours summary this period
   - Compliance gauge visualization
   - Historical supervision log

4. **Fieldwork Tracker** (for BCBA candidates)
   - Monthly hour accumulator
   - Task list competency checkboxes (BACB 5th Edition)
   - Supervisor signature/verification
   - Progress toward 2,000 hour requirement

### Files to Create
- `src/pages/Supervision.tsx` - Main supervision dashboard
- `src/components/supervision/SupervisionDashboard.tsx` - Dashboard layout
- `src/components/supervision/SupervisionLogDialog.tsx` - Log entry form
- `src/components/supervision/ComplianceGauge.tsx` - Visual compliance indicator
- `src/components/supervision/FieldworkTracker.tsx` - Candidate hours tracking
- `src/components/supervision/SupervisionCalendar.tsx` - Calendar view of supervision
- `src/hooks/useSupervisionData.ts` - Data fetching and calculations
- `src/types/supervision.ts` - TypeScript interfaces

---

## Module 2: Referral & Intake Pipeline

### Purpose
Manage new client referrals through a structured pipeline from initial receipt to active caseload, with waitlist prioritization and intake packet generation.

### Database Tables

**referrals**
- Tracks referral source and contact information
- Stores client demographics (pre-student creation)
- Pipeline status (received, screening, assessment, accepted, waitlist, declined)
- Priority levels (urgent, high, normal, low)
- Waitlist positioning and estimated start dates
- Assigned intake coordinator

**intake_checklists**
- Template-based checklist items per referral
- Tracks completion status of required documents/steps
- Due dates for time-sensitive items

**intake_documents**
- Links uploaded files to referrals
- Document type categorization
- Upload tracking (who/when)

### UI Components

1. **Referrals Page** (new top-level route)
   - Kanban board view with draggable cards
   - List view with filtering and sorting
   - Quick referral entry button
   - Pipeline metrics summary

2. **Referral Card** (Kanban)
   - Client name and age
   - Referral source badge
   - Priority indicator
   - Days in stage counter
   - Assigned coordinator avatar

3. **Referral Detail Panel**
   - Client demographics section
   - Referral source information
   - Stage progression timeline
   - Intake checklist with checkboxes
   - Document upload area with type selection
   - Activity log/notes
   - "Convert to Student" button (final stage)

4. **Waitlist Manager**
   - Drag-to-reorder priority ranking
   - Capacity planning indicators
   - Estimated availability dates
   - Auto-notification triggers when slots open

5. **Intake Packet Generator**
   - Template selection by funding source (school, insurance, private pay)
   - Auto-fill from referral data
   - PDF generation and download
   - Email to family option

### Files to Create
- `src/pages/Referrals.tsx` - Main referrals page
- `src/components/referrals/ReferralKanban.tsx` - Kanban board
- `src/components/referrals/ReferralCard.tsx` - Individual card
- `src/components/referrals/ReferralDetailPanel.tsx` - Side panel details
- `src/components/referrals/ReferralDialog.tsx` - Add/edit referral
- `src/components/referrals/IntakeChecklist.tsx` - Checklist manager
- `src/components/referrals/WaitlistManager.tsx` - Waitlist view
- `src/components/referrals/IntakePacketGenerator.tsx` - Document generator
- `src/hooks/useReferrals.ts` - Data operations
- `src/types/referral.ts` - TypeScript interfaces

---

## Module 3: CMS-1500 Claim Generator

### Purpose
Generate professional CMS-1500 billing forms from session data, support batch export for clearinghouse submission, and track claim lifecycle including denials and appeals.

### Database Tables

**billing_claims**
- Claim header information (claim number, patient, payer)
- Service date range
- Place of service code
- Diagnosis codes (ICD-10)
- Claim status tracking (draft, submitted, paid, denied, appealed)
- Payment information (amount paid, adjustment codes)
- Denial tracking (reason, appeal deadline)

**claim_line_items**
- Individual service lines per claim
- Links to session records
- CPT code and modifiers
- Units and charges
- Rendering provider NPI

**era_remittances** (future enhancement)
- Electronic Remittance Advice import
- Payment reconciliation
- Adjustment code parsing

### UI Components

1. **Billing Dashboard** (new route or Admin > Billing tab)
   - Summary cards (draft, submitted, paid, denied counts and amounts)
   - Claim list with status filters
   - Date range selector
   - Batch action toolbar (submit, export, void)

2. **Claim Generator Wizard**
   - **Step 1: Select Sessions** - Filter by date, student, service type; checkbox selection
   - **Step 2: Verify Information** - Patient demographics, payer details, authorization match
   - **Step 3: Review Line Items** - CPT codes, modifiers, units, charges with edit capability
   - **Step 4: Generate Claim** - Preview CMS-1500 form, export options

3. **CMS-1500 Preview**
   - Visual form matching official layout (all 33 boxes)
   - Auto-populated from session and profile data
   - Editable fields for corrections
   - PDF export button
   - Print button

4. **Denial Management**
   - Denial reason categorization (medical necessity, auth expired, etc.)
   - Appeal deadline tracking with alerts
   - Resubmission workflow
   - Notes and correspondence tracking

5. **Batch Export**
   - Select multiple claims
   - Export format options (PDF, CSV for clearinghouse)
   - Export history log

### Files to Create
- `src/pages/Billing.tsx` - Billing dashboard page
- `src/components/billing/BillingDashboard.tsx` - Dashboard layout
- `src/components/billing/ClaimGenerator.tsx` - Multi-step wizard
- `src/components/billing/ClaimLineItems.tsx` - Line item editor
- `src/components/billing/CMS1500Preview.tsx` - Form visualization
- `src/components/billing/CMS1500PDF.tsx` - PDF generation
- `src/components/billing/DenialTracker.tsx` - Denial management
- `src/components/billing/BatchExport.tsx` - Bulk operations
- `src/lib/cms1500Generator.ts` - Form data mapping utilities
- `src/hooks/useBillingClaims.ts` - Data operations
- `src/types/billing.ts` - TypeScript interfaces

---

## Module 4: Analytics Dashboard

### Purpose
Provide business intelligence with revenue tracking (billed vs. collected), authorization utilization, and clinician productivity metrics for practice management decisions.

### Data Sources (no new tables required)
- `sessions` and `session_notes` - Service hours delivered
- `authorizations` - Units approved vs. used
- `billing_claims` - Revenue billed vs. collected (from Module 3)
- `profiles` and `staff_caseloads` - Clinician productivity
- `students` - Caseload metrics

### UI Components

1. **Analytics Page** (new top-level route)
   - Global date range selector
   - Filter by staff, student, payer, site
   - Export to CSV/PDF button

2. **Revenue Cards**
   - Total Billed This Period
   - Total Collected
   - Outstanding AR (Accounts Receivable)
   - Collection Rate Percentage
   - Trend arrows comparing to previous period

3. **Utilization Charts** (using Recharts)
   - Authorization burn-down chart (line)
   - Units used vs. approved by payer (stacked bar)
   - Projected authorization exhaustion dates
   - Expiring authorizations alert list

4. **Clinician Productivity Table**
   - Hours delivered per clinician
   - Billable vs. non-billable ratio
   - Active caseload size
   - Notes completion rate
   - Supervision compliance (links to Module 1)

5. **Outcome Tracking** (aggregate across caseload)
   - Behavior trend summaries (reduction targets meeting goals)
   - Skill mastery rates
   - Goals met vs. in-progress distribution (pie chart)

6. **Downloadable Reports**
   - Monthly revenue summary
   - Authorization status report
   - Clinician productivity report
   - Outcome summary report

### Files to Create
- `src/pages/Analytics.tsx` - Analytics dashboard page
- `src/components/analytics/AnalyticsDashboard.tsx` - Dashboard layout
- `src/components/analytics/RevenueCards.tsx` - KPI cards
- `src/components/analytics/UtilizationCharts.tsx` - Auth usage charts
- `src/components/analytics/ProductivityTable.tsx` - Clinician metrics
- `src/components/analytics/OutcomesSummary.tsx` - Clinical outcomes
- `src/components/analytics/AnalyticsFilters.tsx` - Filter controls
- `src/hooks/useAnalyticsData.ts` - Data aggregation

---

## Module 5: Mobile-First Data Collection

### Purpose
Enable efficient data collection on mobile devices with offline capability, large touch targets for one-handed operation, and voice note transcription.

### Technical Approach

**Offline Storage**
- IndexedDB via `idb` library for local data queue
- Service worker for static asset caching
- Sync queue with conflict resolution on reconnect

**One-Hand Tally Mode**
- Full-screen frequency counter
- Large tap target (entire bottom half of screen)
- Haptic feedback via Vibration API
- Swipe gestures for navigation between students/behaviors

**Voice Notes**
- Web Speech API for recording
- Edge function for AI transcription (using Lovable AI)
- Attach transcribed notes to sessions

### UI Components

1. **Mobile Mode Toggle**
   - Accessible from dashboard header
   - Persists preference in localStorage
   - Automatic detection of mobile viewport

2. **One-Hand Tally Screen**
   - Student/behavior selector at top (minimal interaction area)
   - Giant tap zone for counting (+1 each tap)
   - Visual pulse feedback on tap
   - Haptic vibration feedback
   - Undo button (corner placement)
   - Session timer always visible
   - Swipe left/right to change behavior

3. **Voice Note Recorder**
   - Floating action button (FAB)
   - Recording indicator with duration
   - Playback preview before save
   - "Transcribe" option with AI processing
   - Attach to current session

4. **Offline Indicator**
   - Persistent banner when offline
   - Pending sync count badge
   - Manual "Sync Now" button
   - Last synced timestamp

### Files to Create
- `src/components/mobile/MobileDataMode.tsx` - Mobile mode container
- `src/components/mobile/OneHandTally.tsx` - Full-screen tally
- `src/components/mobile/MobileBehaviorSelector.tsx` - Swipeable selector
- `src/components/mobile/VoiceNoteRecorder.tsx` - Voice recording
- `src/components/mobile/OfflineIndicator.tsx` - Sync status
- `src/components/mobile/MobileNav.tsx` - Simplified navigation
- `src/lib/offlineStorage.ts` - IndexedDB operations
- `src/lib/syncQueue.ts` - Offline sync queue
- `src/hooks/useOfflineSync.ts` - Sync management
- `supabase/functions/transcribe-audio/index.ts` - AI transcription

---

## Navigation & Routing Updates

### New Routes (in App.tsx)
```text
/supervision   - Supervision Hours Tracking
/referrals     - Referral & Intake Pipeline
/billing       - CMS-1500 Claims & Billing
/analytics     - Business Intelligence Dashboard
```

### MainLayout Tab Updates
Add role-based visibility for new tabs:
- **Supervision** - BCBAs, Admins
- **Referrals** - Intake Coordinators, Admins
- **Billing** - Billing Specialists, Admins
- **Analytics** - Clinical Directors, Admins

Mobile mode will be toggled via header button, not a separate route.

---

## Database Migration Summary

### New Tables (10 total)
1. `supervision_logs` - Supervision session records
2. `fieldwork_hours` - BCBA candidate experience tracking
3. `supervision_requirements` - Compliance targets per supervisee
4. `referrals` - Intake pipeline records
5. `intake_checklists` - Checklist instances per referral
6. `intake_checklist_templates` - Reusable checklist templates
7. `intake_documents` - Files attached to referrals
8. `billing_claims` - Claim headers
9. `claim_line_items` - Individual service lines
10. `era_remittances` - Payment reconciliation (future)

### RLS Policies
Each table will have appropriate Row Level Security:
- Supervision tables: Supervisors can manage their supervisees, admins can view all
- Referral tables: Intake coordinators and admins
- Billing tables: Billing role and admins
- All tables: User must be authenticated

---

## Implementation Phases

### Phase 1: Database Foundation (Week 1)
- Create all database tables via migrations
- Set up RLS policies
- Create base TypeScript type definitions

### Phase 2: Supervision Module (Week 2)
- Supervision logging UI
- Compliance calculation functions
- Fieldwork tracking interface
- Integration with staff profiles

### Phase 3: Referral Pipeline (Week 3)
- Referral CRUD operations
- Kanban board with drag-and-drop
- Intake checklist system
- Convert to student workflow

### Phase 4: Billing/Claims (Week 4)
- Claims data model implementation
- Claim generator wizard
- CMS-1500 PDF generation
- Denial tracking interface

### Phase 5: Analytics (Week 5)
- Data aggregation queries
- Dashboard component layout
- Chart implementations with Recharts
- Export functionality

### Phase 6: Mobile Mode (Week 6)
- Offline storage infrastructure
- One-hand tally mode
- Voice notes with transcription
- Service worker setup

---

## Technical Notes

### Existing Patterns to Follow
- Use existing Supabase client from `@/integrations/supabase/client`
- Follow established component patterns (Card, Dialog, Badge)
- Use existing toast notification system
- Leverage AuthContext for role-based access checks
- Use existing dataStore patterns for local state management

### Dependencies Already Available
- **Recharts** - Already installed for chart visualizations
- **date-fns** - Date manipulation
- **Lucide React** - Icons
- **Radix UI** - All dialog/form components
- **React Hook Form** - Form handling
- **Zod** - Validation

### New Dependencies Needed
- **idb** - IndexedDB wrapper for offline storage
- **dnd-kit** or similar - Drag-and-drop for Kanban (or use existing drag patterns)
- **jspdf** - PDF generation for CMS-1500 forms

---

## Security Considerations

### Role-Based Access
- New database function: `has_billing_access(user_id)` for billing features
- New database function: `is_intake_coordinator(user_id)` for referrals
- Extend existing `is_admin()` checks for supervision

### Data Protection
- Billing data contains PHI - ensure RLS policies restrict to authorized users
- Referral data pre-student requires careful access control
- Audit logging for all billing and claim actions

### HIPAA Compliance
- Session data linked to claims maintains minimum necessary principle
- Voice transcription processed server-side, not stored in browser
- Offline data encrypted at rest in IndexedDB
