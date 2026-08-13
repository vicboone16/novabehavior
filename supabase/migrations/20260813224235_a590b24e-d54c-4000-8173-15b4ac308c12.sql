CREATE TABLE public.cleanup_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID,
  student_name TEXT,
  performed_by UUID REFERENCES auth.users(id),
  performed_by_email TEXT,
  mode TEXT NOT NULL DEFAULT 'hard_delete',
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview_count INTEGER NOT NULL DEFAULT 0,
  deleted_map_ids UUID[] NOT NULL DEFAULT '{}',
  deleted_data_ids UUID[] NOT NULL DEFAULT '{}',
  integrity_warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  restored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cleanup_audit_logs_mode_check CHECK (mode IN ('dry_run','archive','hard_delete','restore'))
);

GRANT SELECT, INSERT, UPDATE ON public.cleanup_audit_logs TO authenticated;
GRANT ALL ON public.cleanup_audit_logs TO service_role;
ALTER TABLE public.cleanup_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view cleanup audit logs"
  ON public.cleanup_audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create cleanup audit logs"
  ON public.cleanup_audit_logs FOR INSERT TO authenticated
  WITH CHECK (performed_by = auth.uid());
CREATE POLICY "Owners can update their cleanup audit logs"
  ON public.cleanup_audit_logs FOR UPDATE TO authenticated
  USING (performed_by = auth.uid()) WITH CHECK (performed_by = auth.uid());

CREATE TABLE public.cleanup_archived_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_log_id UUID NOT NULL REFERENCES public.cleanup_audit_logs(id) ON DELETE CASCADE,
  student_id UUID,
  source_table TEXT NOT NULL,
  record_id UUID NOT NULL,
  payload JSONB NOT NULL,
  archived_by UUID REFERENCES auth.users(id),
  retention_until TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  restored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cleanup_archived_audit ON public.cleanup_archived_records(audit_log_id);
CREATE INDEX idx_cleanup_archived_student ON public.cleanup_archived_records(student_id);

GRANT SELECT, INSERT, UPDATE ON public.cleanup_archived_records TO authenticated;
GRANT ALL ON public.cleanup_archived_records TO service_role;
ALTER TABLE public.cleanup_archived_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view cleanup archives"
  ON public.cleanup_archived_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create cleanup archives"
  ON public.cleanup_archived_records FOR INSERT TO authenticated
  WITH CHECK (archived_by = auth.uid());
CREATE POLICY "Owners can update their cleanup archives"
  ON public.cleanup_archived_records FOR UPDATE TO authenticated
  USING (archived_by = auth.uid()) WITH CHECK (archived_by = auth.uid());

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_cleanup_audit_logs_updated_at
  BEFORE UPDATE ON public.cleanup_audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_cleanup_archived_records_updated_at
  BEFORE UPDATE ON public.cleanup_archived_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.restore_cleanup_archive(_audit_log_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  restored_map INT := 0;
  restored_data INT := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  FOR r IN
    SELECT * FROM public.cleanup_archived_records
    WHERE audit_log_id = _audit_log_id
      AND restored_at IS NULL
      AND retention_until > now()
  LOOP
    IF r.source_table = 'student_behavior_map' THEN
      INSERT INTO public.student_behavior_map
      SELECT * FROM jsonb_populate_record(NULL::public.student_behavior_map, r.payload)
      ON CONFLICT (id) DO NOTHING;
      restored_map := restored_map + 1;
    ELSIF r.source_table = 'behavior_session_data' THEN
      INSERT INTO public.behavior_session_data
      SELECT * FROM jsonb_populate_record(NULL::public.behavior_session_data, r.payload)
      ON CONFLICT (id) DO NOTHING;
      restored_data := restored_data + 1;
    END IF;

    UPDATE public.cleanup_archived_records
      SET restored_at = now() WHERE id = r.id;
  END LOOP;

  UPDATE public.cleanup_audit_logs
    SET restored_at = now() WHERE id = _audit_log_id;

  RETURN jsonb_build_object(
    'restored_map_rows', restored_map,
    'restored_data_rows', restored_data
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_cleanup_archive(UUID) TO authenticated;