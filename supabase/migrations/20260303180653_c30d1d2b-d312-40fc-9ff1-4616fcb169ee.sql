CREATE OR REPLACE FUNCTION public.has_app_access(
  _user_id uuid,
  _app_slug text,
  _agency_id uuid DEFAULT NULL::uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH requested AS (
    SELECT CASE regexp_replace(lower(coalesce(_app_slug, '')), '[^a-z0-9]', '', 'g')
      WHEN 'novatrack' THEN 'novatrack'
      WHEN 'studentconnect' THEN 'student_connect'
      WHEN 'behaviordecoded' THEN 'behavior_decoded'
      WHEN 'behaviorcoded' THEN 'behavior_decoded'
      WHEN 'teacherhub' THEN 'teacher_hub'
      WHEN 'teachhub' THEN 'teacher_hub'
      WHEN 'novateachers' THEN 'teacher_hub'
      WHEN 'novateacher' THEN 'teacher_hub'
      ELSE lower(coalesce(_app_slug, ''))
    END AS canonical_slug
  ),
  normalized_access AS (
    SELECT
      ua.user_id,
      ua.agency_id,
      ua.is_active,
      CASE regexp_replace(lower(coalesce(ua.app_slug, '')), '[^a-z0-9]', '', 'g')
        WHEN 'novatrack' THEN 'novatrack'
        WHEN 'studentconnect' THEN 'student_connect'
        WHEN 'behaviordecoded' THEN 'behavior_decoded'
        WHEN 'behaviorcoded' THEN 'behavior_decoded'
        WHEN 'teacherhub' THEN 'teacher_hub'
        WHEN 'teachhub' THEN 'teacher_hub'
        WHEN 'novateachers' THEN 'teacher_hub'
        WHEN 'novateacher' THEN 'teacher_hub'
        ELSE lower(coalesce(ua.app_slug, ''))
      END AS canonical_slug
    FROM public.user_app_access ua
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized_access ua
    CROSS JOIN requested r
    WHERE ua.user_id = _user_id
      AND ua.canonical_slug = r.canonical_slug
      AND ua.is_active = true
      AND (
        _agency_id IS NULL
        OR ua.agency_id = _agency_id
        OR ua.agency_id IS NULL
      )
  );
$function$;