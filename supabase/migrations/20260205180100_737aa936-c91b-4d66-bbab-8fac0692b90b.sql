-- Teacher Observation Requests
CREATE TABLE IF NOT EXISTS observation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL DEFAULT 'behavior_observation',
  target_behaviors UUID[],
  instructions TEXT,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_role TEXT DEFAULT 'teacher',
  access_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  opened_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  response_data JSONB,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE observation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view observation requests they created"
  ON observation_requests FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create observation requests"
  ON observation_requests FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their observation requests"
  ON observation_requests FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Public can view by token"
  ON observation_requests FOR SELECT
  USING (true);

CREATE POLICY "Public can update by token"
  ON observation_requests FOR UPDATE
  USING (true);

-- White-Label Report Branding
CREATE TABLE IF NOT EXISTS report_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id),
  organization_name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  secondary_color TEXT DEFAULT '#1E40AF',
  footer_text TEXT,
  contact_info JSONB,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE report_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view report branding"
  ON report_branding FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage report branding"
  ON report_branding FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Generated Reports
CREATE TABLE IF NOT EXISTS generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  branding_id UUID REFERENCES report_branding(id),
  date_range_start DATE,
  date_range_end DATE,
  content JSONB,
  pdf_url TEXT,
  generated_at TIMESTAMPTZ DEFAULT now(),
  generated_by UUID REFERENCES auth.users(id),
  shared_with JSONB,
  is_public BOOLEAN DEFAULT false,
  public_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex')
);

ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reports they generated"
  ON generated_reports FOR SELECT
  USING (auth.uid() = generated_by);

CREATE POLICY "Users can create reports"
  ON generated_reports FOR INSERT
  WITH CHECK (auth.uid() = generated_by);

CREATE POLICY "Public can view by token"
  ON generated_reports FOR SELECT
  USING (is_public = true);

-- IEP Meeting Preps
CREATE TABLE IF NOT EXISTS iep_meeting_preps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  meeting_date DATE NOT NULL,
  meeting_type TEXT NOT NULL DEFAULT 'annual',
  data_summary JSONB,
  goal_progress JSONB,
  recommendations JSONB,
  documents_checklist JSONB,
  attendees JSONB,
  generated_report_url TEXT,
  status TEXT DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE iep_meeting_preps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view IEP meeting preps they created"
  ON iep_meeting_preps FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create IEP meeting preps"
  ON iep_meeting_preps FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their IEP meeting preps"
  ON iep_meeting_preps FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their IEP meeting preps"
  ON iep_meeting_preps FOR DELETE
  USING (auth.uid() = created_by);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_observation_requests_student ON observation_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_observation_requests_token ON observation_requests(access_token);
CREATE INDEX IF NOT EXISTS idx_generated_reports_student ON generated_reports(student_id);
CREATE INDEX IF NOT EXISTS idx_iep_meeting_preps_student ON iep_meeting_preps(student_id);