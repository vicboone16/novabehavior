
-- Assessment tables
ALTER TABLE public.assessment_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_report_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assessment instances scoped to student access"
  ON public.assessment_instances FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()));

CREATE POLICY "Assessment responses scoped via instance"
  ON public.assessment_responses FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.assessment_instances ai WHERE ai.id = assessment_responses.assessment_instance_id AND public.has_student_access(ai.student_id, auth.uid())))
  WITH CHECK (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.assessment_instances ai WHERE ai.id = assessment_responses.assessment_instance_id AND public.has_student_access(ai.student_id, auth.uid())));

CREATE POLICY "Assessment scores scoped via instance"
  ON public.assessment_scores FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.assessment_instances ai WHERE ai.id = assessment_scores.assessment_instance_id AND public.has_student_access(ai.student_id, auth.uid())))
  WITH CHECK (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.assessment_instances ai WHERE ai.id = assessment_scores.assessment_instance_id AND public.has_student_access(ai.student_id, auth.uid())));

CREATE POLICY "Assessment report outputs scoped via instance"
  ON public.assessment_report_outputs FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.assessment_instances ai WHERE ai.id = assessment_report_outputs.assessment_instance_id AND public.has_student_access(ai.student_id, auth.uid())))
  WITH CHECK (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.assessment_instances ai WHERE ai.id = assessment_report_outputs.assessment_instance_id AND public.has_student_access(ai.student_id, auth.uid())));

-- BOPS reports
ALTER TABLE public.bops_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bops_report_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bops_report_section_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bops_report_section_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BOPS reports scoped to student access"
  ON public.bops_reports FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()) OR created_by = auth.uid())
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()) OR created_by = auth.uid());

CREATE POLICY "BOPS report sections scoped via report"
  ON public.bops_report_sections FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.bops_reports r WHERE r.id = bops_report_sections.report_id AND (public.has_student_access(r.student_id, auth.uid()) OR r.created_by = auth.uid())))
  WITH CHECK (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.bops_reports r WHERE r.id = bops_report_sections.report_id AND (public.has_student_access(r.student_id, auth.uid()) OR r.created_by = auth.uid())));

CREATE POLICY "BOPS report section versions scoped via report"
  ON public.bops_report_section_versions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.bops_reports r WHERE r.id = bops_report_section_versions.report_id AND (public.has_student_access(r.student_id, auth.uid()) OR r.created_by = auth.uid())))
  WITH CHECK (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.bops_reports r WHERE r.id = bops_report_section_versions.report_id AND (public.has_student_access(r.student_id, auth.uid()) OR r.created_by = auth.uid())));

CREATE POLICY "BOPS report section imports scoped via report"
  ON public.bops_report_section_imports FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.bops_reports r WHERE r.id = bops_report_section_imports.report_id AND (public.has_student_access(r.student_id, auth.uid()) OR r.created_by = auth.uid())))
  WITH CHECK (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.bops_reports r WHERE r.id = bops_report_section_imports.report_id AND (public.has_student_access(r.student_id, auth.uid()) OR r.created_by = auth.uid())));

ALTER TABLE public.behavior_daily_aggregates_backup ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Behavior backup admin only"
  ON public.behavior_daily_aggregates_backup FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

ALTER TABLE public.parent_access_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_link_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_link_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_reinforcement_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_parent_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parent access links scoped"
  ON public.parent_access_links FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()) OR (agency_id IS NOT NULL AND public.has_agency_access(auth.uid(), agency_id)))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()) OR (agency_id IS NOT NULL AND public.has_agency_access(auth.uid(), agency_id)));

CREATE POLICY "Parent link threads scoped"
  ON public.parent_link_threads FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()) OR (agency_id IS NOT NULL AND public.has_agency_access(auth.uid(), agency_id)))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()) OR (agency_id IS NOT NULL AND public.has_agency_access(auth.uid(), agency_id)));

CREATE POLICY "Parent link messages scoped"
  ON public.parent_link_messages FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()) OR (agency_id IS NOT NULL AND public.has_agency_access(auth.uid(), agency_id)))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()) OR (agency_id IS NOT NULL AND public.has_agency_access(auth.uid(), agency_id)));

CREATE POLICY "Parent actions scoped"
  ON public.parent_actions FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR parent_user_id = auth.uid() OR public.has_student_access(student_id, auth.uid()) OR (agency_id IS NOT NULL AND public.has_agency_access(auth.uid(), agency_id)))
  WITH CHECK (public.is_admin(auth.uid()) OR parent_user_id = auth.uid() OR public.has_student_access(student_id, auth.uid()) OR (agency_id IS NOT NULL AND public.has_agency_access(auth.uid(), agency_id)));

CREATE POLICY "Home reinforcement log scoped"
  ON public.home_reinforcement_log FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR parent_user_id = auth.uid() OR public.has_student_access(student_id, auth.uid()) OR (agency_id IS NOT NULL AND public.has_agency_access(auth.uid(), agency_id)))
  WITH CHECK (public.is_admin(auth.uid()) OR parent_user_id = auth.uid() OR public.has_student_access(student_id, auth.uid()) OR (agency_id IS NOT NULL AND public.has_agency_access(auth.uid(), agency_id)));

CREATE POLICY "Student parent links scoped"
  ON public.student_parent_links FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR parent_user_id = auth.uid() OR public.has_student_access(student_id, auth.uid()) OR (agency_id IS NOT NULL AND public.has_agency_access(auth.uid(), agency_id)))
  WITH CHECK (public.is_admin(auth.uid()) OR parent_user_id = auth.uid() OR public.has_student_access(student_id, auth.uid()) OR (agency_id IS NOT NULL AND public.has_agency_access(auth.uid(), agency_id)));

ALTER TABLE public.domains_backup_20260331_migration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs_backup_20260331_migration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nt_backfill_behavior_domain_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nt_backfill_behavior_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nt_backfill_objective_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nt_backfill_program_domain_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nt_backfill_program_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nt_backfill_target_map ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['domains_backup_20260331_migration','programs_backup_20260331_migration','nt_backfill_behavior_domain_map','nt_backfill_behavior_map','nt_backfill_objective_map','nt_backfill_program_domain_map','nt_backfill_program_map','nt_backfill_target_map']) LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))', t || '_admin_only', t);
  END LOOP;
END $$;

-- NYDOE / master reports
DROP POLICY IF EXISTS "Authenticated users can manage NYDOE reports" ON public.nydoe_reports;
CREATE POLICY "NYDOE reports scoped to student access"
  ON public.nydoe_reports FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()) OR created_by = auth.uid())
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()) OR created_by = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can manage master reports" ON public.master_report_instances;
DROP POLICY IF EXISTS "Authenticated users can read master reports" ON public.master_report_instances;
CREATE POLICY "Master reports scoped to student access"
  ON public.master_report_instances FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()) OR created_by = auth.uid())
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()) OR created_by = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can manage master report sections" ON public.master_report_sections;
DROP POLICY IF EXISTS "Authenticated users can read master report sections" ON public.master_report_sections;
CREATE POLICY "Master report sections scoped via instance"
  ON public.master_report_sections FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.master_report_instances mri WHERE mri.id = master_report_sections.master_report_id AND (public.has_student_access(mri.student_id, auth.uid()) OR mri.created_by = auth.uid())))
  WITH CHECK (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.master_report_instances mri WHERE mri.id = master_report_sections.master_report_id AND (public.has_student_access(mri.student_id, auth.uid()) OR mri.created_by = auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can view comm log" ON public.client_communication_log;
DROP POLICY IF EXISTS "Staff can manage comm log" ON public.client_communication_log;
CREATE POLICY "Client comm log scoped"
  ON public.client_communication_log FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_student_access(client_id, auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_student_access(client_id, auth.uid()));

-- NT learner assignments
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['nt_learner_behavior_assignments','nt_learner_program_assignments','nt_learner_objective_assignments','nt_learner_target_assignments']) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'auth_read_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'auth_write_' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_admin(auth.uid()) OR created_by = auth.uid()) WITH CHECK (public.is_admin(auth.uid()) OR created_by = auth.uid())', t || '_scoped', t);
  END LOOP;
END $$;

-- behavior aggregates
DROP POLICY IF EXISTS "behavior_daily_aggregates_read" ON public.behavior_daily_aggregates;
DROP POLICY IF EXISTS "behavior_daily_aggregates_write" ON public.behavior_daily_aggregates;
CREATE POLICY "behavior_daily_aggregates_scoped" ON public.behavior_daily_aggregates FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()));

DROP POLICY IF EXISTS "behavior_period_summaries_read" ON public.behavior_period_summaries;
DROP POLICY IF EXISTS "behavior_period_summaries_write" ON public.behavior_period_summaries;
CREATE POLICY "behavior_period_summaries_scoped" ON public.behavior_period_summaries FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()));

DROP POLICY IF EXISTS "behavior_insights_read" ON public.behavior_insights;
DROP POLICY IF EXISTS "behavior_insights_write" ON public.behavior_insights;
CREATE POLICY "behavior_insights_scoped" ON public.behavior_insights FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()));

-- Parent training
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='parent_training_goal_assignments' LOOP
    EXECUTE format('DROP POLICY %I ON public.parent_training_goal_assignments', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Parent training assignments scoped" ON public.parent_training_goal_assignments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_student_access(client_id, auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_student_access(client_id, auth.uid()));

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='parent_training_data' LOOP
    EXECUTE format('DROP POLICY %I ON public.parent_training_data', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Parent training data scoped" ON public.parent_training_data FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.parent_training_goal_assignments a WHERE a.goal_assignment_id = parent_training_data.goal_assignment_id AND public.has_student_access(a.client_id, auth.uid())))
  WITH CHECK (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.parent_training_goal_assignments a WHERE a.goal_assignment_id = parent_training_data.goal_assignment_id AND public.has_student_access(a.client_id, auth.uid())));

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='parent_training_homework' LOOP
    EXECUTE format('DROP POLICY %I ON public.parent_training_homework', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Parent training homework scoped" ON public.parent_training_homework FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR parent_user_id = auth.uid() OR public.has_student_access(client_id, auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR parent_user_id = auth.uid() OR public.has_student_access(client_id, auth.uid()));

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='parent_training_session_logs' LOOP
    EXECUTE format('DROP POLICY %I ON public.parent_training_session_logs', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Parent training session logs scoped" ON public.parent_training_session_logs FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR parent_user_id = auth.uid() OR public.has_student_access(client_id, auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR parent_user_id = auth.uid() OR public.has_student_access(client_id, auth.uid()));

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='parent_training_custom_goals' LOOP
    EXECUTE format('DROP POLICY %I ON public.parent_training_custom_goals', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Parent training custom goals scoped" ON public.parent_training_custom_goals FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_student_access(client_id, auth.uid()) OR created_by = auth.uid())
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_student_access(client_id, auth.uid()) OR created_by = auth.uid());

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='parent_training_goals' LOOP
    EXECUTE format('DROP POLICY %I ON public.parent_training_goals', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Parent training goals readable" ON public.parent_training_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Parent training goals admin insert" ON public.parent_training_goals FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Parent training goals admin update" ON public.parent_training_goals FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Parent training goals admin delete" ON public.parent_training_goals FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- IEP
DROP POLICY IF EXISTS "View IEP goals" ON public.iep_goals;
DROP POLICY IF EXISTS "Manage IEP goals" ON public.iep_goals;
CREATE POLICY "IEP goals scoped" ON public.iep_goals FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_student_access(client_id, auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_student_access(client_id, auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage IEP case data" ON public.iep_case_data;
CREATE POLICY "IEP case data scoped" ON public.iep_case_data FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()) OR created_by = auth.uid())
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()) OR created_by = auth.uid());

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='student_iep_supports' LOOP
    EXECUTE format('DROP POLICY %I ON public.student_iep_supports', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Student IEP supports scoped" ON public.student_iep_supports FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()) OR created_by = auth.uid())
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()) OR created_by = auth.uid());

DROP POLICY IF EXISTS "Users can view recommendation logs" ON public.iep_recommendation_logs;
DROP POLICY IF EXISTS "Users can create recommendation logs" ON public.iep_recommendation_logs;
DROP POLICY IF EXISTS "Users can update recommendation logs" ON public.iep_recommendation_logs;
CREATE POLICY "IEP recommendation logs scoped" ON public.iep_recommendation_logs FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()));

DROP POLICY IF EXISTS "Auth users manage iep prep items" ON public.iep_prep_recommendation_items;
CREATE POLICY "IEP prep items scoped" ON public.iep_prep_recommendation_items FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()) OR created_by = auth.uid())
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()) OR created_by = auth.uid());

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='student_iep_support_audit' LOOP
    EXECUTE format('DROP POLICY %I ON public.student_iep_support_audit', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "IEP support audit admin only" ON public.student_iep_support_audit FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view drafts" ON public.client_goal_drafts;
DROP POLICY IF EXISTS "Authenticated users can insert drafts" ON public.client_goal_drafts;
DROP POLICY IF EXISTS "Authenticated users can update drafts" ON public.client_goal_drafts;
DROP POLICY IF EXISTS "Authenticated users can delete drafts" ON public.client_goal_drafts;
CREATE POLICY "Client goal drafts scoped" ON public.client_goal_drafts FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.has_student_access(client_id, auth.uid()) OR created_by = auth.uid())
  WITH CHECK (public.is_admin(auth.uid()) OR public.has_student_access(client_id, auth.uid()) OR created_by = auth.uid());

-- Client tables
DO $$
DECLARE t text; p record;
BEGIN
  FOR t IN SELECT unnest(ARRAY['client_scheduling_preferences','client_case_attributes','client_service_lines','client_communication_access']) LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_admin(auth.uid()) OR public.has_student_access(client_id, auth.uid())) WITH CHECK (public.is_admin(auth.uid()) OR public.has_student_access(client_id, auth.uid()))', t || '_scoped', t);
  END LOOP;
END $$;

-- Teacher data
DO $$
DECLARE t text; p record;
BEGIN
  FOR t IN SELECT unnest(ARRAY['teacher_data_events','teacher_frequency_entries','teacher_duration_entries','teacher_weekly_summaries']) LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_admin(auth.uid()) OR public.has_student_access(client_id, auth.uid()) OR created_by = auth.uid()) WITH CHECK (public.is_admin(auth.uid()) OR public.has_student_access(client_id, auth.uid()) OR created_by = auth.uid())', t || '_scoped', t);
  END LOOP;
END $$;

-- Coverage tables
DO $$
DECLARE t text; p record;
BEGIN
  FOR t IN SELECT unnest(ARRAY['coverage_rules_insurance','coverage_rules_school','coverage_checks','coverage_tasks']) LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_admin(auth.uid()) OR public.has_student_access(client_id, auth.uid())) WITH CHECK (public.is_admin(auth.uid()) OR public.has_student_access(client_id, auth.uid()))', t || '_scoped', t);
  END LOOP;
END $$;

-- Merge maps
DO $$
DECLARE t text; p record;
BEGIN
  FOR t IN SELECT unnest(ARRAY['program_merge_map','objective_merge_map','target_merge_map','behavior_merge_map']) LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)', t || '_read', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()))', t || '_admin_insert', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()))', t || '_admin_update', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_admin(auth.uid()))', t || '_admin_delete', t);
  END LOOP;
END $$;

-- Storage
DROP POLICY IF EXISTS "Anyone can insert signed documents" ON storage.objects;
CREATE POLICY "Authenticated users can insert signed documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'signed-documents');
