
-- RPC: Generate a random agency invite code (e.g. "AGY-XXXX-XXXX")
CREATE OR REPLACE FUNCTION public.generate_agency_invite_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_code text;
  v_exists boolean;
begin
  loop
    v_code := 'AGY-' || upper(substr(md5(random()::text), 1, 4)) || '-' || upper(substr(md5(random()::text), 1, 4));
    select exists(select 1 from public.agency_invite_codes where code = v_code) into v_exists;
    exit when not v_exists;
  end loop;
  return v_code;
end;
$$;

GRANT EXECUTE ON FUNCTION public.generate_agency_invite_code() TO authenticated;

-- RPC: Redeem an agency invite code
CREATE OR REPLACE FUNCTION public.redeem_agency_invite_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_uid uuid;
  v_row public.agency_invite_codes%rowtype;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'Authentication required');
  end if;

  p_code := btrim(upper(p_code));

  -- Find valid code
  select * into v_row
  from public.agency_invite_codes
  where upper(code) = p_code
    and is_active = true
    and uses < max_uses
    and (expires_at is null or expires_at > now())
  limit 1;

  if v_row.id is null then
    return jsonb_build_object('success', false, 'error', 'Invalid or expired invite code');
  end if;

  -- Check if already a member
  if exists (
    select 1 from public.agency_memberships
    where user_id = v_uid and agency_id = v_row.agency_id
  ) then
    return jsonb_build_object('success', false, 'error', 'You are already a member of this agency');
  end if;

  -- Create membership
  insert into public.agency_memberships (user_id, agency_id, role, status, is_primary, joined_at)
  values (v_uid, v_row.agency_id, v_row.role, 'active', false, now());

  -- Set as primary if user has no primary
  update public.agency_memberships
  set is_primary = true
  where user_id = v_uid and agency_id = v_row.agency_id
    and not exists (select 1 from public.agency_memberships where user_id = v_uid and is_primary = true);

  -- Update agency context
  insert into public.user_agency_context (user_id, current_agency_id, last_switched_at, created_at)
  values (v_uid, v_row.agency_id, now(), now())
  on conflict (user_id)
  do update set current_agency_id = excluded.current_agency_id, last_switched_at = now();

  -- Increment usage
  update public.agency_invite_codes
  set uses = uses + 1, updated_at = now()
  where id = v_row.id;

  return jsonb_build_object(
    'success', true,
    'agency_id', v_row.agency_id,
    'role', v_row.role
  );
end;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_agency_invite_code(text) TO authenticated;
NOTIFY pgrst, 'reload schema';
