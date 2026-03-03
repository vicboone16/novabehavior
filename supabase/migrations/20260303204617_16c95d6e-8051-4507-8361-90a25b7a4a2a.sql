-- Canonical implementation used by all overloads
CREATE OR REPLACE FUNCTION public.has_app_access(
  _user_id uuid,
  _app_slug text,
  _agency_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_agency_id uuid := _agency_id;
  v_requested_slug text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN false;
  END IF;

  IF v_agency_id IS NULL THEN
    SELECT uac.current_agency_id
    INTO v_agency_id
    FROM public.user_agency_context uac
    WHERE uac.user_id = _user_id
    LIMIT 1;
  END IF;

  -- Canonicalize requested slug
  v_requested_slug := CASE regexp_replace(lower(coalesce(_app_slug, '')), '[^a-z0-9]', '', 'g')
    WHEN 'novatrack' THEN 'novatrack'
    WHEN 'studentconnect' THEN 'student_connect'
    WHEN 'behaviordecoded' THEN 'behavior_decoded'
    WHEN 'behaviorcoded' THEN 'behavior_decoded'
    WHEN 'teacherhub' THEN 'teacher_hub'
    WHEN 'teachhub' THEN 'teacher_hub'
    WHEN 'novateachers' THEN 'teacher_hub'
    WHEN 'novateacher' THEN 'teacher_hub'
    ELSE lower(coalesce(_app_slug, ''))
  END;

  -- Always allow hardcoded admin account
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = _user_id;

  IF v_email = 'victoriaboonebcba@gmail.com' THEN
    RETURN true;
  END IF;

  -- Super admin / admin bypass
  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role IN ('super_admin', 'admin')
  ) THEN
    RETURN true;
  END IF;

  -- Owner bypass across apps
  IF EXISTS (
    SELECT 1
    FROM public.agency_memberships am
    WHERE am.user_id = _user_id
      AND am.role = 'owner'
      AND am.status = 'active'
  ) THEN
    RETURN true;
  END IF;

  -- Independent mode passthrough (no agency selected)
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_agency_context uac
    WHERE uac.user_id = _user_id
      AND uac.current_agency_id IS NOT NULL
  ) THEN
    RETURN true;
  END IF;

  -- App-specific active access, including agency-global rows
  IF EXISTS (
    SELECT 1
    FROM public.user_app_access ua
    WHERE ua.user_id = _user_id
      AND coalesce(ua.is_active, true) = true
      AND (
        v_requested_slug = ''
        OR (
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
          END
        ) = v_requested_slug
      )
      AND (
        v_agency_id IS NULL
        OR ua.agency_id = v_agency_id
        OR ua.agency_id IS NULL
      )
  ) THEN
    RETURN true;
  END IF;

  -- Legacy fallback (do not break existing records)
  IF EXISTS (
    SELECT 1
    FROM public.user_agency_access uaa
    WHERE uaa.user_id = _user_id
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- 1-arg overload used in RLS policies and app checks
CREATE OR REPLACE FUNCTION public.has_app_access(p_app_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_app_access(
    auth.uid(),
    p_app_slug,
    (
      SELECT uac.current_agency_id
      FROM public.user_agency_context uac
      WHERE uac.user_id = auth.uid()
      LIMIT 1
    )
  );
$$;

-- text overload used by cross-app calls
CREATE OR REPLACE FUNCTION public.has_app_access(
  _user_id text DEFAULT NULL,
  _app_slug text DEFAULT NULL,
  _agency_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_agency uuid;
BEGIN
  BEGIN
    IF _user_id IS NOT NULL AND btrim(_user_id) <> '' THEN
      v_uid := _user_id::uuid;
    ELSE
      v_uid := auth.uid();
    END IF;
  EXCEPTION WHEN others THEN
    v_uid := auth.uid();
  END;

  BEGIN
    IF _agency_id IS NOT NULL AND btrim(_agency_id) <> '' THEN
      v_agency := _agency_id::uuid;
    ELSE
      v_agency := NULL;
    END IF;
  EXCEPTION WHEN others THEN
    v_agency := NULL;
  END;

  RETURN public.has_app_access(v_uid, _app_slug, v_agency);
END;
$$;