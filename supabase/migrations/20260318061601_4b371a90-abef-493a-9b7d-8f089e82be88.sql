
-- 1) TOPOGRAPHY ALIAS TABLE
create table if not exists public.behavior_topography_aliases (
  id uuid primary key default gen_random_uuid(),
  canonical_topography text not null,
  alias text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_behavior_topography_aliases_alias
on public.behavior_topography_aliases (lower(alias));

create index if not exists idx_behavior_topography_aliases_canonical
on public.behavior_topography_aliases (lower(canonical_topography));

-- 3) NORMALIZE TOPOGRAPHY FUNCTION
create or replace function public.normalize_behavior_topography(
  p_topography text
)
returns text
language plpgsql
stable
as $$
declare
  v_input text;
  v_canonical text;
begin
  v_input := lower(btrim(coalesce(p_topography, '')));
  if v_input = '' then
    return null;
  end if;

  select canonical_topography
  into v_canonical
  from public.behavior_topography_aliases
  where is_active = true
    and lower(alias) = v_input
  limit 1;

  if v_canonical is not null then
    return v_canonical;
  end if;

  if v_input like '%hit%' or v_input like '%kick%' or v_input like '%bite%' or v_input like '%scratch%' or v_input like '%aggress%' then
    return 'aggression';
  elsif v_input like '%elope%' or v_input like '%bolt%' or v_input like '%leave area%' or v_input like '%run away%' then
    return 'elopement';
  elsif v_input like '%refus%' or v_input like '%noncompliance%' or v_input like '%work refusal%' or v_input like '%task refusal%' then
    return 'noncompliance';
  elsif v_input like '%tantrum%' or v_input like '%meltdown%' or v_input like '%cry%' then
    return 'tantrum';
  elsif v_input like '%throw%' or v_input like '%break%' or v_input like '%property%' or v_input like '%flip%' then
    return 'property_destruction';
  elsif v_input like '%self inj%' or v_input like '%sib%' or v_input like '%head bang%' or v_input like '%skin picking%' then
    return 'self_injury';
  elsif v_input like '%stim%' or v_input like '%stereotyp%' or v_input like '%flapping%' then
    return 'stereotypy';
  elsif v_input like '%yell%' or v_input like '%scream%' or v_input like '%disrupt%' then
    return 'disruption';
  end if;

  return v_input;
end;
$$;

-- 4) FUNCTION + TOPOGRAPHY → STRATEGY MAP
create table if not exists public.behavior_topography_strategy_map (
  id uuid primary key default gen_random_uuid(),
  behavior_function text not null,
  behavior_topography text not null,
  strategy_phase text not null,
  strategy_code text not null,
  strategy_title text not null,
  strategy_description text not null,
  setting_tags text[] not null default '{}',
  learner_profile_tags text[] not null default '{}',
  safety_level text,
  replacement_category text,
  response_class text,
  implementation_json jsonb not null default '{}'::jsonb,
  fidelity_lookfors_json jsonb not null default '[]'::jsonb,
  data_collection_json jsonb not null default '{}'::jsonb,
  priority integer not null default 3,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_behavior_topography_strategy_core
on public.behavior_topography_strategy_map (
  behavior_function,
  behavior_topography,
  strategy_phase,
  strategy_code
);

create index if not exists idx_behavior_topography_strategy_lookup
on public.behavior_topography_strategy_map (
  behavior_function,
  behavior_topography,
  strategy_phase,
  priority
);

-- 6) V2 BIP STRATEGY FUNCTION
create or replace function public.auto_generate_bip_strategy_set_v2(
  p_behavior_function text,
  p_behavior_topography text default null,
  p_setting_tags text[] default '{}',
  p_learner_profile_tags text[] default '{}'
)
returns table (
  behavior_function text,
  behavior_topography text,
  strategy_phase text,
  strategy_code text,
  strategy_title text,
  strategy_description text,
  replacement_category text,
  response_class text,
  implementation_json jsonb,
  fidelity_lookfors_json jsonb,
  data_collection_json jsonb,
  priority integer,
  strategy_source text
)
language sql
as $$
  with normalized as (
    select
      public.normalize_behavior_function(p_behavior_function) as canonical_function,
      public.normalize_behavior_topography(p_behavior_topography) as canonical_topography
  ),
  specific as (
    select
      m.behavior_function,
      m.behavior_topography,
      m.strategy_phase,
      m.strategy_code,
      m.strategy_title,
      m.strategy_description,
      m.replacement_category,
      m.response_class,
      m.implementation_json,
      m.fidelity_lookfors_json,
      m.data_collection_json,
      m.priority,
      'topography_specific'::text as strategy_source
    from normalized n
    join public.behavior_topography_strategy_map m
      on lower(m.behavior_function) = lower(n.canonical_function)
     and lower(m.behavior_topography) = lower(n.canonical_topography)
    where m.is_active = true
      and n.canonical_topography is not null
      and (
        cardinality(coalesce(m.setting_tags, '{}')) = 0
        or m.setting_tags && coalesce(p_setting_tags, '{}')
      )
      and (
        cardinality(coalesce(m.learner_profile_tags, '{}')) = 0
        or m.learner_profile_tags && coalesce(p_learner_profile_tags, '{}')
      )
  ),
  generic as (
    select
      m.behavior_function,
      null::text as behavior_topography,
      m.strategy_phase,
      m.strategy_code,
      m.strategy_title,
      m.strategy_description,
      m.replacement_category,
      m.response_class,
      m.implementation_json,
      m.fidelity_lookfors_json,
      m.data_collection_json,
      m.priority,
      'function_generic'::text as strategy_source
    from normalized n
    join public.behavior_function_bip_strategy_map m
      on lower(m.behavior_function) = lower(n.canonical_function)
    where m.is_active = true
      and (
        cardinality(coalesce(m.setting_tags, '{}')) = 0
        or m.setting_tags && coalesce(p_setting_tags, '{}')
      )
      and (
        cardinality(coalesce(m.learner_profile_tags, '{}')) = 0
        or m.learner_profile_tags && coalesce(p_learner_profile_tags, '{}')
      )
  )
  select *
  from (
    select * from specific
    union all
    select *
    from generic g
    where not exists (
      select 1
      from specific s
      where s.strategy_phase = g.strategy_phase
    )
  ) q
  order by
    case strategy_phase
      when 'antecedent' then 1
      when 'teaching' then 2
      when 'reinforcement' then 3
      when 'consequence' then 4
      when 'safety' then 5
      when 'data' then 6
      else 7
    end,
    priority desc,
    strategy_title;
$$;

-- 7) V2 BIP STARTER GENERATOR
create or replace function public.auto_generate_bip_starter_v2(
  p_primary_function text,
  p_behavior_topography text default null,
  p_secondary_function text default null,
  p_setting_tags text[] default '{}',
  p_learner_profile_tags text[] default '{}',
  p_client_id uuid default null,
  p_student_id uuid default null,
  p_created_by uuid default null
)
returns uuid
language plpgsql
as $$
declare
  v_id uuid;
  v_goals jsonb;
  v_strategies jsonb;
begin
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'engine_source', engine_source,
        'source_framework', source_framework,
        'source_code', source_code,
        'title', title,
        'primary_goal_text', primary_goal_text,
        'domain', domain,
        'replacement_category', replacement_category,
        'response_class', response_class,
        'recommendation_priority', recommendation_priority,
        'rationale', rationale,
        'crosswalk_tags_json', crosswalk_tags_json
      )
    ),
    '[]'::jsonb
  )
  into v_goals
  from public.auto_generate_f2o_goal_recommendations(
    p_primary_function,
    p_setting_tags,
    p_learner_profile_tags,
    12
  );

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'behavior_topography', behavior_topography,
        'strategy_phase', strategy_phase,
        'strategy_code', strategy_code,
        'strategy_title', strategy_title,
        'strategy_description', strategy_description,
        'replacement_category', replacement_category,
        'response_class', response_class,
        'implementation_json', implementation_json,
        'fidelity_lookfors_json', fidelity_lookfors_json,
        'data_collection_json', data_collection_json,
        'priority', priority,
        'strategy_source', strategy_source
      )
    ),
    '[]'::jsonb
  )
  into v_strategies
  from public.auto_generate_bip_strategy_set_v2(
    p_primary_function,
    p_behavior_topography,
    p_setting_tags,
    p_learner_profile_tags
  );

  insert into public.generated_bip_starters (
    client_id,
    student_id,
    primary_function,
    secondary_function,
    recommended_goals_json,
    recommended_strategies_json,
    plan_json,
    created_by
  )
  values (
    p_client_id,
    p_student_id,
    public.normalize_behavior_function(p_primary_function),
    public.normalize_behavior_function(p_secondary_function),
    v_goals,
    v_strategies,
    jsonb_build_object(
      'summary', jsonb_build_object(
        'primary_function', public.normalize_behavior_function(p_primary_function),
        'behavior_topography', public.normalize_behavior_topography(p_behavior_topography),
        'secondary_function', public.normalize_behavior_function(p_secondary_function),
        'setting_tags', coalesce(p_setting_tags, '{}'),
        'learner_profile_tags', coalesce(p_learner_profile_tags, '{}')
      ),
      'recommended_goals', v_goals,
      'recommended_strategies', v_strategies
    ),
    p_created_by
  )
  returning id into v_id;

  return v_id;
end;
$$;
