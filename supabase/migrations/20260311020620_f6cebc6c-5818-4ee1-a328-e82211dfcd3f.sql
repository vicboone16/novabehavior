
drop view if exists public.v_iep_meeting_workspace;
drop view if exists public.v_iep_meeting_readiness_summary;
drop view if exists public.v_iep_behavior_summary;
drop view if exists public.v_iep_goal_progress_summary;
drop view if exists public.v_iep_meeting_intelligence_context;

create view public.v_iep_meeting_intelligence_context as
select
    s.student_id, s.student_id as client_id,
    sis.skill_alert_count, sis.behavior_alert_count, sis.programming_alert_count, sis.caregiver_alert_count,
    sis.stalled_target_count, sis.prompt_dependency_count, sis.ready_to_advance_count,
    sis.weak_replacement_behavior_count, sis.emerging_replacement_behavior_count, sis.strong_replacement_behavior_count,
    bei.behavior_name, bei.top_time_of_day, bei.top_antecedent_pattern, bei.top_consequence_pattern,
    bei.transition_risk_flag, bei.unstructured_time_risk_flag, bei.lunch_time_risk_flag,
    bei.escape_pattern_flag, bei.attention_pattern_flag, bei.total_behavior_events,
    coalesce(pta.total_goals, 0) as caregiver_total_goals,
    coalesce(pta.mastered_goals, 0) as caregiver_mastered_goals,
    coalesce(pta.in_progress_goals, 0) as caregiver_in_progress_goals,
    coalesce(pta.not_started_goals, 0) as caregiver_not_started_goals,
    pta.last_data_submission_at, pta.last_homework_submission_at
from (select distinct student_id from public.v_student_intelligence_summary) s
left join public.v_student_intelligence_summary sis on sis.student_id = s.student_id
left join public.v_behavior_event_intelligence_summary bei on bei.student_id = s.student_id
left join (
    select client_id, sum(total_goals) as total_goals, sum(mastered_goals) as mastered_goals,
      sum(in_progress_goals) as in_progress_goals, sum(not_started_goals) as not_started_goals,
      max(last_data_submission_at) as last_data_submission_at, max(last_homework_submission_at) as last_homework_submission_at
    from public.v_parent_training_assignment_intelligence_summary group by client_id
) pta on pta.client_id = s.student_id;

create view public.v_iep_goal_progress_summary as
select st.student_id, st.student_target_id, st.mastery_rule_type, st.mastery_threshold,
    st.current_accuracy, st.current_prompt_independence, st.percent_to_mastery, st.mastery_status,
    st.consecutive_sessions_at_criterion, st.last_mastery_check_date
from public.v_student_target_mastery_engine_summary st;

create view public.v_iep_behavior_summary as
select r.student_id, r.problem_behavior_name, r.plan_link_id,
    r.problem_behavior_count, r.replacement_behavior_count, r.replacement_to_problem_ratio,
    r.replacement_strength_score, r.replacement_status
from public.v_replacement_behavior_strength_summary r;

create view public.v_iep_meeting_readiness_summary as
select
    m.id as meeting_session_id,
    (select count(*) from public.iep_meeting_talking_points tp where tp.meeting_session_id = m.id)::int as talking_point_count,
    (select count(*) from public.iep_meeting_recommendation_items ri where ri.meeting_session_id = m.id)::int as recommendation_count,
    (select count(*) from public.iep_meeting_goal_draft_items gd where gd.meeting_session_id = m.id)::int as goal_draft_count,
    (select count(*) from public.iep_meeting_attendees a where a.meeting_session_id = m.id)::int as attendee_count,
    (select count(*) filter (where ci.is_complete) * 100 / greatest(count(*), 1) from public.iep_meeting_checklist_items ci where ci.meeting_session_id = m.id)::int as readiness_percent
from public.iep_meeting_sessions m;

create view public.v_iep_meeting_workspace as
select
    m.id as meeting_session_id, m.student_id, m.client_id,
    m.meeting_date, m.meeting_type, m.meeting_title, m.school_name,
    m.grade_level, m.case_manager_name, m.status,
    rs.readiness_percent, rs.talking_point_count, rs.recommendation_count, rs.goal_draft_count
from public.iep_meeting_sessions m
left join public.v_iep_meeting_readiness_summary rs on rs.meeting_session_id = m.id;

select pg_notify('pgrst','reload schema');
