-- Final hardening pass for remaining error-level sensitive-data findings

-- 1) Narrow student access scope (remove broad agency-wide read/update paths)
DROP POLICY IF EXISTS "Users can view accessible students" ON public.students;
CREATE POLICY "Users can view accessible students"
ON public.students
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR has_student_access(id, auth.uid())
  OR has_tag_based_access(auth.uid(), id)
  OR is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can update accessible students" ON public.students;
CREATE POLICY "Users can update accessible students"
ON public.students
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  OR has_student_access(id, auth.uid())
  OR is_admin(auth.uid())
)
WITH CHECK (
  auth.uid() = user_id
  OR has_student_access(id, auth.uid())
  OR is_admin(auth.uid())
);

-- 2) Tighten parent/guardian and location/medical access to directly assigned users only
DROP POLICY IF EXISTS "Users can view client contacts for accessible students" ON public.client_contacts;
DROP POLICY IF EXISTS "Users can manage client contacts for accessible students" ON public.client_contacts;

CREATE POLICY "Users can view client contacts for assigned students"
ON public.client_contacts
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
  OR is_student_owner(client_id, auth.uid())
  OR has_student_access(client_id, auth.uid())
);

CREATE POLICY "Users can manage client contacts for assigned students"
ON public.client_contacts
FOR ALL
TO authenticated
USING (
  is_admin(auth.uid())
  OR is_student_owner(client_id, auth.uid())
  OR has_student_access(client_id, auth.uid())
)
WITH CHECK (
  is_admin(auth.uid())
  OR is_student_owner(client_id, auth.uid())
  OR has_student_access(client_id, auth.uid())
);

DROP POLICY IF EXISTS "Users can view client locations for accessible students" ON public.client_locations;
DROP POLICY IF EXISTS "Users can manage client locations for accessible students" ON public.client_locations;

CREATE POLICY "Users can view client locations for assigned students"
ON public.client_locations
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
  OR is_student_owner(client_id, auth.uid())
  OR has_student_access(client_id, auth.uid())
);

CREATE POLICY "Users can manage client locations for assigned students"
ON public.client_locations
FOR ALL
TO authenticated
USING (
  is_admin(auth.uid())
  OR is_student_owner(client_id, auth.uid())
  OR has_student_access(client_id, auth.uid())
)
WITH CHECK (
  is_admin(auth.uid())
  OR is_student_owner(client_id, auth.uid())
  OR has_student_access(client_id, auth.uid())
);

DROP POLICY IF EXISTS "Users can view safety medical for accessible students" ON public.client_safety_medical;
DROP POLICY IF EXISTS "Users can manage safety medical for accessible students" ON public.client_safety_medical;

CREATE POLICY "Users can view safety medical for assigned students"
ON public.client_safety_medical
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
  OR is_student_owner(client_id, auth.uid())
  OR has_student_access(client_id, auth.uid())
);

CREATE POLICY "Users can manage safety medical for assigned students"
ON public.client_safety_medical
FOR ALL
TO authenticated
USING (
  is_admin(auth.uid())
  OR is_student_owner(client_id, auth.uid())
  OR has_student_access(client_id, auth.uid())
)
WITH CHECK (
  is_admin(auth.uid())
  OR is_student_owner(client_id, auth.uid())
  OR has_student_access(client_id, auth.uid())
);

DROP POLICY IF EXISTS "Users can view payer plans for accessible students" ON public.payer_plans;
DROP POLICY IF EXISTS "Users can manage payer plans for accessible students" ON public.payer_plans;

CREATE POLICY "Billing users can view payer plans for assigned students"
ON public.payer_plans
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
  OR has_billing_access(auth.uid())
  OR is_student_owner(client_id, auth.uid())
  OR has_student_access(client_id, auth.uid())
);

CREATE POLICY "Billing users can manage payer plans for assigned students"
ON public.payer_plans
FOR ALL
TO authenticated
USING (
  is_admin(auth.uid())
  OR has_billing_access(auth.uid())
)
WITH CHECK (
  is_admin(auth.uid())
  OR has_billing_access(auth.uid())
);

-- 3) Restrict payment and insurance eligibility tables to billing/admin paths
DROP POLICY IF EXISTS "Staff can view payments for accessible students" ON public.billing_payments;
DROP POLICY IF EXISTS "Staff can create payments for accessible students" ON public.billing_payments;
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.billing_payments;

CREATE POLICY "Billing users can view payments"
ON public.billing_payments
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
  OR has_billing_access(auth.uid())
);

CREATE POLICY "Billing users can manage payments"
ON public.billing_payments
FOR ALL
TO authenticated
USING (
  is_admin(auth.uid())
  OR has_billing_access(auth.uid())
)
WITH CHECK (
  is_admin(auth.uid())
  OR has_billing_access(auth.uid())
);

DROP POLICY IF EXISTS "Staff can view eligibility for accessible students" ON public.eligibility_checks;
DROP POLICY IF EXISTS "Staff can create eligibility checks for accessible students" ON public.eligibility_checks;
DROP POLICY IF EXISTS "Admins can manage all eligibility checks" ON public.eligibility_checks;

CREATE POLICY "Billing users can view eligibility checks"
ON public.eligibility_checks
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid())
  OR has_billing_access(auth.uid())
);

CREATE POLICY "Billing users can manage eligibility checks"
ON public.eligibility_checks
FOR ALL
TO authenticated
USING (
  is_admin(auth.uid())
  OR has_billing_access(auth.uid())
)
WITH CHECK (
  is_admin(auth.uid())
  OR has_billing_access(auth.uid())
);