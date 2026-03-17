
create extension if not exists pgcrypto;

-- COMMAND TASKS TABLE
create table if not exists public.command_tasks (
  id uuid primary key default gen_random_uuid(),
  app_slug text not null,
  repo_owner text not null,
  repo_name text not null,
  command_name text not null,
  command_payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  created_by text,
  output_summary text,
  github_issue_number bigint,
  github_issue_url text,
  task_file_path text,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists idx_command_tasks_status on public.command_tasks(status);
create index if not exists idx_command_tasks_app_slug on public.command_tasks(app_slug);
create index if not exists idx_command_tasks_created_at on public.command_tasks(created_at desc);

-- APP COMMAND REGISTRY
create table if not exists public.app_command_registry (
  app_slug text primary key,
  repo_owner text not null,
  repo_name text not null,
  default_branch text not null default 'main',
  allowed_commands text[] not null default '{}',
  project_label text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_command_registry_is_active on public.app_command_registry(is_active);

-- UPDATED_AT TRIGGER
create or replace function public.set_updated_at_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_command_registry_updated_at on public.app_command_registry;
create trigger trg_app_command_registry_updated_at
before update on public.app_command_registry
for each row execute function public.set_updated_at_timestamp();

-- RLS
alter table public.command_tasks enable row level security;
alter table public.app_command_registry enable row level security;

drop policy if exists "authenticated users can read command tasks" on public.command_tasks;
drop policy if exists "authenticated users can insert command tasks" on public.command_tasks;
drop policy if exists "authenticated users can update command tasks" on public.command_tasks;
drop policy if exists "authenticated users can read app registry" on public.app_command_registry;
drop policy if exists "authenticated users can insert app registry" on public.app_command_registry;
drop policy if exists "authenticated users can update app registry" on public.app_command_registry;

create policy "authenticated users can read command tasks" on public.command_tasks for select to authenticated using (true);
create policy "authenticated users can insert command tasks" on public.command_tasks for insert to authenticated with check (true);
create policy "authenticated users can update command tasks" on public.command_tasks for update to authenticated using (true) with check (true);
create policy "authenticated users can read app registry" on public.app_command_registry for select to authenticated using (true);
create policy "authenticated users can insert app registry" on public.app_command_registry for insert to authenticated with check (true);
create policy "authenticated users can update app registry" on public.app_command_registry for update to authenticated using (true) with check (true);
