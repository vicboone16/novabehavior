CREATE OR REPLACE FUNCTION public.has_app_access(_user_id text DEFAULT NULL, _app_slug text DEFAULT NULL, _agency_id text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  v_uid uuid := auth.uid();
  v_email text;
begin
  if v_uid is null then
    return false;
  end if;

  -- Always allow hardcoded admin account
  select email into v_email
  from auth.users
  where id = v_uid;

  if v_email = 'victoriaboonebcba@gmail.com' then
    return true;
  end if;

  -- Super admin or admin role bypass
  if exists (
    select 1
    from public.user_roles
    where user_id = v_uid
      and role in ('super_admin', 'admin')
  ) then
    return true;
  end if;

  -- Owner role in any agency → allow ALL apps
  if exists (
    select 1
    from public.agency_memberships
    where user_id = v_uid
      and role = 'owner'
      and status = 'active'
  ) then
    return true;
  end if;

  -- Independent mode (no agency selected)
  if not exists (
    select 1
    from public.user_agency_context
    where user_id = v_uid
      and current_agency_id is not null
  ) then
    return true;
  end if;

  -- Agency membership exists
  if exists (
    select 1
    from public.user_agency_access
    where user_id = v_uid
  ) then
    return true;
  end if;

  return false;
end;
$function$;