-- Fix signature_audit_log - audit logs should only be inserted by authenticated users
-- and the policy is intentionally permissive since audit entries are append-only
DROP POLICY IF EXISTS "System can insert audit logs" ON public.signature_audit_log;
CREATE POLICY "Authenticated users can insert signature audit logs"
ON public.signature_audit_log FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);