
-- Drop constraint first, then the index
ALTER TABLE public.ci_client_metrics DROP CONSTRAINT IF EXISTS ci_client_metrics_client_id_agency_id_data_source_id_key;
DROP INDEX IF EXISTS public.ci_client_metrics_client_agency_source_idx;

-- Use delete+insert strategy instead of upsert to avoid conflict issues
CREATE OR REPLACE FUNCTION public.ci_refresh_metrics(
  p_agency_id uuid DEFAULT NULL,
  p_data_source_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $function$
begin
  -- Delete existing metrics for the scope being refreshed
  delete from public.ci_client_metrics
  where (p_agency_id is null or agency_id = p_agency_id)
    and (p_data_source_id is null or data_source_id is not distinct from p_data_source_id);

  -- Compute and insert fresh metrics
  with base_clients as (
    select c.client_id, c.agency_id
    from public.clients c
    where c.active = true
      and (p_agency_id is null or c.agency_id = p_agency_id)
  ),
  last_behavior as (
    select be.client_id, max(be.occurred_at) as last_behavior_at
    from public.behavior_events be join base_clients bc on bc.client_id = be.client_id
    group by be.client_id
  ),
  last_goal_data as (
    select g.client_id, max(gd.created_at) as last_goal_at
    from public.goals g join public.goal_data gd on gd.goal_id = g.goal_id join base_clients bc on bc.client_id = g.client_id
    group by g.client_id
  ),
  last_activity as (
    select bc.client_id, greatest(coalesce(lb.last_behavior_at, '1970-01-01'::timestamptz), coalesce(lg.last_goal_at, '1970-01-01'::timestamptz)) as last_activity_at
    from base_clients bc left join last_behavior lb on lb.client_id = bc.client_id left join last_goal_data lg on lg.client_id = bc.client_id
  ),
  freshness as (
    select la.client_id, greatest(0, date_part('day', now() - la.last_activity_at))::int as days_since_last, public.ci_data_freshness(greatest(0, date_part('day', now() - la.last_activity_at))::int) as data_freshness
    from last_activity la
  ),
  trend_rates as (
    select bc.client_id,
      count(*) filter (where be.occurred_at >= now() - interval '14 days' and coalesce(be.is_problem, true))::numeric / 14.0 as recent_rate,
      count(*) filter (where be.occurred_at < now() - interval '14 days' and be.occurred_at >= now() - interval '28 days' and coalesce(be.is_problem, true))::numeric / 14.0 as prior_rate
    from base_clients bc left join public.behavior_events be on be.client_id = bc.client_id
    group by bc.client_id
  ),
  trend as (
    select tr.client_id, public.ci_trend_score(coalesce(tr.recent_rate,0), coalesce(tr.prior_rate,0)) as trend_score from trend_rates tr
  ),
  intensity as (
    select bc.client_id, avg(be.intensity)::numeric as avg_intensity_14d
    from base_clients bc left join public.behavior_events be on be.client_id = bc.client_id and be.occurred_at >= now() - interval '14 days'
    group by bc.client_id
  ),
  goal_velocity as (
    select bc.client_id,
      case when count(gd.*) filter (where gd.created_at >= now() - interval '14 days') = 0 then 0
        else round((count(*) filter (where gd.created_at >= now() - interval '14 days' and gd.correct = true)::numeric / count(*) filter (where gd.created_at >= now() - interval '14 days')::numeric) * 100.0, 2)
      end as goal_velocity_score
    from base_clients bc left join public.goals g on g.client_id = bc.client_id left join public.goal_data gd on gd.goal_id = g.goal_id
    group by bc.client_id
  ),
  fidelity as (
    select bc.client_id, round(coalesce(avg(fc.fidelity_score) filter (where fc.created_at >= now() - interval '30 days'), 0), 2) as fidelity_score
    from base_clients bc left join public.fidelity_checks fc on fc.client_id = bc.client_id group by bc.client_id
  ),
  parent_impl as (
    select bc.client_id, public.ci_parent_impl(avg(pil.consistency_rating) filter (where pil.created_at >= now() - interval '14 days'), 0) as parent_impl_score
    from base_clients bc left join public.parent_implementation_logs pil on pil.client_id = bc.client_id group by bc.client_id
  ),
  severity as (
    select tr.client_id, case when coalesce(tr.recent_rate,0) >= 2.0 then 'high' when coalesce(tr.recent_rate,0) >= 0.75 then 'moderate' else 'low' end as severity_level
    from trend_rates tr
  ),
  final_metrics as (
    select bc.agency_id, bc.client_id, p_data_source_id as data_source_id,
      coalesce(t.trend_score, 0) as trend_score, coalesce(f.data_freshness, 100) as data_freshness,
      coalesce(gv.goal_velocity_score, 0) as goal_velocity_score, coalesce(fi.fidelity_score, 0) as fidelity_score,
      coalesce(pi.parent_impl_score, 0) as parent_impl_score,
      public.ci_risk_score(s.severity_level, coalesce(t.trend_score,0), coalesce(i.avg_intensity_14d,1), coalesce(f.data_freshness,100), coalesce(fi.fidelity_score,100), coalesce(pi.parent_impl_score,100)) as risk_score
    from base_clients bc
    left join freshness f on f.client_id = bc.client_id left join trend t on t.client_id = bc.client_id
    left join intensity i on i.client_id = bc.client_id left join goal_velocity gv on gv.client_id = bc.client_id
    left join fidelity fi on fi.client_id = bc.client_id left join parent_impl pi on pi.client_id = bc.client_id
    left join severity s on s.client_id = bc.client_id
  )
  insert into public.ci_client_metrics (client_id, agency_id, data_source_id, risk_score, trend_score, data_freshness, parent_impl_score, goal_velocity_score, fidelity_score, updated_at)
  select fm.client_id, fm.agency_id, fm.data_source_id, fm.risk_score, fm.trend_score, fm.data_freshness, fm.parent_impl_score, fm.goal_velocity_score, fm.fidelity_score, now()
  from final_metrics fm;
end;
$function$;
