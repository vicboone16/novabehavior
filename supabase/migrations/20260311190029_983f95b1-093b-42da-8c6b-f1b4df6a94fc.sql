-- BATCH 3: Remaining tables with correct columns

-- changing_criterion_steps (client_id, created_by)
CREATE POLICY "access_select" ON public.changing_criterion_steps FOR SELECT TO authenticated
  USING (public.has_student_access(client_id, auth.uid()) OR created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "creator_modify" ON public.changing_criterion_steps FOR ALL TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "access_select" ON public.ci_client_component_scores FOR SELECT TO authenticated
  USING (public.has_student_access(client_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "admin_all" ON public.ci_client_component_scores FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "access_select" ON public.client_app_links FOR SELECT TO authenticated
  USING (public.has_student_access(client_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "admin_all" ON public.client_app_links FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "access_select" ON public.client_contraindication_tags FOR SELECT TO authenticated
  USING (public.has_student_access(client_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "access_modify" ON public.client_contraindication_tags FOR ALL TO authenticated
  USING (public.has_student_access(client_id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.has_student_access(client_id, auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "access_select" ON public.client_intervention_outcomes FOR SELECT TO authenticated
  USING (public.has_student_access(client_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "admin_all" ON public.client_intervention_outcomes FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "access_select" ON public.client_intervention_runs FOR SELECT TO authenticated
  USING (public.has_student_access(client_id, auth.uid()) OR created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "creator_modify" ON public.client_intervention_runs FOR ALL TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "access_select" ON public.client_profile_tags FOR SELECT TO authenticated
  USING (public.has_student_access(client_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "access_modify" ON public.client_profile_tags FOR ALL TO authenticated
  USING (public.has_student_access(client_id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.has_student_access(client_id, auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "access_select" ON public.clinical_intelligence_alerts FOR SELECT TO authenticated
  USING (public.has_student_access(client_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "admin_all" ON public.clinical_intelligence_alerts FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "access_select" ON public.goal_optimization_outputs FOR SELECT TO authenticated
  USING (public.has_student_access(client_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "admin_all" ON public.goal_optimization_outputs FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "access_select" ON public.goal_optimization_runs FOR SELECT TO authenticated
  USING (public.has_student_access(client_id, auth.uid()) OR created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "creator_modify" ON public.goal_optimization_runs FOR ALL TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "access_select" ON public.graph_phase_markers FOR SELECT TO authenticated
  USING (public.has_student_access(client_id, auth.uid()) OR created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "creator_modify" ON public.graph_phase_markers FOR ALL TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "access_select" ON public.incidents FOR SELECT TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "creator_modify" ON public.incidents FOR ALL TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "user_select" ON public.nova_ai_contextual_launch_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_insert" ON public.nova_ai_contextual_launch_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "access_select" ON public.parent_training_intelligence_alerts FOR SELECT TO authenticated
  USING (public.has_student_access(client_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "admin_all" ON public.parent_training_intelligence_alerts FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "access_select" ON public.parent_training_report_snapshots FOR SELECT TO authenticated
  USING (public.has_student_access(client_id, auth.uid()) OR created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "creator_modify" ON public.parent_training_report_snapshots FOR ALL TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "access_select" ON public.plan_item_data_collection_access FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_student_access(client_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "admin_all" ON public.plan_item_data_collection_access FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "access_select" ON public.plan_item_data_events FOR SELECT TO authenticated
  USING (public.has_student_access(client_id, auth.uid()) OR user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "user_insert" ON public.plan_item_data_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "access_select" ON public.plan_item_publications FOR SELECT TO authenticated
  USING (public.has_student_access(client_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "admin_all" ON public.plan_item_publications FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "access_select" ON public.progression_queue FOR SELECT TO authenticated
  USING (public.has_student_access(client_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "admin_all" ON public.progression_queue FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "access_select" ON public.publication_feedback FOR SELECT TO authenticated
  USING (public.has_student_access(client_id, auth.uid()) OR user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "user_insert" ON public.publication_feedback FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "access_select" ON public.report_goal_inclusions FOR SELECT TO authenticated
  USING (public.has_student_access(client_id, auth.uid()) OR created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "creator_modify" ON public.report_goal_inclusions FOR ALL TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "access_select" ON public.report_goal_narratives FOR SELECT TO authenticated
  USING (public.has_student_access(client_id, auth.uid()) OR created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "creator_modify" ON public.report_goal_narratives FOR ALL TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "access_select" ON public.research_graph_groups FOR SELECT TO authenticated
  USING (public.has_student_access(client_id, auth.uid()) OR created_by = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "creator_modify" ON public.research_graph_groups FOR ALL TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "access_select" ON public.student_behavior_plans FOR SELECT TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "access_modify" ON public.student_behavior_plans FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "access_select" ON public.student_mtss_plans FOR SELECT TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "access_modify" ON public.student_mtss_plans FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "access_select" ON public.student_risk_snapshots FOR SELECT TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "admin_all" ON public.student_risk_snapshots FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "access_select" ON public.plan_step_logs FOR SELECT TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "access_insert" ON public.plan_step_logs FOR INSERT TO authenticated
  WITH CHECK (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "access_select" ON public.skill_trials FOR SELECT TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "access_insert" ON public.skill_trials FOR INSERT TO authenticated
  WITH CHECK (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "access_select" ON public.treatment_bip_draft_items FOR SELECT TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "access_modify" ON public.treatment_bip_draft_items FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

-- user-scoped
CREATE POLICY "user_select" ON public.training_assignments_v2 FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "admin_all" ON public.training_assignments_v2 FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Tables without ownership columns (reference/join tables)
CREATE POLICY "auth_select" ON public.benchmarks FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.benchmarks FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.client_plan_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.client_plan_items FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.goal_optimization_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.goal_optimization_profiles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.goal_optimization_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.goal_optimization_rules FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.incident_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.incident_events FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.mtss_fidelity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.mtss_fidelity_logs FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.mtss_interventions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.mtss_interventions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.plan_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.plan_steps FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.programs FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.programs FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.progression_actions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.progression_actions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.publication_recipients FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.publication_recipients FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.research_graph_series FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.research_graph_series FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.student_mtss_plan_interventions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.student_mtss_plan_interventions FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- target_events and targets (no student_id - linked via target_id/program_id)
CREATE POLICY "auth_select" ON public.target_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.target_events FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "auth_select" ON public.targets FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_all" ON public.targets FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));