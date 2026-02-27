
CREATE OR REPLACE FUNCTION public.ci_refresh_alerts(
  p_agency_id uuid DEFAULT NULL,
  p_data_source_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $function$
begin
  -- Build desired alerts into a temp table so both INSERT and UPDATE can reference it
  create temp table _desired_alerts on commit drop as
  select
    agency_id, data_source_id, client_id, category, severity, message, explanation_json,
    md5(agency_id::text || '|' || coalesce(data_source_id::text,'native') || '|' || client_id::text || '|' || category) as alert_key
  from (
    select cm.agency_id, cm.data_source_id, cm.client_id, 'risk'::text as category,
      case when cm.risk_score >= 75 then 'critical' when cm.risk_score >= 50 then 'high' else null end as severity,
      case when cm.risk_score >= 75 then 'High risk escalation detected' when cm.risk_score >= 50 then 'Elevated risk detected' else null end as message,
      jsonb_build_object('risk_score', cm.risk_score, 'trend_score', cm.trend_score, 'data_freshness', cm.data_freshness, 'fidelity_score', cm.fidelity_score, 'goal_velocity_score', cm.goal_velocity_score, 'parent_impl_score', cm.parent_impl_score) as explanation_json
    from public.ci_client_metrics cm
    where (p_agency_id is null or cm.agency_id = p_agency_id)
      and (p_data_source_id is null or cm.data_source_id is not distinct from p_data_source_id)
    union all
    select cm.agency_id, cm.data_source_id, cm.client_id, 'stale_data', 'high', 'Data appears stale', jsonb_build_object('data_freshness', cm.data_freshness)
    from public.ci_client_metrics cm where cm.data_freshness <= 20 and (p_agency_id is null or cm.agency_id = p_agency_id) and (p_data_source_id is null or cm.data_source_id is not distinct from p_data_source_id)
    union all
    select cm.agency_id, cm.data_source_id, cm.client_id, 'worsening_trend', 'high', 'Behavior trend worsening', jsonb_build_object('trend_score', cm.trend_score)
    from public.ci_client_metrics cm where cm.trend_score >= 40 and (p_agency_id is null or cm.agency_id = p_agency_id) and (p_data_source_id is null or cm.data_source_id is not distinct from p_data_source_id)
    union all
    select cm.agency_id, cm.data_source_id, cm.client_id, 'low_fidelity', case when cm.fidelity_score < 70 then 'high' else 'medium' end, 'Fidelity below target', jsonb_build_object('fidelity_score', cm.fidelity_score)
    from public.ci_client_metrics cm where cm.fidelity_score < 80 and (p_agency_id is null or cm.agency_id = p_agency_id) and (p_data_source_id is null or cm.data_source_id is not distinct from p_data_source_id)
    union all
    select cm.agency_id, cm.data_source_id, cm.client_id, 'goal_plateau', 'medium', 'Goal progress plateau risk', jsonb_build_object('goal_velocity_score', cm.goal_velocity_score)
    from public.ci_client_metrics cm where cm.goal_velocity_score < 30 and (p_agency_id is null or cm.agency_id = p_agency_id) and (p_data_source_id is null or cm.data_source_id is not distinct from p_data_source_id)
    union all
    select cm.agency_id, cm.data_source_id, cm.client_id, 'parent_training_due', 'medium', 'Parent implementation below target', jsonb_build_object('parent_impl_score', cm.parent_impl_score)
    from public.ci_client_metrics cm where cm.parent_impl_score < 60 and (p_agency_id is null or cm.agency_id = p_agency_id) and (p_data_source_id is null or cm.data_source_id is not distinct from p_data_source_id)
  ) x where severity is not null;

  -- Upsert desired alerts
  insert into public.ci_alerts (alert_key, agency_id, data_source_id, client_id, severity, category, message, explanation_json, created_at, resolved_at, resolved_by)
  select da.alert_key, da.agency_id, da.data_source_id, da.client_id, da.severity, da.category, da.message, da.explanation_json, now(), null, null
  from _desired_alerts da
  on conflict (alert_key) where resolved_at is null
  do update set severity = excluded.severity, message = excluded.message, explanation_json = excluded.explanation_json, resolved_at = null, resolved_by = null;

  -- Auto-resolve alerts no longer triggered
  update public.ci_alerts a
  set resolved_at = now(), resolved_by = null
  where a.resolved_at is null
    and (p_agency_id is null or a.agency_id = p_agency_id)
    and (p_data_source_id is null or a.data_source_id is not distinct from p_data_source_id)
    and not exists (select 1 from _desired_alerts da where da.alert_key = a.alert_key);
end;
$function$;
