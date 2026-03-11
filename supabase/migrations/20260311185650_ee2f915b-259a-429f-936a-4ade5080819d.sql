-- BATCH 1: Reference/lookup tables - authenticated SELECT, admin full access
-- These are library/template/config tables with no user ownership columns

-- ABA Library tables
CREATE POLICY "auth_select" ON public.aba_legacy_migration_map FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.aba_legacy_migration_map FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.aba_legacy_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.aba_legacy_sources FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.aba_library_import_staging FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.aba_library_import_staging FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.aba_library_intervention_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.aba_library_intervention_tags FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.aba_library_interventions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.aba_library_interventions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.aba_library_protocol_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.aba_library_protocol_sections FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.aba_library_requirements FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.aba_library_requirements FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.aba_library_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.aba_library_tags FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.aba_plan_template_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.aba_plan_template_items FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.aba_plan_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.aba_plan_templates FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- AI prompt/template tables (reference data)
CREATE POLICY "auth_select" ON public.ai_prompt_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.ai_prompt_categories FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.ai_quick_prompts FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.ai_quick_prompts FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Behavior reference tables
CREATE POLICY "auth_select" ON public.behaviors FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.behaviors FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.behavior_strategies FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.behavior_strategies FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.behavior_strategy_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.behavior_strategy_steps FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.behavior_strategy_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.behavior_strategy_tags FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- CI score components (reference)
CREATE POLICY "auth_select" ON public.ci_score_components FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.ci_score_components FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Clinical library tables
CREATE POLICY "auth_select" ON public.cl_goal_benchmarks FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.cl_goal_benchmarks FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.cl_goal_library FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.cl_goal_library FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.cl_goal_tag_map FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.cl_goal_tag_map FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.cl_intervention_library FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.cl_intervention_library FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.cl_intervention_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.cl_intervention_steps FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.cl_intervention_tag_map FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.cl_intervention_tag_map FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.cl_libraries FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.cl_libraries FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.cl_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.cl_tags FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Clinical curricula tables
CREATE POLICY "auth_select" ON public.clinical_curricula_benchmarks FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.clinical_curricula_benchmarks FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.clinical_curricula_collections FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.clinical_curricula_collections FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.clinical_curricula_domains FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.clinical_curricula_domains FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.clinical_curricula_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.clinical_curricula_goals FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Feature flags
CREATE POLICY "auth_select" ON public.feature_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.feature_flags FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- LMS tables (reference/course content)
CREATE POLICY "auth_select" ON public.lms_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.lms_activities FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.lms_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.lms_categories FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.lms_courses FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.lms_courses FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.lms_lessons FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.lms_lessons FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.lms_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.lms_modules FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.lms_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.lms_questions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.lms_quizzes FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.lms_quizzes FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.lms_resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.lms_resources FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.lms_role_tracks FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.lms_role_tracks FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.lms_scenarios FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.lms_scenarios FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Nova AI template/library tables (reference data)
CREATE POLICY "auth_select" ON public.nova_ai_behavior_definition_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.nova_ai_behavior_definition_templates FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.nova_ai_case_quick_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.nova_ai_case_quick_actions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.nova_ai_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.nova_ai_categories FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.nova_ai_contextual_entry_points FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.nova_ai_contextual_entry_points FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.nova_ai_export_targets FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.nova_ai_export_targets FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.nova_ai_fba_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.nova_ai_fba_templates FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.nova_ai_goal_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.nova_ai_goal_templates FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.nova_ai_intervention_library FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.nova_ai_intervention_library FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.nova_ai_quick_prompts FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.nova_ai_quick_prompts FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.nova_ai_reasoning_modes FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.nova_ai_reasoning_modes FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.nova_ai_reasoning_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.nova_ai_reasoning_templates FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.nova_ai_replacement_behavior_library FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.nova_ai_replacement_behavior_library FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.nova_ai_report_presets FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.nova_ai_report_presets FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.nova_ai_research_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.nova_ai_research_sources FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Other reference tables
CREATE POLICY "auth_select" ON public.novatrack_table_map FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.novatrack_table_map FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.procedure_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.procedure_steps FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.procedures FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.procedures FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.scoring_keys FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.scoring_keys FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.goal_optimization_recommendation_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.goal_optimization_recommendation_types FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.goal_benchmark_criterion_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.goal_benchmark_criterion_steps FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.behavior_problem_recommendation_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.behavior_problem_recommendation_profiles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Training reference tables
CREATE POLICY "auth_select" ON public.training_certification_requirements FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.training_certification_requirements FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.training_workbook_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.training_workbook_items FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.treatment_intelligence_contextual_entry_points FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.treatment_intelligence_contextual_entry_points FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));