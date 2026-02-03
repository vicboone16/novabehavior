-- =============================================
-- CLIENT PROFILE 2.0 DATABASE SCHEMA
-- =============================================

-- 1. Client Contacts Table
CREATE TABLE public.client_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phones JSONB DEFAULT '[]'::jsonb, -- [{type: 'mobile', number: '...', is_primary: true}]
  emails JSONB DEFAULT '[]'::jsonb, -- [{email: '...', is_primary: true}]
  preferred_contact_method TEXT CHECK (preferred_contact_method IN ('phone', 'email', 'text', 'app')),
  preferred_language TEXT,
  notes TEXT,
  is_primary_guardian BOOLEAN DEFAULT false,
  is_secondary_guardian BOOLEAN DEFAULT false,
  is_emergency_contact BOOLEAN DEFAULT false,
  is_school_contact BOOLEAN DEFAULT false,
  is_provider_contact BOOLEAN DEFAULT false,
  can_pickup BOOLEAN DEFAULT false,
  can_make_decisions BOOLEAN DEFAULT false,
  visibility_permission TEXT DEFAULT 'internal_only' CHECK (visibility_permission IN ('internal_only', 'clinical_team', 'school_team', 'parent_shareable')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Safety & Medical Table
CREATE TABLE public.client_safety_medical (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  safety_flags JSONB DEFAULT '[]'::jsonb, -- ['aggression', 'elopement', 'sib', 'pica', 'medical_fragile']
  emergency_protocol_present BOOLEAN NOT NULL DEFAULT false,
  allergies JSONB DEFAULT '[]'::jsonb,
  medications JSONB DEFAULT '[]'::jsonb, -- [{name, dose, schedule_windows, notes}]
  seizure_protocol TEXT,
  medical_conditions JSONB DEFAULT '[]'::jsonb,
  crisis_plan_doc_id UUID,
  known_triggers JSONB DEFAULT '{"structured": [], "notes": ""}'::jsonb,
  deescalation_supports JSONB DEFAULT '{"structured": [], "notes": ""}'::jsonb,
  dietary_restrictions JSONB DEFAULT '[]'::jsonb,
  mobility_needs TEXT,
  sensory_considerations TEXT,
  other_medical_notes TEXT,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  last_reviewed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Communication & Language Access Table
CREATE TABLE public.client_communication_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  primary_language TEXT NOT NULL DEFAULT 'English',
  secondary_languages JSONB DEFAULT '[]'::jsonb,
  preferred_language_for_caregiver_comms TEXT NOT NULL DEFAULT 'English',
  interpreter_required BOOLEAN NOT NULL DEFAULT false,
  interpreter_language TEXT,
  communication_mode TEXT, -- 'verbal', 'aac', 'sign', 'pecs', 'mixed'
  aac_device_type TEXT,
  aac_notes TEXT,
  sensory_preferences JSONB DEFAULT '{"visual": [], "auditory": [], "tactile": [], "notes": ""}'::jsonb,
  cultural_notes TEXT,
  cultural_notes_visibility TEXT DEFAULT 'clinical_team' CHECK (cultural_notes_visibility IN ('internal_only', 'clinical_team', 'school_team')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Scheduling Preferences Table
CREATE TABLE public.client_scheduling_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  availability_windows JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{day: 'monday', start_time: '09:00', end_time: '15:00', location_type: 'home'}]
  hard_constraints JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{day, start_time, end_time, reason}]
  preferred_session_length INTEGER, -- in minutes
  preferred_cadence TEXT, -- 'daily', '3x_week', '2x_week', 'weekly'
  max_sessions_per_day INTEGER DEFAULT 1,
  min_gap_between_sessions INTEGER, -- in minutes
  school_schedule JSONB DEFAULT '{}'::jsonb, -- {start_time, end_time, early_release_days: []}
  vacation_blackouts JSONB DEFAULT '[]'::jsonb, -- [{start_date, end_date, reason}]
  notes TEXT,
  notes_visibility TEXT DEFAULT 'internal_only',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Client Locations Table
CREATE TABLE public.client_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  location_type TEXT NOT NULL CHECK (location_type IN ('home', 'school', 'clinic', 'community', 'daycare', 'other')),
  location_name TEXT NOT NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  country TEXT DEFAULT 'USA',
  geocode_lat NUMERIC(10, 7),
  geocode_lng NUMERIC(10, 7),
  geocode_status TEXT DEFAULT 'pending' CHECK (geocode_status IN ('pending', 'success', 'failed', 'manual')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_primary_service_site BOOLEAN DEFAULT false,
  onsite_contact_name TEXT,
  onsite_contact_phone TEXT,
  onsite_contact_email TEXT,
  access_instructions TEXT,
  safety_notes TEXT,
  safety_notes_visibility TEXT DEFAULT 'clinical_team',
  allowed_session_types JSONB DEFAULT '[]'::jsonb, -- ['direct', 'supervision', 'assessment']
  allowed_staff_roles JSONB DEFAULT '[]'::jsonb, -- ['rbt', 'bcba', 'bcaba']
  school_hours_only BOOLEAN DEFAULT false,
  school_hours JSONB DEFAULT '{}'::jsonb, -- {start_time, end_time}
  parking_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Team Assignments Table
CREATE TABLE public.client_team_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  staff_user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('primary_supervisor', 'secondary_supervisor', 'bcba', 'bcaba', 'rbt', 'bt', 'case_manager', 'scheduler', 'admin')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  permission_scope JSONB DEFAULT '["view_only"]'::jsonb, -- ['data_entry', 'notes', 'plan_edit', 'view_only', 'billing']
  supervision_required BOOLEAN DEFAULT false,
  supervising_staff_id UUID,
  billable_rate NUMERIC(10, 2),
  notes TEXT,
  assigned_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, staff_user_id, role)
);

-- 7. Service Lines Table (extends existing authorizations)
CREATE TABLE public.client_service_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL, -- 'direct_therapy', 'supervision', 'assessment', 'parent_training', 'consultation'
  cpt_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_authorization BOOLEAN DEFAULT true,
  authorization_status TEXT DEFAULT 'not_required' CHECK (authorization_status IN ('not_required', 'required', 'pending', 'approved', 'expired', 'denied')),
  payer_id UUID REFERENCES public.payers(id),
  authorized_units NUMERIC(10, 2),
  unit_type TEXT DEFAULT 'hours' CHECK (unit_type IN ('hours', 'units', 'sessions')),
  used_units NUMERIC(10, 2) DEFAULT 0,
  remaining_units NUMERIC(10, 2) GENERATED ALWAYS AS (COALESCE(authorized_units, 0) - COALESCE(used_units, 0)) STORED,
  start_date DATE,
  end_date DATE,
  expiry_alert_days INTEGER DEFAULT 30,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Client Documents Table
CREATE TABLE public.client_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('consent', 'iep', 'fba', 'bip', 'assessment', 'medical', 'authorization', 'insurance', 'progress_report', 'correspondence', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  school_year_tag TEXT,
  visibility_permission TEXT NOT NULL DEFAULT 'internal_only' CHECK (visibility_permission IN ('internal_only', 'clinical_team', 'school_team', 'parent_shareable')),
  is_current_version BOOLEAN DEFAULT true,
  version_number INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES public.client_documents(id),
  uploaded_by UUID,
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expiration_date DATE,
  review_required BOOLEAN DEFAULT false,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  tags JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. Communication Log Table
CREATE TABLE public.client_communication_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.client_contacts(id),
  contact_person TEXT NOT NULL,
  contact_role TEXT, -- 'parent', 'teacher', 'therapist', 'doctor', 'other'
  date_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  method TEXT NOT NULL CHECK (method IN ('phone', 'email', 'in_person', 'video_call', 'text', 'app_message', 'fax', 'mail')),
  direction TEXT DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
  topic_tags JSONB DEFAULT '[]'::jsonb, -- ['scheduling', 'progress', 'concern', 'authorization', 'intake']
  summary TEXT NOT NULL,
  detailed_notes TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  follow_up_tasks JSONB DEFAULT '[]'::jsonb, -- [{task, assigned_to, due_date, completed}]
  attachments JSONB DEFAULT '[]'::jsonb,
  visibility TEXT DEFAULT 'internal_only' CHECK (visibility IN ('internal_only', 'clinical_team', 'school_team')),
  logged_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. Client Tags/Case Attributes Table
CREATE TABLE public.client_case_attributes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  attribute_type TEXT NOT NULL, -- 'program', 'funding_source', 'priority', 'region', 'custom'
  attribute_key TEXT NOT NULL,
  attribute_value TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, attribute_type, attribute_key)
);

-- Add new columns to students table for Client Profile 2.0
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS legal_first_name TEXT,
ADD COLUMN IF NOT EXISTS legal_last_name TEXT,
ADD COLUMN IF NOT EXISTS preferred_name TEXT,
ADD COLUMN IF NOT EXISTS pronouns TEXT,
ADD COLUMN IF NOT EXISTS dob DATE,
ADD COLUMN IF NOT EXISTS primary_setting TEXT DEFAULT 'home' CHECK (primary_setting IN ('home', 'school', 'clinic', 'community', 'mixed')),
ADD COLUMN IF NOT EXISTS primary_supervisor_staff_id UUID,
ADD COLUMN IF NOT EXISTS diagnoses JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS grade TEXT,
ADD COLUMN IF NOT EXISTS school_name TEXT,
ADD COLUMN IF NOT EXISTS district_name TEXT,
ADD COLUMN IF NOT EXISTS profile_completeness_status TEXT DEFAULT 'incomplete' CHECK (profile_completeness_status IN ('incomplete', 'partial', 'complete')),
ADD COLUMN IF NOT EXISTS activation_status TEXT DEFAULT 'inactive' CHECK (activation_status IN ('inactive', 'pending', 'active', 'on_hold', 'discharged')),
ADD COLUMN IF NOT EXISTS case_opened_date DATE,
ADD COLUMN IF NOT EXISTS case_closed_date DATE,
ADD COLUMN IF NOT EXISTS discharge_reason TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_contacts_client ON public.client_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_primary ON public.client_contacts(client_id, is_primary_guardian) WHERE is_primary_guardian = true;
CREATE INDEX IF NOT EXISTS idx_client_locations_client ON public.client_locations(client_id);
CREATE INDEX IF NOT EXISTS idx_client_locations_active ON public.client_locations(client_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_client_locations_geocode ON public.client_locations(geocode_lat, geocode_lng) WHERE geocode_status = 'success';
CREATE INDEX IF NOT EXISTS idx_client_team_assignments_client ON public.client_team_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_team_assignments_staff ON public.client_team_assignments(staff_user_id);
CREATE INDEX IF NOT EXISTS idx_client_team_assignments_active ON public.client_team_assignments(client_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_client_documents_client ON public.client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_type ON public.client_documents(client_id, doc_type);
CREATE INDEX IF NOT EXISTS idx_client_communication_log_client ON public.client_communication_log(client_id);
CREATE INDEX IF NOT EXISTS idx_client_communication_log_date ON public.client_communication_log(client_id, date_time DESC);
CREATE INDEX IF NOT EXISTS idx_client_service_lines_client ON public.client_service_lines(client_id);

-- Enable RLS on all new tables
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_safety_medical ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_communication_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_scheduling_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_service_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_communication_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_case_attributes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for all tables
CREATE POLICY "Authenticated users can view client contacts" ON public.client_contacts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can manage client contacts" ON public.client_contacts FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view safety medical" ON public.client_safety_medical FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Clinical staff can manage safety medical" ON public.client_safety_medical FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view communication access" ON public.client_communication_access FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can manage communication access" ON public.client_communication_access FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view scheduling prefs" ON public.client_scheduling_preferences FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can manage scheduling prefs" ON public.client_scheduling_preferences FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view locations" ON public.client_locations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can manage locations" ON public.client_locations FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view team assignments" ON public.client_team_assignments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can manage team assignments" ON public.client_team_assignments FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view service lines" ON public.client_service_lines FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can manage service lines" ON public.client_service_lines FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view documents" ON public.client_documents FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can manage documents" ON public.client_documents FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view comm log" ON public.client_communication_log FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can manage comm log" ON public.client_communication_log FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view case attributes" ON public.client_case_attributes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can manage case attributes" ON public.client_case_attributes FOR ALL USING (auth.uid() IS NOT NULL);

-- Create triggers for updated_at
CREATE TRIGGER update_client_contacts_updated_at BEFORE UPDATE ON public.client_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_client_safety_medical_updated_at BEFORE UPDATE ON public.client_safety_medical FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_client_communication_access_updated_at BEFORE UPDATE ON public.client_communication_access FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_client_scheduling_preferences_updated_at BEFORE UPDATE ON public.client_scheduling_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_client_locations_updated_at BEFORE UPDATE ON public.client_locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_client_team_assignments_updated_at BEFORE UPDATE ON public.client_team_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_client_service_lines_updated_at BEFORE UPDATE ON public.client_service_lines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_client_documents_updated_at BEFORE UPDATE ON public.client_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_client_communication_log_updated_at BEFORE UPDATE ON public.client_communication_log FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_client_case_attributes_updated_at BEFORE UPDATE ON public.client_case_attributes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for client documents
INSERT INTO storage.buckets (id, name, public) VALUES ('client-documents', 'client-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Staff can upload client documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'client-documents' AND auth.uid() IS NOT NULL);
CREATE POLICY "Staff can view client documents" ON storage.objects FOR SELECT USING (bucket_id = 'client-documents' AND auth.uid() IS NOT NULL);
CREATE POLICY "Staff can delete client documents" ON storage.objects FOR DELETE USING (bucket_id = 'client-documents' AND auth.uid() IS NOT NULL);