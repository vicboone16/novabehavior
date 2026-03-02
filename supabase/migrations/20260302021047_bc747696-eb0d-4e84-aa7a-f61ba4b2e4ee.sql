
CREATE OR REPLACE FUNCTION public.rpc_redeem_master_pin(p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
declare
  v_uid uuid;
  v_email text;
  v_row public.admin_master_codes%rowtype;
  v_agency_count int;
  v_first_agency uuid;
begin
  v_uid := auth.uid();

  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  p_pin := btrim(p_pin);

  select email into v_email
  from auth.users
  where id = v_uid;

  select *
  into v_row
  from public.admin_master_codes
  where (expires_at is null or expires_at >= now())
    and uses < max_uses
    and (allowed_emails is null or v_email = any(allowed_emails))
    and crypt(p_pin, code_hash) = code_hash
  order by created_at desc
  limit 1;

  if v_row.id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_pin');
  end if;

  -- Grant owner access to all agencies via agency_memberships
  insert into public.agency_memberships (user_id, agency_id, role, status, is_primary, joined_at)
  select v_uid, a.id, 'owner', 'active', false, now()
  from public.agencies a
  where NOT EXISTS (
    select 1 from public.agency_memberships am
    where am.user_id = v_uid and am.agency_id = a.id
  );

  get diagnostics v_agency_count = row_count;

  -- Set first membership as primary if user has none
  UPDATE public.agency_memberships
  SET is_primary = true
  WHERE user_id = v_uid
    AND agency_id = (select id from public.agencies order by created_at asc limit 1)
    AND NOT EXISTS (select 1 from public.agency_memberships where user_id = v_uid and is_primary = true);

  select id into v_first_agency
  from public.agencies
  order by created_at desc nulls last
  limit 1;

  if v_first_agency is not null then
    insert into public.user_agency_context (user_id, current_agency_id, last_switched_at, created_at)
    values (v_uid, v_first_agency, now(), now())
    on conflict (user_id)
    do update set current_agency_id = excluded.current_agency_id,
                  last_switched_at = now();
  end if;

  update public.admin_master_codes
  set uses = uses + 1
  where id = v_row.id;

  return jsonb_build_object(
    'ok', true,
    'granted_agencies', v_agency_count,
    'active_agency_id', v_first_agency
  );
end;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_redeem_master_pin(text) TO authenticated;
NOTIFY pgrst, 'reload schema';
