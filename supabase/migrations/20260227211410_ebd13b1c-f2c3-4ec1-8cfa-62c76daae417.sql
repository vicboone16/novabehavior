
-- Fix security definer views by setting them to SECURITY INVOKER
ALTER VIEW public.clients SET (security_invoker = on);
ALTER VIEW public.behavior_events SET (security_invoker = on);
ALTER VIEW public.goals SET (security_invoker = on);
ALTER VIEW public.goal_data SET (security_invoker = on);
ALTER VIEW public.fidelity_checks SET (security_invoker = on);
ALTER VIEW public.parent_implementation_logs SET (security_invoker = on);
