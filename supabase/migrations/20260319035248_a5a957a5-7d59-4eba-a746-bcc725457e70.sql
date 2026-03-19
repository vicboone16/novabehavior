
CREATE TABLE public.classroom_presence_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  classroom_id UUID NOT NULL,
  student_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'present',
  changed_by UUID,
  agency_id UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

ALTER TABLE public.classroom_presence_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cph_select_agency" ON public.classroom_presence_history
  FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_memberships WHERE user_id = auth.uid()));

CREATE POLICY "cph_insert_agency" ON public.classroom_presence_history
  FOR INSERT TO authenticated
  WITH CHECK (agency_id IN (SELECT agency_id FROM public.agency_memberships WHERE user_id = auth.uid()));

CREATE INDEX idx_cph_classroom_date ON public.classroom_presence_history(classroom_id, changed_at DESC);
CREATE INDEX idx_cph_student ON public.classroom_presence_history(student_id, changed_at DESC);

CREATE TABLE public.guardian_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  parent_contact_id UUID NOT NULL REFERENCES public.parent_contacts(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL DEFAULT 'guardian',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  can_receive_reports BOOLEAN NOT NULL DEFAULT true,
  agency_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, parent_contact_id)
);

ALTER TABLE public.guardian_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gm_select_agency" ON public.guardian_mappings
  FOR SELECT TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_memberships WHERE user_id = auth.uid()));

CREATE POLICY "gm_all_agency" ON public.guardian_mappings
  FOR ALL TO authenticated
  USING (agency_id IN (SELECT agency_id FROM public.agency_memberships WHERE user_id = auth.uid()));

CREATE TABLE public.parent_report_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.parent_report_profiles(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL DEFAULT 'include_section',
  rule_key TEXT NOT NULL,
  rule_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.parent_report_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "prr_select_authenticated" ON public.parent_report_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "prr_manage_authenticated" ON public.parent_report_rules
  FOR ALL TO authenticated USING (true);

CREATE INDEX idx_prr_profile ON public.parent_report_rules(profile_id);
