
-- Domain scoring function
create or replace function public.nova_score_domain_assessment(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assessment_id uuid;
begin
  select assessment_id into v_assessment_id
  from public.nova_assessment_sessions where id = p_session_id;

  delete from public.nova_assessment_results
  where session_id = p_session_id and result_scope = 'domain';

  insert into public.nova_assessment_results (
    session_id, result_scope, result_key, result_label, raw_total, avg_score, band_label, result_json
  )
  select
    p_session_id, 'domain', d.code, d.name,
    sum(r.normalized_score),
    round(avg(r.normalized_score)::numeric, 2),
    (select b.label from public.nova_score_bands b
     where b.assessment_id = v_assessment_id
       and b.band_scope in ('domain', 'skill')
       and round(avg(r.normalized_score)::numeric, 2) between b.min_value and b.max_value
     order by b.display_order limit 1),
    jsonb_build_object('domain_id', d.id, 'item_count', count(*), 'priority_order', d.priority_order)
  from public.nova_assessment_items i
  join public.nova_assessment_domains d on d.id = i.domain_id
  join public.nova_assessment_ratings r on r.item_id = i.id
  where r.session_id = p_session_id
  group by d.id, d.code, d.name, d.priority_order;
end;
$$;

-- NAP archetype scoring
create or replace function public.nova_score_nap(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assessment_id uuid;
begin
  select assessment_id into v_assessment_id
  from public.nova_assessment_sessions where id = p_session_id;

  delete from public.nova_assessment_results
  where session_id = p_session_id and result_scope in ('archetype', 'flag', 'profile');

  insert into public.nova_assessment_results (
    session_id, result_scope, result_key, result_label, raw_total, avg_score, band_label, result_json
  )
  select
    p_session_id, 'archetype',
    coalesce(i.archetype_code, d.code),
    coalesce(pd.profile_name, coalesce(i.archetype_code, d.code)),
    sum(r.normalized_score),
    round(avg(r.normalized_score)::numeric, 2),
    (select b.label from public.nova_score_bands b
     where b.assessment_id = v_assessment_id and b.band_scope = 'archetype'
       and round(avg(r.normalized_score)::numeric, 2) between b.min_value and b.max_value
     order by b.display_order limit 1),
    jsonb_build_object('item_count', count(*))
  from public.nova_assessment_items i
  join public.nova_assessment_ratings r on r.item_id = i.id
  left join public.nova_assessment_domains d on d.id = i.domain_id
  left join public.nova_profile_definitions pd
    on pd.assessment_id = v_assessment_id
   and pd.profile_code = coalesce(i.archetype_code, d.code)
  where r.session_id = p_session_id
  group by coalesce(i.archetype_code, d.code), pd.profile_name;

  insert into public.nova_assessment_results (session_id, result_scope, result_key, result_label, result_json)
  select p_session_id, 'flag', 'BURNOUT_RISK', 'Burnout Risk Flag', '{}'::jsonb
  where exists (
    select 1 from public.nova_assessment_results ar1
    join public.nova_assessment_results ar2 on ar2.session_id = ar1.session_id
    where ar1.session_id = p_session_id and ar1.result_scope = 'archetype'
      and ar1.result_key = 'MASKER' and ar1.avg_score >= 2.0
      and ar2.result_scope = 'archetype' and ar2.result_key = 'DYSREGULATED' and ar2.avg_score >= 2.0
  );

  insert into public.nova_assessment_results (session_id, result_scope, result_key, result_label, result_json)
  select p_session_id, 'flag', 'MISINTERPRETATION_RISK', 'Misinterpretation Risk Flag', '{}'::jsonb
  where exists (
    select 1 from public.nova_assessment_results ar
    where ar.session_id = p_session_id and ar.result_scope = 'archetype'
      and ar.result_key in ('MASKER', 'INTERNALIZER') and ar.avg_score >= 2.0
  );

  insert into public.nova_assessment_results (session_id, result_scope, result_key, result_label, result_json)
  select p_session_id, 'flag', 'DEMAND_SENSITIVITY', 'Demand Sensitivity Flag', '{}'::jsonb
  where exists (
    select 1 from public.nova_assessment_results ar
    where ar.session_id = p_session_id and ar.result_scope = 'archetype'
      and ar.result_key = 'DEMAND_AVOIDANT_ARCH' and ar.avg_score >= 2.0
  );

  insert into public.nova_assessment_results (session_id, result_scope, result_key, result_label, result_json)
  select p_session_id, 'flag', 'SENSORY_IMPACT', 'Sensory Impact Flag', '{}'::jsonb
  where exists (
    select 1 from public.nova_assessment_results ar
    where ar.session_id = p_session_id and ar.result_scope = 'archetype'
      and ar.result_key = 'SENSORY' and ar.avg_score >= 2.0
  );
end;
$$;

-- SBRDS profile
create or replace function public.nova_assign_sbrds_profile(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d1 numeric; d2 numeric; d3 numeric; d4 numeric; d5 numeric;
begin
  select avg_score into d1 from public.nova_assessment_results where session_id = p_session_id and result_scope = 'domain' and result_key = 'D1';
  select avg_score into d2 from public.nova_assessment_results where session_id = p_session_id and result_scope = 'domain' and result_key = 'D2';
  select avg_score into d3 from public.nova_assessment_results where session_id = p_session_id and result_scope = 'domain' and result_key = 'D3';
  select avg_score into d4 from public.nova_assessment_results where session_id = p_session_id and result_scope = 'domain' and result_key = 'D4';
  select avg_score into d5 from public.nova_assessment_results where session_id = p_session_id and result_scope = 'domain' and result_key = 'D5';

  delete from public.nova_assessment_results where session_id = p_session_id and result_scope = 'profile';

  if d1 >= 2.5 and d2 >= 2.5 and d3 >= 1.75 and d4 >= 1.75 and d5 >= 1.75 then
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label, is_primary) values (p_session_id, 'profile', 'SOCIALLY_ENGAGED', 'Socially Engaged', true);
  elsif d4 < 1.75 and d1 < 1.75 then
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label, is_primary) values (p_session_id, 'profile', 'SOCIALLY_GUARDED', 'Socially Guarded', true);
  elsif d3 < 1.75 then
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label, is_primary) values (p_session_id, 'profile', 'SOCIALLY_MISATTUNED', 'Socially Misattuned', true);
  elsif d5 < 1.75 and d2 >= 1.75 then
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label, is_primary) values (p_session_id, 'profile', 'SOCIALLY_FATIGUED', 'Socially Fatigued / Burnout Risk', true);
  elsif d5 < 1.75 then
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label, is_primary) values (p_session_id, 'profile', 'SOCIALLY_DYSREGULATED', 'Socially Dysregulated', true);
  elsif d1 < 1.75 then
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label, is_primary) values (p_session_id, 'profile', 'SOCIALLY_AVOIDANT', 'Socially Avoidant', true);
  else
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label, is_primary) values (p_session_id, 'profile', 'SOCIALLY_EMERGING', 'Socially Emerging', true);
  end if;

  if d5 < 1.75 then
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label, is_secondary)
    values (p_session_id, 'profile', 'SOCIALLY_FATIGUED', 'Socially Fatigued / Burnout Risk', true)
    on conflict do nothing;
  end if;
end;
$$;

-- EFDP profile
create or replace function public.nova_assign_efdp_profile(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d1 numeric; d2 numeric; d3 numeric; d4 numeric; d5 numeric;
begin
  select avg_score into d1 from public.nova_assessment_results where session_id = p_session_id and result_scope = 'domain' and result_key = 'D1';
  select avg_score into d2 from public.nova_assessment_results where session_id = p_session_id and result_scope = 'domain' and result_key = 'D2';
  select avg_score into d3 from public.nova_assessment_results where session_id = p_session_id and result_scope = 'domain' and result_key = 'D3';
  select avg_score into d4 from public.nova_assessment_results where session_id = p_session_id and result_scope = 'domain' and result_key = 'D4';
  select avg_score into d5 from public.nova_assessment_results where session_id = p_session_id and result_scope = 'domain' and result_key = 'D5';

  delete from public.nova_assessment_results where session_id = p_session_id and result_scope in ('profile', 'demand_style');

  if d1 >= 2.5 and d2 >= 2.5 and d3 >= 1.75 and d4 >= 1.75 and d5 >= 1.75 then
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label, is_primary) values (p_session_id, 'profile', 'STRUCTURED_INDEPENDENT', 'Structured Independent', true);
  elsif d5 < 1.75 and d1 < 1.75 then
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label, is_primary) values (p_session_id, 'profile', 'OVERWHELMED_EXECUTOR', 'Overwhelmed Executor', true);
  elsif d3 < 1.75 then
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label, is_primary) values (p_session_id, 'profile', 'RIGID_INFLEXIBLE', 'Rigid / Inflexible', true);
  elsif d1 < 1.75 and d4 >= 1.75 then
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label, is_primary) values (p_session_id, 'profile', 'TASK_AVOIDANT', 'Task-Avoidant (Escape-Maintained)', true);
  elsif d1 < 1.75 then
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label, is_primary) values (p_session_id, 'profile', 'PROMPT_DEPENDENT', 'Prompt-Dependent', true);
  else
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label, is_primary) values (p_session_id, 'profile', 'INCONSISTENT_PERFORMER', 'Inconsistent Performer', true);
  end if;

  if d4 >= 2.5 then
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label) values (p_session_id, 'demand_style', 'COMPLIANT', 'Compliant');
  elsif d4 between 1.75 and 2.49 then
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label) values (p_session_id, 'demand_style', 'PASSIVE_AVOIDANT', 'Passive Avoidant');
  else
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label) values (p_session_id, 'demand_style', 'ESCALATING', 'Escalating');
  end if;
end;
$$;

-- ABRSE profile
create or replace function public.nova_assign_abrse_profile(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d1 numeric; d2 numeric; d3 numeric; d4 numeric; d5 numeric;
begin
  select avg_score into d1 from public.nova_assessment_results where session_id = p_session_id and result_scope = 'domain' and result_key = 'D1';
  select avg_score into d2 from public.nova_assessment_results where session_id = p_session_id and result_scope = 'domain' and result_key = 'D2';
  select avg_score into d3 from public.nova_assessment_results where session_id = p_session_id and result_scope = 'domain' and result_key = 'D3';
  select avg_score into d4 from public.nova_assessment_results where session_id = p_session_id and result_scope = 'domain' and result_key = 'D4';
  select avg_score into d5 from public.nova_assessment_results where session_id = p_session_id and result_scope = 'domain' and result_key = 'D5';

  delete from public.nova_assessment_results where session_id = p_session_id and result_scope = 'profile';

  if d2 < 1.75 then
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label, is_primary) values (p_session_id, 'profile', 'REGULATION_DEFICIT', 'Regulation-Driven Deficit Profile', true);
  elsif d1 < 1.75 then
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label, is_primary) values (p_session_id, 'profile', 'COMMUNICATION_DEFICIT', 'Communication-Driven Deficit Profile', true);
  elsif d3 < 1.75 then
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label, is_primary) values (p_session_id, 'profile', 'TASK_ENGAGEMENT_DEFICIT', 'Task Engagement Deficit Profile', true);
  elsif d5 < 1.75 then
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label, is_primary) values (p_session_id, 'profile', 'FLEXIBILITY_TOLERANCE_DEFICIT', 'Flexibility & Tolerance Deficit Profile', true);
  elsif d4 < 1.75 then
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label, is_primary) values (p_session_id, 'profile', 'SOCIAL_REPLACEMENT_DEFICIT', 'Social Replacement Deficit Profile', true);
  else
    insert into public.nova_assessment_results(session_id, result_scope, result_key, result_label, is_primary) values (p_session_id, 'profile', 'MIXED_SKILL_DEFICIT', 'Mixed Skill Deficit Profile', true);
  end if;
end;
$$;

-- Master dispatcher
create or replace function public.nova_score_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assessment_code text;
begin
  select a.code into v_assessment_code
  from public.nova_assessment_sessions s
  join public.nova_assessments a on a.id = s.assessment_id
  where s.id = p_session_id;

  if v_assessment_code in ('SBRDS', 'EFDP', 'ABRSE') then
    perform public.nova_score_domain_assessment(p_session_id);
  end if;

  if v_assessment_code = 'SBRDS' then
    perform public.nova_assign_sbrds_profile(p_session_id);
  elsif v_assessment_code = 'EFDP' then
    perform public.nova_assign_efdp_profile(p_session_id);
  elsif v_assessment_code = 'ABRSE' then
    perform public.nova_assign_abrse_profile(p_session_id);
  elsif v_assessment_code = 'NAP' then
    perform public.nova_score_nap(p_session_id);
  end if;
end;
$$;

-- Per-session report view
create or replace view public.v_nova_assessment_report
with (security_invoker = on)
as
select
  s.id as session_id,
  a.code as assessment_code,
  a.name as assessment_name,
  s.student_id,
  s.administration_date,
  s.rater_name,
  s.rater_role,
  s.setting_name,
  s.confidence_level,
  s.status,
  (select jsonb_agg(jsonb_build_object(
      'domain_code', r.result_key, 'domain_name', r.result_label,
      'raw_total', r.raw_total, 'avg_score', r.avg_score,
      'band_label', r.band_label, 'meta', r.result_json
    ) order by r.result_key)
   from public.nova_assessment_results r
   where r.session_id = s.id and r.result_scope = 'domain'
  ) as domain_results,
  (select jsonb_agg(jsonb_build_object(
      'profile_code', r.result_key, 'profile_name', r.result_label,
      'is_primary', r.is_primary, 'is_secondary', r.is_secondary
    ))
   from public.nova_assessment_results r
   where r.session_id = s.id and r.result_scope = 'profile'
  ) as profiles,
  (select jsonb_agg(jsonb_build_object(
      'flag_code', r.result_key, 'flag_name', r.result_label
    ))
   from public.nova_assessment_results r
   where r.session_id = s.id and r.result_scope = 'flag'
  ) as flags,
  (select jsonb_agg(jsonb_build_object(
      'style_code', r.result_key, 'style_name', r.result_label
    ))
   from public.nova_assessment_results r
   where r.session_id = s.id and r.result_scope = 'demand_style'
  ) as demand_styles
from public.nova_assessment_sessions s
join public.nova_assessments a on a.id = s.assessment_id;

-- Master report view (fixed UUID aggregation)
create or replace view public.v_nova_master_report
with (security_invoker = on)
as
with latest as (
  select distinct on (s.student_id, a.code)
    s.student_id, a.code as assessment_code, s.id as session_id, s.administration_date
  from public.nova_assessment_sessions s
  join public.nova_assessments a on a.id = s.assessment_id
  where s.status = 'final' and a.code in ('SBRDS', 'EFDP', 'ABRSE', 'NAP')
  order by s.student_id, a.code, s.administration_date desc, s.created_at desc
),
pivoted as (
  select
    l.student_id,
    max(case when l.assessment_code = 'SBRDS' then l.session_id::text end)::uuid as sbrds_session_id,
    max(case when l.assessment_code = 'EFDP' then l.session_id::text end)::uuid as efdp_session_id,
    max(case when l.assessment_code = 'ABRSE' then l.session_id::text end)::uuid as abrse_session_id,
    max(case when l.assessment_code = 'NAP' then l.session_id::text end)::uuid as nap_session_id
  from latest l
  group by l.student_id
)
select
  p.student_id,
  p.sbrds_session_id,
  p.efdp_session_id,
  p.abrse_session_id,
  p.nap_session_id,
  (select r.result_label from public.nova_assessment_results r
   where r.session_id = p.nap_session_id and r.result_scope = 'archetype'
   order by r.avg_score desc nulls last limit 1
  ) as primary_archetype,
  (select r.result_label from public.nova_assessment_results r
   where r.session_id = p.efdp_session_id and r.result_scope = 'profile' and r.is_primary = true limit 1
  ) as primary_ef_profile,
  (select r.result_label from public.nova_assessment_results r
   where r.session_id = p.sbrds_session_id and r.result_scope = 'profile' and r.is_primary = true limit 1
  ) as primary_social_profile,
  (select r.result_label from public.nova_assessment_results r
   where r.session_id = p.abrse_session_id and r.result_scope = 'profile' and r.is_primary = true limit 1
  ) as primary_skill_profile
from pivoted p;

-- Master summary generator
create or replace function public.nova_generate_master_summary(p_student_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_archetype text;
  v_ef text;
  v_social text;
  v_skill text;
begin
  select primary_archetype, primary_ef_profile, primary_social_profile, primary_skill_profile
    into v_archetype, v_ef, v_social, v_skill
  from public.v_nova_master_report
  where student_id = p_student_id;

  return format(
    'The student demonstrates a profile most consistent with a %s archetype, paired with an %s EF profile, a %s social profile, and a %s skill profile. This pattern suggests that challenges are best understood through integrated interpretation rather than surface-level assumptions.',
    coalesce(v_archetype, 'not yet scored'),
    coalesce(v_ef, 'not yet scored'),
    coalesce(v_social, 'not yet scored'),
    coalesce(v_skill, 'not yet scored')
  );
end;
$$;
