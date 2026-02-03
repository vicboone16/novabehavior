
# Advanced Practice Management System Expansion

Based on your requirements, this plan implements 6 major enhancement modules using your existing service providers (MetroFax, Zoom/Whereby) and adds e-signature, document inbox, insurance verification, prior authorization, telehealth, and AI scribing capabilities.

---

## Your Configuration Summary

| Requirement | Your Choice | Implementation Notes |
|-------------|-------------|---------------------|
| Fax Service | MetroFax | API integration via email-to-fax or their API |
| Clearinghouse | All Private + Medicaid | pVerify recommended (good Medicaid coverage) |
| Video Provider | Zoom + Whereby | Whereby preferred (simpler embed, HIPAA-ready) |
| Retention | 7 years | Database + storage lifecycle policies |
| E-Signature Priority | Consent + Intake | Template system with signature canvas |

---

## Module 1: E-Signature Consent & Intake Forms

### Purpose
Enable parents/caregivers to complete consent forms and intake packets with legally-binding electronic signatures directly in the app or via shareable links.

### Database Tables

```
consent_form_templates
- id, name, description, form_type (consent, intake, roi, service_agreement)
- fields (JSONB: array of field definitions with types)
- signature_zones (JSONB: positions and requirements)
- version, is_active, created_at, updated_at

consent_form_submissions
- id, template_id, student_id, referral_id (nullable)
- signer_name, signer_email, signer_relationship
- signature_data (base64 PNG or SVG path)
- signature_ip_address, signature_user_agent
- signed_at, form_data (JSONB: filled fields)
- pdf_url (generated signed copy in storage)
- status (pending, signed, expired, voided)
- access_token (for shareable link), expires_at

signature_audit_log
- id, submission_id, action (created, viewed, signed, voided)
- ip_address, user_agent, performed_by, performed_at
```

### UI Components

1. **Consent Form Template Builder** (Admin)
   - Drag-and-drop form field editor
   - Field types: text, date, checkbox, dropdown, signature block
   - Multiple signature zones (parent + clinician witness)
   - Preview mode before publishing
   - Template versioning for compliance

2. **Parent Portal Form View** (Public route: `/consent/:token`)
   - Mobile-responsive form rendering
   - Touch-friendly signature canvas using `react-signature-canvas`
   - Progress indicator for multi-page forms
   - Auto-save partial completion
   - Date/time/IP auto-stamping on signature

3. **Intake Packet Manager** (Student Profile)
   - Bundle multiple forms into packets
   - Send via email with secure link
   - Track completion status per form
   - Resend/expire link capabilities
   - Download signed PDF copies

4. **Signature Pad Component**
   - Canvas-based signature capture
   - Clear/redo functionality
   - "Type your name" fallback option
   - Visual confirmation with timestamp overlay

### Files to Create
- `src/pages/ConsentForm.tsx` - Public shareable form page
- `src/components/consent/ConsentFormBuilder.tsx` - Admin template editor
- `src/components/consent/SignaturePad.tsx` - Reusable signature component
- `src/components/consent/ConsentFormViewer.tsx` - Form rendering
- `src/components/consent/IntakePacketManager.tsx` - Packet bundling
- `src/components/consent/SubmissionHistory.tsx` - Signed forms list
- `supabase/functions/generate-signed-pdf/index.ts` - PDF generation with signature overlay
- `supabase/functions/send-consent-link/index.ts` - Email delivery

### Dependencies
- `react-signature-canvas` - Signature capture (~15KB)
- Storage bucket: `consent-forms` for signed PDFs

---

## Module 2: Document Inbox (MetroFax + Email)

### Purpose
Receive faxed authorizations, medical records, and emailed documents into a central inbox with AI-assisted routing to the correct student/referral.

### Technical Architecture

**MetroFax Integration:**
- MetroFax supports email notifications when faxes arrive
- Configure MetroFax to forward to a dedicated inbox email
- Alternative: Use MetroFax API directly if available on your plan

**Email Receiving:**
- SendGrid Inbound Parse (recommended) or similar
- Dedicated email: `intake@yourdomain.com` or subfolder routing
- Webhook triggers edge function on new email

### Database Tables

```
document_inbox
- id, received_at, source_type (fax, email, manual_upload)
- sender_info (fax number, email address, or uploader)
- subject_line (for emails)
- raw_content_url (original file in storage)
- extracted_text (OCR/AI extracted content)
- ai_suggested_student_id, ai_confidence_score
- ai_suggested_document_type
- assigned_student_id, assigned_referral_id
- document_type (authorization, medical_record, consent, eval, other)
- status (unprocessed, matched, filed, archived)
- processed_by, processed_at, notes
```

### Processing Pipeline

1. **Receive** - Webhook receives document (fax via MetroFax email-forward or direct email)
2. **Store** - Save raw file to `inbox-documents` bucket
3. **Extract** - OCR/AI extraction using existing `extract-document` function pattern
4. **Match** - AI suggests student based on name/DOB in document
5. **Queue** - Human review with confidence-ranked suggestions
6. **File** - One-click attach to student record

### UI Components

1. **Document Inbox Dashboard** (New page: `/inbox`)
   - Unprocessed documents queue with preview
   - AI confidence indicators (high/medium/low)
   - Quick-filter by source type, date, status
   - Batch actions (assign, archive, delete)

2. **Document Preview Panel**
   - PDF/image viewer (side panel)
   - Highlighted extracted text
   - AI-suggested matches with confidence
   - Manual search to find student

3. **Inbox Settings**
   - MetroFax email forwarding instructions
   - Intake email address display
   - Auto-routing rules by sender

### Files to Create
- `src/pages/DocumentInbox.tsx` - Main inbox page
- `src/components/inbox/InboxQueue.tsx` - Document list
- `src/components/inbox/DocumentPreview.tsx` - Preview panel
- `src/components/inbox/MatchSuggestions.tsx` - AI suggestions
- `src/components/inbox/InboxSettings.tsx` - Configuration
- `supabase/functions/receive-inbox-document/index.ts` - Webhook handler
- `supabase/functions/process-inbox-document/index.ts` - AI matching

### MetroFax Setup Instructions
1. Log into MetroFax admin
2. Set up email notification for incoming faxes
3. Configure to forward fax PDFs as attachments to your intake email
4. System will process attachments automatically

---

## Module 3: Automated Insurance Verification

### Purpose
Verify patient insurance eligibility in real-time during intake or before sessions to reduce claim denials due to coverage issues.

### Recommended Clearinghouse: pVerify

**Why pVerify:**
- Strong Medicaid coverage across states
- Good private payer network
- ABA/behavioral health specific support
- Modern REST API
- Pricing: ~$0.15-0.50 per eligibility check

### Database Tables

```
eligibility_checks
- id, student_id, payer_id (links to student_payers)
- member_id, subscriber_name, subscriber_dob, subscriber_relationship
- check_date, check_type (real_time, batch)
- request_payload (JSONB), response_payload (JSONB)
- status (pending, verified, ineligible, error)
- coverage_active, coverage_start_date, coverage_end_date
- plan_name, group_number
- copay_amount, coinsurance_percent
- deductible_total, deductible_met, deductible_remaining
- aba_coverage_confirmed, behavioral_health_notes
- out_of_pocket_max, out_of_pocket_met
- next_check_due, created_at

eligibility_check_history
- id, eligibility_check_id, field_name, old_value, new_value, changed_at
```

### Verification Flow

1. **Trigger** - Manual click, new referral admission, or scheduled batch (weekly)
2. **Request** - Edge function calls pVerify 270/271 API
3. **Parse** - Extract coverage details from 271 response
4. **Store** - Save results and compare to previous check
5. **Alert** - Flag if coverage issues detected (inactive, exhausted benefits)

### UI Components

1. **Eligibility Widget** (Student Profile sidebar)
   - Current coverage status badge (Active/Inactive/Unknown)
   - Last verified date with "Re-verify" button
   - Key details: copay, deductible remaining, ABA coverage
   - Expandable full details

2. **Batch Verification Dashboard** (Admin)
   - Select all students or filter by payer
   - Run batch verification with progress
   - Results summary (verified/issues/errors)
   - Export verification report

3. **Coverage Alert Banner**
   - Shows on student profile if coverage issue detected
   - Quick action to contact family or update info

### Files to Create
- `src/components/insurance/EligibilityWidget.tsx` - Profile sidebar widget
- `src/components/insurance/BatchVerification.tsx` - Bulk check UI
- `src/components/insurance/EligibilityHistory.tsx` - Check timeline
- `src/components/insurance/CoverageAlerts.tsx` - Issue warnings
- `supabase/functions/verify-eligibility/index.ts` - pVerify API call
- `src/hooks/useEligibility.ts` - Data fetching

### External Requirements
- **pVerify account** - Sign up at pverify.com
- **API credentials** stored as backend secrets: `PVERIFY_CLIENT_ID`, `PVERIFY_CLIENT_SECRET`
- HIPAA BAA with pVerify (they provide this)

---

## Module 4: Prior Authorization Automation

### Purpose
Streamline prior authorization requests with auto-filled forms, submission tracking, deadline management, and AI-assisted clinical justification writing.

### Database Tables

```
prior_auth_requests
- id, student_id, authorization_id (existing auth being renewed)
- payer_id, request_type (initial, renewal, modification, appeal)
- service_type, cpt_code, units_requested, period_start, period_end
- diagnosis_codes (JSONB array)
- clinical_justification (text), ai_justification_draft (text)
- supporting_documents (JSONB: array of file URLs)
- submission_method (fax, portal, email, phone)
- submitted_at, submitted_by
- status (draft, submitted, pending, approved, denied, appealed)
- payer_reference_number, payer_contact_name
- decision_date, decision_notes
- approved_units, approved_start, approved_end
- denial_reason, appeal_deadline
- appeal_submitted_at, appeal_outcome
- created_at, updated_at
```

### PA Request Workflow

1. **Initiate** - Select patient and service type
2. **Auto-fill** - Pull from existing auth, assessment data, session history
3. **Justify** - AI generates clinical justification draft from patient data
4. **Attach** - Add supporting documents (FBA, BIP, progress reports)
5. **Submit** - Fax via MetroFax, download for portal upload, or note manual submission
6. **Track** - Monitor status, deadlines, and follow-ups

### UI Components

1. **PA Request Wizard** (Multi-step dialog)
   - **Step 1**: Select patient, payer, service type
   - **Step 2**: Auto-filled clinical info with edit capability
   - **Step 3**: AI Clinical Justification Generator
   - **Step 4**: Attach supporting documents
   - **Step 5**: Review and submit method

2. **PA Tracking Kanban** (Admin page)
   - Columns: Draft | Submitted | Pending | Approved | Denied | Appealed
   - Cards show patient, payer, days in status, deadlines
   - Color-coded urgency (appeal deadline approaching)

3. **AI Clinical Justification Generator**
   - Input: Patient history, goals, session data
   - Output: Medical necessity language for payer
   - Template library for common scenarios
   - Edit before finalizing

4. **PA Form Generator**
   - Pre-filled PA form with patient/provider info
   - Export to PDF for faxing or portal upload
   - Direct fax via MetroFax integration

### Files to Create
- `src/pages/PriorAuthorizations.tsx` - PA dashboard
- `src/components/pa/PARequestWizard.tsx` - Multi-step wizard
- `src/components/pa/PATrackingKanban.tsx` - Status board
- `src/components/pa/ClinicalJustificationEditor.tsx` - AI writing tool
- `src/components/pa/PAFormGenerator.tsx` - PDF form creation
- `supabase/functions/generate-pa-form/index.ts` - PDF generation
- `supabase/functions/ai-clinical-justification/index.ts` - Lovable AI justification
- `supabase/functions/send-fax/index.ts` - MetroFax fax sending

---

## Module 5: Embedded Telehealth Video (Whereby)

### Purpose
Conduct therapy sessions via secure video directly within the app, with waiting room, parent portal access, and optional recording.

### Why Whereby
- **Simple embed** - Just an iframe, no complex SDK
- **HIPAA-ready** - Business plan includes BAA
- **Branding** - Custom room URLs and logos
- **Recording** - Cloud recording available
- **Pricing** - ~$14.99/month per host, unlimited meetings

### Database Tables

```
telehealth_sessions
- id, appointment_id (links to appointments table)
- student_id, clinician_user_id
- room_url, room_name
- scheduled_start, actual_start, actual_end
- status (scheduled, waiting, in_progress, completed, no_show)
- recording_enabled, recording_url, recording_expires_at
- parent_join_token, parent_joined_at
- technical_issues_log (JSONB)
- retention_until (7 years from session date)
- created_at

telehealth_recordings
- id, telehealth_session_id
- storage_url, file_size_bytes
- duration_seconds, recorded_at
- transcription_status, transcription_url
- retention_until, created_at
```

### Whereby Integration Flow

1. **Schedule** - Toggle "Telehealth" on appointment creation
2. **Create Room** - Edge function creates Whereby room via API
3. **Send Links** - Email session links to parent and clinician
4. **Join** - Clinician enters from dashboard, parent via email link
5. **Session** - Video with optional recording
6. **End** - Recording saved to storage with 7-year retention

### UI Components

1. **Telehealth Room Page** (`/telehealth/:sessionId`)
   - Whereby iframe embed (full screen)
   - Side panel for notes/data collection (collapsible)
   - Session timer overlay
   - End session button

2. **Patient Join Page** (`/join/:token`)
   - Device/permission checks
   - Waiting room message
   - Whereby embed on admission

3. **Scheduler Integration**
   - "Telehealth Session" toggle on AppointmentDialog
   - Auto-generate Whereby room on save
   - Video link in appointment details

4. **Recording Manager** (Admin)
   - List of session recordings
   - Playback interface
   - Download for supervision
   - Retention countdown display

### Files to Create
- `src/pages/TelehealthSession.tsx` - Clinician video page
- `src/pages/JoinSession.tsx` - Parent join page
- `src/components/telehealth/TelehealthRoom.tsx` - Whereby embed wrapper
- `src/components/telehealth/WaitingRoom.tsx` - Pre-admission screen
- `src/components/telehealth/SessionControls.tsx` - Sidebar tools
- `src/components/telehealth/RecordingManager.tsx` - Recording list
- `src/components/schedule/TelehealthToggle.tsx` - Appointment toggle
- `supabase/functions/create-whereby-room/index.ts` - Room creation
- `supabase/functions/whereby-webhook/index.ts` - Recording notifications

### External Requirements
- **Whereby Business plan** ($14.99/mo/host) with HIPAA BAA
- **API key** stored as secret: `WHEREBY_API_KEY`
- Storage bucket: `telehealth-recordings` with 7-year lifecycle

---

## Module 6: AI Session Scribing

### Purpose
Automatically transcribe telehealth and in-person sessions, generating draft session notes from the conversation using Lovable AI.

### Technical Architecture

**Audio Sources:**
- **Telehealth**: Whereby cloud recording audio track (post-session)
- **In-person**: Browser `MediaRecorder` API via tablet/phone mic

**Processing Pipeline:**
1. Capture audio (Whereby recording or browser recording)
2. Upload to storage (`session-audio` bucket)
3. Transcribe via Lovable AI (Gemini/GPT with audio support)
4. Generate structured note draft from transcript
5. Clinician reviews/edits and finalizes

### Database Tables

```
session_transcripts
- id, session_id, telehealth_session_id (nullable)
- audio_url (storage path)
- raw_transcript (full text)
- speaker_segments (JSONB: array of {speaker, start, end, text})
- ai_generated_note (JSONB: structured note matching note template)
- clinician_edits (JSONB: diff of changes made)
- finalized_at, finalized_by
- retention_until (7 years)
- created_at
```

### Scribe Flow

**Real-Time (In-Person):**
1. Clinician taps "Start Scribe" on mobile/tablet
2. Audio captured via MediaRecorder
3. Chunks uploaded periodically
4. Post-session: full transcription + note generation

**Post-Session (Telehealth):**
1. Whereby saves recording
2. Webhook triggers processing
3. Audio extracted and transcribed
4. Draft note generated automatically

### UI Components

1. **In-Session Scribe Control** (Mobile/tablet)
   - Recording indicator with timer
   - Pause/resume capability
   - Stop and process button
   - Mic level indicator

2. **Post-Session Review Panel**
   - Side-by-side: transcript | AI draft note
   - Click to edit any section
   - Accept/reject AI suggestions
   - Highlight and annotate transcript
   - One-click finalize to session notes

3. **Scribe Settings**
   - Enable/disable per session type
   - Custom vocabulary (student names, technical terms)
   - Default note template selection

### AI Note Generation

**Input to AI:**
- Raw transcript text
- Session context (student, goals from IEP/BIP, previous notes)
- Note template structure

**Output:**
```json
{
  "sessionSummary": "Brief overview of session...",
  "goalsAddressed": ["Goal 1 description", "Goal 2..."],
  "interventionsUsed": ["Intervention 1", "Intervention 2..."],
  "studentResponses": "Description of student engagement...",
  "dataCollected": "Summary of any data taken...",
  "recommendations": "Next steps and recommendations..."
}
```

### Files to Create
- `src/components/scribe/InSessionScribe.tsx` - Recording controls
- `src/components/scribe/TranscriptReview.tsx` - Transcript viewer
- `src/components/scribe/NoteReviewPanel.tsx` - AI note editor
- `src/components/scribe/ScribeSettings.tsx` - Preferences
- `src/hooks/useAudioRecording.ts` - MediaRecorder wrapper
- `supabase/functions/transcribe-session/index.ts` - Audio to text
- `supabase/functions/generate-scribe-note/index.ts` - Transcript to note

### External Requirements
- **Lovable AI** (already available) for transcription and summarization
- Storage bucket: `session-audio` with 7-year lifecycle
- Browser `MediaRecorder` API (no external dependency)

---

## Storage & Retention Architecture

### Storage Buckets (7-Year Retention)

| Bucket | Purpose | Lifecycle Policy |
|--------|---------|-----------------|
| `consent-forms` | Signed consent/intake PDFs | Delete after 7 years |
| `inbox-documents` | Incoming faxes/emails | Delete after 7 years |
| `telehealth-recordings` | Session video recordings | Delete after 7 years |
| `session-audio` | In-person session audio | Delete after 7 years |
| `pa-documents` | Prior auth supporting docs | Delete after 7 years |

### Retention Enforcement

- Each record includes `retention_until` timestamp (7 years from creation)
- Scheduled job checks and alerts before deletion
- Audit log of all deletions for compliance

---

## Implementation Phases

### Phase 1: E-Signature Forms (Week 1-2)
- Database tables for templates and submissions
- Signature canvas component
- Public consent form page
- Basic template builder
- PDF generation with signature overlay

### Phase 2: Document Inbox (Week 2-3)
- Inbox database table
- MetroFax email forwarding setup
- Webhook receiver edge function
- AI matching using existing extraction patterns
- Inbox queue UI

### Phase 3: Insurance Verification (Week 3-4)
- pVerify account setup and BAA
- Eligibility check edge function
- Student profile widget
- Batch verification UI
- Coverage alerts

### Phase 4: Prior Auth Automation (Week 4-5)
- PA tracking database tables
- Request wizard with auto-fill
- AI justification generator
- Kanban tracking board
- MetroFax fax integration

### Phase 5: Telehealth Video (Week 5-6)
- Whereby account setup and BAA
- Room creation edge function
- Telehealth session pages
- Scheduler integration
- Recording management

### Phase 6: AI Scribing (Week 6-7)
- Audio capture component
- Transcription edge function
- Note generation AI
- Review/edit panel
- Session notes integration

---

## External Service Setup Summary

| Service | Purpose | Setup Required | Cost Estimate |
|---------|---------|----------------|---------------|
| MetroFax | Fax receiving + sending | Email forwarding config | Existing plan |
| pVerify | Insurance verification | Account + BAA + API keys | $0.15-0.50/check |
| Whereby | Telehealth video | Business plan + BAA | $14.99/mo/host |
| SendGrid | Email intake + notifications | Inbound parse setup | Free tier |
| Lovable AI | Transcription + notes | Already available | Included |

---

## Security & Compliance

### HIPAA Safeguards

1. **E-Signatures**
   - ESIGN Act + UETA compliant
   - Capture: timestamp, IP, user agent, device info
   - Immutable audit log for all actions

2. **Document Inbox**
   - Encrypted at rest in storage
   - Access logged per document
   - Auto-expiration of unprocessed items

3. **Insurance Data**
   - Member IDs are PHI - RLS policies enforced
   - Eligibility responses stored encrypted
   - API keys in secure secrets storage

4. **Telehealth**
   - HIPAA BAA with Whereby required
   - Recordings encrypted at rest
   - 7-year retention then secure deletion

5. **Transcripts**
   - Audio processed server-side only
   - No browser storage of recordings
   - Same retention as clinical notes

### RLS Policies

Each new table includes:
- `SELECT`: User must be authenticated + have appropriate role
- `INSERT`: User must be authenticated + own the record or have admin role
- `UPDATE`: Owner or admin only
- `DELETE`: Admin only with audit logging

---

## New Dependencies

```json
{
  "react-signature-canvas": "^1.0.6"
}
```

All other functionality uses existing dependencies (Recharts, date-fns, Radix UI, etc.) or native browser APIs.

---

## Questions Answered Summary

1. **Fax (MetroFax)**: Email forwarding to intake address triggers edge function processing
2. **Clearinghouse**: pVerify recommended for private + Medicaid coverage
3. **Video (Whereby)**: Simple iframe embed with HIPAA BAA, $14.99/mo/host
4. **Retention (7 years)**: Storage lifecycle policies + database `retention_until` fields
5. **E-Signature (Consent + Intake)**: Template builder with `react-signature-canvas`, PDF generation
