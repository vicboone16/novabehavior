
drop view if exists public.v_replacement_behavior_context_summary;
drop view if exists public.v_behavior_event_intelligence_summary;
drop view if exists public.v_behavior_event_source_enriched;
drop view if exists public.v_behavior_event_source_normalized;

create view public.v_behavior_event_source_normalized as
select
    s.student_id,
    s.created_at as event_time,
    cast(s.created_at as date) as event_date,
    coalesce(s.behavior_name, 'behavior_event') as behavior_name,
    null::text as antecedent,
    null::text as consequence,
    null::text as setting_name,
    null::text as activity_name,
    null::text as routine_name,
    null::text as staff_name,
    null::text as intervention_phase,
    null::text as replacement_behavior_name,
    'session_data' as source_table,
    null::text as notes
from public.session_data s
union all
select
    a.client_id as student_id,
    a.created_at as event_time,
    cast(a.logged_at as date) as event_date,
    coalesce(a.behavior, 'behavior_event') as behavior_name,
    a.antecedent,
    a.consequence,
    null::text as setting_name,
    null::text as activity_name,
    null::text as routine_name,
    null::text as staff_name,
    null::text as intervention_phase,
    null::text as replacement_behavior_name,
    'abc_logs' as source_table,
    a.notes
from public.abc_logs a
union all
select
    t.client_id as student_id,
    coalesce(t.occurred_at, t.created_at) as event_time,
    cast(coalesce(t.occurred_at, t.created_at) as date) as event_date,
    coalesce(t.value_text, 'behavior_event') as behavior_name,
    null::text as antecedent,
    null::text as consequence,
    null::text as setting_name,
    null::text as activity_name,
    null::text as routine_name,
    null::text as staff_name,
    null::text as intervention_phase,
    null::text as replacement_behavior_name,
    'teacher_data_points' as source_table,
    t.notes
from public.teacher_data_points t
union all
select
    l.student_id,
    l.created_at as event_time,
    l.log_date as event_date,
    case when l.status = 'observed_none' then 'observed_no_toi' else 'no_observation' end as behavior_name,
    null::text as antecedent,
    null::text as consequence,
    null::text as setting_name,
    null::text as activity_name,
    null::text as routine_name,
    null::text as staff_name,
    null::text as intervention_phase,
    null::text as replacement_behavior_name,
    'toi_daily_logs' as source_table,
    l.notes
from public.toi_daily_logs l
union all
select
    c.student_id,
    c.created_at as event_time,
    cast(c.created_at as date) as event_date,
    coalesce(c.display_label, c.event_type::text, c.event_group::text, 'context_barrier_event') as behavior_name,
    null::text as antecedent,
    null::text as consequence,
    null::text as setting_name,
    null::text as activity_name,
    null::text as routine_name,
    null::text as staff_name,
    null::text as intervention_phase,
    null::text as replacement_behavior_name,
    'context_barriers_events' as source_table,
    c.notes
from public.context_barriers_events c;

create view public.v_behavior_event_source_enriched as
select
    e.*,
    case
        when extract(hour from e.event_time) between 6 and 9 then 'arrival_morning'
        when extract(hour from e.event_time) between 10 and 11 then 'mid_morning'
        when extract(hour from e.event_time) between 12 and 13 then 'lunch_window'
        when extract(hour from e.event_time) between 14 and 15 then 'afternoon'
        else 'other'
    end as time_of_day_bucket,
    case
        when coalesce(e.antecedent,'') ilike '%transition%' then true
        when coalesce(e.activity_name,'') ilike '%transition%' then true
        when coalesce(e.routine_name,'') ilike '%transition%' then true
        else false
    end as transition_risk_flag,
    case
        when coalesce(e.antecedent,'') ilike '%unstructured%' then true
        when coalesce(e.activity_name,'') ilike '%unstructured%' then true
        when coalesce(e.routine_name,'') ilike '%recess%' then true
        when coalesce(e.routine_name,'') ilike '%free%' then true
        else false
    end as unstructured_time_risk_flag,
    case
        when coalesce(e.antecedent,'') ilike '%lunch%' then true
        when coalesce(e.routine_name,'') ilike '%lunch%' then true
        when coalesce(e.activity_name,'') ilike '%lunch%' then true
        else false
    end as lunch_time_risk_flag,
    case
        when coalesce(e.consequence,'') ilike '%escape%' then true
        when coalesce(e.antecedent,'') ilike '%demand%' then true
        when coalesce(e.antecedent,'') ilike '%task%' then true
        else false
    end as escape_pattern_flag,
    case
        when coalesce(e.consequence,'') ilike '%attention%' then true
        when coalesce(e.consequence,'') ilike '%redirect%' then true
        when coalesce(e.consequence,'') ilike '%talk%' then true
        else false
    end as attention_pattern_flag
from public.v_behavior_event_source_normalized e;

create view public.v_behavior_event_intelligence_summary as
with base as (
    select * from public.v_behavior_event_source_enriched
),
top_time as (
    select distinct on (student_id)
        student_id,
        time_of_day_bucket as top_time_of_day,
        count(*) over (partition by student_id, time_of_day_bucket) as bucket_count
    from base
    order by student_id, count(*) over (partition by student_id, time_of_day_bucket) desc, time_of_day_bucket
),
top_antecedent as (
    select distinct on (student_id)
        student_id,
        antecedent as top_antecedent_pattern
    from base
    where antecedent is not null and trim(antecedent) <> ''
    order by student_id, count(*) over (partition by student_id, antecedent) desc, antecedent
),
top_consequence as (
    select distinct on (student_id)
        student_id,
        consequence as top_consequence_pattern
    from base
    where consequence is not null and trim(consequence) <> ''
    order by student_id, count(*) over (partition by student_id, consequence) desc, consequence
),
top_behavior as (
    select distinct on (student_id)
        student_id,
        behavior_name as top_behavior_name
    from base
    order by student_id, count(*) over (partition by student_id, behavior_name) desc, behavior_name
)
select
    b.student_id,
    tb.top_behavior_name as behavior_name,
    tt.top_time_of_day,
    ta.top_antecedent_pattern,
    tc.top_consequence_pattern,
    max(case when b.transition_risk_flag then 1 else 0 end)::boolean as transition_risk_flag,
    max(case when b.unstructured_time_risk_flag then 1 else 0 end)::boolean as unstructured_time_risk_flag,
    max(case when b.lunch_time_risk_flag then 1 else 0 end)::boolean as lunch_time_risk_flag,
    max(case when b.escape_pattern_flag then 1 else 0 end)::boolean as escape_pattern_flag,
    max(case when b.attention_pattern_flag then 1 else 0 end)::boolean as attention_pattern_flag,
    count(*) as total_behavior_events,
    min(b.event_date) as first_event_date,
    max(b.event_date) as last_event_date
from base b
left join top_time tt on tt.student_id = b.student_id
left join top_antecedent ta on ta.student_id = b.student_id
left join top_consequence tc on tc.student_id = b.student_id
left join top_behavior tb on tb.student_id = b.student_id
group by
    b.student_id,
    tb.top_behavior_name,
    tt.top_time_of_day,
    ta.top_antecedent_pattern,
    tc.top_consequence_pattern;

create view public.v_replacement_behavior_context_summary as
select
    e.student_id,
    e.time_of_day_bucket,
    e.transition_risk_flag,
    e.unstructured_time_risk_flag,
    e.lunch_time_risk_flag,
    count(*) filter (where coalesce(e.replacement_behavior_name,'') <> '') as replacement_behavior_events,
    count(*) as total_events
from public.v_behavior_event_source_enriched e
group by
    e.student_id,
    e.time_of_day_bucket,
    e.transition_risk_flag,
    e.unstructured_time_risk_flag,
    e.lunch_time_risk_flag;
