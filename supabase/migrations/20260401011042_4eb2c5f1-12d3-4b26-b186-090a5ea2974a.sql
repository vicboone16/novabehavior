
-- =========================================================
-- NOVA CLINICAL INTELLIGENCE - ASSESSMENT ENGINE CORE TABLES
-- =========================================================

-- 1. Assessments
create table if not exists public.nova_assessments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  short_name text,
  assessment_type text not null,
  description text,
  scoring_model text not null,
  version text not null default '1.0',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Domains
create table if not exists public.nova_assessment_domains (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.nova_assessments(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  display_order int not null default 0,
  priority_order int,
  is_profile_driving boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, code)
);

-- 3. Subdomains
create table if not exists public.nova_assessment_subdomains (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.nova_assessment_domains(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (domain_id, code)
);

-- 4. Items
create table if not exists public.nova_assessment_items (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.nova_assessments(id) on delete cascade,
  domain_id uuid references public.nova_assessment_domains(id) on delete cascade,
  subdomain_id uuid references public.nova_assessment_subdomains(id) on delete set null,
  item_number int not null,
  item_code text not null,
  item_text text not null,
  reverse_scored boolean not null default false,
  min_score numeric not null default 0,
  max_score numeric not null default 3,
  scoring_notes text,
  archetype_code text,
  display_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, item_number),
  unique (assessment_id, item_code)
);

-- 5. Score bands
create table if not exists public.nova_score_bands (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.nova_assessments(id) on delete cascade,
  band_scope text not null,
  label text not null,
  min_value numeric not null,
  max_value numeric not null,
  display_order int not null default 0,
  color_token text,
  interpretation text,
  unique (assessment_id, band_scope, label)
);

-- 6. Profile definitions
create table if not exists public.nova_profile_definitions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.nova_assessments(id) on delete cascade,
  profile_code text not null,
  profile_name text not null,
  profile_type text not null,
  description text,
  clinical_meaning text,
  intervention_priority text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, profile_code)
);

-- 7. Report snippets
create table if not exists public.nova_report_snippets (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references public.nova_assessments(id) on delete cascade,
  snippet_key text not null,
  snippet_label text not null,
  snippet_text text not null,
  snippet_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, snippet_key)
);

-- 8. Assessment sessions (administrations)
create table if not exists public.nova_assessment_sessions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.nova_assessments(id) on delete cascade,
  student_id uuid not null,
  evaluator_user_id uuid,
  rater_name text,
  rater_role text,
  setting_name text,
  confidence_level int,
  administration_date date not null default current_date,
  notes text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 9. Item ratings
create table if not exists public.nova_assessment_ratings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.nova_assessment_sessions(id) on delete cascade,
  item_id uuid not null references public.nova_assessment_items(id) on delete cascade,
  raw_score numeric not null,
  normalized_score numeric,
  comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, item_id)
);

-- 10. Scored results
create table if not exists public.nova_assessment_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.nova_assessment_sessions(id) on delete cascade,
  result_scope text not null,
  result_key text not null,
  result_label text not null,
  raw_total numeric,
  avg_score numeric,
  band_label text,
  is_primary boolean not null default false,
  is_secondary boolean not null default false,
  result_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_nova_sessions_student_assessment
  on public.nova_assessment_sessions(student_id, assessment_id, administration_date desc);

create index if not exists idx_nova_ratings_session
  on public.nova_assessment_ratings(session_id);

create index if not exists idx_nova_results_session
  on public.nova_assessment_results(session_id, result_scope);

-- RLS
alter table public.nova_assessments enable row level security;
alter table public.nova_assessment_domains enable row level security;
alter table public.nova_assessment_subdomains enable row level security;
alter table public.nova_assessment_items enable row level security;
alter table public.nova_score_bands enable row level security;
alter table public.nova_profile_definitions enable row level security;
alter table public.nova_report_snippets enable row level security;
alter table public.nova_assessment_sessions enable row level security;
alter table public.nova_assessment_ratings enable row level security;
alter table public.nova_assessment_results enable row level security;

-- Reference tables readable by authenticated users
create policy "Authenticated read nova_assessments" on public.nova_assessments for select to authenticated using (true);
create policy "Authenticated read nova_assessment_domains" on public.nova_assessment_domains for select to authenticated using (true);
create policy "Authenticated read nova_assessment_subdomains" on public.nova_assessment_subdomains for select to authenticated using (true);
create policy "Authenticated read nova_assessment_items" on public.nova_assessment_items for select to authenticated using (true);
create policy "Authenticated read nova_score_bands" on public.nova_score_bands for select to authenticated using (true);
create policy "Authenticated read nova_profile_definitions" on public.nova_profile_definitions for select to authenticated using (true);
create policy "Authenticated read nova_report_snippets" on public.nova_report_snippets for select to authenticated using (true);

-- Session data: authenticated users can CRUD
create policy "Authenticated read nova_assessment_sessions" on public.nova_assessment_sessions for select to authenticated using (true);
create policy "Authenticated insert nova_assessment_sessions" on public.nova_assessment_sessions for insert to authenticated with check (true);
create policy "Authenticated update nova_assessment_sessions" on public.nova_assessment_sessions for update to authenticated using (true);

create policy "Authenticated read nova_assessment_ratings" on public.nova_assessment_ratings for select to authenticated using (true);
create policy "Authenticated insert nova_assessment_ratings" on public.nova_assessment_ratings for insert to authenticated with check (true);
create policy "Authenticated update nova_assessment_ratings" on public.nova_assessment_ratings for update to authenticated using (true);

create policy "Authenticated read nova_assessment_results" on public.nova_assessment_results for select to authenticated using (true);
create policy "Authenticated insert nova_assessment_results" on public.nova_assessment_results for insert to authenticated with check (true);
create policy "Authenticated update nova_assessment_results" on public.nova_assessment_results for update to authenticated using (true);
create policy "Authenticated delete nova_assessment_results" on public.nova_assessment_results for delete to authenticated using (true);

-- Normalized score trigger
create or replace function public.nova_compute_normalized_score(
  p_raw_score numeric,
  p_min_score numeric,
  p_max_score numeric,
  p_reverse_scored boolean
)
returns numeric
language sql
immutable
as $$
  select case
    when p_reverse_scored then (p_max_score - p_raw_score + p_min_score)
    else p_raw_score
  end
$$;

create or replace function public.nova_set_normalized_score()
returns trigger
language plpgsql
as $$
declare
  v_reverse boolean;
  v_min numeric;
  v_max numeric;
begin
  select reverse_scored, min_score, max_score
    into v_reverse, v_min, v_max
  from public.nova_assessment_items
  where id = new.item_id;

  new.normalized_score := public.nova_compute_normalized_score(
    new.raw_score,
    v_min,
    v_max,
    v_reverse
  );

  return new;
end;
$$;

drop trigger if exists trg_nova_set_normalized_score on public.nova_assessment_ratings;

create trigger trg_nova_set_normalized_score
before insert or update on public.nova_assessment_ratings
for each row
execute function public.nova_set_normalized_score();
