-- Fix infinite recursion in session_participants RLS policy
DROP POLICY IF EXISTS "Staff can view session participants they belong to" ON public.session_participants;

CREATE POLICY "Staff can view session participants they belong to"
ON public.session_participants
FOR SELECT
USING (
  user_id = auth.uid()
  OR is_admin(auth.uid())
  OR session_id IN (
    SELECT sp.session_id FROM public.session_participants sp WHERE sp.user_id = auth.uid()
  )
);