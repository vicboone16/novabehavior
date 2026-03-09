
-- Benchmarks for mand-2
INSERT INTO public.clinical_curricula_benchmarks(goal_id, benchmark_order, benchmark_text)
SELECT g.id, unnest(ARRAY[1,2,3,4,5,6]),
       unnest(ARRAY[
         'Complete target in 1 opportunity',
         'Complete target in 3 opportunities',
         'Complete target in 5 opportunities',
         'Across 2 instructors',
         'Across 2 settings',
         'Maintain skill across sessions'
       ])
FROM public.clinical_curricula_goals g
JOIN public.clinical_curricula_domains d ON d.id = g.domain_id
JOIN public.clinical_curricula_collections c ON c.id = d.collection_id
WHERE c.key = 'vbmapp' AND d.key = 'mand' AND g.key = 'mand-2'
ON CONFLICT (goal_id, benchmark_order) DO UPDATE SET benchmark_text = EXCLUDED.benchmark_text;

-- Insert mand-3 goal
INSERT INTO public.clinical_curricula_goals(
  domain_id, key, title, clinical_goal, objective_text, vbmapp_domain, vbmapp_level,
  benchmark_count, younger_examples, older_examples, age_group_tags, setting_tags, skill_tags, sort_order
)
SELECT d.id, 'mand-3', 'Mand 3', 'Generalizes 6 mands across people, settings, and examples', 'Generalizes 6 mands across people, settings, and examples',
       'Mand', 1,
       6,
       ARRAY['mom', 'teacher', 'therapist'],
       ARRAY['teacher', 'aide', 'parent'],
       ARRAY['younger','older'],
       ARRAY['clinic','school','home'],
       ARRAY['mand', 'generalization', 'level-1'],
       3
FROM public.clinical_curricula_domains d
JOIN public.clinical_curricula_collections c ON c.id = d.collection_id
WHERE c.key = 'vbmapp' AND d.key = 'mand'
ON CONFLICT (domain_id, key) DO UPDATE
SET title = EXCLUDED.title,
    clinical_goal = EXCLUDED.clinical_goal,
    objective_text = EXCLUDED.objective_text,
    vbmapp_domain = EXCLUDED.vbmapp_domain,
    vbmapp_level = EXCLUDED.vbmapp_level,
    benchmark_count = EXCLUDED.benchmark_count,
    younger_examples = EXCLUDED.younger_examples,
    older_examples = EXCLUDED.older_examples,
    age_group_tags = EXCLUDED.age_group_tags,
    setting_tags = EXCLUDED.setting_tags,
    skill_tags = EXCLUDED.skill_tags,
    sort_order = EXCLUDED.sort_order,
    is_active = true;

-- Delete and re-insert benchmarks for mand-3
DELETE FROM public.clinical_curricula_benchmarks
WHERE goal_id IN (
  SELECT g.id FROM public.clinical_curricula_goals g
  JOIN public.clinical_curricula_domains d ON d.id = g.domain_id
  JOIN public.clinical_curricula_collections c ON c.id = d.collection_id
  WHERE c.key = 'vbmapp' AND d.key = 'mand' AND g.key = 'mand-3'
);

INSERT INTO public.clinical_curricula_benchmarks(goal_id, benchmark_order, benchmark_text)
SELECT g.id, unnest(ARRAY[1,2,3]),
       unnest(ARRAY[
         'Complete target in 1 opportunity',
         'Complete target in 3 opportunities',
         'Complete target in 5 opportunities'
       ])
FROM public.clinical_curricula_goals g
JOIN public.clinical_curricula_domains d ON d.id = g.domain_id
JOIN public.clinical_curricula_collections c ON c.id = d.collection_id
WHERE c.key = 'vbmapp' AND d.key = 'mand' AND g.key = 'mand-3';
