
-- Fix is_super_admin() no-arg: was checking agency_user_roles, should check user_roles
CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'super_admin'
  )
  OR EXISTS (
    SELECT 1
    FROM public.agency_memberships
    WHERE user_id = auth.uid()
      AND role = 'owner'
      AND status = 'active'
  );
$function$;

-- Fix has_agency_admin_access to also check agency_memberships
CREATE OR REPLACE FUNCTION public.has_agency_admin_access(p_agency_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.is_super_admin()
  OR EXISTS (
    SELECT 1
    FROM public.agency_user_roles r
    WHERE r.user_id = auth.uid()
      AND r.agency_id = p_agency_id
      AND r.role IN ('agency_admin', 'supervisor')
  )
  OR EXISTS (
    SELECT 1
    FROM public.agency_memberships m
    WHERE m.user_id = auth.uid()
      AND m.agency_id = p_agency_id
      AND m.role IN ('owner', 'admin')
      AND m.status = 'active'
  );
$function$;
