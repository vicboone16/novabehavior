
CREATE OR REPLACE VIEW public.abas_registry_adapter_v WITH (security_invoker = on) AS
SELECT r.client_id, r.assessment_date, 'ABAS'::text AS source_type, r.domain_name, r.skill_area_name, r.program_name, r.objective_goal, r.recommendation_reason AS source_reason, true AS generator_ready, r.final_score AS priority_score, true AS send_to_iep,
  CASE WHEN r.skill_area_name IN ('Self-Direction','Health and Safety','Social','Communication') THEN true ELSE false END AS send_to_bip,
  CASE WHEN r.skill_area_name IN ('Health and Safety','Self-Direction','Social','Communication','Community Use') THEN true ELSE false END AS send_to_fba
FROM public.abas_item_deficit_recommendations_ranked_v r;

CREATE OR REPLACE VIEW public.srs_registry_adapter_v WITH (security_invoker = on) AS
SELECT NULL::uuid AS client_id, NULL::date AS assessment_date, 'SRS'::text AS source_type, s.domain AS domain_name, s.subdomain AS skill_area_name, s.subdomain_code AS program_name, s.objective AS objective_goal, ('SRS-2 ' || s.severity_support_level || ' support level goal')::text AS source_reason, true AS generator_ready, 0::numeric AS priority_score, true AS send_to_iep,
  CASE WHEN s.domain IN ('Social Communication and Interaction','Restricted Interests and Repetitive Behavior') THEN true ELSE false END AS send_to_bip,
  CASE WHEN s.domain IN ('Social Communication and Interaction') THEN true ELSE false END AS send_to_fba
FROM public.aba_goal_library_srs2 s WHERE s.status = 'active';

CREATE OR REPLACE VIEW public.vbmapp_registry_adapter_v WITH (security_invoker = on) AS
SELECT NULL::uuid AS client_id, NULL::date AS assessment_date, 'VBMAPP'::text AS source_type, v.vbmapp_domain AS domain_name, v.domain_title AS skill_area_name, v.goal_key AS program_name, v.clinical_goal AS objective_goal, ('VB-MAPP Level ' || v.vbmapp_level || ' curriculum target')::text AS source_reason, true AS generator_ready, v.vbmapp_level::numeric AS priority_score, true AS send_to_iep,
  CASE WHEN v.vbmapp_domain IN ('Mand','Echoic','Spontaneous Vocal Behavior') THEN true ELSE false END AS send_to_bip, false AS send_to_fba
FROM public.v_curricula_vbmapp v;

CREATE OR REPLACE VIEW public.vineland_registry_adapter_v WITH (security_invoker = on) AS
SELECT NULL::uuid AS client_id, NULL::date AS assessment_date, 'VINELAND'::text AS source_type, gc.domain_key AS domain_name, COALESCE(gc.subdomain_key, gc.domain_key) AS skill_area_name, gc.recommended_program_area AS program_name, gc.recommendation_text AS objective_goal, ('Vineland-3 ' || gc.score_band || ' score band recommendation')::text AS source_reason, true AS generator_ready, COALESCE(gc.priority_level::numeric, 0) AS priority_score, true AS send_to_iep,
  CASE WHEN gc.domain_key = 'socialization' THEN true ELSE false END AS send_to_bip,
  CASE WHEN gc.domain_key IN ('socialization','communication') THEN true ELSE false END AS send_to_fba
FROM public.vineland3_goal_crosswalks gc WHERE gc.is_active = true;

CREATE OR REPLACE VIEW public.behavior_registry_adapter_v WITH (security_invoker = on) AS
SELECT NULL::uuid AS client_id, NULL::date AS assessment_date, 'BEHAVIOR'::text AS source_type, g.domain AS domain_name, g.domain AS skill_area_name, g.goal_code AS program_name, g.goal_title AS objective_goal, ('Replacement behavior goal - ' || g.domain)::text AS source_reason, true AS generator_ready, 0::numeric AS priority_score, false AS send_to_iep, true AS send_to_bip, true AS send_to_fba
FROM public.bx_replacement_goals g WHERE g.status = 'active';

CREATE OR REPLACE VIEW public.clinical_goals_registry_adapter_v WITH (security_invoker = on) AS
SELECT NULL::uuid AS client_id, NULL::date AS assessment_date, 'CLINICAL_GOALS'::text AS source_type, cg.domain AS domain_name, COALESCE(cg.subdomain, cg.domain) AS skill_area_name, COALESCE(cg.program_name, cg.domain) AS program_name, cg.title AS objective_goal, ('Clinical goal bank - ' || cg.domain || COALESCE(' / ' || cg.phase, ''))::text AS source_reason, true AS generator_ready, 0::numeric AS priority_score, true AS send_to_iep, false AS send_to_bip, false AS send_to_fba
FROM public.clinical_goals cg WHERE cg.library_section = 'clinical_collections' AND cg.collection_type = 'goal_bank';
