
-- Refresh functions
CREATE OR REPLACE FUNCTION public.refresh_abas_registry()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM curriculum_source_registry WHERE source_type = 'ABAS';
  INSERT INTO curriculum_source_registry (source_type, source_record_id, client_id, assessment_date, domain_name, skill_area_name, program_name, objective_goal, source_reason, generator_ready, priority_score, send_to_iep, send_to_bip, send_to_fba)
  SELECT source_type, NULL, client_id, assessment_date, domain_name, skill_area_name, program_name, objective_goal, source_reason, generator_ready, priority_score, send_to_iep, send_to_bip, send_to_fba FROM abas_registry_adapter_v;
END; $$;

CREATE OR REPLACE FUNCTION public.refresh_srs_registry()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM curriculum_source_registry WHERE source_type = 'SRS';
  INSERT INTO curriculum_source_registry (source_type, source_record_id, client_id, assessment_date, domain_name, skill_area_name, program_name, objective_goal, source_reason, generator_ready, priority_score, send_to_iep, send_to_bip, send_to_fba)
  SELECT source_type, NULL, client_id, assessment_date, domain_name, skill_area_name, program_name, objective_goal, source_reason, generator_ready, priority_score, send_to_iep, send_to_bip, send_to_fba FROM srs_registry_adapter_v;
END; $$;

CREATE OR REPLACE FUNCTION public.refresh_vbmapp_registry()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM curriculum_source_registry WHERE source_type = 'VBMAPP';
  INSERT INTO curriculum_source_registry (source_type, source_record_id, client_id, assessment_date, domain_name, skill_area_name, program_name, objective_goal, source_reason, generator_ready, priority_score, send_to_iep, send_to_bip, send_to_fba)
  SELECT source_type, NULL, client_id, assessment_date, domain_name, skill_area_name, program_name, objective_goal, source_reason, generator_ready, priority_score, send_to_iep, send_to_bip, send_to_fba FROM vbmapp_registry_adapter_v;
END; $$;

CREATE OR REPLACE FUNCTION public.refresh_vineland_registry()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM curriculum_source_registry WHERE source_type = 'VINELAND';
  INSERT INTO curriculum_source_registry (source_type, source_record_id, client_id, assessment_date, domain_name, skill_area_name, program_name, objective_goal, source_reason, generator_ready, priority_score, send_to_iep, send_to_bip, send_to_fba)
  SELECT source_type, NULL, client_id, assessment_date, domain_name, skill_area_name, program_name, objective_goal, source_reason, generator_ready, priority_score, send_to_iep, send_to_bip, send_to_fba FROM vineland_registry_adapter_v;
END; $$;

CREATE OR REPLACE FUNCTION public.refresh_behavior_registry()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM curriculum_source_registry WHERE source_type = 'BEHAVIOR';
  INSERT INTO curriculum_source_registry (source_type, source_record_id, client_id, assessment_date, domain_name, skill_area_name, program_name, objective_goal, source_reason, generator_ready, priority_score, send_to_iep, send_to_bip, send_to_fba)
  SELECT source_type, NULL, client_id, assessment_date, domain_name, skill_area_name, program_name, objective_goal, source_reason, generator_ready, priority_score, send_to_iep, send_to_bip, send_to_fba FROM behavior_registry_adapter_v;
END; $$;

CREATE OR REPLACE FUNCTION public.refresh_clinical_goals_registry()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM curriculum_source_registry WHERE source_type = 'CLINICAL_GOALS';
  INSERT INTO curriculum_source_registry (source_type, source_record_id, client_id, assessment_date, domain_name, skill_area_name, program_name, objective_goal, source_reason, generator_ready, priority_score, send_to_iep, send_to_bip, send_to_fba)
  SELECT source_type, NULL, client_id, assessment_date, domain_name, skill_area_name, program_name, objective_goal, source_reason, generator_ready, priority_score, send_to_iep, send_to_bip, send_to_fba FROM clinical_goals_registry_adapter_v;
END; $$;

CREATE OR REPLACE FUNCTION public.refresh_all_registries()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM refresh_abas_registry();
  PERFORM refresh_srs_registry();
  PERFORM refresh_vbmapp_registry();
  PERFORM refresh_vineland_registry();
  PERFORM refresh_behavior_registry();
  PERFORM refresh_clinical_goals_registry();
END; $$;

-- Master union view
CREATE OR REPLACE VIEW public.curriculum_registry_master_v
WITH (security_invoker = on) AS
SELECT source_type, client_id, assessment_date, domain_name, skill_area_name, program_name, objective_goal, source_reason, generator_ready, priority_score, send_to_iep, send_to_bip, send_to_fba
FROM public.curriculum_source_registry;
