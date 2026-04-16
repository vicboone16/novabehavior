-- ============================================================
-- PHASE 2 (FINAL): Ingest framework curricula into library_*
-- Only the program → objective → target tier (skip benchmark_variants
-- which require a separate goal_bank ingestion path).
-- ============================================================

INSERT INTO public.program_domains (id, name, slug, sort_order, is_active)
SELECT gen_random_uuid(), x.name, x.slug, x.sort_order, true
FROM (VALUES
  ('SRS-2 Library', 'srs-2-library', 1000),
  ('ABAS-3 Library', 'abas-3-library', 1010),
  ('ABLLS-R Library', 'ablls-r-library', 1020),
  ('AFLS Library', 'afls-library', 1030),
  ('VB-MAPP Library', 'vb-mapp-library', 1040)
) AS x(name, slug, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.program_domains pd WHERE pd.slug = x.slug);

-- 1. SRS-2
WITH framework_domain AS (SELECT id FROM public.program_domains WHERE slug = 'srs-2-library'),
new_subdomains AS (
  INSERT INTO public.program_subdomains (id, domain_id, name, slug, sort_order, is_active)
  SELECT gen_random_uuid(), (SELECT id FROM framework_domain), dd.domain,
    'srs2-' || lower(regexp_replace(dd.domain, '[^a-zA-Z0-9]+', '-', 'g')), 100, true
  FROM (SELECT DISTINCT domain FROM public.aba_goal_library_srs2 WHERE domain IS NOT NULL) dd
  WHERE NOT EXISTS (SELECT 1 FROM public.program_subdomains ps WHERE ps.domain_id = (SELECT id FROM framework_domain) AND ps.name = dd.domain)
  RETURNING id, name
),
all_subdomains AS (SELECT id, name FROM public.program_subdomains WHERE domain_id = (SELECT id FROM framework_domain)),
inserted_programs AS (
  INSERT INTO public.library_programs (id, domain_id, subdomain_id, name, slug, description,
    framework_source, framework_native_domain, framework_native_subdomain, framework_source_id, framework_metadata, is_active, sort_order)
  SELECT gen_random_uuid(), (SELECT id FROM framework_domain), sd.id, g.objective,
    'srs2-' || g.objective_code, g.objective, 'srs_2', g.domain, g.subdomain, g.library_id::text,
    jsonb_build_object('objective_code', g.objective_code, 'domain_code', g.domain_code,
      'subdomain_code', g.subdomain_code, 'goal_type', g.goal_type,
      'age_band_default', g.age_band_default, 'severity_support_level', g.severity_support_level,
      'crosswalk_tags', g.crosswalk_tags_json, 'primary_construct_tag', g.primary_construct_tag,
      'mastery_criteria_text', g.mastery_criteria_text, 'intervention_menu', g.intervention_menu_json,
      'teaching_strategies', g.teaching_strategies_json,
      'benchmark_1', g.benchmark_1, 'benchmark_2', g.benchmark_2, 'benchmark_3', g.benchmark_3), true, 0
  FROM public.aba_goal_library_srs2 g
  LEFT JOIN all_subdomains sd ON sd.name = g.domain
  WHERE NOT EXISTS (SELECT 1 FROM public.library_programs lp WHERE lp.framework_source = 'srs_2' AND lp.framework_source_id = g.library_id::text)
  RETURNING id, framework_source_id
),
inserted_objectives AS (
  INSERT INTO public.library_program_objectives (id, library_program_id, name, slug, description,
    framework_source, framework_source_id, sort_order, is_active)
  SELECT gen_random_uuid(), ip.id, g.objective, 'srs2-obj-' || g.objective_code, g.objective,
    'srs_2', g.library_id::text, 0, true
  FROM inserted_programs ip JOIN public.aba_goal_library_srs2 g ON g.library_id::text = ip.framework_source_id
  RETURNING id, framework_source_id
)
INSERT INTO public.library_objective_targets (id, objective_id, name, description, sort_order, is_active,
  framework_source, framework_source_id, mastery_criteria)
SELECT gen_random_uuid(), io.id, g.objective, g.objective, 0, true, 'srs_2', g.library_id::text,
  CASE WHEN g.mastery_criteria_text IS NOT NULL THEN jsonb_build_object('text', g.mastery_criteria_text) ELSE NULL END
FROM inserted_objectives io JOIN public.aba_goal_library_srs2 g ON g.library_id::text = io.framework_source_id;

-- 2. ABAS-3
WITH framework_domain AS (SELECT id FROM public.program_domains WHERE slug = 'abas-3-library'),
new_subdomains AS (
  INSERT INTO public.program_subdomains (id, domain_id, name, slug, sort_order, is_active)
  SELECT gen_random_uuid(), (SELECT id FROM framework_domain), sa.skill_area_name,
    'abas3-' || lower(regexp_replace(sa.skill_area_name, '[^a-zA-Z0-9]+', '-', 'g')), sa.sort_order, true
  FROM public.abas_skill_areas sa
  WHERE NOT EXISTS (SELECT 1 FROM public.program_subdomains ps WHERE ps.domain_id = (SELECT id FROM framework_domain) AND ps.name = sa.skill_area_name)
  RETURNING id, name
),
all_subdomains AS (SELECT id, name FROM public.program_subdomains WHERE domain_id = (SELECT id FROM framework_domain)),
inserted_programs AS (
  INSERT INTO public.library_programs (id, domain_id, subdomain_id, name, slug, description,
    framework_source, framework_native_domain, framework_native_subdomain, framework_source_id, framework_metadata, is_active, sort_order)
  SELECT gen_random_uuid(), (SELECT id FROM framework_domain), sd.id, p.program_name,
    'abas3-' || COALESCE(p.program_code, p.id::text),
    COALESCE(p.program_description, p.objective_goal), 'abas_3', d.domain_name, sa.skill_area_name, p.id::text,
    jsonb_build_object('program_code', p.program_code, 'objective_goal', p.objective_goal,
      'abas_item_alignment', p.abas_item_alignment, 'setting_tags', p.setting_tags,
      'age_band_applicability', p.age_band_applicability, 'status', p.status), true, p.sort_order
  FROM public.abas_programs p
  JOIN public.abas_skill_areas sa ON sa.id = p.skill_area_id
  JOIN public.abas_domains d ON d.id = sa.domain_id
  LEFT JOIN all_subdomains sd ON sd.name = sa.skill_area_name
  WHERE NOT EXISTS (SELECT 1 FROM public.library_programs lp WHERE lp.framework_source = 'abas_3' AND lp.framework_source_id = p.id::text)
  RETURNING id, framework_source_id
),
inserted_objectives AS (
  INSERT INTO public.library_program_objectives (id, library_program_id, name, slug, description,
    framework_source, framework_source_id, sort_order, is_active)
  SELECT gen_random_uuid(), ip.id, COALESCE(p.objective_goal, p.program_name),
    'abas3-obj-' || p.id::text, COALESCE(p.objective_goal, p.program_name),
    'abas_3', p.id::text, 0, true
  FROM inserted_programs ip JOIN public.abas_programs p ON p.id::text = ip.framework_source_id
  RETURNING id, framework_source_id
)
INSERT INTO public.library_objective_targets (id, objective_id, name, description, sort_order, is_active,
  framework_source, framework_source_id)
SELECT gen_random_uuid(), io.id, p.program_name, COALESCE(p.objective_goal, p.program_name),
  0, true, 'abas_3', p.id::text
FROM inserted_objectives io JOIN public.abas_programs p ON p.id::text = io.framework_source_id;

-- 3. ABLLS-R
WITH framework_domain AS (SELECT id FROM public.program_domains WHERE slug = 'ablls-r-library'),
new_subdomains AS (
  INSERT INTO public.program_subdomains (id, domain_id, name, slug, sort_order, is_active)
  SELECT gen_random_uuid(), (SELECT id FROM framework_domain), sa.skill_area_name,
    'ablls-' || lower(regexp_replace(sa.skill_area_name, '[^a-zA-Z0-9]+', '-', 'g')), COALESCE(sa.sort_order, 0), true
  FROM public.ablls_skill_areas sa
  WHERE NOT EXISTS (SELECT 1 FROM public.program_subdomains ps WHERE ps.domain_id = (SELECT id FROM framework_domain) AND ps.name = sa.skill_area_name)
  RETURNING id, name
),
all_subdomains AS (SELECT id, name FROM public.program_subdomains WHERE domain_id = (SELECT id FROM framework_domain)),
inserted_programs AS (
  INSERT INTO public.library_programs (id, domain_id, subdomain_id, name, slug, description,
    framework_source, framework_native_domain, framework_native_subdomain, framework_source_id, framework_metadata, is_active, sort_order)
  SELECT gen_random_uuid(), (SELECT id FROM framework_domain), sd.id, p.program_name,
    'ablls-' || COALESCE(p.program_code, p.id::text), p.objective_goal, 'ablls_r',
    d.domain_name, sa.skill_area_name, p.id::text,
    jsonb_build_object('program_code', p.program_code, 'objective_goal', p.objective_goal),
    true, COALESCE(p.sort_order, 0)
  FROM public.ablls_programs p
  JOIN public.ablls_skill_areas sa ON sa.id = p.skill_area_id
  JOIN public.ablls_domains d ON d.id = sa.domain_id
  LEFT JOIN all_subdomains sd ON sd.name = sa.skill_area_name
  WHERE NOT EXISTS (SELECT 1 FROM public.library_programs lp WHERE lp.framework_source = 'ablls_r' AND lp.framework_source_id = p.id::text)
  RETURNING id, framework_source_id
),
inserted_objectives AS (
  INSERT INTO public.library_program_objectives (id, library_program_id, name, slug, description,
    framework_source, framework_source_id, sort_order, is_active)
  SELECT gen_random_uuid(), ip.id, COALESCE(p.objective_goal, p.program_name),
    'ablls-obj-' || p.id::text, p.objective_goal, 'ablls_r', p.id::text, 0, true
  FROM inserted_programs ip JOIN public.ablls_programs p ON p.id::text = ip.framework_source_id
  RETURNING id, framework_source_id
)
INSERT INTO public.library_objective_targets (id, objective_id, name, description, sort_order, is_active,
  framework_source, framework_source_id)
SELECT gen_random_uuid(), io.id, COALESCE(p.objective_goal, p.program_name), p.objective_goal,
  0, true, 'ablls_r', p.id::text
FROM inserted_objectives io JOIN public.ablls_programs p ON p.id::text = io.framework_source_id;

-- 4. AFLS
WITH framework_domain AS (SELECT id FROM public.program_domains WHERE slug = 'afls-library'),
new_subdomains AS (
  INSERT INTO public.program_subdomains (id, domain_id, name, slug, sort_order, is_active)
  SELECT gen_random_uuid(), (SELECT id FROM framework_domain), sa.skill_area_name,
    'afls-' || lower(regexp_replace(sa.skill_area_name, '[^a-zA-Z0-9]+', '-', 'g')), COALESCE(sa.sort_order, 0), true
  FROM public.afls_skill_areas sa
  WHERE NOT EXISTS (SELECT 1 FROM public.program_subdomains ps WHERE ps.domain_id = (SELECT id FROM framework_domain) AND ps.name = sa.skill_area_name)
  RETURNING id, name
),
all_subdomains AS (SELECT id, name FROM public.program_subdomains WHERE domain_id = (SELECT id FROM framework_domain)),
inserted_programs AS (
  INSERT INTO public.library_programs (id, domain_id, subdomain_id, name, slug, description,
    framework_source, framework_native_domain, framework_native_subdomain, framework_source_id, framework_metadata, is_active, sort_order)
  SELECT gen_random_uuid(), (SELECT id FROM framework_domain), sd.id, p.program_name,
    'afls-' || COALESCE(p.program_code, p.id::text), p.objective_goal, 'afls',
    d.domain_name, sa.skill_area_name, p.id::text,
    jsonb_build_object('program_code', p.program_code, 'objective_goal', p.objective_goal),
    true, COALESCE(p.sort_order, 0)
  FROM public.afls_programs p
  JOIN public.afls_skill_areas sa ON sa.id = p.skill_area_id
  JOIN public.afls_domains d ON d.id = sa.domain_id
  LEFT JOIN all_subdomains sd ON sd.name = sa.skill_area_name
  WHERE NOT EXISTS (SELECT 1 FROM public.library_programs lp WHERE lp.framework_source = 'afls' AND lp.framework_source_id = p.id::text)
  RETURNING id, framework_source_id
),
inserted_objectives AS (
  INSERT INTO public.library_program_objectives (id, library_program_id, name, slug, description,
    framework_source, framework_source_id, sort_order, is_active)
  SELECT gen_random_uuid(), ip.id, COALESCE(p.objective_goal, p.program_name),
    'afls-obj-' || p.id::text, p.objective_goal, 'afls', p.id::text, 0, true
  FROM inserted_programs ip JOIN public.afls_programs p ON p.id::text = ip.framework_source_id
  RETURNING id, framework_source_id
)
INSERT INTO public.library_objective_targets (id, objective_id, name, description, sort_order, is_active,
  framework_source, framework_source_id)
SELECT gen_random_uuid(), io.id, COALESCE(p.objective_goal, p.program_name), p.objective_goal,
  0, true, 'afls', p.id::text
FROM inserted_objectives io JOIN public.afls_programs p ON p.id::text = io.framework_source_id;

-- 5. VB-MAPP
WITH framework_domain AS (SELECT id FROM public.program_domains WHERE slug = 'vb-mapp-library'),
vbmapp_items AS (
  SELECT ci.*, cs.name AS system_name, d.name AS domain_name
  FROM public.curriculum_items ci
  JOIN public.curriculum_systems cs ON cs.id = ci.curriculum_system_id
  LEFT JOIN public.domains d ON d.id = ci.domain_id
  WHERE cs.name LIKE 'VB-MAPP%' AND ci.active = true
),
new_subdomains AS (
  INSERT INTO public.program_subdomains (id, domain_id, name, slug, sort_order, is_active)
  SELECT gen_random_uuid(), (SELECT id FROM framework_domain), dd.combined_name,
    'vbmapp-' || lower(regexp_replace(dd.combined_name, '[^a-zA-Z0-9]+', '-', 'g')), 100, true
  FROM (SELECT DISTINCT (system_name || ' — ' || COALESCE(domain_name, 'General')) AS combined_name FROM vbmapp_items) dd
  WHERE NOT EXISTS (SELECT 1 FROM public.program_subdomains ps WHERE ps.domain_id = (SELECT id FROM framework_domain) AND ps.name = dd.combined_name)
  RETURNING id, name
),
all_subdomains AS (SELECT id, name FROM public.program_subdomains WHERE domain_id = (SELECT id FROM framework_domain)),
inserted_programs AS (
  INSERT INTO public.library_programs (id, domain_id, subdomain_id, name, slug, description,
    framework_source, framework_native_domain, framework_native_subdomain, framework_source_id, framework_metadata, is_active, sort_order)
  SELECT gen_random_uuid(), (SELECT id FROM framework_domain), sd.id, v.title,
    'vbmapp-' || v.id::text, v.description, 'vb_mapp', v.system_name, v.domain_name, v.id::text,
    jsonb_build_object('code', v.code, 'level', v.level, 'mastery_criteria', v.mastery_criteria, 'system', v.system_name),
    true, v.display_order
  FROM vbmapp_items v
  LEFT JOIN all_subdomains sd ON sd.name = (v.system_name || ' — ' || COALESCE(v.domain_name, 'General'))
  WHERE NOT EXISTS (SELECT 1 FROM public.library_programs lp WHERE lp.framework_source = 'vb_mapp' AND lp.framework_source_id = v.id::text)
  RETURNING id, framework_source_id
),
inserted_objectives AS (
  INSERT INTO public.library_program_objectives (id, library_program_id, name, slug, description,
    framework_source, framework_source_id, sort_order, is_active)
  SELECT gen_random_uuid(), ip.id, v.title, 'vbmapp-obj-' || v.id::text, v.description,
    'vb_mapp', v.id::text, 0, true
  FROM inserted_programs ip JOIN vbmapp_items v ON v.id::text = ip.framework_source_id
  RETURNING id, framework_source_id
)
INSERT INTO public.library_objective_targets (id, objective_id, name, description, sort_order, is_active,
  framework_source, framework_source_id, mastery_criteria)
SELECT gen_random_uuid(), io.id, v.title, v.description, 0, true, 'vb_mapp', v.id::text,
  CASE WHEN v.mastery_criteria IS NOT NULL THEN jsonb_build_object('text', v.mastery_criteria) ELSE NULL END
FROM inserted_objectives io
JOIN (SELECT ci.*, cs.name AS system_name FROM public.curriculum_items ci JOIN public.curriculum_systems cs ON cs.id = ci.curriculum_system_id WHERE cs.name LIKE 'VB-MAPP%' AND ci.active = true) v ON v.id::text = io.framework_source_id;