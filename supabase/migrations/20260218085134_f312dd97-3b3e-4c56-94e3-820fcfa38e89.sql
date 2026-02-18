
-- Drop all remaining stale USING (true) SELECT policies that coexist with the new restrictive ones

DROP POLICY IF EXISTS "Authenticated users can view probes" ON public.caregiver_generalization_probes;
DROP POLICY IF EXISTS "Authenticated users can view caregiver sessions" ON public.caregiver_training_sessions;
DROP POLICY IF EXISTS "Authenticated users can view claim history" ON public.claim_submission_history;
DROP POLICY IF EXISTS "Authenticated users can view submissions" ON public.clearinghouse_submissions;
DROP POLICY IF EXISTS "Authenticated users can view annotations" ON public.graph_annotations;
DROP POLICY IF EXISTS "Authenticated users can view graph configs" ON public.graph_configurations;

-- Also check and drop any remaining true-policies on the other listed tables
DROP POLICY IF EXISTS "Authenticated users can view timesheets" ON public.staff_timesheets;
DROP POLICY IF EXISTS "Authenticated users can view timesheet entries" ON public.timesheet_entries;
DROP POLICY IF EXISTS "Authenticated users can view payroll exports" ON public.payroll_exports;
DROP POLICY IF EXISTS "Authenticated users can view ERA imports" ON public.era_imports;
DROP POLICY IF EXISTS "Authenticated users can view ERA line items" ON public.era_line_items;
DROP POLICY IF EXISTS "Authenticated users can view protocol templates" ON public.protocol_templates;
DROP POLICY IF EXISTS "Authenticated users can view protocol assignments" ON public.protocol_assignments;
DROP POLICY IF EXISTS "Authenticated users can view caregiver programs" ON public.caregiver_training_programs;
DROP POLICY IF EXISTS "Authenticated users can view competency checks" ON public.caregiver_competency_checks;
DROP POLICY IF EXISTS "Authenticated users can view onboarding templates" ON public.onboarding_templates;
DROP POLICY IF EXISTS "Authenticated users can view onboarding tasks" ON public.onboarding_tasks;
DROP POLICY IF EXISTS "Authenticated users can view mentor assignments" ON public.mentor_assignments;
DROP POLICY IF EXISTS "Authenticated users can view training modules" ON public.training_modules;
DROP POLICY IF EXISTS "Authenticated users can view custom forms" ON public.custom_forms;
DROP POLICY IF EXISTS "Authenticated users can view form submissions" ON public.custom_form_submissions;
DROP POLICY IF EXISTS "Authenticated users can view job postings" ON public.job_postings;

-- Also drop any duplicate restrictive policies from prior migration runs
DROP POLICY IF EXISTS "Users with student access can view caregiver competency checks" ON public.caregiver_competency_checks;
DROP POLICY IF EXISTS "Users with student access can view caregiver generalization pro" ON public.caregiver_generalization_probes;
DROP POLICY IF EXISTS "Users with student access can view caregiver training sessions" ON public.caregiver_training_sessions;
DROP POLICY IF EXISTS "Users with student access can view graph annotations" ON public.graph_annotations;
DROP POLICY IF EXISTS "Admins can view era imports" ON public.era_imports;
DROP POLICY IF EXISTS "Admins can view era line items" ON public.era_line_items;
