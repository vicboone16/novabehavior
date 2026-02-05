
# Comprehensive Feature Enhancement Plan

## Executive Summary

This plan addresses 12 major feature requests to transform the platform into a differentiated, ABA-forward, school-focused practice management system with robust staff management, mobile-first data collection, and advanced communication capabilities.

---

## Feature Priority Matrix

| Priority | Feature | Business Impact | Technical Effort |
|----------|---------|-----------------|------------------|
| 1 | Fix Staff Geocoding | HIGH - Currently broken | LOW |
| 2 | Voice-to-Text Session Notes | HIGH - Clinician efficiency | MEDIUM |
| 3 | Offline-First Data Collection | HIGH - Field reliability | HIGH |
| 4 | Supervision Chain Enforcement | HIGH - Compliance critical | MEDIUM |
| 5 | Push Notifications | MEDIUM - Engagement | MEDIUM |
| 6 | Treatment Fidelity Tracking | HIGH - Clinical outcomes | MEDIUM |
| 7 | Contract Rate Management | HIGH - Revenue accuracy | MEDIUM |
| 8 | Travel Route Optimization | MEDIUM - Staff efficiency | MEDIUM |
| 9 | IEP Meeting Prep Wizard | HIGH - School partnerships | MEDIUM |
| 10 | Teacher Observation Requests | HIGH - Collaboration | MEDIUM |
| 11 | White-Label School Reports | HIGH - Deal closer | MEDIUM |
| 12 | External Document Sharing | HIGH - Parent engagement | MEDIUM |

---

## Phase 1: Critical Fixes & Core Infrastructure

### 1.1 Fix Staff Geocoding (PRIORITY 1)

**Current Issue**: The `AddressAutocomplete` component uses Nominatim (OpenStreetMap) which works, but the results are not being properly saved/displayed in the Staff Travel & Geo tab.

**Root Cause Analysis**:
- The `StaffTravelGeoTab` correctly calls `updateProfile()` with geocode data
- Need to verify the `profiles` table has the geocode columns and RLS allows updates
- The popover may be closing before selection registers

**Database Changes**:
```sql
-- Ensure columns exist (may already be present)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS home_base_address TEXT,
ADD COLUMN IF NOT EXISTS geocode_lat NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS geocode_lng NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS geocode_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS max_travel_radius_miles INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS min_buffer_minutes INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS transportation_method TEXT DEFAULT 'car';
```

**Code Fixes**:
- Fix `AddressAutocomplete` popover focus handling
- Add error handling and loading states
- Add manual "Save Address" button as fallback
- Display clear success/error feedback

**Files to Modify**:
- `src/components/ui/address-autocomplete.tsx`
- `src/components/staff-profile/tabs/StaffTravelGeoTab.tsx`
- `src/hooks/useStaffProfile.ts`

---

### 1.2 Voice-to-Text Session Notes (PRIORITY 2)

**Current State**: `VoiceNoteRecorder.tsx` exists but uses mock transcription. Need to integrate real speech-to-text.

**Implementation**:

**New Backend Function**:
```typescript
// supabase/functions/elevenlabs-transcribe/index.ts
// Uses ElevenLabs Scribe v2 for transcription
```

**Frontend Changes**:
- Integrate ElevenLabs SDK (`@elevenlabs/react`) for real-time transcription
- Add "Dictate" button to `NoteCreationDialog.tsx` and `NoteEditorDialog.tsx`
- Support both batch (upload audio) and real-time (live dictation) modes
- Auto-insert transcribed text into note content

**Files to Create**:
- `supabase/functions/elevenlabs-transcribe/index.ts`
- `supabase/functions/elevenlabs-scribe-token/index.ts`
- `src/components/session-notes/VoiceNoteIntegration.tsx`

**Files to Modify**:
- `src/components/mobile/VoiceNoteRecorder.tsx` (integrate real transcription)
- `src/components/session-notes/NoteCreationDialog.tsx`
- `src/components/session-notes/NoteEditorDialog.tsx`

**Dependencies**:
- Requires `ELEVENLABS_API_KEY` secret to be configured

---

### 1.3 Offline-First Data Collection (PRIORITY 3)

**Current State**: Basic localStorage persistence via Zustand. `OfflineIndicator.tsx` exists but sync queue is placeholder.

**Implementation Strategy**:

**IndexedDB Integration**:
```typescript
// src/lib/offlineStorage.ts
// Using idb library for IndexedDB wrapper
interface OfflineQueue {
  id: string;
  action: 'create' | 'update' | 'delete';
  table: string;
  data: any;
  timestamp: Date;
  retryCount: number;
}
```

**Key Components**:
1. **IndexedDB Store**: Replace localStorage with IndexedDB for larger data capacity
2. **Sync Queue Manager**: Queue mutations when offline, sync when online
3. **Conflict Resolution**: Last-write-wins with merge prompts for conflicts
4. **Service Worker**: Cache critical assets for offline access

**Database Changes**:
```sql
-- Add sync tracking columns
ALTER TABLE session_data
ADD COLUMN IF NOT EXISTS local_id TEXT,
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS client_timestamp TIMESTAMPTZ;

-- Create sync_queue table for server-side conflict tracking
CREATE TABLE sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  table_name TEXT NOT NULL,
  record_id UUID,
  local_data JSONB,
  server_data JSONB,
  resolved BOOLEAN DEFAULT false,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Files to Create**:
- `src/lib/offlineStorage.ts` (IndexedDB wrapper)
- `src/lib/syncQueue.ts` (Queue manager)
- `src/hooks/useOfflineSync.ts`
- `public/sw.js` (Service Worker)

**Files to Modify**:
- `src/contexts/SyncContext.tsx` (integrate IndexedDB)
- `src/components/mobile/OfflineIndicator.tsx`
- `src/store/dataStore.ts` (add offline queue)
- `index.html` (register service worker)

---

## Phase 2: Staff Management & Compliance

### 2.1 Supervision Chain Enforcement (PRIORITY 4)

**Current State**: `supervisor_links` table exists, `SupervisionDashboard` tracks compliance. Need stricter enforcement.

**Enhancements**:

**Database Changes**:
```sql
-- Add supervision chain validation
CREATE TABLE supervision_chain_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id UUID NOT NULL REFERENCES profiles(user_id),
  violation_type TEXT NOT NULL, -- 'missing_supervisor', 'expired_link', 'ratio_exceeded'
  detected_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_by UUID REFERENCES auth.users(id)
);

-- Function to check if RBT can be scheduled
CREATE OR REPLACE FUNCTION can_schedule_rbt(_staff_user_id UUID, _session_date DATE)
RETURNS TABLE(allowed BOOLEAN, reason TEXT) AS $$
BEGIN
  -- Check for active supervisor link
  IF NOT EXISTS (
    SELECT 1 FROM supervisor_links
    WHERE supervisee_staff_id = _staff_user_id
    AND status = 'active'
    AND (end_date IS NULL OR end_date >= _session_date)
  ) THEN
    RETURN QUERY SELECT false, 'No active supervisor assigned';
    RETURN;
  END IF;
  
  RETURN QUERY SELECT true, 'OK';
END;
$$ LANGUAGE plpgsql;
```

**UI Enhancements**:
- Block scheduling for RBTs without active supervisor (hard block)
- Warning banner on Staff Profile when supervisor chain is broken
- Supervision compliance alerts in `NotificationBell`
- Supervisor assignment quick-action from scheduling dialog

**Files to Create**:
- `src/components/supervision/SupervisionChainWarning.tsx`
- `src/components/supervision/AssignSupervisorDialog.tsx`

**Files to Modify**:
- `src/components/scheduling/SchedulingEngine.tsx` (add hard blocks)
- `src/components/staff-profile/tabs/StaffOverviewTab.tsx` (warning banner)
- `src/hooks/useStaffProfile.ts` (add chain validation)

---

### 2.2 Travel Route Optimization (PRIORITY 8)

**Current State**: Distance calculation exists in `SchedulingEngine.tsx` (Haversine formula). Need route optimization.

**Implementation**:

**Database Changes**:
```sql
-- Store route calculations for caching
CREATE TABLE travel_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_location_id UUID,
  to_location_id UUID,
  from_lat NUMERIC(10, 7),
  from_lng NUMERIC(10, 7),
  to_lat NUMERIC(10, 7),
  to_lng NUMERIC(10, 7),
  distance_miles NUMERIC(8, 2),
  travel_time_minutes INTEGER,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  transport_mode TEXT DEFAULT 'driving',
  UNIQUE(from_lat, from_lng, to_lat, to_lng, transport_mode)
);

CREATE INDEX idx_travel_routes_coords ON travel_routes(from_lat, from_lng, to_lat, to_lng);
```

**Features**:
1. **Multi-Stop Route Optimizer**: For staff with multiple clients/day
2. **Travel Time Matrix**: Pre-calculate common routes
3. **Buffer Enforcement**: Warn when travel + buffer exceeds gap between sessions
4. **Map Visualization**: Show staff coverage area and client locations

**Files to Create**:
- `src/lib/routeOptimization.ts`
- `src/components/scheduling/TravelRouteOptimizer.tsx`
- `src/components/scheduling/StaffCoverageMap.tsx`

**Files to Modify**:
- `src/components/scheduling/SchedulingEngine.tsx`
- `src/components/staff-profile/tabs/StaffTravelGeoTab.tsx`

---

## Phase 3: Clinical Features

### 3.1 Treatment Fidelity Tracking (PRIORITY 6)

**New Feature**: Track whether interventions are implemented as designed (BIP adherence).

**Database Schema**:
```sql
CREATE TABLE treatment_fidelity_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id),
  student_id UUID NOT NULL REFERENCES students(id),
  observer_user_id UUID NOT NULL REFERENCES auth.users(id),
  implementer_user_id UUID REFERENCES auth.users(id),
  check_date DATE NOT NULL DEFAULT CURRENT_DATE,
  intervention_id UUID, -- Link to behavior_interventions
  
  -- Fidelity scoring
  items JSONB NOT NULL, -- Array of {item_text, implemented: boolean, notes}
  items_implemented INTEGER NOT NULL,
  items_total INTEGER NOT NULL,
  fidelity_percentage NUMERIC(5, 2) GENERATED ALWAYS AS 
    (CASE WHEN items_total > 0 THEN (items_implemented::numeric / items_total) * 100 ELSE 0 END) STORED,
  
  -- Context
  setting TEXT,
  duration_minutes INTEGER,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fidelity check templates (per intervention/BIP)
CREATE TABLE fidelity_check_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  intervention_id UUID,
  name TEXT NOT NULL,
  items JSONB NOT NULL, -- Array of check items
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**UI Components**:
- Fidelity Check Form (checklist-style during observation)
- Fidelity Dashboard (trends over time, by staff, by intervention)
- Fidelity Alerts (when scores drop below threshold)

**Files to Create**:
- `src/types/treatmentFidelity.ts`
- `src/hooks/useTreatmentFidelity.ts`
- `src/components/fidelity/FidelityCheckForm.tsx`
- `src/components/fidelity/FidelityDashboard.tsx`
- `src/components/fidelity/FidelityTemplateBuilder.tsx`

---

### 3.2 IEP Meeting Prep Wizard (PRIORITY 9)

**New Feature**: Guided workflow to prepare for IEP/504 meetings with data summaries.

**Implementation**:

**Database Schema**:
```sql
CREATE TABLE iep_meeting_preps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  meeting_date DATE NOT NULL,
  meeting_type TEXT NOT NULL, -- 'annual', 'triennial', 'amendment', '504'
  
  -- Pulled data
  data_summary JSONB, -- Behavior trends, skill progress, attendance
  goal_progress JSONB, -- Current goal status
  recommendations JSONB, -- AI-suggested or clinician-entered
  
  -- Documents to bring
  documents_checklist JSONB, -- {doc_type, included: boolean}
  
  -- Team
  attendees JSONB, -- Expected attendees with roles
  
  -- Output
  generated_report_url TEXT,
  
  status TEXT DEFAULT 'draft', -- draft, ready, completed
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Wizard Steps**:
1. **Meeting Details**: Date, type, attendees
2. **Data Review**: Auto-pull behavior trends (30/60/90 days)
3. **Goal Progress**: Current goal status with visual graphs
4. **Recommendations**: Suggest goal modifications based on data
5. **Document Checklist**: FBA, BIP, progress reports
6. **Generate Report**: Create printable/shareable summary

**Files to Create**:
- `src/types/iepMeeting.ts`
- `src/components/iep/IEPMeetingPrepWizard.tsx`
- `src/components/iep/MeetingDataSummary.tsx`
- `src/components/iep/MeetingReportGenerator.tsx`
- `src/hooks/useIEPMeetingPrep.ts`

---

## Phase 4: Communication & Reporting

### 4.1 Push Notifications (PRIORITY 5)

**Current State**: In-app `NotificationBell` with database-backed notifications and realtime subscriptions.

**Enhancement**: Add browser push notifications.

**Implementation**:

**Backend Changes**:
```sql
-- Store push subscriptions
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  subscription JSONB NOT NULL, -- Web Push subscription object
  device_name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, subscription)
);

-- Notification preferences
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_preferences JSONB DEFAULT '{
  "session_reminders": true,
  "supervision_alerts": true,
  "questionnaire_responses": true,
  "approval_requests": true
}';
```

**New Edge Function**:
```typescript
// supabase/functions/send-push-notification/index.ts
// Uses Web Push API with VAPID keys
```

**Files to Create**:
- `supabase/functions/send-push-notification/index.ts`
- `src/lib/pushNotifications.ts`
- `src/components/settings/NotificationPreferences.tsx`
- `public/sw-push.js` (Push service worker)

**Files to Modify**:
- `src/components/NotificationBell.tsx` (add push subscription UI)
- `index.html` (register push service worker)

**Secrets Required**:
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

---

### 4.2 Teacher Observation Requests (PRIORITY 10)

**New Feature**: Send observation/data collection requests to teachers.

**Database Schema**:
```sql
CREATE TABLE observation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  
  -- Request details
  request_type TEXT NOT NULL, -- 'behavior_observation', 'skills_checklist', 'antecedent_log'
  target_behaviors UUID[], -- Specific behaviors to observe
  instructions TEXT,
  
  -- Recipient
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_role TEXT, -- 'teacher', 'aide', 'parent'
  
  -- Tracking
  access_token TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'pending', -- pending, sent, opened, in_progress, completed, expired
  sent_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Response
  response_data JSONB,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Features**:
- Teacher-friendly observation form (simplified ABC, frequency counts)
- Email with magic link (no login required)
- Mobile-optimized data entry
- Automatic data import into student record
- Reminders for incomplete requests

**Files to Create**:
- `src/types/observationRequest.ts`
- `src/components/observation-requests/CreateRequestDialog.tsx`
- `src/components/observation-requests/RequestStatusTable.tsx`
- `src/pages/TeacherObservationForm.tsx` (public route)
- `supabase/functions/send-observation-request/index.ts`

---

### 4.3 White-Label School Reports (PRIORITY 11)

**New Feature**: Generate branded reports for schools/districts.

**Database Schema**:
```sql
CREATE TABLE report_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id),
  organization_name TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#1E40AF',
  footer_text TEXT,
  contact_info JSONB,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  report_type TEXT NOT NULL, -- 'progress', 'fba_summary', 'behavior_data', 'iep_prep'
  branding_id UUID REFERENCES report_branding(id),
  
  -- Content
  date_range_start DATE,
  date_range_end DATE,
  content JSONB, -- Report data
  
  -- Output
  pdf_url TEXT,
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id),
  
  -- Sharing
  shared_with JSONB, -- [{email, access_token, sent_at}]
  is_public BOOLEAN DEFAULT false,
  public_token TEXT UNIQUE
);
```

**Report Types**:
1. **Progress Report**: Behavior trends, goal progress, session summary
2. **FBA Summary**: Parent-friendly FBA findings
3. **Data Summary**: Charts and graphs for IEP meetings
4. **Attendance/Billing Summary**: For districts with contracts

**Files to Create**:
- `src/types/reportBranding.ts`
- `src/components/reports/ReportBrandingEditor.tsx`
- `src/components/reports/WhiteLabelReportGenerator.tsx`
- `src/components/reports/ReportShareDialog.tsx`
- `src/pages/PublicReportView.tsx` (public route)

---

### 4.4 External Document Sharing (PRIORITY 12)

**New Feature**: Share documents and request signatures from parents/teachers.

**Implementation**:

**Database Schema**:
```sql
CREATE TABLE document_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id),
  document_type TEXT NOT NULL, -- 'consent', 'report', 'iep_summary', 'questionnaire'
  document_url TEXT,
  document_content JSONB, -- For dynamic documents
  
  -- Recipient
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_role TEXT,
  
  -- Access
  access_token TEXT NOT NULL UNIQUE,
  requires_signature BOOLEAN DEFAULT false,
  signature_data JSONB, -- {signed: bool, signature_image, signed_at}
  
  -- Tracking
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Features**:
- Email documents with secure magic links
- Track opens/views
- Collect e-signatures using existing `SignaturePad`
- Send reminders for unsigned documents
- Bulk send to multiple recipients

**Files to Create**:
- `src/types/documentSharing.ts`
- `src/components/documents/ShareDocumentDialog.tsx`
- `src/components/documents/DocumentSharingStatus.tsx`
- `src/pages/SharedDocumentView.tsx` (public route)
- `supabase/functions/send-document-share/index.ts`

---

## Phase 5: Billing Enhancements

### 5.1 Contract Rate Management (PRIORITY 7)

**New Feature**: Manage district/school-specific contracted rates separate from insurance.

**Database Schema**:
```sql
CREATE TABLE contract_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id),
  
  -- Contract party
  contract_type TEXT NOT NULL, -- 'district', 'school', 'agency_partner'
  organization_name TEXT NOT NULL,
  organization_id UUID, -- Optional link to external org table
  
  -- Contract terms
  contract_start_date DATE NOT NULL,
  contract_end_date DATE,
  contract_number TEXT,
  
  -- Rate details
  services JSONB NOT NULL, -- Array of {service_type, cpt_code, rate, unit_type}
  
  -- Billing settings
  billing_frequency TEXT DEFAULT 'monthly', -- weekly, biweekly, monthly
  invoice_due_days INTEGER DEFAULT 30,
  requires_signature BOOLEAN DEFAULT false,
  
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Link students to contracts
CREATE TABLE student_contract_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  contract_id UUID NOT NULL REFERENCES contract_rates(id),
  start_date DATE NOT NULL,
  end_date DATE,
  funding_source TEXT, -- 'district_funded', 'grant', 'settlement'
  is_active BOOLEAN DEFAULT true,
  UNIQUE(student_id, contract_id)
);
```

**UI Components**:
- Contract Rate Manager (CRUD for contracts)
- Student Contract Assignment
- Contract vs Insurance rate comparison
- Invoice generation for contract clients

**Files to Create**:
- `src/types/contractRates.ts`
- `src/hooks/useContractRates.ts`
- `src/components/billing/ContractRateManager.tsx`
- `src/components/billing/StudentContractAssignment.tsx`
- `src/components/billing/ContractInvoiceGenerator.tsx`

---

## Implementation Roadmap

### Sprint 1 (Weeks 1-2): Critical Fixes
- Fix Staff Geocoding
- Voice-to-Text Integration (ElevenLabs)
- Supervision Chain Hard Blocks

### Sprint 2 (Weeks 3-4): Offline & Push
- IndexedDB Integration
- Sync Queue Manager
- Service Worker
- Push Notifications (VAPID)

### Sprint 3 (Weeks 5-6): Clinical Features
- Treatment Fidelity Tracking
- IEP Meeting Prep Wizard
- Contract Rate Management

### Sprint 4 (Weeks 7-8): Communication
- Teacher Observation Requests
- External Document Sharing
- White-Label Reports

### Sprint 5 (Weeks 9-10): Polish & Optimization
- Travel Route Optimization
- Map Visualizations
- Performance Optimization
- Testing & Bug Fixes

---

## Technical Requirements

### New Dependencies
```json
{
  "idb": "^8.0.0",           // IndexedDB wrapper
  "@elevenlabs/react": "^0.0.4",  // Voice transcription
  "web-push": "^3.6.0"       // Push notifications (edge function)
}
```

### Secrets Required
| Secret | Purpose |
|--------|---------|
| `ELEVENLABS_API_KEY` | Voice transcription |
| `VAPID_PUBLIC_KEY` | Push notifications |
| `VAPID_PRIVATE_KEY` | Push notifications |

### New Public Routes
- `/observation/:token` - Teacher observation form
- `/document/:token` - Shared document view
- `/report/:token` - Public report view

---

## Success Metrics

| Feature | KPI |
|---------|-----|
| Geocoding Fix | 100% successful address saves |
| Voice Notes | 80% transcription accuracy |
| Offline Mode | <1% data loss during offline |
| Push Notifications | 90% delivery rate |
| Treatment Fidelity | Average fidelity score tracked |
| Teacher Requests | Response rate >60% |
| White-Label Reports | Report generation time <5s |

---

## Files Summary

### New Files to Create (~40 files)
- 8 Edge Functions
- 6 Type definition files
- 12 Component files
- 8 Hook files
- 4 Library/utility files
- 3 Public page routes

### Files to Modify (~15 files)
- Scheduling and staff profile components
- Sync context and data store
- Session notes components
- Billing pages
- App routing

