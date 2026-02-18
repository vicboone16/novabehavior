
-- Part 1: HR, Forms, Payers, Billing tables

-- job_postings
DROP POLICY IF EXISTS "Admins can view job postings" ON public.job_postings;
DROP POLICY IF EXISTS "Authenticated users can view job_postings" ON public.job_postings;
CREATE POLICY "Admins can view job postings"
ON public.job_postings FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

-- onboarding_templates
DROP POLICY IF EXISTS "Admins can view onboarding templates" ON public.onboarding_templates;
DROP POLICY IF EXISTS "Authenticated users can view onboarding_templates" ON public.onboarding_templates;
CREATE POLICY "Admins can view onboarding templates"
ON public.onboarding_templates FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

-- onboarding_tasks (new_hire_user_id column)
DROP POLICY IF EXISTS "Staff can view own onboarding tasks, admins view all" ON public.onboarding_tasks;
DROP POLICY IF EXISTS "Authenticated users can view onboarding_tasks" ON public.onboarding_tasks;
DROP POLICY IF EXISTS "Users can view onboarding tasks" ON public.onboarding_tasks;
CREATE POLICY "Staff can view own onboarding tasks, admins view all"
ON public.onboarding_tasks FOR SELECT TO authenticated
USING (auth.uid() = new_hire_user_id OR public.is_admin(auth.uid()));

-- mentor_assignments (new_hire_user_id, mentor_user_id columns)
DROP POLICY IF EXISTS "Staff can view own mentor assignments, admins view all" ON public.mentor_assignments;
DROP POLICY IF EXISTS "Authenticated users can view mentor_assignments" ON public.mentor_assignments;
DROP POLICY IF EXISTS "Users can view mentor assignments" ON public.mentor_assignments;
CREATE POLICY "Staff can view own mentor assignments, admins view all"
ON public.mentor_assignments FOR SELECT TO authenticated
USING (auth.uid() = new_hire_user_id OR auth.uid() = mentor_user_id OR public.is_admin(auth.uid()));

-- custom_forms
DROP POLICY IF EXISTS "Agency members can view custom forms" ON public.custom_forms;
DROP POLICY IF EXISTS "Authenticated users can view custom_forms" ON public.custom_forms;
CREATE POLICY "Agency members can view custom forms"
ON public.custom_forms FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid()) OR
  created_by = auth.uid() OR
  agency_id IS NULL OR
  public.has_agency_access(auth.uid(), agency_id)
);

-- payers
DROP POLICY IF EXISTS "Admins can view payers" ON public.payers;
DROP POLICY IF EXISTS "Authenticated users can view payers" ON public.payers;
CREATE POLICY "Admins can view payers"
ON public.payers FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

-- client_payers (student_id column)
DROP POLICY IF EXISTS "Users with student access can view client payers" ON public.client_payers;
DROP POLICY IF EXISTS "Authenticated users can view client_payers" ON public.client_payers;
CREATE POLICY "Users with student access can view client payers"
ON public.client_payers FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()));

-- authorizations
DROP POLICY IF EXISTS "Users with student access can view authorizations" ON public.authorizations;
DROP POLICY IF EXISTS "Authenticated users can view authorizations" ON public.authorizations;
CREATE POLICY "Users with student access can view authorizations"
ON public.authorizations FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()));

-- authorized_services
DROP POLICY IF EXISTS "Users with student access can view authorized services" ON public.authorized_services;
DROP POLICY IF EXISTS "Authenticated users can view authorized_services" ON public.authorized_services;
CREATE POLICY "Users with student access can view authorized services"
ON public.authorized_services FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()) OR public.has_student_access(student_id, auth.uid()));

-- unit_deduction_ledger
DROP POLICY IF EXISTS "Users with authorization access can view unit deductions" ON public.unit_deduction_ledger;
DROP POLICY IF EXISTS "Authenticated users can view unit_deduction_ledger" ON public.unit_deduction_ledger;
CREATE POLICY "Users with authorization access can view unit deductions"
ON public.unit_deduction_ledger FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.authorizations a
    WHERE a.id = unit_deduction_ledger.authorization_id
      AND public.has_student_access(a.student_id, auth.uid())
  )
);

-- staff_timesheets
DROP POLICY IF EXISTS "Staff can view own timesheets, admins view all" ON public.staff_timesheets;
DROP POLICY IF EXISTS "Authenticated users can view timesheets" ON public.staff_timesheets;
CREATE POLICY "Staff can view own timesheets, admins view all"
ON public.staff_timesheets FOR SELECT TO authenticated
USING (auth.uid() = staff_user_id OR public.is_admin(auth.uid()));

-- timesheet_entries
DROP POLICY IF EXISTS "Staff can view own timesheet entries, admins view all" ON public.timesheet_entries;
DROP POLICY IF EXISTS "Authenticated users can view entries" ON public.timesheet_entries;
CREATE POLICY "Staff can view own timesheet entries, admins view all"
ON public.timesheet_entries FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.staff_timesheets st
    WHERE st.id = timesheet_entries.timesheet_id
      AND (st.staff_user_id = auth.uid() OR public.is_admin(auth.uid()))
  )
);

-- payroll_exports
DROP POLICY IF EXISTS "Admins can view payroll exports" ON public.payroll_exports;
DROP POLICY IF EXISTS "Admins can view exports" ON public.payroll_exports;
CREATE POLICY "Admins can view payroll exports"
ON public.payroll_exports FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

-- era_imports
DROP POLICY IF EXISTS "Admins can view era imports" ON public.era_imports;
DROP POLICY IF EXISTS "Authenticated users can view era_imports" ON public.era_imports;
CREATE POLICY "Admins can view era imports"
ON public.era_imports FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

-- era_line_items
DROP POLICY IF EXISTS "Admins can view era line items" ON public.era_line_items;
DROP POLICY IF EXISTS "Authenticated users can view era_line_items" ON public.era_line_items;
CREATE POLICY "Admins can view era line items"
ON public.era_line_items FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

-- clearinghouse_submissions
DROP POLICY IF EXISTS "Admins can view clearinghouse submissions" ON public.clearinghouse_submissions;
DROP POLICY IF EXISTS "Authenticated users can view clearinghouse_submissions" ON public.clearinghouse_submissions;
DROP POLICY IF EXISTS "Users can view clearinghouse submissions" ON public.clearinghouse_submissions;
CREATE POLICY "Admins can view clearinghouse submissions"
ON public.clearinghouse_submissions FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

-- claim_submission_history
DROP POLICY IF EXISTS "Admins can view claim submission history" ON public.claim_submission_history;
DROP POLICY IF EXISTS "Authenticated users can view claim_submission_history" ON public.claim_submission_history;
DROP POLICY IF EXISTS "Users can view claim submission history" ON public.claim_submission_history;
CREATE POLICY "Admins can view claim submission history"
ON public.claim_submission_history FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));
