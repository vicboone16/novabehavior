CREATE TABLE IF NOT EXISTS public.assessment_capture_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  record_type text not null check (record_type in ('fba_structured_observation','cold_probe_session','observation_notes')),
  record_key text not null,
  observation_date date,
  payload jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, record_type, record_key)
);

CREATE INDEX IF NOT EXISTS idx_acr_student_type ON public.assessment_capture_records(student_id, record_type, observation_date desc);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_capture_records TO authenticated;
GRANT ALL ON public.assessment_capture_records TO service_role;

ALTER TABLE public.assessment_capture_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "acr_select" ON public.assessment_capture_records FOR SELECT TO authenticated
USING (created_by = auth.uid() OR public.has_student_access(student_id, auth.uid()) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "acr_insert" ON public.assessment_capture_records FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid() AND (public.has_student_access(student_id, auth.uid()) OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin')));

CREATE POLICY "acr_update" ON public.assessment_capture_records FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "acr_delete" ON public.assessment_capture_records FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'));

CREATE TRIGGER trg_acr_updated_at BEFORE UPDATE ON public.assessment_capture_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();