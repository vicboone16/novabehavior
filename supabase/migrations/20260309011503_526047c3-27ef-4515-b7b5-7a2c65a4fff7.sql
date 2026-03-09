-- Drop existing views that have column name changes
drop view if exists behavior_intelligence.v_parent_timeline;
drop view if exists behavior_intelligence.v_staff_timeline;
drop view if exists behavior_intelligence.v_supervisor_timeline;

-- Recreate insert_event (drop old signatures first)
drop function if exists behavior_intelligence.insert_event(uuid, text, text, timestamptz, uuid, uuid, uuid, numeric, int, text, text, text, jsonb, text, text, uuid, uuid);

create or replace function behavior_intelligence.insert_event(
  p_client_id uuid,
  p_event_type text,
  p_event_name text,
  p_occurred_at timestamptz default now(),
  p_agency_id uuid default null,
  p_classroom_id uuid default null,
  p_school_id uuid default null,
  p_value numeric default null,
  p_intensity int default null,
  p_phase text default null,
  p_prompt_code text default null,
  p_correctness text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_source_app text default null,
  p_source_table text default null,
  p_source_id uuid default null,
  p_recorded_by uuid default null
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  if p_source_table is not null and p_source_id is not null then
    select id into v_id
    from behavior_intelligence.behavior_events
    where source_table = p_source_table and source_id = p_source_id
    limit 1;
    if v_id is not null then return v_id; end if;
  end if;

  insert into behavior_intelligence.behavior_events(
    agency_id, client_id, classroom_id, school_id,
    source_app, source_table, source_id,
    event_type, event_name, value, intensity, phase, prompt_code, correctness,
    metadata, occurred_at, recorded_by
  ) values(
    p_agency_id, p_client_id, p_classroom_id, p_school_id,
    p_source_app, p_source_table, p_source_id,
    p_event_type, p_event_name, p_value, p_intensity, p_phase, p_prompt_code, p_correctness,
    coalesce(p_metadata,'{}'::jsonb), p_occurred_at, p_recorded_by
  ) returning id into v_id;
  return v_id;
end $$;

grant execute on function behavior_intelligence.insert_event(
  uuid, text, text, timestamptz, uuid, uuid, uuid, numeric, integer, text, text, text, jsonb, text, text, uuid, uuid
) to authenticated;

-- Storyboard views
create or replace view behavior_intelligence.v_storyboard_events as
select
  client_id, occurred_at, event_type, event_name, value, intensity, phase, prompt_code, correctness, metadata,
  case
    when event_type='behavior' then 'red'
    when event_type='reinforcement' then 'green'
    when event_type='skill_trial' then 'blue'
    when event_type in ('incident','incident_step') then 'orange'
    else 'gray'
  end as color
from behavior_intelligence.behavior_events;

create or replace view behavior_intelligence.v_event_sequences as
select
  client_id, occurred_at, event_type, event_name,
  lag(event_type,1) over (partition by client_id order by occurred_at) as prev_type,
  lag(event_name,1) over (partition by client_id order by occurred_at) as prev_name,
  lead(event_type,1) over (partition by client_id order by occurred_at) as next_type,
  lead(event_name,1) over (partition by client_id order by occurred_at) as next_name
from behavior_intelligence.behavior_events;

drop function if exists behavior_intelligence.get_storyboard_json(uuid, timestamptz, timestamptz);

create or replace function behavior_intelligence.get_storyboard_json(
  p_client_id uuid, p_start timestamptz, p_end timestamptz
) returns jsonb language sql as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'occurred_at', occurred_at, 'event_type', event_type, 'event_name', event_name,
      'value', value, 'intensity', intensity, 'phase', phase,
      'prompt_code', prompt_code, 'correctness', correctness, 'color', color, 'metadata', metadata
    ) order by occurred_at asc
  ), '[]'::jsonb)
  from behavior_intelligence.v_storyboard_events
  where client_id = p_client_id and occurred_at >= p_start and occurred_at <= p_end;
$$;

grant execute on function behavior_intelligence.get_storyboard_json(uuid, timestamptz, timestamptz) to authenticated;

-- Timeline views (recreated with new column names)
create view behavior_intelligence.v_parent_timeline as
select
  client_id, occurred_at,
  case
    when event_type in ('incident','incident_step') then 'support_event'
    when event_type = 'behavior' then 'behavior_event'
    when event_type = 'skill_trial' then 'learning_event'
    else event_type
  end as category,
  case
    when event_type = 'behavior' and event_name in ('aggression','property_destruction') then 'big feelings / dysregulation'
    when event_type = 'behavior' then event_name
    else event_name
  end as label,
  value,
  (metadata - 'staff_notes' - 'injury_details' - 'peer_names') as metadata
from behavior_intelligence.behavior_events;

create view behavior_intelligence.v_staff_timeline as
select
  client_id, occurred_at, event_type, event_name,
  value, phase, prompt_code, correctness, intensity, metadata
from behavior_intelligence.behavior_events;

create view behavior_intelligence.v_supervisor_timeline as
select
  e.*,
  (e.metadata->>'plan_id') as plan_id,
  (e.metadata->>'intervention_id') as intervention_id
from behavior_intelligence.behavior_events e;

-- Digital twin tables
create table if not exists behavior_intelligence.digital_twin_models (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid,
  client_id uuid not null,
  model_version text not null default 'v1',
  features jsonb not null default '{}'::jsonb,
  trained_at timestamptz default now()
);

create table if not exists behavior_intelligence.digital_twin_predictions (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid,
  client_id uuid not null,
  predicted_at timestamptz default now(),
  horizon_minutes int not null default 60,
  predicted_risks jsonb not null,
  recommended_preventions jsonb default '[]'::jsonb,
  confidence numeric(4,2) default 0.70,
  source jsonb not null default '{}'::jsonb
);

create table if not exists behavior_intelligence.digital_twin_scenarios (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid,
  client_id uuid not null,
  created_at timestamptz default now(),
  scenario_name text not null,
  knobs jsonb not null,
  predicted_delta jsonb not null,
  notes text
);

create index if not exists idx_twin_pred_client_time
  on behavior_intelligence.digital_twin_predictions(client_id, predicted_at desc);

create or replace view behavior_intelligence.v_latest_twin_prediction as
select distinct on (client_id)
  client_id, agency_id, predicted_at, horizon_minutes,
  predicted_risks, recommended_preventions, confidence, source
from behavior_intelligence.digital_twin_predictions
order by client_id, predicted_at desc;