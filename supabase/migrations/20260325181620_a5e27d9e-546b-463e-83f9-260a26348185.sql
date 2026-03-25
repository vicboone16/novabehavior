
-- 1. Behavior domains from student_behavior_map
INSERT INTO public.nt_behavior_domains (id, name, status, is_selectable, created_at)
SELECT gen_random_uuid(), initcap(trim(bd.domain_name)), 'active', true, now()
FROM (
  SELECT DISTINCT lower(trim(behavior_domain)) as norm, initcap(trim(behavior_domain)) as domain_name
  FROM public.student_behavior_map WHERE behavior_domain IS NOT NULL AND trim(behavior_domain) <> ''
) bd
ON CONFLICT DO NOTHING;

-- Link existing behaviors to their domain
UPDATE public.nt_behaviors nb SET domain_id = (SELECT id FROM public.nt_behavior_domains WHERE lower(name) = 'externalizing' LIMIT 1) WHERE nb.domain_id IS NULL;

-- 2. Program domains from domains table
INSERT INTO public.nt_program_domains (id, name, category, description, status, is_selectable, created_at)
SELECT d.id, d.name, d.category, d.description, 
  CASE WHEN d.status IN ('active','archived','merged','deprecated','draft') THEN d.status ELSE 'active' END,
  true, coalesce(d.created_at, now())
FROM public.domains d
ON CONFLICT (id) DO NOTHING;

-- 3. Programs from skill_programs
INSERT INTO public.nt_programs (id, domain_id, name, description, framework_source, status, is_selectable, created_at, created_by)
SELECT sp.id, sp.domain_id, sp.name, sp.description, sp.method, 'active', true, coalesce(sp.created_at, now()), sp.created_by
FROM public.skill_programs sp WHERE sp.active = true
ON CONFLICT (id) DO NOTHING;

-- 4. Synthetic objectives
INSERT INTO public.nt_objectives (id, program_id, name, objective_text, status, is_selectable, created_at)
SELECT gen_random_uuid(), sp.id, sp.name || ' — Default Objective',
  'Auto-generated objective grouping targets for: ' || sp.name, 'active', true, now()
FROM public.skill_programs sp WHERE sp.active = true
AND NOT EXISTS (SELECT 1 FROM public.nt_objectives o WHERE o.program_id = sp.id);

-- 5. Targets from skill_targets
INSERT INTO public.nt_targets (id, objective_id, name, target_text, status, is_selectable, created_at)
SELECT st.id, obj.id, st.name, st.operational_definition, 'active', true, coalesce(st.created_at, now())
FROM public.skill_targets st
JOIN public.nt_objectives obj ON obj.program_id = st.program_id
WHERE st.active = true
ON CONFLICT (id) DO NOTHING;

-- 6. Learner behavior assignments
INSERT INTO public.nt_learner_behavior_assignments (id, learner_id, behavior_id, resolved_behavior_id, behavior_name_snapshot, domain_name_snapshot, status, assigned_at, created_at)
SELECT sbm.id, sbm.student_id, sbm.behavior_entry_id, sbm.behavior_entry_id,
  coalesce(b.name, sbm.behavior_subtype, 'Unknown'), coalesce(sbm.behavior_domain, 'Uncategorized'),
  CASE WHEN sbm.active THEN 'active' ELSE 'inactive' END, coalesce(sbm.created_at, now()), coalesce(sbm.created_at, now())
FROM public.student_behavior_map sbm
LEFT JOIN public.behaviors b ON b.id = sbm.behavior_entry_id
ON CONFLICT (id) DO NOTHING;

-- 7. Learner program assignments
INSERT INTO public.nt_learner_program_assignments (id, learner_id, program_id, resolved_program_id, program_name_snapshot, domain_name_snapshot, status, assigned_at, created_at, created_by)
SELECT sp.id, sp.student_id, sp.id, sp.id, sp.name, coalesce(d.name, 'Uncategorized'),
  CASE WHEN sp.active THEN 'active' ELSE 'inactive' END, coalesce(sp.created_at, now()), coalesce(sp.created_at, now()), sp.created_by
FROM public.skill_programs sp LEFT JOIN public.domains d ON d.id = sp.domain_id
ON CONFLICT (id) DO NOTHING;

-- 8. Learner target assignments
INSERT INTO public.nt_learner_target_assignments (id, learner_id, target_id, resolved_target_id, target_name_snapshot, objective_name_snapshot, status, assigned_at, created_at)
SELECT st.id, sp.student_id, st.id, st.id, st.name, sp.name || ' — Default Objective',
  CASE WHEN st.active THEN 'active' ELSE 'inactive' END, coalesce(st.created_at, now()), coalesce(st.created_at, now())
FROM public.skill_targets st JOIN public.skill_programs sp ON sp.id = st.program_id
ON CONFLICT (id) DO NOTHING;
