-- Drop dependent views first
drop view if exists public.v_goal_optimization_context cascade;
drop view if exists public.v_nova_ai_case_context_summary cascade;
drop view if exists public.v_nova_ai_clinical_context_summary cascade;
drop view if exists public.v_student_intelligence_summary cascade;

-- Recreate v_student_intelligence_summary with new columns
create view public.v_student_intelligence_summary as
select
    s.student_id,
    coalesce(a.skill_alert_count, 0)::bigint as skill_alert_count,
    coalesce(a.behavior_alert_count, 0)::bigint as behavior_alert_count,
    coalesce(a.programming_alert_count, 0)::bigint as programming_alert_count,
    coalesce(a.caregiver_alert_count, 0)::bigint as caregiver_alert_count,
    coalesce(sk.stalled_target_count, 0)::bigint as stalled_target_count,
    coalesce(sk.prompt_dependency_count, 0)::bigint as prompt_dependency_count,
    coalesce(sk.ready_to_advance_count, 0)::bigint as ready_to_advance_count,
    coalesce(rb.weak_replacement_behavior_count, 0)::bigint as weak_replacement_behavior_count,
    coalesce(rb.emerging_replacement_behavior_count, 0)::bigint as emerging_replacement_behavior_count,
    coalesce(rb.strong_replacement_behavior_count, 0)::bigint as strong_replacement_behavior_count
from (
    select student_id from public.v_clinical_intelligence_alerts
    union
    select student_id from public.v_skill_optimization_candidates
    union
    select student_id from public.v_replacement_behavior_strength_summary
) s
left join (
    select student_id,
        count(*) filter (where domain = 'skill') as skill_alert_count,
        count(*) filter (where domain = 'behavior') as behavior_alert_count,
        count(*) filter (where domain = 'programming') as programming_alert_count,
        count(*) filter (where domain = 'caregiver') as caregiver_alert_count
    from public.v_clinical_intelligence_alerts group by student_id
) a on a.student_id = s.student_id
left join (
    select student_id,
        count(*) filter (where mastery_status = 'stalled') as stalled_target_count,
        count(*) filter (where current_prompt_independence < 50) as prompt_dependency_count,
        count(*) filter (where mastery_status = 'ready_to_advance' or percent_to_mastery >= 90) as ready_to_advance_count
    from public.v_skill_optimization_candidates group by student_id
) sk on sk.student_id = s.student_id
left join (
    select student_id,
        count(*) filter (where replacement_status = 'weak') as weak_replacement_behavior_count,
        count(*) filter (where replacement_status = 'emerging') as emerging_replacement_behavior_count,
        count(*) filter (where replacement_status = 'strong') as strong_replacement_behavior_count
    from public.v_replacement_behavior_strength_summary group by student_id
) rb on rb.student_id = s.student_id;

-- Recreate v_nova_ai_clinical_context_summary
create view public.v_nova_ai_clinical_context_summary as
select
    sis.student_id,
    sis.student_id as client_id,
    sis.skill_alert_count,
    sis.behavior_alert_count,
    sis.caregiver_alert_count,
    sis.programming_alert_count,
    bei.behavior_name,
    bei.top_time_of_day,
    bei.top_antecedent_pattern,
    bei.top_consequence_pattern,
    bei.transition_risk_flag,
    bei.unstructured_time_risk_flag,
    bei.lunch_time_risk_flag,
    bei.escape_pattern_flag,
    bei.attention_pattern_flag,
    bei.total_behavior_events
from public.v_student_intelligence_summary sis
left join public.v_behavior_event_intelligence_summary bei
  on bei.student_id = sis.student_id;

-- Recreate v_nova_ai_case_context_summary
create view public.v_nova_ai_case_context_summary as
select
    s.student_id,
    s.student_id as client_id,
    sis.skill_alert_count,
    sis.behavior_alert_count,
    sis.programming_alert_count,
    sis.caregiver_alert_count,
    bei.behavior_name,
    bei.top_time_of_day,
    bei.top_antecedent_pattern,
    bei.top_consequence_pattern,
    bei.transition_risk_flag,
    bei.unstructured_time_risk_flag,
    bei.lunch_time_risk_flag,
    bei.escape_pattern_flag,
    bei.attention_pattern_flag,
    bei.total_behavior_events,
    coalesce(pta.total_goals, 0) as caregiver_total_goals,
    coalesce(pta.mastered_goals, 0) as caregiver_mastered_goals,
    coalesce(pta.in_progress_goals, 0) as caregiver_in_progress_goals,
    coalesce(pta.not_started_goals, 0) as caregiver_not_started_goals,
    pta.last_data_submission_at,
    pta.last_homework_submission_at
from (
    select distinct student_id from public.v_student_intelligence_summary
) s
left join public.v_student_intelligence_summary sis on sis.student_id = s.student_id
left join public.v_behavior_event_intelligence_summary bei on bei.student_id = s.student_id
left join (
    select client_id,
        sum(total_goals) as total_goals,
        sum(mastered_goals) as mastered_goals,
        sum(in_progress_goals) as in_progress_goals,
        sum(not_started_goals) as not_started_goals,
        max(last_data_submission_at) as last_data_submission_at,
        max(last_homework_submission_at) as last_homework_submission_at
    from public.v_parent_training_assignment_intelligence_summary
    group by client_id
) pta on pta.client_id = s.student_id;

-- Now create v_goal_optimization_context
create view public.v_goal_optimization_context as
select
    s.student_id,
    s.student_id as client_id,
    sis.skill_alert_count,
    sis.behavior_alert_count,
    sis.programming_alert_count,
    sis.caregiver_alert_count,
    sis.stalled_target_count,
    sis.prompt_dependency_count,
    sis.ready_to_advance_count,
    sis.weak_replacement_behavior_count,
    sis.emerging_replacement_behavior_count,
    sis.strong_replacement_behavior_count,
    bei.behavior_name,
    bei.top_time_of_day,
    bei.top_antecedent_pattern,
    bei.top_consequence_pattern,
    bei.transition_risk_flag,
    bei.unstructured_time_risk_flag,
    bei.lunch_time_risk_flag,
    bei.escape_pattern_flag,
    bei.attention_pattern_flag,
    coalesce(pta.total_goals, 0) as caregiver_total_goals,
    coalesce(pta.mastered_goals, 0) as caregiver_mastered_goals,
    coalesce(pta.in_progress_goals, 0) as caregiver_in_progress_goals,
    coalesce(pta.not_started_goals, 0) as caregiver_not_started_goals,
    pta.last_data_submission_at,
    pta.last_homework_submission_at
from (
    select distinct student_id from public.v_student_intelligence_summary
) s
left join public.v_student_intelligence_summary sis on sis.student_id = s.student_id
left join public.v_behavior_event_intelligence_summary bei on bei.student_id = s.student_id
left join (
    select client_id,
        sum(total_goals) as total_goals,
        sum(mastered_goals) as mastered_goals,
        sum(in_progress_goals) as in_progress_goals,
        sum(not_started_goals) as not_started_goals,
        max(last_data_submission_at) as last_data_submission_at,
        max(last_homework_submission_at) as last_homework_submission_at
    from public.v_parent_training_assignment_intelligence_summary
    group by client_id
) pta on pta.client_id = s.student_id;