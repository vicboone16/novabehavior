
-- Remove duplicate/conflicting UPDATE policy on custom_form_submissions
DROP POLICY IF EXISTS "Creators can update form submissions" ON public.custom_form_submissions;
