
ALTER VIEW public.v_ci_caseload_feed SET (security_invoker = on);
ALTER VIEW public.v_ci_alert_feed SET (security_invoker = on);
ALTER VIEW public.v_ci_agency_comparison SET (security_invoker = on);
ALTER VIEW public.v_ci_stale_leaderboard SET (security_invoker = on);
