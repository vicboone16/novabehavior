
-- 1) Create beacon_student_day_state table
create table if not exists beacon_student_day_state (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  state_date date not null default current_date,
  day_state text not null check (day_state in ('red','yellow','green')),
  selected_by text,
  selected_by_user_id uuid,
  classroom_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, state_date)
);

-- 2) Create beacon_teacher_plans table
create table if not exists beacon_teacher_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  plan_date date not null default current_date,
  day_state text not null check (day_state in ('red','yellow','green')),
  classroom_id text,
  selected_program_ids jsonb not null default '[]'::jsonb,
  targets jsonb not null default '[]'::jsonb,
  antecedents jsonb not null default '[]'::jsonb,
  reactives jsonb not null default '[]'::jsonb,
  reinforcement text,
  teacher_summary text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, plan_date)
);

-- 3) Enable RLS on both tables
alter table beacon_student_day_state enable row level security;
alter table beacon_teacher_plans enable row level security;

-- RLS policies for beacon_student_day_state
create policy "Authenticated users can view beacon day state"
  on beacon_student_day_state for select to authenticated
  using (true);

create policy "Authenticated users can insert beacon day state"
  on beacon_student_day_state for insert to authenticated
  with check (true);

create policy "Authenticated users can update beacon day state"
  on beacon_student_day_state for update to authenticated
  using (true);

-- RLS policies for beacon_teacher_plans
create policy "Authenticated users can view beacon teacher plans"
  on beacon_teacher_plans for select to authenticated
  using (true);

create policy "Authenticated users can insert beacon teacher plans"
  on beacon_teacher_plans for insert to authenticated
  with check (true);

create policy "Authenticated users can update beacon teacher plans"
  on beacon_teacher_plans for update to authenticated
  using (true);

-- 4) Create beacon plan generator function
create or replace function generate_beacon_teacher_plan(
  p_student uuid,
  p_date date,
  p_state text,
  p_selected_by text default null,
  p_classroom_id text default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
as $$
declare
  v_has_preferred boolean := false;
  v_program_ids jsonb;
  v_targets jsonb;
  v_antecedents jsonb;
  v_reactives jsonb;
  v_reinforcement text;
  v_teacher_summary text;
begin
  insert into beacon_student_day_state (
    student_id, state_date, day_state, selected_by, classroom_id, notes
  )
  values (
    p_student, p_date, lower(p_state), p_selected_by, p_classroom_id, p_notes
  )
  on conflict (student_id, state_date) do update set
    day_state = excluded.day_state,
    selected_by = excluded.selected_by,
    classroom_id = excluded.classroom_id,
    notes = excluded.notes,
    updated_at = now();

  select exists (
    select 1 from bops_program_bank
    where student_id = p_student
      and lower(day_state) = lower(p_state)
      and active = true
      and is_preferred_default = true
  ) into v_has_preferred;

  with selected_programs as (
    select *
    from bops_program_bank
    where student_id = p_student
      and lower(day_state) = lower(p_state)
      and active = true
      and (
        (v_has_preferred = true and is_preferred_default = true)
        or (v_has_preferred = false)
      )
    order by is_preferred_default desc, problem_area, program_name
  )
  select
    coalesce(jsonb_agg(sp.id), '[]'::jsonb),
    coalesce((select jsonb_agg(distinct t.target) from selected_programs sp2 left join lateral jsonb_array_elements_text(sp2.target_options) as t(target) on true), '[]'::jsonb),
    coalesce((select jsonb_agg(distinct a.strategy) from selected_programs sp3 left join lateral jsonb_array_elements_text(sp3.antecedent_strategies) as a(strategy) on true), '[]'::jsonb),
    coalesce((select jsonb_agg(distinct r.strategy) from selected_programs sp4 left join lateral jsonb_array_elements_text(sp4.reactive_strategies) as r(strategy) on true), '[]'::jsonb),
    string_agg(distinct sp.reinforcement_plan, ' | '),
    string_agg(distinct sp.teacher_friendly_summary, ' | ')
  into v_program_ids, v_targets, v_antecedents, v_reactives, v_reinforcement, v_teacher_summary
  from selected_programs sp;

  insert into beacon_teacher_plans (
    student_id, plan_date, day_state, classroom_id,
    selected_program_ids, targets, antecedents, reactives,
    reinforcement, teacher_summary, created_by
  )
  values (
    p_student, p_date, lower(p_state), p_classroom_id,
    coalesce(v_program_ids, '[]'::jsonb),
    coalesce(v_targets, '[]'::jsonb),
    coalesce(v_antecedents, '[]'::jsonb),
    coalesce(v_reactives, '[]'::jsonb),
    v_reinforcement, v_teacher_summary, p_selected_by
  )
  on conflict (student_id, plan_date) do update set
    day_state = excluded.day_state,
    classroom_id = excluded.classroom_id,
    selected_program_ids = excluded.selected_program_ids,
    targets = excluded.targets,
    antecedents = excluded.antecedents,
    reactives = excluded.reactives,
    reinforcement = excluded.reinforcement,
    teacher_summary = excluded.teacher_summary,
    created_by = excluded.created_by,
    updated_at = now();
end;
$$;

-- 5) Create v_beacon_current_day_state view
create or replace view v_beacon_current_day_state with (security_invoker=on) as
select distinct on (student_id)
  student_id, state_date, day_state, selected_by, classroom_id, notes, updated_at
from beacon_student_day_state
order by student_id, state_date desc, updated_at desc;

-- 6) Create v_beacon_current_teacher_plan view
create or replace view v_beacon_current_teacher_plan with (security_invoker=on) as
select distinct on (student_id)
  student_id, plan_date, day_state, classroom_id,
  selected_program_ids, targets, antecedents, reactives,
  reinforcement, teacher_summary, created_by, updated_at
from beacon_teacher_plans
order by student_id, plan_date desc, updated_at desc;

-- 7) Recreate v_student_behavior_intelligence_dashboard
create or replace view v_student_behavior_intelligence_dashboard with (security_invoker=on) as
select
  o.student_id,
  o.bops_enabled, o.bops_assessment_status, o.bops_profile_saved,
  o.bops_programming_available, o.bops_programming_active,
  o.active_bops_session_id, o.latest_scored_session_id, o.assessment_date,
  o.calculated_profile_type, o.calculated_primary, o.calculated_secondary, o.calculated_tertiary,
  o.calculated_training_name, o.calculated_clinical_name,
  o.storm_score, o.escalation_index, o.hidden_need_index, o.sensory_load_index,
  o.power_conflict_index, o.social_complexity_index, o.recovery_burden_index,
  o.elevated_profile_count, o.combo_classification_type, o.combo_training_name, o.combo_clinical_name,
  o.base_constellation_key, o.primary_archetype, o.secondary_archetype,
  o.tertiary_archetype, o.quaternary_archetype, o.quinary_archetype,
  cfi.model_key as best_fit_model_key, cfi.model_name as best_fit_model_name,
  cfi.fit_score as best_fit_score, cfi.fit_band as best_fit_band, cfi.recommended_rank as best_fit_rank,
  sp.total_suggested_programs, sp.archetype_suggestions, sp.dual_suggestions,
  sp.multi_profile_suggestions, sp.cfi_suggestions,
  pb.total_programs as accepted_programs_total, pb.active_programs as accepted_programs_active,
  pb.preferred_defaults, pb.modified_programs, pb.red_programs, pb.yellow_programs, pb.green_programs,
  cds.current_day_state, cds.current_state_date, cds.current_state_selected_by, cds.current_state_notes,
  cp.current_plan_date, cp.benchmark_level, cp.teacher_summary_view, cp.clinician_summary_view, cp.reinforcement_plan,
  bds.beacon_state_date, bds.beacon_day_state, bds.beacon_selected_by, bds.beacon_state_notes,
  btp.beacon_plan_date, btp.beacon_targets, btp.beacon_antecedents, btp.beacon_reactives,
  btp.beacon_reinforcement, btp.beacon_teacher_summary,
  mtss.plan_id as latest_mtss_plan_id, mtss.tier as latest_mtss_tier, mtss.status as latest_mtss_status,
  mtss.primary_goal as latest_mtss_primary_goal, mtss.start_date as latest_mtss_start_date,
  mtss.intervention_count as latest_mtss_intervention_count
from v_student_bops_overview o
left join (select student_id, state_date as current_state_date, day_state as current_day_state, selected_by as current_state_selected_by, notes as current_state_notes from v_student_bops_current_day_state) cds on cds.student_id = o.student_id
left join (select student_id, date as current_plan_date, benchmark_level, teacher_summary_view, clinician_summary_view, reinforcement_plan from v_student_bops_current_plan) cp on cp.student_id = o.student_id
left join (select student_id, state_date as beacon_state_date, day_state as beacon_day_state, selected_by as beacon_selected_by, notes as beacon_state_notes from v_beacon_current_day_state) bds on bds.student_id = o.student_id
left join (select student_id, plan_date as beacon_plan_date, targets as beacon_targets, antecedents as beacon_antecedents, reactives as beacon_reactives, reinforcement as beacon_reinforcement, teacher_summary as beacon_teacher_summary from v_beacon_current_teacher_plan) btp on btp.student_id = o.student_id
left join v_bops_cfi_best_fit cfi on cfi.student_id = o.student_id
left join v_student_bops_suggested_program_summary sp on sp.student_id = o.student_id and sp.session_id = o.latest_scored_session_id
left join v_student_bops_program_bank_rollup pb on pb.student_id = o.student_id
left join v_student_mtss_latest_plan mtss on mtss.student_id = o.student_id;
