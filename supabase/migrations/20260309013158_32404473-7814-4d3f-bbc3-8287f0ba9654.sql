
-- ==========================================
-- 1. Skill Target Session Summary View
-- ==========================================
drop view if exists public.v_skill_target_session_summary;

create view public.v_skill_target_session_summary as
select
    tr.target_id as student_target_id,
    (tr.recorded_at at time zone 'UTC')::date as session_date,
    count(*) as total_trials,
    count(*) filter (where tr.score_code = '+') as correct_trials,
    round(
        100.0 * count(*) filter (where tr.score_code = '+') / nullif(count(*),0),
        2
    ) as accuracy_percent,
    round(
        100.0 * count(*) filter (where pl.counts_as_prompted is not true and tr.prompt_level_id is null) / nullif(count(*),0),
        2
    ) as independent_percent,
    null::numeric as avg_latency_seconds,
    null::numeric as avg_duration_seconds,
    0 as generalization_context_count
from public.skill_trials tr
left join public.prompt_levels pl on pl.id = tr.prompt_level_id
group by tr.target_id, (tr.recorded_at at time zone 'UTC')::date;

-- ==========================================
-- 2. Recalculate Student Target Mastery
-- ==========================================
create or replace function public.recalculate_student_target_mastery(
    p_student_target_id uuid
)
returns uuid
language plpgsql
security definer
as $$
declare
    v_target record;
    v_latest record;
    v_consecutive integer := 0;
    v_percent numeric := null;
    v_mastered boolean := false;
begin
    select *
    into v_target
    from public.student_targets
    where id = p_student_target_id;

    if not found then
        raise exception 'Student target not found';
    end if;

    select *
    into v_latest
    from public.v_skill_target_session_summary
    where student_target_id = p_student_target_id
    order by session_date desc
    limit 1;

    if not found then
        update public.student_targets
        set
          mastery_status = 'not_started',
          last_mastery_check_date = current_date
        where id = p_student_target_id;
        return p_student_target_id;
    end if;

    if v_target.mastery_rule_type = 'prompt_independence' then
        v_percent := v_latest.independent_percent;
        select count(*)
        into v_consecutive
        from (
            select session_date, independent_percent
            from public.v_skill_target_session_summary
            where student_target_id = p_student_target_id
            order by session_date desc
            limit coalesce(v_target.required_consecutive_sessions, 2)
        ) x
        where x.independent_percent >= coalesce(v_target.mastery_threshold, 80);
        v_mastered := v_consecutive >= coalesce(v_target.required_consecutive_sessions, 2);

    elsif v_target.mastery_rule_type = 'latency' then
        v_percent := v_latest.avg_latency_seconds;
        select count(*)
        into v_consecutive
        from (
            select session_date, avg_latency_seconds
            from public.v_skill_target_session_summary
            where student_target_id = p_student_target_id
            order by session_date desc
            limit coalesce(v_target.required_consecutive_sessions, 2)
        ) x
        where x.avg_latency_seconds <= coalesce(v_target.mastery_threshold, 3);
        v_mastered := v_consecutive >= coalesce(v_target.required_consecutive_sessions, 2);

    elsif v_target.mastery_rule_type = 'duration' then
        v_percent := v_latest.avg_duration_seconds;
        select count(*)
        into v_consecutive
        from (
            select session_date, avg_duration_seconds
            from public.v_skill_target_session_summary
            where student_target_id = p_student_target_id
            order by session_date desc
            limit coalesce(v_target.required_consecutive_sessions, 2)
        ) x
        where x.avg_duration_seconds >= coalesce(v_target.mastery_threshold, 60);
        v_mastered := v_consecutive >= coalesce(v_target.required_consecutive_sessions, 2);

    else
        -- default: accuracy threshold
        v_percent := v_latest.accuracy_percent;
        select count(*)
        into v_consecutive
        from (
            select session_date, accuracy_percent
            from public.v_skill_target_session_summary
            where student_target_id = p_student_target_id
            order by session_date desc
            limit coalesce(v_target.required_consecutive_sessions, 2)
        ) x
        where x.accuracy_percent >= coalesce(v_target.mastery_threshold, 80);
        v_mastered := v_consecutive >= coalesce(v_target.required_consecutive_sessions, 2);
    end if;

    update public.student_targets
    set
      current_accuracy = case when v_target.mastery_rule_type not in ('latency','duration','prompt_independence') then v_latest.accuracy_percent else current_accuracy end,
      current_prompt_independence = case when v_target.mastery_rule_type = 'prompt_independence' then v_latest.independent_percent else current_prompt_independence end,
      current_latency = case when v_target.mastery_rule_type = 'latency' then v_latest.avg_latency_seconds else current_latency end,
      current_duration = case when v_target.mastery_rule_type = 'duration' then v_latest.avg_duration_seconds else current_duration end,
      consecutive_sessions_at_criterion = v_consecutive,
      percent_to_mastery = v_percent,
      mastery_status = case when v_mastered then 'mastered' else 'in_progress' end,
      last_mastery_check_date = current_date
    where id = p_student_target_id;

    return p_student_target_id;
end;
$$;

-- ==========================================
-- 3. Student Target Mastery Engine Summary
-- ==========================================
drop view if exists public.v_student_target_mastery_engine_summary;

create view public.v_student_target_mastery_engine_summary as
select
    st.id as student_target_id,
    st.student_id,
    st.title as target_title,
    st.mastery_rule_type,
    st.mastery_threshold,
    st.required_consecutive_sessions,
    st.required_prompt_level,
    st.generalization_required,
    st.generalization_context_count,
    st.current_accuracy,
    st.current_prompt_independence,
    st.current_latency,
    st.current_duration,
    st.percent_to_mastery,
    st.mastery_status,
    st.consecutive_sessions_at_criterion,
    st.last_mastery_check_date,
    st.status as target_status,
    st.date_added,
    st.date_mastered
from public.student_targets st;

-- ==========================================
-- 4. Replacement Behavior Strength Summary
-- ==========================================
-- Uses behavior_session_data to compare problem behavior (from plan link target_behavior_label)
-- against replacement behavior frequency. Joins on student_bx_plan_links.
drop view if exists public.v_replacement_behavior_strength_summary;

create view public.v_replacement_behavior_strength_summary as
select
    l.student_id,
    l.id as plan_link_id,
    l.target_behavior_label as problem_behavior_name,
    coalesce(l.problem_behavior_frequency, 0) as problem_behavior_count,
    coalesce(l.replacement_behavior_frequency, 0) as replacement_behavior_count,
    l.replacement_to_problem_ratio,
    l.replacement_strength_score,
    coalesce(l.replacement_status, 'not_started') as replacement_status,
    l.last_replacement_analysis_date
from public.student_bx_plan_links l;

-- ==========================================
-- 5. Recalculate Replacement Behavior Strength
-- ==========================================
create or replace function public.recalculate_replacement_behavior_strength(
    p_student_id uuid
)
returns integer
language plpgsql
security definer
as $$
declare
    v_count integer := 0;
    v_link record;
    v_problem_freq numeric;
    v_replacement_freq numeric;
    v_ratio numeric;
begin
    -- For each plan link, recalculate from behavior_session_data
    for v_link in
        select id, problem_id, objective_id
        from public.student_bx_plan_links
        where student_id = p_student_id
    loop
        -- Count problem behavior frequency (from behavior_session_data where behavior_id = problem_id)
        select coalesce(sum(frequency), 0)
        into v_problem_freq
        from public.behavior_session_data
        where student_id = p_student_id
          and behavior_id = v_link.problem_id;

        -- Count replacement/objective behavior frequency
        -- objective_id represents the replacement behavior target
        if v_link.objective_id is not null then
            select coalesce(sum(frequency), 0)
            into v_replacement_freq
            from public.behavior_session_data
            where student_id = p_student_id
              and behavior_id = v_link.objective_id;
        else
            v_replacement_freq := 0;
        end if;

        v_ratio := case when v_problem_freq > 0 then round(v_replacement_freq / v_problem_freq, 2) else null end;

        update public.student_bx_plan_links
        set
          problem_behavior_frequency = v_problem_freq,
          replacement_behavior_frequency = v_replacement_freq,
          replacement_to_problem_ratio = v_ratio,
          replacement_strength_score = case
            when v_ratio is null then 0
            when v_ratio >= 1.5 then 100
            when v_ratio >= 1.0 then 80
            when v_ratio >= 0.5 then 60
            when v_ratio > 0 then 40
            else 0
          end,
          replacement_status = case
            when v_ratio is null then 'not_started'
            when v_ratio >= 1.0 then 'strong'
            when v_ratio >= 0.5 then 'emerging'
            else 'weak'
          end,
          last_replacement_analysis_date = current_date
        where id = v_link.id;

        v_count := v_count + 1;
    end loop;

    return v_count;
end;
$$;
