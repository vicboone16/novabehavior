-- Behavior session metrics view (fixed: student_id, no client_id)
create or replace view public.v_behavior_session_metrics_v3 as
select
  bsd.student_id,
  bsd.behavior_id,
  s.id as session_id,
  s.started_at as session_time,
  s.started_at::date as session_day,
  bsd.data_state,
  case
    when bsd.data_state = 'no_data' then null
    when bsd.data_state = 'observed_zero' then 0
    else bsd.frequency
  end as frequency_plot,
  case
    when bsd.data_state = 'no_data' then null
    when bsd.observation_minutes is null or bsd.observation_minutes = 0 then null
    when bsd.data_state = 'observed_zero' then 0
    else round(coalesce(bsd.frequency,0)::numeric / bsd.observation_minutes::numeric, 4)
  end as rate_per_minute,
  case
    when bsd.data_state = 'no_data' then null
    when bsd.data_state = 'observed_zero' then 0
    else bsd.duration_seconds
  end as duration_seconds_plot,
  case
    when bsd.data_state = 'no_data' then null
    when bsd.data_state = 'observed_zero' then null
    else bsd.latency_seconds
  end as latency_seconds_plot,
  bsd.observation_minutes,
  sum(
    case
      when bsd.data_state in ('no_data','observed_zero') then 0
      else coalesce(bsd.frequency,0)
    end
  ) over (
    partition by bsd.student_id, bsd.behavior_id
    order by s.started_at
    rows between unbounded preceding and current row
  ) as cumulative_frequency
from public.behavior_session_data bsd
join public.sessions s on s.id = bsd.session_id;

-- Behavior daily metrics view
create or replace view public.v_behavior_daily_metrics_v3 as
select
  student_id,
  behavior_id,
  session_day,
  sum(coalesce(frequency_plot, 0)) as frequency_total_for_day,
  case
    when sum(coalesce(observation_minutes,0)) = 0 then null
    else round(sum(coalesce(frequency_plot,0))::numeric / sum(observation_minutes)::numeric, 4)
  end as rate_per_minute_day,
  sum(coalesce(duration_seconds_plot,0)) as duration_seconds_total_for_day
from public.v_behavior_session_metrics_v3
group by student_id, behavior_id, session_day;

-- Graph presets table
create table if not exists public.graph_presets (
  id uuid primary key default gen_random_uuid(),
  graph_key text unique not null,
  title text not null,
  source_view text not null,
  x_field text not null,
  y_field text not null,
  y_null_behavior text default 'gap',
  created_at timestamptz default now()
);

insert into public.graph_presets (graph_key, title, source_view, x_field, y_field, y_null_behavior)
values
  ('skill_pct_correct','% Correct','v_skill_target_session_metrics_v3','session_time','pct_correct','gap'),
  ('skill_pct_independent','% Independent','v_skill_target_session_metrics_v3','session_time','pct_independent','gap'),
  ('behavior_frequency','Frequency','v_behavior_session_metrics_v3','session_time','frequency_plot','gap'),
  ('behavior_rate','Rate/min','v_behavior_session_metrics_v3','session_time','rate_per_minute','gap'),
  ('behavior_duration','Duration (sec)','v_behavior_session_metrics_v3','session_time','duration_seconds_plot','gap'),
  ('behavior_cumulative','Cumulative Frequency','v_behavior_session_metrics_v3','session_time','cumulative_frequency','gap')
on conflict (graph_key) do nothing;

-- NovaTrack table map
create table if not exists public.novatrack_table_map (
  key text primary key,
  table_name text,
  detected_at timestamptz default now()
);

-- Insert known mappings directly (no need for dynamic discovery since we know the schema)
insert into public.novatrack_table_map(key, table_name)
values
  ('sessions', 'public.sessions'),
  ('skill_trials', 'public.skill_trials'),
  ('behavior_session_data', 'public.behavior_session_data')
on conflict (key) do update
  set table_name = excluded.table_name,
      detected_at = now();