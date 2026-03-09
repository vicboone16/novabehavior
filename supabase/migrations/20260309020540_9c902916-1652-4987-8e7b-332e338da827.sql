
-- Drop in dependency order (outermost first)
drop view if exists public.v_student_connect_intel_alerts;
drop view if exists public.v_student_intelligence_summary;
drop view if exists public.v_clinical_intelligence_alert_rollup;
drop view if exists public.v_clinical_intelligence_alerts;
drop view if exists public.v_replacement_behavior_context_summary;
drop view if exists public.v_behavior_event_intelligence_summary;
drop view if exists public.v_behavior_event_source_enriched;

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

create view public.v_clinical_intelligence_alerts as
select
    st.student_id,
    st.student_id as client_id,
    'skill' as domain,
    'stalled_target' as alert_type,
    'high' as severity,
    'Stalled Target' as title,
    concat('Target appears stalled and may need BCBA review. Mastery status: ', coalesce(st.mastery_status,'unknown')) as summary,
    'student_target' as source_object_type,
    st.student_target_id as source_object_id,
    'Review teaching procedure, prompting, task difficulty, and reinforcement strategy.' as recommended_action,
    true as is_active,
    false as is_student_connect_visible,
    now() as detected_at
from public.v_student_target_mastery_engine_summary st
where lower(coalesce(st.mastery_status,'')) = 'in_progress'
  and coalesce(st.consecutive_sessions_at_criterion, 0) = 0
  and coalesce(st.percent_to_mastery, 0) < 50

union all

select
    st.student_id,
    st.student_id as client_id,
    'skill' as domain,
    'prompt_dependency' as alert_type,
    'high' as severity,
    'Prompt Dependency' as title,
    'Target shows high performance under prompts but low independent responding.' as summary,
    'student_target' as source_object_type,
    st.student_target_id as source_object_id,
    'Review prompt fading strategy and independence criteria.' as recommended_action,
    true as is_active,
    false as is_student_connect_visible,
    now() as detected_at
from public.v_student_target_mastery_engine_summary st
where coalesce(st.current_accuracy, 0) >= 80
  and coalesce(st.current_prompt_independence, 100) < 50

union all

select
    st.student_id,
    st.student_id as client_id,
    'skill' as domain,
    'ready_to_advance' as alert_type,
    'medium' as severity,
    'Ready to Advance' as title,
    'Target appears at or above mastery criteria and may be ready for progression or generalization.' as summary,
    'student_target' as source_object_type,
    st.student_target_id as source_object_id,
    'Review whether target should progress, generalize, or move to maintenance.' as recommended_action,
    true as is_active,
    true as is_student_connect_visible,
    now() as detected_at
from public.v_student_target_mastery_engine_summary st
where lower(coalesce(st.mastery_status,'')) = 'mastered'

union all

select
    st.student_id,
    st.student_id as client_id,
    'programming' as domain,
    'review_recommended' as alert_type,
    'medium' as severity,
    'Review Recommended' as title,
    'Target or program may benefit from BCBA review based on current performance patterns.' as summary,
    'student_target' as source_object_type,
    st.student_target_id as source_object_id,
    'Review target design, progression path, prompting, and reinforcement strategy.' as recommended_action,
    true as is_active,
    false as is_student_connect_visible,
    now() as detected_at
from public.v_student_target_mastery_engine_summary st
where lower(coalesce(st.mastery_status,'')) = 'in_progress'
  and (
    coalesce(st.percent_to_mastery, 0) between 40 and 70
    or coalesce(st.consecutive_sessions_at_criterion, 0) = 1
  )

union all

select
    st.student_id,
    st.student_id as client_id,
    'programming' as domain,
    'programming_review_needed' as alert_type,
    'high' as severity,
    'Programming Review Needed' as title,
    'Current target or program pattern suggests programming review may be needed.' as summary,
    'student_target' as source_object_type,
    st.student_target_id as source_object_id,
    'Review mastery rules, prompting, generalization requirements, and target scope.' as recommended_action,
    true as is_active,
    false as is_student_connect_visible,
    now() as detected_at
from public.v_student_target_mastery_engine_summary st
where lower(coalesce(st.mastery_status,'')) = 'in_progress'
  and coalesce(st.percent_to_mastery, 0) < 40

union all

select
    r.student_id,
    r.student_id as client_id,
    'behavior' as domain,
    'weak_replacement_behavior' as alert_type,
    'high' as severity,
    'Weak Replacement Behavior' as title,
    concat('Replacement behavior for ', coalesce(r.problem_behavior_name,'target behavior'), ' is not yet competing effectively.') as summary,
    'student_behavior_plan' as source_object_type,
    null::uuid as source_object_id,
    'Review replacement skill teaching, reinforcement strength, and implementation fidelity.' as recommended_action,
    true as is_active,
    false as is_student_connect_visible,
    now() as detected_at
from public.v_replacement_behavior_strength_summary r
where coalesce(r.replacement_to_problem_ratio, 0) < 0.5

union all

select
    r.student_id,
    r.student_id as client_id,
    'behavior' as domain,
    'emerging_replacement_behavior' as alert_type,
    'medium' as severity,
    'Emerging Replacement Behavior' as title,
    concat('Replacement behavior for ', coalesce(r.problem_behavior_name,'target behavior'), ' is emerging but not yet dominant.') as summary,
    'student_behavior_plan' as source_object_type,
    null::uuid as source_object_id,
    'Continue strengthening replacement behavior and monitor ratio over time.' as recommended_action,
    true as is_active,
    true as is_student_connect_visible,
    now() as detected_at
from public.v_replacement_behavior_strength_summary r
where coalesce(r.replacement_to_problem_ratio, 0) >= 0.5
  and coalesce(r.replacement_to_problem_ratio, 0) < 1.0

union all

select
    r.student_id,
    r.student_id as client_id,
    'behavior' as domain,
    'strong_replacement_behavior' as alert_type,
    'low' as severity,
    'Strong Replacement Behavior' as title,
    concat('Replacement behavior for ', coalesce(r.problem_behavior_name,'target behavior'), ' is strong and competing effectively.') as summary,
    'student_behavior_plan' as source_object_type,
    null::uuid as source_object_id,
    'Continue maintenance and monitor for generalization.' as recommended_action,
    true as is_active,
    true as is_student_connect_visible,
    now() as detected_at
from public.v_replacement_behavior_strength_summary r
where coalesce(r.replacement_to_problem_ratio, 0) >= 1.0

union all

select
    b.student_id,
    b.student_id as client_id,
    'behavior' as domain,
    'transition_triggered_escalation' as alert_type,
    'high' as severity,
    'Transition-Triggered Escalation' as title,
    'Behavior events appear strongly associated with transitions.' as summary,
    'behavior_pattern' as source_object_type,
    null::uuid as source_object_id,
    'Review transition supports, priming, warnings, and replacement strategies for transitions.' as recommended_action,
    true as is_active,
    false as is_student_connect_visible,
    now() as detected_at
from public.v_behavior_event_intelligence_summary b
where coalesce(b.transition_risk_flag, false) = true

union all

select
    b.student_id,
    b.student_id as client_id,
    'behavior' as domain,
    'unstructured_time_risk' as alert_type,
    'medium' as severity,
    'Unstructured Time Risk' as title,
    'Behavior events appear associated with unstructured or loosely structured time.' as summary,
    'behavior_pattern' as source_object_type,
    null::uuid as source_object_id,
    'Review structure, active supervision, visual supports, and engagement during unstructured times.' as recommended_action,
    true as is_active,
    false as is_student_connect_visible,
    now() as detected_at
from public.v_behavior_event_intelligence_summary b
where coalesce(b.unstructured_time_risk_flag, false) = true

union all

select
    b.student_id,
    b.student_id as client_id,
    'behavior' as domain,
    'lunch_recess_escalation' as alert_type,
    'medium' as severity,
    'Lunch/Recess Escalation' as title,
    'Behavior events appear elevated around lunch or recess windows.' as summary,
    'behavior_pattern' as source_object_type,
    null::uuid as source_object_id,
    'Review pre-correction, supervision, transition supports, and replacement planning around lunch/recess.' as recommended_action,
    true as is_active,
    false as is_student_connect_visible,
    now() as detected_at
from public.v_behavior_event_intelligence_summary b
where coalesce(b.lunch_time_risk_flag, false) = true

union all

select
    b.student_id,
    b.student_id as client_id,
    'behavior' as domain,
    'escape_pattern_signal' as alert_type,
    'medium' as severity,
    'Escape Pattern Signal' as title,
    'Behavior pattern suggests possible escape-maintained responding.' as summary,
    'behavior_pattern' as source_object_type,
    null::uuid as source_object_id,
    'Review task difficulty, demand presentation, break access, and functional communication supports.' as recommended_action,
    true as is_active,
    false as is_student_connect_visible,
    now() as detected_at
from public.v_behavior_event_intelligence_summary b
where coalesce(b.escape_pattern_flag, false) = true

union all

select
    b.student_id,
    b.student_id as client_id,
    'behavior' as domain,
    'attention_pattern_signal' as alert_type,
    'medium' as severity,
    'Attention Pattern Signal' as title,
    'Behavior pattern suggests possible attention-maintained responding.' as summary,
    'behavior_pattern' as source_object_type,
    null::uuid as source_object_id,
    'Review attention delivery patterns, planned ignoring appropriateness, and reinforcement of alternative behaviors.' as recommended_action,
    true as is_active,
    false as is_student_connect_visible,
    now() as detected_at
from public.v_behavior_event_intelligence_summary b
where coalesce(b.attention_pattern_flag, false) = true

union all

select
    g.client_id as student_id,
    g.client_id,
    'caregiver' as domain,
    'caregiver_goal_off_track' as alert_type,
    'medium' as severity,
    'Caregiver Goal Off Track' as title,
    concat('Caregiver goal "', coalesce(g.goal_title,'Goal'), '" may need review.') as summary,
    'caregiver_goal' as source_object_type,
    g.goal_assignment_id as source_object_id,
    'Review caregiver progress, support level, and training plan.' as recommended_action,
    true as is_active,
    false as is_student_connect_visible,
    now() as detected_at
from public.v_parent_training_goal_engine_summary g
where lower(coalesce(g.mastery_status,'')) in ('not_started','in_progress')
  and (
    g.last_data_date is null
    or coalesce(g.percent_to_goal, 0) < 40
  );

create view public.v_clinical_intelligence_alert_rollup as
select
    domain,
    alert_type,
    severity,
    count(*) as alert_count
from public.v_clinical_intelligence_alerts
where coalesce(is_active, true) = true
group by domain, alert_type, severity
order by severity desc, domain, alert_type;

create view public.v_student_intelligence_summary as
select
    a.student_id,
    count(*) filter (where a.domain = 'skill') as skill_alert_count,
    count(*) filter (where a.domain = 'behavior') as behavior_alert_count,
    count(*) filter (where a.domain = 'programming') as programming_alert_count,
    count(*) filter (where a.domain = 'caregiver') as caregiver_alert_count,
    count(*) filter (where a.alert_type = 'stalled_target') as stalled_target_count,
    count(*) filter (where a.alert_type = 'prompt_dependency') as prompt_dependency_count,
    count(*) filter (where a.alert_type = 'ready_to_advance') as ready_to_advance_count,
    count(*) filter (where a.alert_type = 'weak_replacement_behavior') as weak_replacement_behavior_count,
    count(*) filter (where a.alert_type = 'emerging_replacement_behavior') as emerging_replacement_behavior_count,
    count(*) filter (where a.alert_type = 'strong_replacement_behavior') as strong_replacement_behavior_count,
    count(*) filter (where a.alert_type = 'transition_triggered_escalation') as transition_triggered_escalation_count,
    count(*) filter (where a.alert_type = 'unstructured_time_risk') as unstructured_time_risk_count,
    count(*) filter (where a.alert_type = 'lunch_recess_escalation') as lunch_recess_escalation_count,
    count(*) filter (where a.alert_type = 'escape_pattern_signal') as escape_pattern_signal_count,
    count(*) filter (where a.alert_type = 'attention_pattern_signal') as attention_pattern_signal_count
from public.v_clinical_intelligence_alerts a
group by a.student_id;

create view public.v_student_connect_intel_alerts as
select
    student_id,
    client_id,
    domain,
    alert_type,
    severity,
    title,
    summary,
    recommended_action,
    detected_at
from public.v_clinical_intelligence_alerts
where coalesce(is_student_connect_visible, false) = true
  and coalesce(is_active, true) = true;

select pg_notify('pgrst','reload schema');
