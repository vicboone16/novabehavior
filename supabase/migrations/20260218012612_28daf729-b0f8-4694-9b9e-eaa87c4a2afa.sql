
-- Part 2: Clinical, Protocol, and Caregiver Training tables

-- protocol_templates
DROP POLICY IF EXISTS "Agency members can view protocol templates" ON public.protocol_templates;
DROP POLICY IF EXISTS "Authenticated users can view protocol_templates" ON public.protocol_templates;
CREATE POLICY "Agency members can view protocol templates"
ON public.protocol_templates FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid()) OR
  agency_id IS NULL OR
  public.has_agency_access(auth.uid(), agency_id)
);

-- protocol_assignments
DROP POLICY IF EXISTS "Users with student access can view protocol assignments" ON public.protocol_assignments;
DROP POLICY IF EXISTS "Authenticated users can view protocol_assignments" ON public.protocol_assignments;
CREATE POLICY "Users with student access can view protocol assignments"
ON public.protocol_assignments FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()));

-- graph_annotations
DROP POLICY IF EXISTS "Users with student access can view graph annotations" ON public.graph_annotations;
DROP POLICY IF EXISTS "Authenticated users can view graph_annotations" ON public.graph_annotations;
CREATE POLICY "Users with student access can view graph annotations"
ON public.graph_annotations FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()));

-- graph_configurations
DROP POLICY IF EXISTS "Users with student access can view graph configurations" ON public.graph_configurations;
DROP POLICY IF EXISTS "Authenticated users can view graph_configurations" ON public.graph_configurations;
CREATE POLICY "Users with student access can view graph configurations"
ON public.graph_configurations FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()));

-- caregiver_training_programs
DROP POLICY IF EXISTS "Agency members can view caregiver training programs" ON public.caregiver_training_programs;
DROP POLICY IF EXISTS "Authenticated users can view caregiver_training_programs" ON public.caregiver_training_programs;
CREATE POLICY "Agency members can view caregiver training programs"
ON public.caregiver_training_programs FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid()) OR
  agency_id IS NULL OR
  public.has_agency_access(auth.uid(), agency_id)
);

-- caregiver_training_sessions
DROP POLICY IF EXISTS "Users with student access can view caregiver training sessions" ON public.caregiver_training_sessions;
DROP POLICY IF EXISTS "Authenticated users can view caregiver_training_sessions" ON public.caregiver_training_sessions;
CREATE POLICY "Users with student access can view caregiver training sessions"
ON public.caregiver_training_sessions FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()));

-- caregiver_competency_checks
DROP POLICY IF EXISTS "Users with student access can view caregiver competency checks" ON public.caregiver_competency_checks;
DROP POLICY IF EXISTS "Authenticated users can view caregiver_competency_checks" ON public.caregiver_competency_checks;
CREATE POLICY "Users with student access can view caregiver competency checks"
ON public.caregiver_competency_checks FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()));

-- caregiver_generalization_probes
DROP POLICY IF EXISTS "Users with student access can view caregiver generalization probes" ON public.caregiver_generalization_probes;
DROP POLICY IF EXISTS "Authenticated users can view caregiver_generalization_probes" ON public.caregiver_generalization_probes;
CREATE POLICY "Users with student access can view caregiver generalization probes"
ON public.caregiver_generalization_probes FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()));
