
-- Add missing columns to claim_batches
alter table public.claim_batches
  add column if not exists item_count integer not null default 0;
alter table public.claim_batches
  add column if not exists total_minutes integer not null default 0;
alter table public.claim_batches
  add column if not exists submitted_at timestamptz null;
alter table public.claim_batches
  add column if not exists notes text null;

-- Add missing column to claim_batch_items
alter table public.claim_batch_items
  add column if not exists status text not null default 'pending';

-- Fix RLS policies using correct column name claim_batch_id
drop policy if exists "claim_batch_items_select" on public.claim_batch_items;
drop policy if exists "claim_batch_items_insert" on public.claim_batch_items;

create policy "claim_batch_items_select" on public.claim_batch_items
  for select using (
    exists (select 1 from public.claim_batches cb where cb.id = claim_batch_id and cb.created_by = auth.uid())
  );
create policy "claim_batch_items_insert" on public.claim_batch_items
  for insert with check (
    exists (select 1 from public.claim_batches cb where cb.id = claim_batch_id and cb.created_by = auth.uid())
  );

-- rpc_add_time_entry_to_timesheet
create or replace function public.rpc_add_time_entry_to_timesheet(p_time_entry_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_te record;
  v_ts_id uuid;
  v_period_start date;
  v_period_end date;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  select * into v_te from public.time_entries where id = p_time_entry_id;
  if v_te is null then
    return jsonb_build_object('ok', false, 'error', 'time_entry_not_found');
  end if;

  v_period_start := date_trunc('week', (v_te.started_at at time zone 'UTC')::date)::date;
  v_period_end := v_period_start + interval '13 days';

  select id into v_ts_id
  from public.staff_timesheets
  where staff_user_id = v_uid
    and pay_period_start = v_period_start
    and pay_period_end = v_period_end
  limit 1;

  if v_ts_id is null then
    insert into public.staff_timesheets (staff_user_id, agency_id, pay_period_start, pay_period_end, status)
    values (v_uid, v_te.agency_id, v_period_start, v_period_end, 'draft')
    returning id into v_ts_id;
  end if;

  insert into public.timesheet_entries (
    timesheet_id, entry_date, entry_type, duration_minutes,
    is_billable, student_id, appointment_id, description
  )
  values (
    v_ts_id,
    (v_te.started_at at time zone 'UTC')::date,
    v_te.activity_type,
    coalesce(v_te.duration_minutes, 0),
    v_te.is_billable,
    v_te.student_id,
    v_te.appointment_id,
    'Auto-added from posted time entry'
  );

  return jsonb_build_object('ok', true, 'timesheet_id', v_ts_id);
end;
$$;

grant execute on function public.rpc_add_time_entry_to_timesheet(uuid) to authenticated;

-- rpc_recalc_timesheet_totals
create or replace function public.rpc_recalc_timesheet_totals(p_timesheet_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
  v_billable int;
  v_nonbillable int;
begin
  select
    coalesce(sum(duration_minutes), 0),
    coalesce(sum(case when is_billable then duration_minutes else 0 end), 0),
    coalesce(sum(case when not coalesce(is_billable, false) then duration_minutes else 0 end), 0)
  into v_total, v_billable, v_nonbillable
  from public.timesheet_entries
  where timesheet_id = p_timesheet_id;

  update public.staff_timesheets
  set total_hours = round(v_total / 60.0, 2),
      billable_hours = round(v_billable / 60.0, 2),
      non_billable_hours = round(v_nonbillable / 60.0, 2),
      updated_at = now()
  where id = p_timesheet_id;

  return jsonb_build_object('ok', true, 'total_minutes', v_total, 'billable_minutes', v_billable);
end;
$$;

grant execute on function public.rpc_recalc_timesheet_totals(uuid) to authenticated;

-- rpc_create_claim_batch (uses claim_batch_id column)
create or replace function public.rpc_create_claim_batch(p_agency_id uuid, p_limit integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_batch_id uuid;
  v_count int;
  v_total_min int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  insert into public.claim_batches (agency_id, created_by)
  values (p_agency_id, v_uid)
  returning id into v_batch_id;

  with picked as (
    select id from public.session_postings
    where agency_id = p_agency_id
      and post_status = 'ready_for_claim'
      and is_billable = true
    order by posted_at asc
    limit p_limit
  )
  insert into public.claim_batch_items (claim_batch_id, session_posting_id)
  select v_batch_id, id from picked;

  get diagnostics v_count = row_count;

  update public.session_postings
  set post_status = 'batched'
  where id in (select session_posting_id from public.claim_batch_items where claim_batch_id = v_batch_id);

  select coalesce(sum(sp.rounded_minutes), 0) into v_total_min
  from public.claim_batch_items cbi
  join public.session_postings sp on sp.id = cbi.session_posting_id
  where cbi.claim_batch_id = v_batch_id;

  update public.claim_batches
  set item_count = v_count, total_minutes = v_total_min
  where id = v_batch_id;

  return jsonb_build_object('ok', true, 'batch_id', v_batch_id, 'item_count', v_count, 'total_minutes', v_total_min);
end;
$$;

grant execute on function public.rpc_create_claim_batch(uuid, integer) to authenticated;

notify pgrst, 'reload schema';
