
-- 1) clients → students
CREATE OR REPLACE VIEW public.clients AS
SELECT
  s.id          AS client_id,
  s.agency_id,
  (NOT coalesce(s.is_archived, false)) AS active,
  s.first_name,
  s.last_name,
  coalesce(s.display_name, s.name) AS full_name,
  s.primary_setting,
  NULL::text    AS communication_level,
  NULL::text    AS diagnosis_cluster,
  CASE
    WHEN s.dob IS NOT NULL THEN date_part('year', age(s.dob::date))::int
    WHEN s.date_of_birth IS NOT NULL THEN date_part('year', age(s.date_of_birth))::int
    ELSE NULL
  END           AS age_years
FROM public.students s;

-- 2) behavior_events → session_data
CREATE OR REPLACE VIEW public.behavior_events AS
SELECT
  sd.id            AS event_id,
  sd.student_id    AS client_id,
  sd.session_id,
  sd.behavior_id,
  sd.behavior_name,
  sd.event_type,
  sd.timestamp     AS occurred_at,
  sd.duration_seconds,
  sd.abc_data,
  true             AS is_problem,
  NULL::numeric    AS intensity,
  sd.created_at
FROM public.session_data sd;

-- 3) goals → skill_programs
CREATE OR REPLACE VIEW public.goals AS
SELECT
  sp.id          AS goal_id,
  sp.student_id  AS client_id,
  sp.name        AS goal_name,
  sp.status,
  sp.active,
  sp.created_at,
  sp.updated_at
FROM public.skill_programs sp;

-- 4) goal_data → target_trials
CREATE OR REPLACE VIEW public.goal_data AS
SELECT
  tt.id          AS data_id,
  sp.id          AS goal_id,
  st.id          AS target_id,
  tt.outcome,
  (tt.outcome = 'correct' OR tt.outcome = '+')  AS correct,
  tt.prompt_level_id,
  tt.recorded_at,
  coalesce(tt.recorded_at, tt.created_at) AS created_at
FROM public.target_trials tt
JOIN public.skill_targets st ON st.id = tt.target_id
JOIN public.skill_programs sp ON sp.id = st.program_id;

-- 5) fidelity_checks — placeholder
CREATE OR REPLACE VIEW public.fidelity_checks AS
SELECT
  gen_random_uuid() AS id,
  NULL::uuid        AS client_id,
  NULL::numeric     AS fidelity_score,
  now()             AS created_at
WHERE false;

-- 6) parent_implementation_logs — placeholder
CREATE OR REPLACE VIEW public.parent_implementation_logs AS
SELECT
  gen_random_uuid() AS id,
  NULL::uuid        AS client_id,
  NULL::numeric     AS consistency_rating,
  now()             AS created_at
WHERE false;

-- Rewrite ci_refresh_metrics with search_path
CREATE OR REPLACE FUNCTION public.ci_refresh_metrics(
  p_agency_id uuid DEFAULT NULL,
  p_data_source_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $function$
begin
  with base_clients as (
    select c.client_id, c.agency_id
    from public.clients c
    where c.active = true
      and (p_agency_id is null or c.agency_id = p_agency_id)
  ),
  last_behavior as (
    select be.client_id, max(be.occurred_at) as last_behavior_at
    from public.behavior_events be
    join base_clients bc on bc.client_id = be.client_id
    group by be.client_id
  ),
  last_goal_data as (
    select g.client_id, max(gd.created_at) as last_goal_at
    from public.goals g
    join public.goal_data gd on gd.goal_id = g.goal_id
    join base_clients bc on bc.client_id = g.client_id
    group by g.client_id
  ),
  last_activity as (
    select
      bc.client_id,
      greatest(
        coalesce(lb.last_behavior_at, '1970-01-01'::timestamptz),
        coalesce(lg.last_goal_at, '1970-01-01'::timestamptz)
      ) as last_activity_at
    from base_clients bc
    left join last_behavior lb on lb.client_id = bc.client_id
    left join last_goal_data lg on lg.client_id = bc.client_id
  ),
  freshness as (
    select
      la.client_id,
      greatest(0, date_part('day', now() - la.last_activity_at))::int as days_since_last,
      public.ci_data_freshness(greatest(0, date_part('day', now() - la.last_activity_at))::int) as data_freshness
    from last_activity la
  ),
  trend_rates as (
    select
      bc.client_id,
      count(*) filter (where be.occurred_at >= now() - interval '14 days' and coalesce(be.is_problem, true) = true)::numeric / 14.0 as recent_rate,
      count(*) filter (where be.occurred_at < now() - interval '14 days' and be.occurred_at >= now() - interval '28 days' and coalesce(be.is_problem, true) = true)::numeric / 14.0 as prior_rate
    from base_clients bc
    left join public.behavior_events be on be.client_id = bc.client_id
    group by bc.client_id
  ),
  trend as (
    select tr.client_id, public.ci_trend_score(coalesce(tr.recent_rate,0), coalesce(tr.prior_rate,0)) as trend_score
    from trend_rates tr
  ),
  intensity as (
    select bc.client_id, avg(be.intensity)::numeric as avg_intensity_14d
    from base_clients bc
    left join public.behavior_events be on be.client_id = bc.client_id and be.occurred_at >= now() - interval '14 days'
    group by bc.client_id
  ),
  goal_velocity as (
    select
      bc.client_id,
      case
        when count(gd.*) filter (where gd.created_at >= now() - interval '14 days') = 0 then 0
        else round((count(*) filter (where gd.created_at >= now() - interval '14 days' and gd.correct = true)::numeric / count(*) filter (where gd.created_at >= now() - interval '14 days')::numeric) * 100.0, 2)
      end as goal_velocity_score
    from base_clients bc
    left join public.goals g on g.client_id = bc.client_id
    left join public.goal_data gd on gd.goal_id = g.goal_id
    group by bc.client_id
  ),
  fidelity as (
    select bc.client_id, round(coalesce(avg(fc.fidelity_score) filter (where fc.created_at >= now() - interval '30 days'), 0), 2) as fidelity_score
    from base_clients bc
    left join public.fidelity_checks fc on fc.client_id = bc.client_id
    group by bc.client_id
  ),
  parent_impl as (
    select bc.client_id, public.ci_parent_impl(avg(pil.consistency_rating) filter (where pil.created_at >= now() - interval '14 days'), 0) as parent_impl_score
    from base_clients bc
    left join public.parent_implementation_logs pil on pil.client_id = bc.client_id
    group by bc.client_id
  ),
  severity as (
    select tr.client_id,
      case when coalesce(tr.recent_rate,0) >= 2.0 then 'high' when coalesce(tr.recent_rate,0) >= 0.75 then 'moderate' else 'low' end as severity_level
    from trend_rates tr
  ),
  final_metrics as (
    select
      bc.agency_id, bc.client_id, p_data_source_id as data_source_id,
      coalesce(t.trend_score, 0) as trend_score,
      coalesce(f.data_freshness, 100) as data_freshness,
      coalesce(gv.goal_velocity_score, 0) as goal_velocity_score,
      coalesce(fi.fidelity_score, 0) as fidelity_score,
      coalesce(pi.parent_impl_score, 0) as parent_impl_score,
      public.ci_risk_score(s.severity_level, coalesce(t.trend_score,0), coalesce(i.avg_intensity_14d,1), coalesce(f.data_freshness,100), coalesce(fi.fidelity_score,100), coalesce(pi.parent_impl_score,100)) as risk_score
    from base_clients bc
    left join freshness f on f.client_id = bc.client_id
    left join trend t on t.client_id = bc.client_id
    left join intensity i on i.client_id = bc.client_id
    left join goal_velocity gv on gv.client_id = bc.client_id
    left join fidelity fi on fi.client_id = bc.client_id
    left join parent_impl pi on pi.client_id = bc.client_id
    left join severity s on s.client_id = bc.client_id
  )
  insert into public.ci_client_metrics (client_id, agency_id, data_source_id, risk_score, trend_score, data_freshness, parent_impl_score, goal_velocity_score, fidelity_score, updated_at)
  select fm.client_id, fm.agency_id, fm.data_source_id, fm.risk_score, fm.trend_score, fm.data_freshness, fm.parent_impl_score, fm.goal_velocity_score, fm.fidelity_score, now()
  from final_metrics fm
  on conflict (client_id) do update set
    agency_id = excluded.agency_id, data_source_id = excluded.data_source_id,
    risk_score = excluded.risk_score, trend_score = excluded.trend_score, data_freshness = excluded.data_freshness,
    parent_impl_score = excluded.parent_impl_score, goal_velocity_score = excluded.goal_velocity_score,
    fidelity_score = excluded.fidelity_score, updated_at = excluded.updated_at;
end;
$function$;

-- Rewrite ci_refresh_alerts with search_path
CREATE OR REPLACE FUNCTION public.ci_refresh_alerts(
  p_agency_id uuid DEFAULT NULL,
  p_data_source_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $function$
begin
  with m as (
    select cm.agency_id, cm.data_source_id, cm.client_id, cm.risk_score, cm.trend_score, cm.data_freshness, cm.fidelity_score, cm.goal_velocity_score, cm.parent_impl_score
    from public.ci_client_metrics cm
    where (p_agency_id is null or cm.agency_id = p_agency_id)
      and (p_data_source_id is null or cm.data_source_id is not distinct from p_data_source_id)
  ),
  desired_alerts as (
    select agency_id, data_source_id, client_id, category, severity, message, explanation_json,
      md5(agency_id::text || '|' || coalesce(data_source_id::text,'native') || '|' || client_id::text || '|' || category) as alert_key
    from (
      select m.agency_id, m.data_source_id, m.client_id, 'risk'::text as category,
        case when m.risk_score >= 75 then 'critical' when m.risk_score >= 50 then 'high' else null end as severity,
        case when m.risk_score >= 75 then 'High risk escalation detected' when m.risk_score >= 50 then 'Elevated risk detected' else null end as message,
        jsonb_build_object('risk_score', m.risk_score, 'trend_score', m.trend_score, 'data_freshness', m.data_freshness, 'fidelity_score', m.fidelity_score, 'goal_velocity_score', m.goal_velocity_score, 'parent_impl_score', m.parent_impl_score) as explanation_json
      from m
      union all
      select m.agency_id, m.data_source_id, m.client_id, 'stale_data', 'high', 'Data appears stale', jsonb_build_object('data_freshness', m.data_freshness) from m where m.data_freshness <= 20
      union all
      select m.agency_id, m.data_source_id, m.client_id, 'worsening_trend', 'high', 'Behavior trend worsening', jsonb_build_object('trend_score', m.trend_score) from m where m.trend_score >= 40
      union all
      select m.agency_id, m.data_source_id, m.client_id, 'low_fidelity', case when m.fidelity_score < 70 then 'high' else 'medium' end, 'Fidelity below target', jsonb_build_object('fidelity_score', m.fidelity_score) from m where m.fidelity_score < 80
      union all
      select m.agency_id, m.data_source_id, m.client_id, 'goal_plateau', 'medium', 'Goal progress plateau risk', jsonb_build_object('goal_velocity_score', m.goal_velocity_score) from m where m.goal_velocity_score < 30
      union all
      select m.agency_id, m.data_source_id, m.client_id, 'parent_training_due', 'medium', 'Parent implementation below target', jsonb_build_object('parent_impl_score', m.parent_impl_score) from m where m.parent_impl_score < 60
    ) x where severity is not null
  )
  insert into public.ci_alerts (alert_key, agency_id, data_source_id, client_id, severity, category, message, explanation_json, created_at, resolved_at, resolved_by)
  select da.alert_key, da.agency_id, da.data_source_id, da.client_id, da.severity, da.category, da.message, da.explanation_json, now(), null, null
  from desired_alerts da
  on conflict (alert_key) where resolved_at is null
  do update set severity = excluded.severity, message = excluded.message, explanation_json = excluded.explanation_json, resolved_at = null, resolved_by = null;

  update public.ci_alerts a
  set resolved_at = now(), resolved_by = null
  where a.resolved_at is null
    and (p_agency_id is null or a.agency_id = p_agency_id)
    and (p_data_source_id is null or a.data_source_id is not distinct from p_data_source_id)
    and not exists (select 1 from desired_alerts da where da.alert_key = a.alert_key);
end;
$function$;
