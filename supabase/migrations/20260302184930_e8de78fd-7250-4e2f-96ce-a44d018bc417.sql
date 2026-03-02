
drop function if exists public.rpc_export_hours(uuid, date, date, text);

create or replace function public.rpc_export_hours(
  p_agency_id uuid,
  p_start_date date,
  p_end_date date,
  p_grouping text default 'by_staff'
)
returns table (
  group_key text,
  group_label text,
  total_minutes bigint,
  billable_minutes bigint,
  nonbillable_minutes bigint,
  total_hours numeric,
  billable_hours numeric,
  nonbillable_hours numeric,
  entry_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_grouping = 'by_staff' then
    return query
      select
        te.user_id::text as group_key,
        coalesce(p.display_name, p.email, te.user_id::text) as group_label,
        coalesce(sum(te.duration_minutes), 0)::bigint as total_minutes,
        coalesce(sum(case when te.is_billable then te.duration_minutes else 0 end), 0)::bigint as billable_minutes,
        coalesce(sum(case when not te.is_billable then te.duration_minutes else 0 end), 0)::bigint as nonbillable_minutes,
        round(coalesce(sum(te.duration_minutes), 0) / 60.0, 2) as total_hours,
        round(coalesce(sum(case when te.is_billable then te.duration_minutes else 0 end), 0) / 60.0, 2) as billable_hours,
        round(coalesce(sum(case when not te.is_billable then te.duration_minutes else 0 end), 0) / 60.0, 2) as nonbillable_hours,
        count(*)::bigint as entry_count
      from public.time_entries te
      left join public.profiles p on p.id = te.user_id
      where te.agency_id = p_agency_id
        and (te.started_at at time zone 'UTC')::date between p_start_date and p_end_date
        and te.status in ('posted', 'reserved')
      group by te.user_id, p.display_name, p.email
      order by group_label;
  elsif p_grouping = 'by_client' then
    return query
      select
        coalesce(te.student_id::text, 'unassigned') as group_key,
        coalesce(s.first_name || ' ' || s.last_name, 'Unassigned') as group_label,
        coalesce(sum(te.duration_minutes), 0)::bigint as total_minutes,
        coalesce(sum(case when te.is_billable then te.duration_minutes else 0 end), 0)::bigint as billable_minutes,
        coalesce(sum(case when not te.is_billable then te.duration_minutes else 0 end), 0)::bigint as nonbillable_minutes,
        round(coalesce(sum(te.duration_minutes), 0) / 60.0, 2) as total_hours,
        round(coalesce(sum(case when te.is_billable then te.duration_minutes else 0 end), 0) / 60.0, 2) as billable_hours,
        round(coalesce(sum(case when not te.is_billable then te.duration_minutes else 0 end), 0) / 60.0, 2) as nonbillable_hours,
        count(*)::bigint as entry_count
      from public.time_entries te
      left join public.students s on s.id = te.student_id
      where te.agency_id = p_agency_id
        and (te.started_at at time zone 'UTC')::date between p_start_date and p_end_date
        and te.status in ('posted', 'reserved')
      group by te.student_id, s.first_name, s.last_name
      order by group_label;
  else
    return query
      select
        te.activity_type as group_key,
        te.activity_type as group_label,
        coalesce(sum(te.duration_minutes), 0)::bigint as total_minutes,
        coalesce(sum(case when te.is_billable then te.duration_minutes else 0 end), 0)::bigint as billable_minutes,
        coalesce(sum(case when not te.is_billable then te.duration_minutes else 0 end), 0)::bigint as nonbillable_minutes,
        round(coalesce(sum(te.duration_minutes), 0) / 60.0, 2) as total_hours,
        round(coalesce(sum(case when te.is_billable then te.duration_minutes else 0 end), 0) / 60.0, 2) as billable_hours,
        round(coalesce(sum(case when not te.is_billable then te.duration_minutes else 0 end), 0) / 60.0, 2) as nonbillable_hours,
        count(*)::bigint as entry_count
      from public.time_entries te
      where te.agency_id = p_agency_id
        and (te.started_at at time zone 'UTC')::date between p_start_date and p_end_date
        and te.status in ('posted', 'reserved')
      group by te.activity_type
      order by group_label;
  end if;
end;
$$;

grant execute on function public.rpc_export_hours(uuid, date, date, text) to authenticated;
notify pgrst, 'reload schema';
