
-- Fix payroll_exports: drop the old permissive policy and the one that was already created
DROP POLICY IF EXISTS "Admins can view payroll exports" ON public.payroll_exports;

-- Recreate with proper admin check
CREATE POLICY "Admins can view payroll exports"
ON public.payroll_exports FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));
