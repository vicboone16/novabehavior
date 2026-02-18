
-- Fix overly permissive USING (true) SELECT policies on sensitive tables

-- =============================================
-- 1. PAYROLL / TIMESHEET TABLES
-- =============================================
DROP POLICY IF EXISTS "Users can view own timesheets or admins all" ON public.staff_timesheets;
DROP POLICY IF EXISTS "Admins can view timesheets" ON public.staff_timesheets;
DROP POLICY IF EXISTS "Users can view timesheets" ON public.staff_timesheets;
DROP POLICY IF EXISTS "Authenticated users can view timesheets" ON public.staff_timesheets;
CREATE POLICY "Users can view own timesheets or admins all"
ON public.staff_timesheets FOR SELECT
USING (
  staff_user_id = auth.uid()
  OR is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can view own timesheet entries or admins all" ON public.timesheet_entries;
DROP POLICY IF EXISTS "Admins can view timesheet entries" ON public.timesheet_entries;
DROP POLICY IF EXISTS "Users can view entries" ON public.timesheet_entries;
DROP POLICY IF EXISTS "Authenticated users can view timesheet entries" ON public.timesheet_entries;
CREATE POLICY "Users can view own timesheet entries or admins all"
ON public.timesheet_entries FOR SELECT
USING (
  is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.staff_timesheets st
    WHERE st.id = timesheet_entries.timesheet_id
      AND st.staff_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can view payroll exports" ON public.payroll_exports;
DROP POLICY IF EXISTS "Authenticated users can view payroll exports" ON public.payroll_exports;
CREATE POLICY "Admins can view payroll exports"
ON public.payroll_exports FOR SELECT
USING (is_admin(auth.uid()));

-- =============================================
-- 2. BILLING / INSURANCE TABLES
-- =============================================
DROP POLICY IF EXISTS "Admins can view ERA imports" ON public.era_imports;
DROP POLICY IF EXISTS "Authenticated users can view ERA imports" ON public.era_imports;
CREATE POLICY "Admins can view ERA imports"
ON public.era_imports FOR SELECT
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view ERA line items" ON public.era_line_items;
DROP POLICY IF EXISTS "Authenticated users can view ERA line items" ON public.era_line_items;
CREATE POLICY "Admins can view ERA line items"
ON public.era_line_items FOR SELECT
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view clearinghouse submissions" ON public.clearinghouse_submissions;
DROP POLICY IF EXISTS "Authenticated users can view clearinghouse submissions" ON public.clearinghouse_submissions;
CREATE POLICY "Admins can view clearinghouse submissions"
ON public.clearinghouse_submissions FOR SELECT
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view claim submission history" ON public.claim_submission_history;
DROP POLICY IF EXISTS "Authenticated users can view claim submission history" ON public.claim_submission_history;
CREATE POLICY "Admins can view claim submission history"
ON public.claim_submission_history FOR SELECT
USING (is_admin(auth.uid()));

-- =============================================
-- 3. CLINICAL / PROTOCOL TABLES
-- =============================================
DROP POLICY IF EXISTS "Clinical staff can view protocol templates" ON public.protocol_templates;
DROP POLICY IF EXISTS "Authenticated users can view protocol templates" ON public.protocol_templates;
CREATE POLICY "Clinical staff can view protocol templates"
ON public.protocol_templates FOR SELECT
USING (
  is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.agency_memberships am
    WHERE am.user_id = auth.uid()
      AND am.status = 'active'
  )
);

-- protocol_assignments: assigned_by, assigned_staff (uuid[]), student_id
DROP POLICY IF EXISTS "Staff can view protocol assignments for accessible students" ON public.protocol_assignments;
DROP POLICY IF EXISTS "Admins can view protocol assignments" ON public.protocol_assignments;
DROP POLICY IF EXISTS "Authenticated users can view protocol assignments" ON public.protocol_assignments;
CREATE POLICY "Staff can view protocol assignments for accessible students"
ON public.protocol_assignments FOR SELECT
USING (
  is_admin(auth.uid())
  OR has_student_access(student_id, auth.uid())
  OR assigned_by = auth.uid()
  OR auth.uid() = ANY(assigned_staff)
);

-- graph_annotations: student_id, created_by
DROP POLICY IF EXISTS "Staff can view graph annotations for accessible students" ON public.graph_annotations;
DROP POLICY IF EXISTS "Admins can view graph annotations" ON public.graph_annotations;
DROP POLICY IF EXISTS "Authenticated users can view graph annotations" ON public.graph_annotations;
CREATE POLICY "Staff can view graph annotations for accessible students"
ON public.graph_annotations FOR SELECT
USING (
  is_admin(auth.uid())
  OR has_student_access(student_id, auth.uid())
  OR created_by = auth.uid()
);

-- graph_configurations: student_id (nullable), created_by
DROP POLICY IF EXISTS "Agency members can view graph configurations" ON public.graph_configurations;
DROP POLICY IF EXISTS "Admins can view graph configurations" ON public.graph_configurations;
DROP POLICY IF EXISTS "Authenticated users can view graph configurations" ON public.graph_configurations;
CREATE POLICY "Agency members can view graph configurations"
ON public.graph_configurations FOR SELECT
USING (
  is_admin(auth.uid())
  OR created_by = auth.uid()
  OR (student_id IS NOT NULL AND has_student_access(student_id, auth.uid()))
  OR (
    student_id IS NULL AND EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid() AND am.status = 'active'
    )
  )
);

-- =============================================
-- 4. CAREGIVER TRAINING TABLES
-- =============================================
DROP POLICY IF EXISTS "Agency members can view caregiver training programs" ON public.caregiver_training_programs;
DROP POLICY IF EXISTS "Admins can view caregiver programs" ON public.caregiver_training_programs;
DROP POLICY IF EXISTS "Authenticated users can view caregiver programs" ON public.caregiver_training_programs;
CREATE POLICY "Agency members can view caregiver training programs"
ON public.caregiver_training_programs FOR SELECT
USING (
  is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.agency_memberships am
    WHERE am.user_id = auth.uid()
      AND (caregiver_training_programs.agency_id IS NULL OR am.agency_id = caregiver_training_programs.agency_id)
      AND am.status = 'active'
  )
);

DROP POLICY IF EXISTS "Staff can view own caregiver training sessions or admins all" ON public.caregiver_training_sessions;
DROP POLICY IF EXISTS "Authenticated users can view caregiver training sessions" ON public.caregiver_training_sessions;
CREATE POLICY "Staff can view own caregiver training sessions or admins all"
ON public.caregiver_training_sessions FOR SELECT
USING (
  is_admin(auth.uid())
  OR staff_user_id = auth.uid()
  OR has_student_access(student_id, auth.uid())
);

DROP POLICY IF EXISTS "Staff can view caregiver competency checks" ON public.caregiver_competency_checks;
DROP POLICY IF EXISTS "Authenticated users can view competency checks" ON public.caregiver_competency_checks;
CREATE POLICY "Staff can view caregiver competency checks"
ON public.caregiver_competency_checks FOR SELECT
USING (
  is_admin(auth.uid())
  OR evaluator_id = auth.uid()
  OR has_student_access(student_id, auth.uid())
);

DROP POLICY IF EXISTS "Staff can view caregiver generalization probes" ON public.caregiver_generalization_probes;
DROP POLICY IF EXISTS "Authenticated users can view generalization probes" ON public.caregiver_generalization_probes;
CREATE POLICY "Staff can view caregiver generalization probes"
ON public.caregiver_generalization_probes FOR SELECT
USING (
  is_admin(auth.uid())
  OR observer_id = auth.uid()
  OR has_student_access(student_id, auth.uid())
);

-- =============================================
-- 5. HR / ONBOARDING TABLES
-- =============================================
DROP POLICY IF EXISTS "Admins can view onboarding templates" ON public.onboarding_templates;
DROP POLICY IF EXISTS "Authenticated users can view onboarding templates" ON public.onboarding_templates;
CREATE POLICY "Admins can view onboarding templates"
ON public.onboarding_templates FOR SELECT
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "New hires can view own tasks, admins can view all" ON public.onboarding_tasks;
DROP POLICY IF EXISTS "Admins can view onboarding tasks" ON public.onboarding_tasks;
DROP POLICY IF EXISTS "Users can view onboarding tasks" ON public.onboarding_tasks;
DROP POLICY IF EXISTS "Authenticated users can view onboarding tasks" ON public.onboarding_tasks;
CREATE POLICY "New hires can view own tasks, admins can view all"
ON public.onboarding_tasks FOR SELECT
USING (
  is_admin(auth.uid())
  OR new_hire_user_id = auth.uid()
);

-- mentor_assignments: new_hire_user_id, mentor_user_id
DROP POLICY IF EXISTS "Staff can view own mentor assignments or admins all" ON public.mentor_assignments;
DROP POLICY IF EXISTS "Authenticated users can view mentor assignments" ON public.mentor_assignments;
CREATE POLICY "Staff can view own mentor assignments or admins all"
ON public.mentor_assignments FOR SELECT
USING (
  is_admin(auth.uid())
  OR mentor_user_id = auth.uid()
  OR new_hire_user_id = auth.uid()
);

DROP POLICY IF EXISTS "Active agency members can view training modules" ON public.training_modules;
DROP POLICY IF EXISTS "Authenticated users can view training modules" ON public.training_modules;
CREATE POLICY "Active agency members can view training modules"
ON public.training_modules FOR SELECT
USING (
  is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.agency_memberships am
    WHERE am.user_id = auth.uid() AND am.status = 'active'
  )
);

-- =============================================
-- 6. CUSTOM FORMS TABLES
-- =============================================
DROP POLICY IF EXISTS "Agency members can view custom forms" ON public.custom_forms;
DROP POLICY IF EXISTS "Admins can view custom forms" ON public.custom_forms;
DROP POLICY IF EXISTS "Authenticated users can view custom forms" ON public.custom_forms;
CREATE POLICY "Agency members can view custom forms"
ON public.custom_forms FOR SELECT
USING (
  is_admin(auth.uid())
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.agency_memberships am
    WHERE am.user_id = auth.uid()
      AND (custom_forms.agency_id IS NULL OR am.agency_id = custom_forms.agency_id)
      AND am.status = 'active'
  )
);

-- custom_form_submissions: created_by, student_id (nullable); keep existing magic-link public policy intact
DROP POLICY IF EXISTS "Staff can view accessible form submissions" ON public.custom_form_submissions;
DROP POLICY IF EXISTS "Authenticated users can view form submissions" ON public.custom_form_submissions;
DROP POLICY IF EXISTS "Admins can view form submissions" ON public.custom_form_submissions;
CREATE POLICY "Staff can view accessible form submissions"
ON public.custom_form_submissions FOR SELECT
USING (
  is_admin(auth.uid())
  OR created_by = auth.uid()
  OR (student_id IS NOT NULL AND has_student_access(student_id, auth.uid()))
);
