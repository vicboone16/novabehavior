
-- ========================================================
-- SECURITY FIX: Replace overly permissive RLS policies
-- Batch 1: Financial, billing, clinical, and sensitive tables
-- ========================================================

-- ===================== authorizations =====================
-- student_id scoped — use has_agency_student_access
DROP POLICY IF EXISTS "Users can view authorizations" ON public.authorizations;
CREATE POLICY "Users can view authorizations via student access"
  ON public.authorizations FOR SELECT TO authenticated
  USING (
    public.has_agency_student_access(auth.uid(), student_id)
    OR public.is_admin(auth.uid())
  );

-- ===================== client_payers =====================
DROP POLICY IF EXISTS "Users can view client payers" ON public.client_payers;
CREATE POLICY "Users can view client payers via student access"
  ON public.client_payers FOR SELECT TO authenticated
  USING (
    public.has_agency_student_access(auth.uid(), student_id)
    OR public.is_admin(auth.uid())
  );

-- ===================== payers =====================
-- agency_id scoped
DROP POLICY IF EXISTS "Users can view all payers" ON public.payers;
CREATE POLICY "Agency members can view payers"
  ON public.payers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.agency_id = payers.agency_id
        AND am.status = 'active'
    ) OR public.is_admin(auth.uid())
  );

-- ===================== graph_annotations =====================
DROP POLICY IF EXISTS "Staff can manage annotations" ON public.graph_annotations;
DROP POLICY IF EXISTS "Staff can update annotations" ON public.graph_annotations;
DROP POLICY IF EXISTS "Staff can delete annotations" ON public.graph_annotations;

CREATE POLICY "Staff can insert annotations for accessible students"
  ON public.graph_annotations FOR INSERT TO authenticated
  WITH CHECK (
    public.has_agency_student_access(auth.uid(), student_id)
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Creators can update annotations"
  ON public.graph_annotations FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Creators can delete annotations"
  ON public.graph_annotations FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- ===================== graph_configurations =====================
DROP POLICY IF EXISTS "Staff can manage graph configs" ON public.graph_configurations;
DROP POLICY IF EXISTS "Staff can update graph configs" ON public.graph_configurations;
DROP POLICY IF EXISTS "Staff can delete graph configs" ON public.graph_configurations;

CREATE POLICY "Staff can insert graph configs for accessible students"
  ON public.graph_configurations FOR INSERT TO authenticated
  WITH CHECK (
    public.has_agency_student_access(auth.uid(), student_id)
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Creators can update graph configs"
  ON public.graph_configurations FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Creators can delete graph configs"
  ON public.graph_configurations FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- ===================== protocol_templates =====================
DROP POLICY IF EXISTS "Staff can create protocol templates" ON public.protocol_templates;
DROP POLICY IF EXISTS "Staff can update protocol templates" ON public.protocol_templates;
DROP POLICY IF EXISTS "Staff can delete protocol templates" ON public.protocol_templates;

CREATE POLICY "Agency staff can create protocol templates"
  ON public.protocol_templates FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.agency_id = protocol_templates.agency_id
        AND am.status = 'active'
    ) OR public.is_admin(auth.uid())
  );

CREATE POLICY "Creators can update protocol templates"
  ON public.protocol_templates FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Creators can delete protocol templates"
  ON public.protocol_templates FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- ===================== protocol_assignments =====================
DROP POLICY IF EXISTS "Staff can create protocol assignments" ON public.protocol_assignments;
DROP POLICY IF EXISTS "Staff can update protocol assignments" ON public.protocol_assignments;
DROP POLICY IF EXISTS "Staff can delete protocol assignments" ON public.protocol_assignments;

CREATE POLICY "Staff can create protocol assignments for accessible students"
  ON public.protocol_assignments FOR INSERT TO authenticated
  WITH CHECK (
    public.has_agency_student_access(auth.uid(), student_id)
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Staff can update protocol assignments for accessible students"
  ON public.protocol_assignments FOR UPDATE TO authenticated
  USING (
    public.has_agency_student_access(auth.uid(), student_id)
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Staff can delete protocol assignments for accessible students"
  ON public.protocol_assignments FOR DELETE TO authenticated
  USING (
    public.has_agency_student_access(auth.uid(), student_id)
    OR public.is_admin(auth.uid())
  );

-- ===================== caregiver_training_programs =====================
DROP POLICY IF EXISTS "Staff can manage caregiver programs" ON public.caregiver_training_programs;
DROP POLICY IF EXISTS "Staff can update caregiver programs" ON public.caregiver_training_programs;

CREATE POLICY "Agency staff can create caregiver programs"
  ON public.caregiver_training_programs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.agency_id = caregiver_training_programs.agency_id
        AND am.status = 'active'
    ) OR public.is_admin(auth.uid())
  );

CREATE POLICY "Creators can update caregiver programs"
  ON public.caregiver_training_programs FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- ===================== caregiver_training_sessions =====================
DROP POLICY IF EXISTS "Staff can create caregiver sessions" ON public.caregiver_training_sessions;
DROP POLICY IF EXISTS "Staff can update caregiver sessions" ON public.caregiver_training_sessions;

CREATE POLICY "Staff can create caregiver sessions for accessible students"
  ON public.caregiver_training_sessions FOR INSERT TO authenticated
  WITH CHECK (
    public.has_agency_student_access(auth.uid(), student_id)
    OR staff_user_id = auth.uid()
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Session staff can update caregiver sessions"
  ON public.caregiver_training_sessions FOR UPDATE TO authenticated
  USING (staff_user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ===================== caregiver_competency_checks =====================
DROP POLICY IF EXISTS "Staff can manage competency checks" ON public.caregiver_competency_checks;

CREATE POLICY "Staff can insert competency checks for accessible students"
  ON public.caregiver_competency_checks FOR INSERT TO authenticated
  WITH CHECK (
    public.has_agency_student_access(auth.uid(), student_id)
    OR public.is_admin(auth.uid())
  );

-- ===================== caregiver_generalization_probes =====================
DROP POLICY IF EXISTS "Staff can manage probes" ON public.caregiver_generalization_probes;

CREATE POLICY "Staff can insert probes for accessible students"
  ON public.caregiver_generalization_probes FOR INSERT TO authenticated
  WITH CHECK (
    public.has_agency_student_access(auth.uid(), student_id)
    OR public.is_admin(auth.uid())
  );

-- ===================== behavior_categories =====================
DROP POLICY IF EXISTS "Users can insert behavior_categories" ON public.behavior_categories;
DROP POLICY IF EXISTS "Users can update behavior_categories" ON public.behavior_categories;
DROP POLICY IF EXISTS "Users can delete behavior_categories" ON public.behavior_categories;
DROP POLICY IF EXISTS "Users can view behavior_categories" ON public.behavior_categories;

CREATE POLICY "Users can view behavior categories for accessible clients"
  ON public.behavior_categories FOR SELECT TO authenticated
  USING (
    public.has_agency_student_access(auth.uid(), client_id)
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Users can insert behavior categories for accessible clients"
  ON public.behavior_categories FOR INSERT TO authenticated
  WITH CHECK (
    public.has_agency_student_access(auth.uid(), client_id)
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Users can update behavior categories for accessible clients"
  ON public.behavior_categories FOR UPDATE TO authenticated
  USING (
    public.has_agency_student_access(auth.uid(), client_id)
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Users can delete behavior categories for accessible clients"
  ON public.behavior_categories FOR DELETE TO authenticated
  USING (
    public.has_agency_student_access(auth.uid(), client_id)
    OR public.is_admin(auth.uid())
  );

-- ===================== collaborator_invite_codes =====================
DROP POLICY IF EXISTS "Authenticated can view collaborator invite codes" ON public.collaborator_invite_codes;

CREATE POLICY "Agency staff can view collaborator invite codes"
  ON public.collaborator_invite_codes FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.agency_id = collaborator_invite_codes.agency_id
        AND am.status = 'active'
    ) OR public.is_admin(auth.uid())
  );

-- ===================== custom_forms =====================
DROP POLICY IF EXISTS "Staff can create custom forms" ON public.custom_forms;
DROP POLICY IF EXISTS "Staff can update custom forms" ON public.custom_forms;

CREATE POLICY "Agency staff can create custom forms"
  ON public.custom_forms FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.agency_id = custom_forms.agency_id
        AND am.status = 'active'
    ) OR public.is_admin(auth.uid())
  );

CREATE POLICY "Creators can update custom forms"
  ON public.custom_forms FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- ===================== custom_form_submissions =====================
DROP POLICY IF EXISTS "Anyone can submit custom forms" ON public.custom_form_submissions;
DROP POLICY IF EXISTS "Staff can update form submissions" ON public.custom_form_submissions;

CREATE POLICY "Authenticated users can submit custom forms"
  ON public.custom_form_submissions FOR INSERT TO authenticated
  WITH CHECK (
    public.has_agency_student_access(auth.uid(), student_id)
    OR created_by = auth.uid()
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Creators can update form submissions"
  ON public.custom_form_submissions FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- ===================== onboarding_tasks =====================
DROP POLICY IF EXISTS "Admins can manage onboarding tasks" ON public.onboarding_tasks;
DROP POLICY IF EXISTS "Users can update onboarding tasks" ON public.onboarding_tasks;

CREATE POLICY "Admins can insert onboarding tasks"
  ON public.onboarding_tasks FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update onboarding tasks"
  ON public.onboarding_tasks FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));
