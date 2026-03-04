
-- Fix era_imports: the old USING(true) was dropped but a same-named admin policy already existed
-- Drop the old one and recreate
DROP POLICY IF EXISTS "Admins can view ERA imports" ON public.era_imports;
CREATE POLICY "Admins can view ERA imports"
  ON public.era_imports FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- era_line_items: same issue possible
DROP POLICY IF EXISTS "Admins can view ERA line items" ON public.era_line_items;
CREATE POLICY "Admins can view ERA line items"
  ON public.era_line_items FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- clearinghouse_submissions
DROP POLICY IF EXISTS "Admins can view clearinghouse submissions" ON public.clearinghouse_submissions;
CREATE POLICY "Admins can view clearinghouse submissions"
  ON public.clearinghouse_submissions FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- claim_submission_history
DROP POLICY IF EXISTS "Admins can view claim history" ON public.claim_submission_history;
CREATE POLICY "Admins can view claim history"
  ON public.claim_submission_history FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));
