-- ESDM adapter view
CREATE OR REPLACE VIEW public.esdm_registry_adapter_v AS
SELECT
  NULL::uuid AS client_id,
  NULL::date AS assessment_date,
  'ESDM'::text AS source_type,
  'Early Intervention'::text AS domain_name,
  p.program_name AS skill_area_name,
  p.program_name AS program_name,
  o.objective_text AS objective_goal,
  'ESDM developmental curriculum target' AS source_reason,
  true AS generator_ready,
  0.90 AS priority_score,
  true AS send_to_iep,
  false AS send_to_bip,
  false AS send_to_fba
FROM esdm_programs p
LEFT JOIN esdm_objectives o ON o.program_code = p.program_code;

-- DAYC2 adapter view
CREATE OR REPLACE VIEW public.dayc2_registry_adapter_v AS
SELECT
  NULL::uuid AS client_id,
  NULL::date AS assessment_date,
  'DAYC2'::text AS source_type,
  p.program_name AS domain_name,
  p.program_name AS skill_area_name,
  p.program_name AS program_name,
  o.objective_text AS objective_goal,
  'DAYC-2 developmental assessment target' AS source_reason,
  true AS generator_ready,
  0.88 AS priority_score,
  true AS send_to_iep,
  false AS send_to_bip,
  false AS send_to_fba
FROM dayc_programs p
LEFT JOIN dayc_objectives o ON o.program_code = p.program_code;

-- Socially Savvy adapter view
CREATE OR REPLACE VIEW public.socially_savvy_registry_adapter_v AS
SELECT
  NULL::uuid AS client_id,
  NULL::date AS assessment_date,
  'SOCIALLY_SAVVY'::text AS source_type,
  'Social Communication'::text AS domain_name,
  p.program_name AS skill_area_name,
  p.program_name AS program_name,
  o.objective_text AS objective_goal,
  'Socially Savvy social skills curriculum target' AS source_reason,
  true AS generator_ready,
  0.89 AS priority_score,
  true AS send_to_iep,
  false AS send_to_bip,
  false AS send_to_fba
FROM socially_savvy_programs p
LEFT JOIN socially_savvy_objectives o ON o.program_code = p.program_code;

-- ESDM refresh function
CREATE OR REPLACE FUNCTION public.refresh_esdm_registry()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM curriculum_source_registry WHERE source_type = 'ESDM';
  INSERT INTO curriculum_source_registry (source_type, source_record_id, client_id, assessment_date, domain_name, skill_area_name, program_name, objective_goal, source_reason, generator_ready, priority_score, send_to_iep, send_to_bip, send_to_fba)
  SELECT source_type, NULL, client_id, assessment_date, domain_name, skill_area_name, program_name, objective_goal, source_reason, generator_ready, priority_score, send_to_iep, send_to_bip, send_to_fba
  FROM esdm_registry_adapter_v;
END; $$;

-- DAYC2 refresh function
CREATE OR REPLACE FUNCTION public.refresh_dayc2_registry()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM curriculum_source_registry WHERE source_type = 'DAYC2';
  INSERT INTO curriculum_source_registry (source_type, source_record_id, client_id, assessment_date, domain_name, skill_area_name, program_name, objective_goal, source_reason, generator_ready, priority_score, send_to_iep, send_to_bip, send_to_fba)
  SELECT source_type, NULL, client_id, assessment_date, domain_name, skill_area_name, program_name, objective_goal, source_reason, generator_ready, priority_score, send_to_iep, send_to_bip, send_to_fba
  FROM dayc2_registry_adapter_v;
END; $$;

-- Socially Savvy refresh function
CREATE OR REPLACE FUNCTION public.refresh_socially_savvy_registry()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM curriculum_source_registry WHERE source_type = 'SOCIALLY_SAVVY';
  INSERT INTO curriculum_source_registry (source_type, source_record_id, client_id, assessment_date, domain_name, skill_area_name, program_name, objective_goal, source_reason, generator_ready, priority_score, send_to_iep, send_to_bip, send_to_fba)
  SELECT source_type, NULL, client_id, assessment_date, domain_name, skill_area_name, program_name, objective_goal, source_reason, generator_ready, priority_score, send_to_iep, send_to_bip, send_to_fba
  FROM socially_savvy_registry_adapter_v;
END; $$;

-- Run ALL refresh functions
SELECT refresh_ablls_registry();
SELECT refresh_afls_registry();
SELECT refresh_abas_registry();
SELECT refresh_srs_registry();
SELECT refresh_vbmapp_registry();
SELECT refresh_vineland_registry();
SELECT refresh_clinical_goals_registry();
SELECT refresh_behavior_registry();
SELECT refresh_esdm_registry();
SELECT refresh_dayc2_registry();
SELECT refresh_socially_savvy_registry();
