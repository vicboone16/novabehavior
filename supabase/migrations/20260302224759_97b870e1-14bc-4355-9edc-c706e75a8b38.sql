CREATE OR REPLACE FUNCTION public.has_app_access(_user_id uuid, _app_slug text, _agency_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH normalized AS (
    SELECT CASE lower(_app_slug)
      WHEN 'behaviordecoded' THEN 'behavior_decoded'
      WHEN 'teacherhub' THEN 'teacher_hub'
      ELSE lower(_app_slug)
    END AS canonical_slug
  )
  SELECT EXISTS (
    SELECT 1
    FROM public.user_app_access ua
    CROSS JOIN normalized n
    WHERE ua.user_id = _user_id
      AND ua.app_slug = n.canonical_slug
      AND ua.is_active = true
      AND (
        _agency_id IS NULL
        OR ua.agency_id = _agency_id
        OR ua.agency_id IS NULL
      )
  );
$function$;