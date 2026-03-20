
create table if not exists public.clinical_frameworks (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  title text not null,
  framework_type text not null,
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.unified_clinical_domains (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  title text not null,
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.unified_clinical_subdomains (
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.unified_clinical_domains(id) on delete cascade,
  key text not null,
  title text not null,
  description text,
  sort_order int not null default 0,
  unique (domain_id, key)
);

create table if not exists public.unified_goal_framework_links (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.clinical_curricula_goals(id) on delete cascade,
  framework_id uuid not null references public.clinical_frameworks(id) on delete cascade,
  framework_domain text,
  framework_subdomain text,
  framework_item_code text,
  framework_item_title text,
  alignment_type text not null default 'direct',
  notes text
);

create index if not exists idx_ugfl_goal_id on public.unified_goal_framework_links(goal_id);
create index if not exists idx_ugfl_framework_id on public.unified_goal_framework_links(framework_id);
create index if not exists idx_ucs_domain_id on public.unified_clinical_subdomains(domain_id);

alter table public.clinical_frameworks enable row level security;
alter table public.unified_clinical_domains enable row level security;
alter table public.unified_clinical_subdomains enable row level security;
alter table public.unified_goal_framework_links enable row level security;

create policy "Authenticated read clinical_frameworks" on public.clinical_frameworks for select to authenticated using (true);
create policy "Authenticated read unified_clinical_domains" on public.unified_clinical_domains for select to authenticated using (true);
create policy "Authenticated read unified_clinical_subdomains" on public.unified_clinical_subdomains for select to authenticated using (true);
create policy "Authenticated read unified_goal_framework_links" on public.unified_goal_framework_links for select to authenticated using (true);
