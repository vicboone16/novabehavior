
-- 1) Add columns to parent_training_goal_assignments
alter table public.parent_training_goal_assignments
add column if not exists custom_goal_title text,
add column if not exists custom_goal_description text,
add column if not exists custom_measurement_method text,
add column if not exists custom_baseline_definition text,
add column if not exists custom_target_definition text,
add column if not exists custom_mastery_criteria text,
add column if not exists custom_unit text,
add column if not exists goal_source text default 'library',
add column if not exists save_as_library_candidate boolean default false,
add column if not exists mastery_status text default 'not_started',
add column if not exists percent_to_goal numeric,
add column if not exists last_data_date date;

-- 2) Backfill nulls
update public.parent_training_goal_assignments
set
  goal_source = coalesce(goal_source, 'library'),
  mastery_status = coalesce(mastery_status, 'not_started')
where goal_source is null
   or mastery_status is null;

-- 3) Ensure parent_training_custom_goals table and columns
create table if not exists public.parent_training_custom_goals (
    id uuid primary key default gen_random_uuid(),
    client_id uuid,
    caregiver_id uuid,
    module_id uuid,
    created_by uuid,
    goal_title text,
    goal_description text,
    measurement_method text,
    baseline_definition text,
    target_definition text,
    mastery_criteria text,
    unit text,
    add_to_library boolean default false,
    promoted_goal_id uuid,
    is_active boolean default true,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.parent_training_custom_goals
add column if not exists client_id uuid,
add column if not exists caregiver_id uuid,
add column if not exists module_id uuid,
add column if not exists created_by uuid,
add column if not exists goal_title text,
add column if not exists goal_description text,
add column if not exists measurement_method text,
add column if not exists baseline_definition text,
add column if not exists target_definition text,
add column if not exists mastery_criteria text,
add column if not exists unit text,
add column if not exists add_to_library boolean default false,
add column if not exists promoted_goal_id uuid,
add column if not exists is_active boolean default true,
add column if not exists created_at timestamptz default now(),
add column if not exists updated_at timestamptz default now();

create index if not exists idx_parent_training_custom_goals_module_id
on public.parent_training_custom_goals(module_id);

create index if not exists idx_parent_training_custom_goals_client_caregiver
on public.parent_training_custom_goals(client_id, caregiver_id);

-- 4) Updated-at trigger
create or replace function public.set_parent_training_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_parent_training_custom_goals_updated_at on public.parent_training_custom_goals;
create trigger trg_parent_training_custom_goals_updated_at
before update on public.parent_training_custom_goals
for each row
execute function public.set_parent_training_updated_at();

-- 5) Effective goals view
drop view if exists public.v_parent_training_caregiver_goal_sheet cascade;
drop view if exists public.v_parent_training_effective_goals cascade;

create view public.v_parent_training_effective_goals as
select
    ga.id as goal_assignment_id,
    ga.client_id,
    ga.caregiver_id,
    ga.module_assignment_id,
    ga.goal_id,
    ga.goal_source,
    coalesce(ga.custom_goal_title, g.goal_title, g.title) as effective_goal_title,
    coalesce(ga.custom_goal_description, g.goal_description, g.description) as effective_goal_description,
    coalesce(ga.custom_measurement_method, g.measurement_method) as effective_measurement_method,
    coalesce(ga.custom_baseline_definition, g.baseline_definition) as effective_baseline_definition,
    coalesce(ga.custom_target_definition, g.target_definition) as effective_target_definition,
    coalesce(ga.custom_mastery_criteria, g.mastery_criteria) as effective_mastery_criteria,
    coalesce(ga.custom_unit, g.unit) as effective_unit,
    ga.baseline_value,
    ga.target_value,
    ga.current_value,
    ga.status,
    ga.mastery_status,
    ga.percent_to_goal,
    ga.insurance_billable,
    ga.start_date,
    ga.target_date,
    ga.last_data_date,
    ga.notes,
    ga.save_as_library_candidate
from public.parent_training_goal_assignments ga
left join public.parent_training_goals g
  on g.id = ga.goal_id;

-- Recreate dependent view
create view public.v_parent_training_caregiver_goal_sheet as
select
    eg.goal_assignment_id,
    eg.client_id,
    eg.caregiver_id,
    eg.module_assignment_id,
    eg.effective_goal_title,
    eg.effective_goal_description,
    eg.effective_measurement_method,
    eg.effective_baseline_definition,
    eg.effective_target_definition,
    eg.effective_mastery_criteria,
    eg.effective_unit,
    eg.baseline_value,
    eg.target_value,
    eg.current_value,
    eg.status,
    eg.mastery_status,
    eg.percent_to_goal,
    eg.target_date,
    eg.notes,
    eg.goal_source
from public.v_parent_training_effective_goals eg;

-- 6) RPC: assign_parent_training_module
create or replace function public.assign_parent_training_module(
    p_client_id uuid,
    p_caregiver_id uuid,
    p_module_key text,
    p_assigned_by uuid default null,
    p_due_date date default null,
    p_target_date date default null
)
returns uuid
language plpgsql
security definer
as $$
declare
    v_module_id uuid;
    v_assignment_id uuid;
begin
    select id into v_module_id
    from public.parent_training_modules
    where module_key = p_module_key
      and coalesce(is_active, true) = true
    limit 1;

    if v_module_id is null then
        raise exception 'Parent training module not found: %', p_module_key;
    end if;

    insert into public.parent_training_assignments (
        client_id, caregiver_id, module_id, assigned_by, due_date, status
    ) values (
        p_client_id, p_caregiver_id, v_module_id, p_assigned_by, p_due_date, 'assigned'
    )
    on conflict (client_id, caregiver_id, module_id)
    do update set
        due_date = excluded.due_date,
        assigned_by = excluded.assigned_by,
        updated_at = now()
    returning id into v_assignment_id;

    insert into public.parent_training_goal_assignments (
        client_id, caregiver_id, module_assignment_id, goal_id,
        status, insurance_billable, start_date, target_date, goal_source, mastery_status
    )
    select
        p_client_id, p_caregiver_id, v_assignment_id, g.id,
        'active', true, current_date, p_target_date, 'library', 'not_started'
    from public.parent_training_goals g
    where g.module_id = v_module_id
      and coalesce(g.is_active, true) = true
    on conflict (module_assignment_id, goal_id) do nothing;

    return v_assignment_id;
end;
$$;

-- 7) RPC: update_parent_training_goal_assignment
create or replace function public.update_parent_training_goal_assignment(
    p_goal_assignment_id uuid,
    p_custom_goal_title text default null,
    p_custom_goal_description text default null,
    p_custom_measurement_method text default null,
    p_custom_baseline_definition text default null,
    p_custom_target_definition text default null,
    p_custom_mastery_criteria text default null,
    p_custom_unit text default null,
    p_baseline_value numeric default null,
    p_target_value numeric default null,
    p_current_value numeric default null,
    p_target_date date default null,
    p_notes text default null,
    p_save_as_library_candidate boolean default null
)
returns uuid
language plpgsql
security definer
as $$
begin
    update public.parent_training_goal_assignments
    set
        custom_goal_title = coalesce(p_custom_goal_title, custom_goal_title),
        custom_goal_description = coalesce(p_custom_goal_description, custom_goal_description),
        custom_measurement_method = coalesce(p_custom_measurement_method, custom_measurement_method),
        custom_baseline_definition = coalesce(p_custom_baseline_definition, custom_baseline_definition),
        custom_target_definition = coalesce(p_custom_target_definition, custom_target_definition),
        custom_mastery_criteria = coalesce(p_custom_mastery_criteria, custom_mastery_criteria),
        custom_unit = coalesce(p_custom_unit, custom_unit),
        baseline_value = coalesce(p_baseline_value, baseline_value),
        target_value = coalesce(p_target_value, target_value),
        current_value = coalesce(p_current_value, current_value),
        target_date = coalesce(p_target_date, target_date),
        notes = coalesce(p_notes, notes),
        save_as_library_candidate = coalesce(p_save_as_library_candidate, save_as_library_candidate),
        goal_source = case
            when goal_source = 'library' then 'modified_library'
            else goal_source
        end,
        updated_at = now()
    where id = p_goal_assignment_id;
    return p_goal_assignment_id;
end;
$$;

-- 8) RPC: add_custom_parent_training_goal
create or replace function public.add_custom_parent_training_goal(
    p_client_id uuid,
    p_caregiver_id uuid,
    p_module_assignment_id uuid,
    p_module_key text,
    p_goal_title text,
    p_goal_description text default null,
    p_measurement_method text default null,
    p_baseline_definition text default null,
    p_target_definition text default null,
    p_mastery_criteria text default null,
    p_unit text default null,
    p_created_by uuid default null,
    p_add_to_library boolean default false,
    p_target_date date default null
)
returns uuid
language plpgsql
security definer
as $$
declare
    v_module_id uuid;
    v_goal_assignment_id uuid;
begin
    select id into v_module_id
    from public.parent_training_modules
    where module_key = p_module_key
    limit 1;

    if v_module_id is null then
        raise exception 'Module not found: %', p_module_key;
    end if;

    insert into public.parent_training_custom_goals (
        client_id, caregiver_id, module_id, created_by,
        goal_title, goal_description, measurement_method,
        baseline_definition, target_definition, mastery_criteria, unit, add_to_library
    ) values (
        p_client_id, p_caregiver_id, v_module_id, p_created_by,
        p_goal_title, p_goal_description, p_measurement_method,
        p_baseline_definition, p_target_definition, p_mastery_criteria, p_unit, p_add_to_library
    );

    insert into public.parent_training_goal_assignments (
        client_id, caregiver_id, module_assignment_id, goal_id,
        custom_goal_title, custom_goal_description, custom_measurement_method,
        custom_baseline_definition, custom_target_definition, custom_mastery_criteria, custom_unit,
        status, insurance_billable, start_date, target_date, goal_source, save_as_library_candidate, mastery_status
    ) values (
        p_client_id, p_caregiver_id, p_module_assignment_id, null,
        p_goal_title, p_goal_description, p_measurement_method,
        p_baseline_definition, p_target_definition, p_mastery_criteria, p_unit,
        'active', true, current_date, p_target_date, 'custom', p_add_to_library, 'not_started'
    )
    returning id into v_goal_assignment_id;

    return v_goal_assignment_id;
end;
$$;

-- 9) RLS for parent_training_custom_goals
alter table public.parent_training_custom_goals enable row level security;

create policy "Authenticated users can view custom goals"
on public.parent_training_custom_goals for select
to authenticated using (true);

create policy "Authenticated users can insert custom goals"
on public.parent_training_custom_goals for insert
to authenticated with check (true);

create policy "Authenticated users can update custom goals"
on public.parent_training_custom_goals for update
to authenticated using (true);
