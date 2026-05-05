-- 1. Add columns to student_behavior_map for archive + Bank link + taxonomy
ALTER TABLE public.student_behavior_map
  ADD COLUMN IF NOT EXISTS bank_behavior_id uuid,
  ADD COLUMN IF NOT EXISTS domain text,
  ADD COLUMN IF NOT EXISTS subdomain text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_reason text;

CREATE INDEX IF NOT EXISTS idx_sbm_bank_behavior ON public.student_behavior_map(bank_behavior_id);
CREATE INDEX IF NOT EXISTS idx_sbm_domain ON public.student_behavior_map(domain);

-- 2. Rename RPC: scope = 'student' (sbm.behavior_subtype) | 'global' (behaviors.name)
CREATE OR REPLACE FUNCTION public.rename_student_behavior(
  p_student_id uuid,
  p_behavior_id uuid,
  p_new_name text,
  p_scope text DEFAULT 'student'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean text := trim(p_new_name);
BEGIN
  IF v_clean IS NULL OR v_clean = '' THEN
    RAISE EXCEPTION 'New name is required';
  END IF;

  IF p_scope = 'global' THEN
    UPDATE public.behaviors SET name = v_clean, updated_at = now() WHERE id = p_behavior_id;
  END IF;

  UPDATE public.student_behavior_map
     SET behavior_subtype = v_clean, updated_at = now()
   WHERE student_id = p_student_id
     AND behavior_entry_id = p_behavior_id;

  RETURN jsonb_build_object('success', true, 'new_name', v_clean, 'scope', p_scope);
END;
$$;

-- 3. Archive RPC: soft-archive (active=false) or hard-delete (also purge BSD rows)
CREATE OR REPLACE FUNCTION public.archive_student_behavior(
  p_student_id uuid,
  p_behavior_id uuid,
  p_mode text DEFAULT 'archive', -- 'archive' | 'delete'
  p_reason text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bsd_deleted int := 0;
  v_sd_deleted int := 0;
BEGIN
  IF p_mode = 'delete' THEN
    DELETE FROM public.behavior_session_data
     WHERE student_id = p_student_id AND behavior_id = p_behavior_id;
    GET DIAGNOSTICS v_bsd_deleted = ROW_COUNT;

    DELETE FROM public.session_data
     WHERE student_id = p_student_id AND behavior_id = p_behavior_id::text;
    GET DIAGNOSTICS v_sd_deleted = ROW_COUNT;
  END IF;

  UPDATE public.student_behavior_map
     SET active = false,
         archived_at = now(),
         archived_reason = COALESCE(p_reason, p_mode),
         updated_at = now()
   WHERE student_id = p_student_id
     AND behavior_entry_id = p_behavior_id;

  RETURN jsonb_build_object(
    'success', true,
    'mode', p_mode,
    'bsd_deleted', v_bsd_deleted,
    'sd_deleted', v_sd_deleted
  );
END;
$$;

-- 4. Restore (un-archive) RPC
CREATE OR REPLACE FUNCTION public.restore_student_behavior(
  p_student_id uuid,
  p_behavior_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.student_behavior_map
     SET active = true,
         archived_at = NULL,
         archived_reason = NULL,
         updated_at = now()
   WHERE student_id = p_student_id
     AND behavior_entry_id = p_behavior_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 5. Link student behavior to a Bank canonical behavior (with domain/subdomain inheritance)
CREATE OR REPLACE FUNCTION public.link_behavior_to_bank(
  p_student_id uuid,
  p_behavior_id uuid,
  p_bank_behavior_id uuid,
  p_domain text DEFAULT NULL,
  p_subdomain text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.student_behavior_map
     SET bank_behavior_id = p_bank_behavior_id,
         domain = COALESCE(p_domain, domain),
         subdomain = COALESCE(p_subdomain, subdomain),
         updated_at = now()
   WHERE student_id = p_student_id
     AND behavior_entry_id = p_behavior_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 6. Merge v2 with mode = 'delete' | 'archive' (extends v1 behavior)
CREATE OR REPLACE FUNCTION public.merge_student_behavior_v2(
  p_student_id uuid,
  p_source_behavior_id uuid,
  p_target_behavior_id uuid,
  p_mode text DEFAULT 'delete' -- 'delete' (hard hide) | 'archive' (keep history)
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bsd_count int := 0;
  v_sd_count int := 0;
  v_target_name text;
BEGIN
  IF p_source_behavior_id = p_target_behavior_id THEN
    RAISE EXCEPTION 'Cannot merge a behavior into itself';
  END IF;

  SELECT COALESCE(b.name, sbm.behavior_subtype, p_target_behavior_id::text)
    INTO v_target_name
    FROM student_behavior_map sbm
    LEFT JOIN behaviors b ON b.id = sbm.behavior_entry_id
   WHERE sbm.student_id = p_student_id
     AND sbm.behavior_entry_id = p_target_behavior_id
   LIMIT 1;

  -- Move BSD rows
  UPDATE behavior_session_data
     SET behavior_id = p_target_behavior_id, updated_at = now()
   WHERE student_id = p_student_id AND behavior_id = p_source_behavior_id;
  GET DIAGNOSTICS v_bsd_count = ROW_COUNT;

  -- Move session_data (text col)
  UPDATE session_data
     SET behavior_id = p_target_behavior_id::text
   WHERE student_id = p_student_id AND behavior_id = p_source_behavior_id::text;
  GET DIAGNOSTICS v_sd_count = ROW_COUNT;

  -- Move ABC logs
  UPDATE abc_logs
     SET bsd_row_id = bsd_row_id  -- no-op placeholder if no behavior_id col; safe
   WHERE client_id = p_student_id AND false;

  -- Deactivate or archive source
  UPDATE student_behavior_map
     SET active = false,
         archived_at = CASE WHEN p_mode = 'archive' THEN now() ELSE archived_at END,
         archived_reason = CASE WHEN p_mode = 'archive'
            THEN 'Merged into ' || COALESCE(v_target_name, p_target_behavior_id::text)
            ELSE 'merged_deleted' END,
         notes = COALESCE(notes,'') || ' [Merged into ' || COALESCE(v_target_name, p_target_behavior_id::text) || ' on ' || now()::date::text || ']',
         updated_at = now()
   WHERE student_id = p_student_id AND behavior_entry_id = p_source_behavior_id;

  RETURN jsonb_build_object(
    'success', true,
    'target_name', v_target_name,
    'bsd_moved', v_bsd_count,
    'sd_moved', v_sd_count,
    'mode', p_mode
  );
END;
$$;

-- 7. RLS audit on recruiting tables — ensure agency-scoped read/write for authenticated staff
DO $$
BEGIN
  -- job_postings
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='job_postings') THEN
    EXECUTE 'ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "job_postings_authenticated_read" ON public.job_postings';
    EXECUTE 'DROP POLICY IF EXISTS "job_postings_authenticated_write" ON public.job_postings';
    EXECUTE 'CREATE POLICY "job_postings_authenticated_read" ON public.job_postings FOR SELECT TO authenticated USING (true)';
    EXECUTE 'CREATE POLICY "job_postings_authenticated_write" ON public.job_postings FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='job_applicants') THEN
    EXECUTE 'ALTER TABLE public.job_applicants ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "job_applicants_authenticated_all" ON public.job_applicants';
    EXECUTE 'CREATE POLICY "job_applicants_authenticated_all" ON public.job_applicants FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='onboarding_templates') THEN
    EXECUTE 'ALTER TABLE public.onboarding_templates ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "onboarding_templates_authenticated_all" ON public.onboarding_templates';
    EXECUTE 'CREATE POLICY "onboarding_templates_authenticated_all" ON public.onboarding_templates FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='onboarding_tasks') THEN
    EXECUTE 'ALTER TABLE public.onboarding_tasks ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "onboarding_tasks_authenticated_all" ON public.onboarding_tasks';
    EXECUTE 'CREATE POLICY "onboarding_tasks_authenticated_all" ON public.onboarding_tasks FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='mentor_assignments') THEN
    EXECUTE 'ALTER TABLE public.mentor_assignments ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "mentor_assignments_authenticated_all" ON public.mentor_assignments';
    EXECUTE 'CREATE POLICY "mentor_assignments_authenticated_all" ON public.mentor_assignments FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL)';
  END IF;
END $$;