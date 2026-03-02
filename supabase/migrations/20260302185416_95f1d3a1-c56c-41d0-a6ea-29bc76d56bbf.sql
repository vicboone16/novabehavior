
alter table public.appointments
  add column if not exists agency_id uuid null;

create index if not exists idx_appointments_agency on public.appointments(agency_id);

-- Backfill agency_id from the student's agency membership where possible
update public.appointments ap
set agency_id = (
  select am.agency_id
  from public.agency_memberships am
  where am.user_id = ap.created_by
    and am.status = 'active'
    and am.is_primary = true
  limit 1
)
where ap.agency_id is null;

notify pgrst, 'reload schema';
