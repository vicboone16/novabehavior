CREATE OR REPLACE FUNCTION public.rpc_get_active_agency()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_uid uuid := auth.uid();
  v_agency_id uuid;
  v_agency jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  -- Get current agency context
  select current_agency_id into v_agency_id
  from public.user_agency_context
  where user_id = v_uid;

  -- If no context set, fall back to first agency from user_agency_access
  if v_agency_id is null then
    select agency_id into v_agency_id
    from public.user_agency_access
    where user_id = v_uid
    limit 1;
  end if;

  if v_agency_id is null then
    return jsonb_build_object('ok', true, 'agency', null);
  end if;

  -- Fetch agency details
  select jsonb_build_object(
    'id', a.id,
    'name', a.name,
    'slug', a.slug,
    'status', a.status,
    'logo_url', a.logo_url,
    'coverage_mode', a.coverage_mode,
    'primary_entity_label', a.primary_entity_label
  ) into v_agency
  from public.agencies a
  where a.id = v_agency_id;

  return jsonb_build_object('ok', true, 'agency', v_agency, 'agency_id', v_agency_id);
end;
$$;