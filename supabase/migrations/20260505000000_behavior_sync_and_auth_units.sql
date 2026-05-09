-- Enable Realtime on session_data so cross-staff taps propagate immediately
alter publication supabase_realtime add table session_data;

-- Safe increment of authorization units_used (atomic, avoids race conditions)
create or replace function increment_authorization_units(
  p_authorization_id uuid,
  p_units integer
)
returns void
language plpgsql
security definer
as $$
begin
  update authorizations
  set
    units_used      = units_used + p_units,
    units_remaining = greatest(0, coalesce(units_approved - (units_used + p_units), 0)),
    updated_at      = now()
  where id = p_authorization_id;
end;
$$;

-- Grant execute to authenticated users
grant execute on function increment_authorization_units(uuid, integer) to authenticated;

-- Index to speed up authorization lookup during session start
create index if not exists idx_authorizations_student_status_dates
  on authorizations (student_id, status, start_date, end_date);

-- Index to speed up session_data realtime fan-out queries
create index if not exists idx_session_data_session_id_ts
  on session_data (session_id, timestamp);
