-- A1: Trial display view (fixed: use pl.name instead of pl.label)
create or replace view public.v_skill_trials_display_v2 as
select
  st.id,
  st.student_id,
  st.target_id,
  st.session_id,
  st.score_code,
  st.prompt_level_id,
  st.procedure_step_id,
  st.benchmark_id,
  st.trial_index,
  st.recorded_at,
  st.created_at,
  pl.code as prompt_code,
  pl.name as prompt_label,
  pl.rank as prompt_rank
from public.skill_trials st
left join public.prompt_levels pl on pl.id = st.prompt_level_id;

-- A2: Session-level metrics
create or replace view public.v_skill_target_session_metrics_v3 as
select
  st.student_id,
  st.target_id,
  s.id as session_id,
  s.started_at as session_time,
  s.started_at::date as session_day,
  count(*) as trials_total,
  sum(case when st.score_code in ('+','P+') then 1 else 0 end) as correct_total,
  sum(case when st.score_code in ('-','P-') then 1 else 0 end) as incorrect_total,
  sum(case when st.score_code = '+' and st.prompt_level_id is null then 1 else 0 end) as independent_correct,
  round(
    case when count(*) = 0 then null
         else (sum(case when st.score_code in ('+','P+') then 1 else 0 end)::numeric / count(*)::numeric) * 100
    end
  , 2) as pct_correct,
  round(
    case when count(*) = 0 then null
         else (sum(case when st.score_code = '+' and st.prompt_level_id is null then 1 else 0 end)::numeric / count(*)::numeric) * 100
    end
  , 2) as pct_independent
from public.skill_trials st
join public.sessions s on s.id = st.session_id
group by st.student_id, st.target_id, s.id, s.started_at;

-- A3: Daily metrics
create or replace view public.v_skill_target_daily_metrics_v3 as
select
  student_id,
  target_id,
  session_day,
  sum(trials_total) as trials_total,
  sum(correct_total) as correct_total,
  sum(incorrect_total) as incorrect_total,
  sum(independent_correct) as independent_correct,
  round(case when sum(trials_total)=0 then null
       else (sum(correct_total)::numeric / sum(trials_total)::numeric)*100 end, 2) as pct_correct,
  round(case when sum(trials_total)=0 then null
       else (sum(independent_correct)::numeric / sum(trials_total)::numeric)*100 end, 2) as pct_independent
from public.v_skill_target_session_metrics_v3
group by student_id, target_id, session_day;

-- A4: Prompt distribution
create or replace view public.v_skill_prompt_distribution_v2 as
select
  st.student_id,
  st.target_id,
  s.started_at::date as session_day,
  pl.code as prompt_code,
  count(*) as trials
from public.skill_trials st
join public.sessions s on s.id = st.session_id
left join public.prompt_levels pl on pl.id = st.prompt_level_id
group by st.student_id, st.target_id, s.started_at::date, pl.code;