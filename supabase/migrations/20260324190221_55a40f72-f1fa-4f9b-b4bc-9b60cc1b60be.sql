-- Refresh client intelligence profiles
create or replace function public.refresh_client_intelligence_profiles()
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer := 0;
begin
  insert into public.client_intelligence_profiles (
    client_id, severity_level, severity_score, risk_score,
    communication_level, top_behavior_flags, top_function_flags,
    reinforcer_summary, program_need_flags, source_summary, last_computed_at, updated_at
  )
  select c.client_id, 'moderate', 50.00, 50.00, 'unknown',
    '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    '{"source":"refresh"}'::jsonb, now(), now()
  from public.clients c
  on conflict (client_id) do update set last_computed_at = now(), updated_at = now();
  get diagnostics v_count = row_count;
  return v_count;
end; $$;

-- Refresh client outcome snapshots
create or replace function public.refresh_client_outcome_snapshots(
  p_snapshot_date date default current_date, p_period_type text default 'monthly'
) returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer := 0;
begin
  insert into public.client_outcome_snapshots (
    client_id, snapshot_date, period_type,
    behavior_reduction_score, replacement_growth_score,
    goal_progress_score, reinforcement_effectiveness_score,
    attendance_consistency_score, notes
  )
  select c.client_id, p_snapshot_date, p_period_type,
    0.00, 0.00, 0.00, 0.00, 100.00, '{"source":"refresh"}'::jsonb
  from public.clients c
  on conflict (client_id, snapshot_date, period_type) do update set notes = excluded.notes;
  get diagnostics v_count = row_count;
  return v_count;
end; $$;

-- Refresh entity compliance snapshots
create or replace function public.refresh_entity_compliance_snapshots(
  p_snapshot_date date default current_date
) returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer := 0;
begin
  insert into public.entity_compliance_snapshots (
    entity_id, snapshot_date, documentation_compliance_rate, supervision_compliance_rate,
    authorization_risk_count, missing_note_count, utilization_rate, service_gap_count
  )
  select oe.id, p_snapshot_date, 100.00, 100.00, 0, 0, 0.00, 0
  from public.org_entities oe where oe.is_active = true
  on conflict (entity_id, snapshot_date) do update set
    documentation_compliance_rate = excluded.documentation_compliance_rate;
  get diagnostics v_count = row_count;
  return v_count;
end; $$;

-- Refresh entity outcome snapshots
create or replace function public.refresh_entity_outcome_snapshots(
  p_snapshot_date date default current_date
) returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer := 0;
begin
  insert into public.entity_outcome_snapshots (
    entity_id, snapshot_date, behavior_reduction_avg, replacement_growth_avg,
    progress_score_avg, high_risk_client_count, severity_distribution, top_behavior_distribution
  )
  select oe.id, p_snapshot_date, 0.00, 0.00, 0.00, 0,
    '{"low":0,"moderate":0,"high":0,"critical":0}'::jsonb, '{}'::jsonb
  from public.org_entities oe where oe.is_active = true
  on conflict (entity_id, snapshot_date) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end; $$;

-- Refresh generated behavior targets
create or replace function public.refresh_generated_behavior_targets()
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer := 0; v_count2 integer := 0;
begin
  insert into public.generated_behavior_targets (
    client_id, source_type, target_type, target_name,
    target_definition, proposed_measurement_type, rationale, approval_status, source_evidence
  )
  select cip.client_id, 'intake_plus_fba', 'replacement_behavior',
    'Functional Communication Replacement',
    'Teach the client to request help, break, attention, or tangible access.',
    'frequency', 'Suggested from severity/risk profile.', 'pending',
    jsonb_build_object('severity_level', cip.severity_level, 'risk_score', cip.risk_score)
  from public.client_intelligence_profiles cip
  where cip.severity_level in ('moderate','high','critical')
    and not exists (select 1 from public.generated_behavior_targets gbt
      where gbt.client_id = cip.client_id and gbt.target_name = 'Functional Communication Replacement' and gbt.approval_status = 'pending');
  get diagnostics v_count = row_count;

  insert into public.generated_behavior_targets (
    client_id, source_type, target_type, target_name,
    target_definition, proposed_measurement_type, rationale, approval_status, source_evidence
  )
  select cip.client_id, 'intake_plus_fba', 'tracking_target',
    'Priority Behavior Tracking Target',
    'Track the primary high-priority behavior from intake/FBA.',
    'frequency', 'High-risk or critical severity band.', 'pending',
    jsonb_build_object('severity_level', cip.severity_level, 'risk_score', cip.risk_score)
  from public.client_intelligence_profiles cip
  where cip.severity_level in ('high','critical')
    and not exists (select 1 from public.generated_behavior_targets gbt
      where gbt.client_id = cip.client_id and gbt.target_name = 'Priority Behavior Tracking Target' and gbt.approval_status = 'pending');
  get diagnostics v_count2 = row_count;
  return v_count + v_count2;
end; $$;

-- Master refresh
create or replace function public.refresh_intelligence_layer()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v1 integer; v2 integer; v3 integer; v4 integer; v5 integer;
begin
  select public.refresh_client_intelligence_profiles() into v1;
  select public.refresh_client_outcome_snapshots(current_date, 'monthly') into v2;
  select public.refresh_entity_compliance_snapshots(current_date) into v3;
  select public.refresh_entity_outcome_snapshots(current_date) into v4;
  select public.refresh_generated_behavior_targets() into v5;
  return jsonb_build_object(
    'client_intelligence_profiles', v1, 'client_outcome_snapshots', v2,
    'entity_compliance_snapshots', v3, 'entity_outcome_snapshots', v4,
    'generated_behavior_targets', v5, 'refreshed_at', now()
  );
end; $$;

-- Approval functions
create or replace function public.approve_generated_behavior_target(
  p_id uuid, p_by uuid, p_note text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_cid uuid;
begin
  update public.generated_behavior_targets
  set approval_status = 'approved', approved_by = p_by, approved_at = now(),
      source_evidence = coalesce(source_evidence, '{}'::jsonb) || jsonb_build_object('approval_note', p_note)
  where id = p_id returning client_id into v_cid;
  if v_cid is null then raise exception 'Target not found'; end if;
  return p_id;
end; $$;

create or replace function public.reject_generated_behavior_target(
  p_id uuid, p_by uuid, p_reason text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_cid uuid;
begin
  update public.generated_behavior_targets
  set approval_status = 'rejected', approved_by = p_by, approved_at = now(),
      source_evidence = coalesce(source_evidence, '{}'::jsonb) || jsonb_build_object('rejection_reason', p_reason)
  where id = p_id returning client_id into v_cid;
  if v_cid is null then raise exception 'Target not found'; end if;
  return p_id;
end; $$;

create or replace function public.accept_staffing_recommendation(
  p_id uuid, p_by uuid, p_note text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  update public.staffing_recommendations
  set recommendation_status = 'accepted', updated_at = now(),
      supporting_metrics = coalesce(supporting_metrics, '{}'::jsonb) || jsonb_build_object('accepted_by', p_by, 'accepted_note', p_note)
  where id = p_id returning id into v_id;
  if v_id is null then raise exception 'Not found'; end if;
  return v_id;
end; $$;

create or replace function public.dismiss_staffing_recommendation(
  p_id uuid, p_by uuid, p_reason text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  update public.staffing_recommendations
  set recommendation_status = 'dismissed', updated_at = now(),
      supporting_metrics = coalesce(supporting_metrics, '{}'::jsonb) || jsonb_build_object('dismissed_by', p_by, 'dismiss_reason', p_reason)
  where id = p_id returning id into v_id;
  if v_id is null then raise exception 'Not found'; end if;
  return v_id;
end; $$;

create or replace function public.accept_program_recommendation(
  p_id uuid, p_by uuid, p_note text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  update public.program_recommendations
  set recommendation_status = 'accepted', updated_at = now(),
      supporting_metrics = coalesce(supporting_metrics, '{}'::jsonb) || jsonb_build_object('accepted_by', p_by, 'accepted_note', p_note)
  where id = p_id returning id into v_id;
  if v_id is null then raise exception 'Not found'; end if;
  return v_id;
end; $$;

create or replace function public.dismiss_program_recommendation(
  p_id uuid, p_by uuid, p_reason text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  update public.program_recommendations
  set recommendation_status = 'dismissed', updated_at = now(),
      supporting_metrics = coalesce(supporting_metrics, '{}'::jsonb) || jsonb_build_object('dismissed_by', p_by, 'dismiss_reason', p_reason)
  where id = p_id returning id into v_id;
  if v_id is null then raise exception 'Not found'; end if;
  return v_id;
end; $$;

-- Review views
create or replace view public.v_open_generated_behavior_targets as
select gbt.id, gbt.client_id, gbt.source_type, gbt.target_type,
  gbt.target_name, gbt.target_definition, gbt.proposed_measurement_type,
  gbt.rationale, gbt.approval_status, gbt.created_at
from public.generated_behavior_targets gbt where gbt.approval_status = 'pending';

create or replace view public.v_open_staffing_recommendations as
select sr.id, sr.entity_id, oe.name as entity_name, oe.entity_type,
  sr.recommendation_level, sr.recommendation_type, sr.title,
  sr.rationale, sr.impacted_client_count, sr.impacted_staff_count,
  sr.priority, sr.recommendation_status, sr.created_at
from public.staffing_recommendations sr
left join public.org_entities oe on oe.id = sr.entity_id
where sr.recommendation_status = 'open';

create or replace view public.v_open_program_recommendations as
select pr.id, pr.entity_id, oe.name as entity_name, oe.entity_type,
  pr.recommendation_level, pr.recommendation_type, pr.title,
  pr.rationale, pr.affected_client_count, pr.priority,
  pr.recommendation_status, pr.created_at
from public.program_recommendations pr
left join public.org_entities oe on oe.id = pr.entity_id
where pr.recommendation_status = 'open';