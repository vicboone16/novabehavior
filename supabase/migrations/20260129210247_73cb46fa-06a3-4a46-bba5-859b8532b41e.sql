
-- Fix the permissive notifications insert policy
-- Drop the overly permissive policy and create a more restricted one
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Only allow authenticated users to insert notifications for other users (for system use)
-- Or allow service role to insert (edge functions will use service role)
CREATE POLICY "Authenticated users can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
