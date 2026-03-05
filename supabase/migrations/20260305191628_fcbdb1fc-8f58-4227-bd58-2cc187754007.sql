
-- Fix security definer views created in behavior_intelligence
ALTER VIEW behavior_intelligence.v_storyboard_events SET (security_invoker = on);
ALTER VIEW behavior_intelligence.v_staff_timeline SET (security_invoker = on);
ALTER VIEW behavior_intelligence.v_supervisor_timeline SET (security_invoker = on);
ALTER VIEW behavior_intelligence.v_parent_timeline SET (security_invoker = on);
