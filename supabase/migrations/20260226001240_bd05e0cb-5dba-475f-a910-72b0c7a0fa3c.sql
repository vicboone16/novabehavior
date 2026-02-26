-- Create a security definer function to check session membership without RLS recursion
CREATE OR REPLACE FUNCTION public.user_session_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT session_id FROM public.session_participants WHERE user_id = p_user_id;
$$;

-- Fix infinite recursion in session_participants RLS policy
DROP POLICY IF EXISTS "Staff can view session participants they belong to" ON public.session_participants;

CREATE POLICY "Staff can view session participants they belong to"
ON public.session_participants
FOR SELECT
USING (
  user_id = auth.uid()
  OR is_admin(auth.uid())
  OR session_id IN (SELECT public.user_session_ids(auth.uid()))
);