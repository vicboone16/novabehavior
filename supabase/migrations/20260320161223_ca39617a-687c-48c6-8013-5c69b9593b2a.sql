
-- Clinical Form Templates: stores definitions for all 20 clinical forms
CREATE TABLE public.clinical_form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_key TEXT NOT NULL UNIQUE,
  form_name TEXT NOT NULL,
  form_category TEXT NOT NULL, -- 'sendable', 'observation', 'data_sheet', 'iep_dashboard', 'assessment'
  description TEXT,
  delivery_modes TEXT[] NOT NULL DEFAULT '{}', -- 'magic_link', 'in_app', 'exportable', 'teacher_hub'
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  scoring_config JSONB,
  export_layout TEXT, -- 'pdf', 'docx', 'xlsx'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clinical form submissions: tracks individual form completions
CREATE TABLE public.clinical_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.clinical_form_templates(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  respondent_name TEXT,
  respondent_email TEXT,
  respondent_relationship TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'sent', 'in_progress', 'submitted', 'reviewed'
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  scores JSONB,
  access_token UUID DEFAULT gen_random_uuid(),
  expires_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- IEP case data: stores case planner, service minutes, comms per student
CREATE TABLE public.iep_case_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL, -- 'case_plan', 'service_minutes', 'communication', 'meeting_notes'
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clinical_form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iep_case_data ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated users can read all templates
CREATE POLICY "Authenticated users can read clinical form templates"
  ON public.clinical_form_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage clinical form templates"
  ON public.clinical_form_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RLS: submissions readable by creator or assigned user
CREATE POLICY "Users can read their clinical form submissions"
  ON public.clinical_form_submissions FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid());

CREATE POLICY "Users can insert clinical form submissions"
  ON public.clinical_form_submissions FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their clinical form submissions"
  ON public.clinical_form_submissions FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR assigned_to = auth.uid());

CREATE POLICY "Users can delete their clinical form submissions"
  ON public.clinical_form_submissions FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- RLS: public access for magic link submissions (anon via access_token)
CREATE POLICY "Public can read submissions by access token"
  ON public.clinical_form_submissions FOR SELECT TO anon
  USING (access_token IS NOT NULL AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Public can update submissions by access token"
  ON public.clinical_form_submissions FOR UPDATE TO anon
  USING (access_token IS NOT NULL AND (expires_at IS NULL OR expires_at > now()));

-- RLS: IEP case data
CREATE POLICY "Authenticated users can manage IEP case data"
  ON public.iep_case_data FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_clinical_form_submissions_student ON public.clinical_form_submissions(student_id);
CREATE INDEX idx_clinical_form_submissions_template ON public.clinical_form_submissions(template_id);
CREATE INDEX idx_clinical_form_submissions_token ON public.clinical_form_submissions(access_token);
CREATE INDEX idx_iep_case_data_student ON public.iep_case_data(student_id);
CREATE INDEX idx_iep_case_data_type ON public.iep_case_data(data_type);
