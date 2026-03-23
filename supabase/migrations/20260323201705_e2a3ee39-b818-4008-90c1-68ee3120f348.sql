
-- ============================================================
-- ENABLE RLS ON ALL 32 UNPROTECTED TABLES
-- ============================================================

ALTER TABLE public.report_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rendered_bip_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beacon_shared_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_programming_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bops_assessment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_bops_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_bops_day_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mayday_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_instance_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_bip_starters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bops_multi_profile_resolution ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshot_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_login_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_portal_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_ai_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bops_classroom_rosters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bops_cfi_model_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bops_item_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bops_recommended_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vineland3_pairwise_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vineland3_scoring_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mayday_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_assessment_derived_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_assessment_item_scores ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES: Student-scoped tables (use has_student_access)
-- ============================================================

-- report_drafts (has student_id)
CREATE POLICY "Users can access own student report drafts" ON public.report_drafts
  FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

-- beacon_shared_plans (has student_id)
CREATE POLICY "Users can access own student beacon plans" ON public.beacon_shared_plans
  FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

-- student_programming_assignments (has student_id)
CREATE POLICY "Users can access own student programming" ON public.student_programming_assignments
  FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

-- bops_assessment_sessions (has student_id)
CREATE POLICY "Users can access own student bops sessions" ON public.bops_assessment_sessions
  FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

-- student_bops_config (has student_id)
CREATE POLICY "Users can access own student bops config" ON public.student_bops_config
  FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

-- student_bops_day_state (has student_id)
CREATE POLICY "Users can access own student bops day state" ON public.student_bops_day_state
  FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

-- package_instances (has student_id)
CREATE POLICY "Users can access own student packages" ON public.package_instances
  FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

-- generated_bip_starters (has student_id)
CREATE POLICY "Users can access own student bip starters" ON public.generated_bip_starters
  FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

-- bops_multi_profile_resolution (has student_id)
CREATE POLICY "Users can access own student bops profiles" ON public.bops_multi_profile_resolution
  FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

-- snapshot_tokens (has student_id)
CREATE POLICY "Users can access own student snapshot tokens" ON public.snapshot_tokens
  FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

-- student_login_codes (has student_id)
CREATE POLICY "Users can access own student login codes" ON public.student_login_codes
  FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

-- student_portal_tokens (has student_id)
CREATE POLICY "Users can access own student portal tokens" ON public.student_portal_tokens
  FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

-- bops_classroom_rosters (has student_id)
CREATE POLICY "Users can access own student classroom rosters" ON public.bops_classroom_rosters
  FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

-- bops_cfi_model_results (has student_id)
CREATE POLICY "Users can access own student cfi results" ON public.bops_cfi_model_results
  FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

-- bops_recommended_programs (has student_id)
CREATE POLICY "Users can access own student recommended programs" ON public.bops_recommended_programs
  FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

-- parent_questions (has student_id)
CREATE POLICY "Users can access own student parent questions" ON public.parent_questions
  FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

-- parent_reactions (has student_id)
CREATE POLICY "Users can access own student parent reactions" ON public.parent_reactions
  FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

-- student_guardians (has student_id)
CREATE POLICY "Users can access own student guardians" ON public.student_guardians
  FOR ALL TO authenticated
  USING (public.has_student_access(student_id, auth.uid()) OR public.is_admin(auth.uid()));

-- ============================================================
-- RLS POLICIES: Mayday tables (agency-scoped)
-- ============================================================

-- mayday_alerts (has agency_id)
CREATE POLICY "Users can access agency mayday alerts" ON public.mayday_alerts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.agency_id = mayday_alerts.agency_id
      AND am.user_id = auth.uid()
      AND am.status = 'active'
    )
    OR public.is_admin(auth.uid())
  );

-- mayday_recipients (has recipient_user_id)
CREATE POLICY "Users can access own mayday recipients" ON public.mayday_recipients
  FOR ALL TO authenticated
  USING (recipient_user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ============================================================
-- RLS POLICIES: Rendered docs (created_by scoped)
-- ============================================================

-- rendered_bip_documents (has created_by)
CREATE POLICY "Users can access own rendered bip docs" ON public.rendered_bip_documents
  FOR ALL TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- ============================================================
-- RLS POLICIES: Form/intake chain (join-based)
-- ============================================================

-- form_responses (has form_instance_id -> form_instances.linked_entity_id)
CREATE POLICY "Users can access form responses via instance" ON public.form_responses
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.form_instances fi
      WHERE fi.id = form_responses.form_instance_id
      AND (
        fi.student_id IS NOT NULL AND public.has_student_access(fi.student_id, auth.uid())
      )
    )
    OR public.is_admin(auth.uid())
  );

-- package_instance_forms (join through package_instances)
CREATE POLICY "Users can access package instance forms" ON public.package_instance_forms
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.package_instances pi
      WHERE pi.id = package_instance_forms.package_instance_id
      AND public.has_student_access(pi.student_id, auth.uid())
    )
    OR public.is_admin(auth.uid())
  );

-- intake_sessions (has linked_entity_id, started_by)
CREATE POLICY "Users can access intake sessions" ON public.intake_sessions
  FOR ALL TO authenticated
  USING (
    started_by = auth.uid()
    OR (linked_entity_type = 'student' AND public.has_student_access(linked_entity_id, auth.uid()))
    OR public.is_admin(auth.uid())
  );

-- intake_transcripts (join through intake_sessions)
CREATE POLICY "Users can access intake transcripts" ON public.intake_transcripts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.intake_sessions s
      WHERE s.id = intake_transcripts.intake_session_id
      AND (
        s.started_by = auth.uid()
        OR (s.linked_entity_type = 'student' AND public.has_student_access(s.linked_entity_id, auth.uid()))
      )
    )
    OR public.is_admin(auth.uid())
  );

-- intake_ai_extractions (join through intake_sessions)
CREATE POLICY "Users can access intake ai extractions" ON public.intake_ai_extractions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.intake_sessions s
      WHERE s.id = intake_ai_extractions.intake_session_id
      AND (
        s.started_by = auth.uid()
        OR (s.linked_entity_type = 'student' AND public.has_student_access(s.linked_entity_id, auth.uid()))
      )
    )
    OR public.is_admin(auth.uid())
  );

-- ============================================================
-- RLS POLICIES: BOPS item responses (session-scoped)
-- ============================================================

-- bops_item_responses (join through bops_assessment_sessions)
CREATE POLICY "Users can access bops item responses" ON public.bops_item_responses
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bops_assessment_sessions bas
      WHERE bas.id = bops_item_responses.session_id
      AND public.has_student_access(bas.student_id, auth.uid())
    )
    OR public.is_admin(auth.uid())
  );

-- ============================================================
-- RLS POLICIES: Assessment scores (join through student_assessments)
-- ============================================================

-- student_assessment_derived_scores
CREATE POLICY "Users can access student assessment derived scores" ON public.student_assessment_derived_scores
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_assessments sa
      WHERE sa.id = student_assessment_derived_scores.student_assessment_id
      AND public.has_student_access(sa.student_id, auth.uid())
    )
    OR public.is_admin(auth.uid())
  );

-- student_assessment_item_scores
CREATE POLICY "Users can access student assessment item scores" ON public.student_assessment_item_scores
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_assessments sa
      WHERE sa.id = student_assessment_item_scores.student_assessment_id
      AND public.has_student_access(sa.student_id, auth.uid())
    )
    OR public.is_admin(auth.uid())
  );

-- vineland3_pairwise_comparisons
CREATE POLICY "Users can access vineland3 comparisons" ON public.vineland3_pairwise_comparisons
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_assessments sa
      WHERE sa.id = vineland3_pairwise_comparisons.student_assessment_id
      AND public.has_student_access(sa.student_id, auth.uid())
    )
    OR public.is_admin(auth.uid())
  );

-- vineland3_scoring_status
CREATE POLICY "Users can access vineland3 scoring status" ON public.vineland3_scoring_status
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.student_assessments sa
      WHERE sa.id = vineland3_scoring_status.student_assessment_id
      AND public.has_student_access(sa.student_id, auth.uid())
    )
    OR public.is_admin(auth.uid())
  );

-- ============================================================
-- RLS POLICIES: Parent contacts (admin-only for now)
-- ============================================================

CREATE POLICY "Admins can access parent contacts" ON public.parent_contacts
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));
