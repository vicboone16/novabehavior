
-- Drop existing views first
DROP VIEW IF EXISTS public.v_nt_selectable_behaviors CASCADE;
DROP VIEW IF EXISTS public.v_nt_selectable_programs CASCADE;
DROP VIEW IF EXISTS public.v_nt_selectable_objectives CASCADE;
DROP VIEW IF EXISTS public.v_nt_selectable_targets CASCADE;
DROP VIEW IF EXISTS public.v_nt_selectable_behavior_domains CASCADE;
DROP VIEW IF EXISTS public.v_nt_selectable_program_domains CASCADE;
DROP VIEW IF EXISTS public.v_nt_learner_behavior_assignments_resolved CASCADE;
DROP VIEW IF EXISTS public.v_nt_learner_program_assignments_resolved CASCADE;
DROP VIEW IF EXISTS public.v_nt_learner_target_assignments_resolved CASCADE;
DROP VIEW IF EXISTS public.v_nt_backfill_diagnostics CASCADE;

-- RLS
ALTER TABLE public.nt_behavior_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nt_behaviors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nt_behavior_measurement_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nt_program_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nt_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nt_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nt_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nt_learner_behavior_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nt_learner_program_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nt_learner_objective_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nt_learner_target_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_bops_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_merge_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_merge_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objective_merge_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.target_merge_map ENABLE ROW LEVEL SECURITY;

-- RLS policies
DO $$ 
DECLARE tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'nt_behavior_domains','nt_behaviors','nt_behavior_measurement_profiles',
    'nt_program_domains','nt_programs','nt_objectives','nt_targets',
    'entity_bops_tags','entity_aliases',
    'behavior_merge_map','program_merge_map','objective_merge_map','target_merge_map',
    'nt_learner_behavior_assignments','nt_learner_program_assignments',
    'nt_learner_objective_assignments','nt_learner_target_assignments'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "auth_read_%s" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "auth_read_%s" ON public.%I FOR SELECT TO authenticated USING (true)', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS "auth_write_%s" ON public.%I', tbl, tbl);
    EXECUTE format('CREATE POLICY "auth_write_%s" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', tbl, tbl);
  END LOOP;
END $$;

-- Selectable views
CREATE VIEW public.v_nt_selectable_behaviors WITH (security_invoker=on) AS
SELECT b.id, b.name, b.definition, b.domain_id, bd.name as domain_name
FROM public.nt_behaviors b LEFT JOIN public.nt_behavior_domains bd ON bd.id = b.domain_id
WHERE b.status = 'active' AND b.is_selectable = true;

CREATE VIEW public.v_nt_selectable_programs WITH (security_invoker=on) AS
SELECT p.id, p.name, p.description, p.domain_id, pd.name as domain_name, p.framework_source
FROM public.nt_programs p LEFT JOIN public.nt_program_domains pd ON pd.id = p.domain_id
WHERE p.status = 'active' AND p.is_selectable = true;

CREATE VIEW public.v_nt_selectable_objectives WITH (security_invoker=on) AS
SELECT o.id, o.name, o.objective_text, o.program_id, p.name as program_name
FROM public.nt_objectives o LEFT JOIN public.nt_programs p ON p.id = o.program_id
WHERE o.status = 'active' AND o.is_selectable = true;

CREATE VIEW public.v_nt_selectable_targets WITH (security_invoker=on) AS
SELECT t.id, t.name, t.target_text, t.objective_id, o.name as objective_name, t.measurement_type
FROM public.nt_targets t LEFT JOIN public.nt_objectives o ON o.id = t.objective_id
WHERE t.status = 'active' AND t.is_selectable = true;

CREATE VIEW public.v_nt_selectable_behavior_domains WITH (security_invoker=on) AS
SELECT id, name, description FROM public.nt_behavior_domains WHERE status = 'active' AND is_selectable = true;

CREATE VIEW public.v_nt_selectable_program_domains WITH (security_invoker=on) AS
SELECT id, name, category, description FROM public.nt_program_domains WHERE status = 'active' AND is_selectable = true;

-- Resolved learner views
CREATE VIEW public.v_nt_learner_behavior_assignments_resolved WITH (security_invoker=on) AS
SELECT la.id, la.learner_id, la.behavior_id,
  coalesce(la.resolved_behavior_id, la.behavior_id) as effective_behavior_id,
  la.behavior_name_snapshot as original_behavior_name,
  coalesce(nb.name, la.behavior_name_snapshot) as current_behavior_name,
  la.domain_name_snapshot as original_domain_name,
  coalesce(nbd.name, la.domain_name_snapshot) as current_domain_name,
  nb.status as current_behavior_status, nb.successor_id as behavior_successor_id,
  la.status as assignment_status, la.assigned_at, la.ended_at, la.created_at,
  CASE WHEN nb.id IS NULL THEN 'detached' WHEN nb.status='merged' THEN 'merged'
    WHEN nb.status='archived' THEN 'archived' WHEN nb.status='deprecated' THEN 'deprecated' ELSE 'linked' END as link_health
FROM public.nt_learner_behavior_assignments la
LEFT JOIN public.nt_behaviors nb ON nb.id = coalesce(la.resolved_behavior_id, la.behavior_id)
LEFT JOIN public.nt_behavior_domains nbd ON nbd.id = nb.domain_id;

CREATE VIEW public.v_nt_learner_program_assignments_resolved WITH (security_invoker=on) AS
SELECT la.id, la.learner_id, la.program_id,
  coalesce(la.resolved_program_id, la.program_id) as effective_program_id,
  la.program_name_snapshot as original_program_name,
  coalesce(np.name, la.program_name_snapshot) as current_program_name,
  la.domain_name_snapshot as original_domain_name,
  coalesce(npd.name, la.domain_name_snapshot) as current_domain_name,
  np.status as current_program_status, np.successor_id as program_successor_id,
  la.status as assignment_status, la.assigned_at, la.ended_at, la.created_at,
  CASE WHEN np.id IS NULL THEN 'detached' WHEN np.status='merged' THEN 'merged'
    WHEN np.status='archived' THEN 'archived' WHEN np.status='deprecated' THEN 'deprecated' ELSE 'linked' END as link_health
FROM public.nt_learner_program_assignments la
LEFT JOIN public.nt_programs np ON np.id = coalesce(la.resolved_program_id, la.program_id)
LEFT JOIN public.nt_program_domains npd ON npd.id = np.domain_id;

CREATE VIEW public.v_nt_learner_target_assignments_resolved WITH (security_invoker=on) AS
SELECT la.id, la.learner_id, la.target_id,
  coalesce(la.resolved_target_id, la.target_id) as effective_target_id,
  la.target_name_snapshot as original_target_name,
  coalesce(nt.name, la.target_name_snapshot) as current_target_name,
  la.objective_name_snapshot as original_objective_name,
  nt.status as current_target_status, nt.successor_id as target_successor_id,
  la.status as assignment_status, la.assigned_at, la.ended_at, la.created_at,
  CASE WHEN nt.id IS NULL THEN 'detached' WHEN nt.status='merged' THEN 'merged'
    WHEN nt.status='archived' THEN 'archived' ELSE 'linked' END as link_health
FROM public.nt_learner_target_assignments la
LEFT JOIN public.nt_targets nt ON nt.id = coalesce(la.resolved_target_id, la.target_id);

-- Safe archive function
CREATE OR REPLACE FUNCTION public.nt_safe_archive(p_entity_type text, p_entity_id uuid, p_archived_by uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count int := 0; v_table text;
BEGIN
  v_table := CASE p_entity_type WHEN 'behavior' THEN 'nt_behaviors' WHEN 'behavior_domain' THEN 'nt_behavior_domains'
    WHEN 'program' THEN 'nt_programs' WHEN 'program_domain' THEN 'nt_program_domains'
    WHEN 'objective' THEN 'nt_objectives' WHEN 'target' THEN 'nt_targets' ELSE NULL END;
  IF v_table IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Unknown entity type'); END IF;
  EXECUTE format('UPDATE public.%I SET status=$1, is_selectable=false, archived_at=now(), archived_by=$2 WHERE id=$3 AND status=$4', v_table)
    USING 'archived', p_archived_by, p_entity_id, 'active';
  IF p_entity_type = 'behavior' THEN SELECT count(*) INTO v_count FROM nt_learner_behavior_assignments WHERE behavior_id = p_entity_id AND status = 'active';
  ELSIF p_entity_type = 'program' THEN SELECT count(*) INTO v_count FROM nt_learner_program_assignments WHERE program_id = p_entity_id AND status = 'active';
  ELSIF p_entity_type = 'target' THEN SELECT count(*) INTO v_count FROM nt_learner_target_assignments WHERE target_id = p_entity_id AND status = 'active';
  END IF;
  RETURN jsonb_build_object('success', true, 'entity_type', p_entity_type, 'entity_id', p_entity_id, 'active_assignments_preserved', v_count);
END; $$;

-- Safe merge function
CREATE OR REPLACE FUNCTION public.nt_safe_merge(p_entity_type text, p_old_id uuid, p_new_id uuid, p_migrate_assignments boolean DEFAULT false, p_merge_reason text DEFAULT NULL, p_merged_by uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_table text; v_migrated int := 0; v_old_name text;
BEGIN
  v_table := CASE p_entity_type WHEN 'behavior' THEN 'nt_behaviors' WHEN 'program' THEN 'nt_programs'
    WHEN 'objective' THEN 'nt_objectives' WHEN 'target' THEN 'nt_targets' ELSE NULL END;
  IF v_table IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Unknown entity type'); END IF;
  EXECUTE format('SELECT name FROM public.%I WHERE id=$1', v_table) INTO v_old_name USING p_old_id;
  EXECUTE format('UPDATE public.%I SET status=$1, is_selectable=false, successor_id=$2, archived_at=now(), archived_by=$3 WHERE id=$4', v_table)
    USING 'merged', p_new_id, p_merged_by, p_old_id;
  IF p_entity_type = 'behavior' THEN
    INSERT INTO behavior_merge_map (old_behavior_id, new_behavior_id, merge_reason, migrated_assignments, migrated_data, created_by) VALUES (p_old_id, p_new_id, p_merge_reason, p_migrate_assignments, false, p_merged_by);
  ELSIF p_entity_type = 'program' THEN
    INSERT INTO program_merge_map (old_program_id, new_program_id, merge_reason, migrated_assignments, migrated_data, created_by) VALUES (p_old_id, p_new_id, p_merge_reason, p_migrate_assignments, false, p_merged_by);
  END IF;
  IF v_old_name IS NOT NULL THEN
    INSERT INTO entity_aliases (entity_type, entity_id, alias_text, alias_kind) VALUES (p_entity_type, p_new_id, v_old_name, 'merge_source') ON CONFLICT DO NOTHING;
  END IF;
  IF p_migrate_assignments THEN
    IF p_entity_type = 'behavior' THEN UPDATE nt_learner_behavior_assignments SET resolved_behavior_id = p_new_id WHERE behavior_id = p_old_id AND status = 'active'; GET DIAGNOSTICS v_migrated = ROW_COUNT;
    ELSIF p_entity_type = 'program' THEN UPDATE nt_learner_program_assignments SET resolved_program_id = p_new_id WHERE program_id = p_old_id AND status = 'active'; GET DIAGNOSTICS v_migrated = ROW_COUNT;
    ELSIF p_entity_type = 'target' THEN UPDATE nt_learner_target_assignments SET resolved_target_id = p_new_id WHERE target_id = p_old_id AND status = 'active'; GET DIAGNOSTICS v_migrated = ROW_COUNT;
    END IF;
  END IF;
  RETURN jsonb_build_object('success', true, 'old_id', p_old_id, 'new_id', p_new_id, 'old_name', v_old_name, 'assignments_migrated', v_migrated);
END; $$;

-- Diagnostics view
CREATE VIEW public.v_nt_backfill_diagnostics WITH (security_invoker=on) AS
SELECT 'nt_behavior_domains' as entity, count(*) as total, count(*) FILTER (WHERE status='active') as active_count FROM nt_behavior_domains
UNION ALL SELECT 'nt_behaviors', count(*), count(*) FILTER (WHERE status='active') FROM nt_behaviors
UNION ALL SELECT 'nt_program_domains', count(*), count(*) FILTER (WHERE status='active') FROM nt_program_domains
UNION ALL SELECT 'nt_programs', count(*), count(*) FILTER (WHERE status='active') FROM nt_programs
UNION ALL SELECT 'nt_objectives', count(*), count(*) FILTER (WHERE status='active') FROM nt_objectives
UNION ALL SELECT 'nt_targets', count(*), count(*) FILTER (WHERE status='active') FROM nt_targets
UNION ALL SELECT 'nt_learner_behavior_assignments', count(*), count(*) FILTER (WHERE status='active') FROM nt_learner_behavior_assignments
UNION ALL SELECT 'nt_learner_program_assignments', count(*), count(*) FILTER (WHERE status='active') FROM nt_learner_program_assignments
UNION ALL SELECT 'nt_learner_target_assignments', count(*), count(*) FILTER (WHERE status='active') FROM nt_learner_target_assignments;
