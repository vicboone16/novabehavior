
-- ============================================================
-- 1. Create v_ci_caseload_feed view
-- ============================================================
drop view if exists public.v_ci_caseload_feed cascade;

create view public.v_ci_caseload_feed
with (security_invoker = on) as
select
  m.client_id,
  m.agency_id,
  coalesce(c.full_name, 'Unknown') as client_name,
  coalesce(m.risk_score, 0) as risk_score,
  coalesce(m.trend_score, 0) as trend_score,
  coalesce(m.data_freshness, 0) as data_freshness,
  coalesce(m.fidelity_score, 0) as fidelity_score,
  coalesce(m.goal_velocity_score, 0) as goal_velocity_score,
  coalesce(m.parent_impl_score, 0) as parent_impl_score,
  m.updated_at as metrics_updated_at,
  coalesce(ac.open_alert_count, 0) as open_alert_count
from public.ci_client_metrics m
join public.clients c
  on c.client_id = m.client_id
  and c.agency_id = m.agency_id
left join lateral (
  select count(*) as open_alert_count
  from public.ci_alerts a
  where a.client_id = m.client_id
    and a.agency_id = m.agency_id
    and a.resolved_at is null
) ac on true;

-- ============================================================
-- 2. Create v_ci_alert_feed view
-- ============================================================
drop view if exists public.v_ci_alert_feed cascade;

create view public.v_ci_alert_feed
with (security_invoker = on) as
select
  a.id as alert_id,
  a.agency_id,
  a.client_id,
  c.full_name as client_name,
  a.category,
  a.severity,
  a.message,
  coalesce(a.explanation_json, '{}'::jsonb) as explanation_json,
  coalesce(a.alert_key, '') as alert_key,
  a.created_at,
  a.resolved_at,
  a.resolved_by
from public.ci_alerts a
left join public.clients c
  on c.client_id = a.client_id
  and c.agency_id = a.agency_id
where a.resolved_at is null
order by a.created_at desc;

-- ============================================================
-- 3. Create v_clinical_authorization_summary view
-- ============================================================
drop view if exists public.v_clinical_authorization_summary cascade;

create view public.v_clinical_authorization_summary
with (security_invoker = on) as
with auth_data as (
  select
    ca.authorization_id,
    ca.agency_id,
    ca.client_id,
    c.full_name as client_name,
    ca.authorization_id as auth_number,
    ca.start_date,
    ca.end_date,
    ca.direct_hours_per_week,
    ca.parent_training_hours_per_week,
    ca.supervision_hours_per_week,
    ca.group_hours_per_week,
    ca.status,
    -- total weekly required
    coalesce(ca.direct_hours_per_week, 0) +
    coalesce(ca.parent_training_hours_per_week, 0) +
    coalesce(ca.supervision_hours_per_week, 0) +
    coalesce(ca.group_hours_per_week, 0) as weekly_total_required,
    -- total weeks in auth
    greatest(1, extract(epoch from (ca.end_date::timestamptz - ca.start_date::timestamptz)) / 604800.0) as total_weeks,
    -- weeks remaining
    greatest(0, extract(epoch from (ca.end_date::timestamptz - now())) / 604800.0) as weeks_remaining,
    -- days remaining
    greatest(0, extract(day from (ca.end_date::timestamptz - now()))) as days_remaining
  from public.clinical_authorizations ca
  join public.clients c
    on c.client_id = ca.client_id
    and c.agency_id = ca.agency_id
  where ca.status = 'active'
    and c.active = true
),
delivered as (
  select
    sl.agency_id,
    sl.client_id,
    sum(sl.hours) as total_delivered_hours
  from public.v_clinical_service_logs_norm sl
  where sl.status = 'completed'
  group by sl.agency_id, sl.client_id
)
select
  ad.authorization_id,
  ad.client_id,
  ad.agency_id,
  ad.client_name,
  ad.auth_number::text,
  array['direct', 'parent_training', 'supervision', 'group']::text[] as service_codes,
  ad.start_date,
  ad.end_date,
  round((ad.weekly_total_required * ad.total_weeks)::numeric, 2) as units_approved,
  coalesce(round(d.total_delivered_hours::numeric, 2), 0) as units_used,
  round(greatest(0, (ad.weekly_total_required * ad.total_weeks) - coalesce(d.total_delivered_hours, 0))::numeric, 2) as units_remaining,
  ad.days_remaining::int,
  case
    when (ad.weekly_total_required * ad.total_weeks) > 0
    then round((coalesce(d.total_delivered_hours, 0) / (ad.weekly_total_required * ad.total_weeks) * 100)::numeric, 1)
    else 0
  end as pct_used,
  case
    when ad.total_weeks > 0
    then round(((ad.total_weeks - ad.weeks_remaining) / ad.total_weeks * 100)::numeric, 1)
    else 100
  end as pct_time_elapsed,
  case
    when ad.days_remaining <= 0 then 'expired'
    when (ad.weekly_total_required * ad.total_weeks) > 0
         and (coalesce(d.total_delivered_hours, 0) / (ad.weekly_total_required * ad.total_weeks)) < 0.5
         and ((ad.total_weeks - ad.weeks_remaining) / ad.total_weeks) > 0.7
    then 'critical'
    when (ad.weekly_total_required * ad.total_weeks) > 0
         and (coalesce(d.total_delivered_hours, 0) / (ad.weekly_total_required * ad.total_weeks)) < 0.7
         and ((ad.total_weeks - ad.weeks_remaining) / ad.total_weeks) > 0.5
    then 'at_risk'
    else 'on_track'
  end as computed_status,
  -- Per-bucket required weekly
  coalesce(ad.direct_hours_per_week, 0) as direct_hours_per_week,
  coalesce(ad.parent_training_hours_per_week, 0) as parent_training_hours_per_week,
  coalesce(ad.supervision_hours_per_week, 0) as supervision_hours_per_week,
  coalesce(ad.group_hours_per_week, 0) as group_hours_per_week
from auth_data ad
left join delivered d
  on d.client_id = ad.client_id
  and d.agency_id = ad.agency_id;

-- ============================================================
-- 4. Recreate v_clinical_hours_forecast with burn rate
-- ============================================================
drop view if exists public.v_clinical_hours_forecast cascade;

create view public.v_clinical_hours_forecast
with (security_invoker = on) as
with active_auth as (
  select * from public.clinical_authorizations where status = 'active'
),
base as (
  select
    a.authorization_id,
    a.agency_id,
    a.client_id,
    c.full_name as client_name,
    a.start_date,
    a.end_date,
    coalesce(a.direct_hours_per_week, 0) as direct_hours_per_week,
    coalesce(a.parent_training_hours_per_week, 0) as parent_training_hours_per_week,
    coalesce(a.supervision_hours_per_week, 0) as supervision_hours_per_week,
    coalesce(a.group_hours_per_week, 0) as group_hours_per_week
  from active_auth a
  join public.clients c on c.client_id = a.client_id and c.agency_id = a.agency_id
  where c.active = true
),
delivered_7d as (
  select
    agency_id, client_id,
    sum(hours) filter (where bucket='direct' and status='completed') as delivered_direct_7d,
    sum(hours) filter (where bucket='parent_training' and status='completed') as delivered_parent_7d,
    sum(hours) filter (where bucket='supervision' and status='completed') as delivered_supervision_7d,
    sum(hours) filter (where bucket='group' and status='completed') as delivered_group_7d,
    sum(hours) filter (where status='completed') as delivered_total_7d
  from public.v_clinical_service_logs_norm
  where occurred_at >= now() - interval '7 days'
  group by agency_id, client_id
),
scheduled_remaining as (
  select
    s.agency_id, s.client_id,
    sum(s.scheduled_hours) filter (where s.status='scheduled' and s.bucket='direct') as scheduled_direct_remaining,
    sum(s.scheduled_hours) filter (where s.status='scheduled' and s.bucket='parent_training') as scheduled_parent_remaining,
    sum(s.scheduled_hours) filter (where s.status='scheduled' and s.bucket='supervision') as scheduled_supervision_remaining,
    sum(s.scheduled_hours) filter (where s.status='scheduled' and s.bucket='group') as scheduled_group_remaining,
    sum(s.scheduled_hours) filter (where s.status='scheduled') as scheduled_total_remaining,
    count(*) filter (where s.status='canceled' and s.start_time >= now() - interval '7 days') as cancels_7d,
    count(*) filter (where s.status='no_show' and s.start_time >= now() - interval '7 days') as no_shows_7d
  from public.v_clinical_schedule_events_norm s
  group by s.agency_id, s.client_id
),
req as (
  select
    b.*,
    greatest(0, extract(epoch from (b.end_date::timestamptz - now())) / 604800.0) as weeks_remaining,
    (b.direct_hours_per_week + b.parent_training_hours_per_week + b.supervision_hours_per_week + b.group_hours_per_week) as weekly_total_required
  from base b
)
select
  r.authorization_id,
  r.agency_id,
  r.client_id,
  r.client_name as full_name,
  r.start_date,
  r.end_date,
  round(r.weeks_remaining::numeric, 2) as weeks_remaining,
  r.weekly_total_required,
  coalesce(d.delivered_total_7d, 0) as delivered_total_7d,
  coalesce(s.scheduled_total_remaining, 0) as scheduled_total_remaining,
  round((r.weekly_total_required * r.weeks_remaining)::numeric, 2) as required_remaining_hours,
  round((coalesce(d.delivered_total_7d,0) + coalesce(s.scheduled_total_remaining,0))::numeric, 2) as projected_coverage_hours,
  case
    when (coalesce(d.delivered_total_7d,0) + coalesce(s.scheduled_total_remaining,0)) >= (r.weekly_total_required * r.weeks_remaining) then 'on_track'
    when (coalesce(d.delivered_total_7d,0) + coalesce(s.scheduled_total_remaining,0)) >= (0.80 * r.weekly_total_required * r.weeks_remaining) then 'at_risk'
    else 'off_track'
  end as forecast_status,
  coalesce(s.cancels_7d, 0) as cancels_7d,
  coalesce(s.no_shows_7d, 0) as no_shows_7d,
  -- Burn rate: delivered last 7d / weekly required * 100
  round(
    case
      when r.weekly_total_required > 0
      then (coalesce(d.delivered_total_7d,0) / r.weekly_total_required) * 100
      else 0
    end
  , 2) as weekly_burn_rate_percent
from req r
left join delivered_7d d on d.client_id = r.client_id and d.agency_id = r.agency_id
left join scheduled_remaining s on s.client_id = r.client_id and s.agency_id = r.agency_id;

-- ============================================================
-- 5. Create v_agency_forecast_summary view
-- ============================================================
drop view if exists public.v_agency_forecast_summary cascade;

create view public.v_agency_forecast_summary
with (security_invoker = on) as
select
  agency_id,
  count(*) as total_authorizations,
  count(*) filter (where forecast_status='off_track') as off_track,
  count(*) filter (where forecast_status='at_risk') as at_risk,
  count(*) filter (where forecast_status='on_track') as on_track,
  round(avg(weekly_burn_rate_percent)::numeric, 2) as avg_burn_rate
from public.v_clinical_hours_forecast
group by agency_id;

-- ============================================================
-- 6. Add unique index on ci_alerts.alert_key for UPSERT support
-- ============================================================
create unique index if not exists ci_alerts_alert_key_unique
  on public.ci_alerts (alert_key)
  where alert_key is not null;

-- ============================================================
-- 7. Create ci_refresh_supervision_alerts function
-- ============================================================
create or replace function public.ci_refresh_supervision_alerts(p_agency_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- WEEKLY alerts
  with latest_week as (
    select distinct on (agency_id, client_id)
      agency_id, client_id, week_start, supervision_status,
      compliance_percent, required_hours, delivered_hours
    from public.v_supervision_weekly_summary
    where (p_agency_id is null or agency_id = p_agency_id)
    order by agency_id, client_id, week_start desc
  ),
  weekly_alerts as (
    select
      lw.agency_id,
      lw.client_id,
      case when lw.supervision_status = 'off_track' then 'critical' else 'high' end as severity,
      case when lw.supervision_status = 'off_track' then 'supervision_off_track_weekly' else 'supervision_at_risk_weekly' end as category,
      case when lw.supervision_status = 'off_track' then 'Weekly supervision is off-track' else 'Weekly supervision is at risk' end as message,
      jsonb_build_object(
        'period', 'week', 'week_start', lw.week_start,
        'required_hours', lw.required_hours, 'delivered_hours', lw.delivered_hours,
        'compliance_percent', lw.compliance_percent
      ) as explanation_json,
      md5(lw.agency_id::text || '|' || lw.client_id::text || '|supervision|weekly') as alert_key
    from latest_week lw
    where lw.supervision_status in ('off_track','at_risk')
  ),
  latest_month as (
    select distinct on (agency_id, client_id)
      agency_id, client_id, month_start, supervision_status,
      compliance_percent, required_hours_monthly, delivered_hours
    from public.v_supervision_monthly_summary
    where (p_agency_id is null or agency_id = p_agency_id)
    order by agency_id, client_id, month_start desc
  ),
  monthly_alerts as (
    select
      lm.agency_id,
      lm.client_id,
      case when lm.supervision_status = 'off_track' then 'critical' else 'high' end as severity,
      case when lm.supervision_status = 'off_track' then 'supervision_off_track_monthly' else 'supervision_at_risk_monthly' end as category,
      case when lm.supervision_status = 'off_track' then 'Monthly supervision is off-track' else 'Monthly supervision is at risk' end as message,
      jsonb_build_object(
        'period', 'month', 'month_start', lm.month_start,
        'required_hours_monthly', lm.required_hours_monthly, 'delivered_hours', lm.delivered_hours,
        'compliance_percent', lm.compliance_percent
      ) as explanation_json,
      md5(lm.agency_id::text || '|' || lm.client_id::text || '|supervision|monthly') as alert_key
    from latest_month lm
    where lm.supervision_status in ('off_track','at_risk')
  ),
  desired as (
    select * from weekly_alerts
    union all
    select * from monthly_alerts
  )
  insert into public.ci_alerts (
    alert_key, agency_id, client_id, severity, category, message, explanation_json, created_at, resolved_at, resolved_by
  )
  select
    d.alert_key, d.agency_id, d.client_id, d.severity, d.category, d.message, d.explanation_json, now(), null, null
  from desired d
  on conflict (alert_key) where alert_key is not null do update
  set
    severity = excluded.severity,
    category = excluded.category,
    message = excluded.message,
    explanation_json = excluded.explanation_json,
    resolved_at = null,
    resolved_by = null;

  -- Auto-resolve when compliance returns to on-track
  update public.ci_alerts a
  set resolved_at = now(), resolved_by = null
  where a.resolved_at is null
    and (p_agency_id is null or a.agency_id = p_agency_id)
    and a.category in (
      'supervision_off_track_weekly','supervision_at_risk_weekly',
      'supervision_off_track_monthly','supervision_at_risk_monthly'
    )
    and not exists (
      select 1 from (
        select md5(lw2.agency_id::text || '|' || lw2.client_id::text || '|supervision|weekly') as ak
        from (
          select distinct on (agency_id, client_id) agency_id, client_id, supervision_status
          from public.v_supervision_weekly_summary
          where (p_agency_id is null or agency_id = p_agency_id)
          order by agency_id, client_id, week_start desc
        ) lw2
        where lw2.supervision_status in ('off_track','at_risk')
        union all
        select md5(lm2.agency_id::text || '|' || lm2.client_id::text || '|supervision|monthly') as ak
        from (
          select distinct on (agency_id, client_id) agency_id, client_id, supervision_status
          from public.v_supervision_monthly_summary
          where (p_agency_id is null or agency_id = p_agency_id)
          order by agency_id, client_id, month_start desc
        ) lm2
        where lm2.supervision_status in ('off_track','at_risk')
      ) keys where keys.ak = a.alert_key
    );
end;
$$;

-- ============================================================
-- 8. Create forecast auto-alert function
-- ============================================================
create or replace function public.ci_refresh_forecast_alerts(p_agency_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  with forecast_issues as (
    select
      f.agency_id,
      f.client_id,
      f.forecast_status,
      f.cancels_7d,
      f.no_shows_7d,
      f.weekly_burn_rate_percent,
      case
        when f.forecast_status = 'off_track' then 'critical'
        when f.forecast_status = 'at_risk' then 'high'
        when f.cancels_7d > 3 then 'high'
        when f.no_shows_7d > 2 then 'high'
        else null
      end as severity,
      case
        when f.forecast_status = 'off_track' then 'forecast_off_track'
        when f.forecast_status = 'at_risk' then 'forecast_at_risk'
        when f.cancels_7d > 3 then 'high_cancellations'
        when f.no_shows_7d > 2 then 'high_no_shows'
        else null
      end as category,
      md5(f.agency_id::text || '|' || f.client_id::text || '|forecast|' ||
        case
          when f.forecast_status in ('off_track','at_risk') then f.forecast_status
          when f.cancels_7d > 3 then 'cancels'
          when f.no_shows_7d > 2 then 'no_shows'
          else 'unknown'
        end
      ) as alert_key
    from public.v_clinical_hours_forecast f
    where (p_agency_id is null or f.agency_id = p_agency_id)
      and (f.forecast_status in ('off_track','at_risk') or f.cancels_7d > 3 or f.no_shows_7d > 2)
  )
  insert into public.ci_alerts (
    alert_key, agency_id, client_id, severity, category, message, explanation_json, created_at
  )
  select
    fi.alert_key,
    fi.agency_id,
    fi.client_id,
    fi.severity,
    fi.category,
    case fi.category
      when 'forecast_off_track' then 'Hours forecast is off-track for authorization period'
      when 'forecast_at_risk' then 'Hours forecast is at risk for authorization period'
      when 'high_cancellations' then fi.cancels_7d || ' cancellations in 7 days'
      when 'high_no_shows' then fi.no_shows_7d || ' no-shows in 7 days'
      else 'Forecast issue detected'
    end,
    jsonb_build_object(
      'forecast_status', fi.forecast_status,
      'cancels_7d', fi.cancels_7d,
      'no_shows_7d', fi.no_shows_7d,
      'burn_rate', fi.weekly_burn_rate_percent
    ),
    now()
  from forecast_issues fi
  on conflict (alert_key) where alert_key is not null do update
  set
    severity = excluded.severity,
    message = excluded.message,
    explanation_json = excluded.explanation_json,
    resolved_at = null,
    resolved_by = null;
end;
$$;
