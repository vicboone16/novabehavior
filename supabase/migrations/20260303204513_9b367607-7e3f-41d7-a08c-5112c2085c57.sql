CREATE OR REPLACE FUNCTION public.has_app_access(
  _user_id text DEFAULT NULL,
  _app_slug text DEFAULT NULL,
  _agency_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_email text;
  v_agency_id uuid;
  v_requested_slug text;
BEGIN
  -- Resolve user id from explicit arg first, then auth context
  BEGIN
    IF _user_id IS NOT NULL AND btrim(_user_id) <> '' THEN
      v_uid := _user_id::uuid;
    ELSE
      v_uid := auth.uid();
    END IF;
  EXCEPTION WHEN others THEN
    v_uid := auth.uid();
  END;

  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  -- Resolve agency from explicit arg or active context
  BEGIN
    IF _agency_id IS NOT NULL AND btrim(_agency_id) <> '' THEN
      v_agency_id := _agency_id::uuid;
    ELSE
      SELECT uac.current_agency_id
      INTO v_agency_id
      FROM public.user_agency_context uac
      WHERE uac.user_id = v_uid
      LIMIT 1;
    END IF;
  EXCEPTION WHEN others THEN
    v_agency_id := NULL;
  END;

  -- Normalize slug for cross-app alias tolerance
  v_requested_slug := regexp_replace(lower(coalesce(_app_slug, '')), '[^a-z0-9]+', '', 'g');

  -- Always allow hardcoded admin account
  SELECT email INTO v_email
  FROM auth.users
  WHERE id = v_uid;

  IF v_email = 'victoriaboonebcba@gmail.com' THEN
    RETURN true;
  END IF;

  -- Super admin / admin bypass
  IF EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = v_uid
      AND role IN ('super_admin', 'admin')
  ) THEN
    RETURN true;
  END IF;

  -- Owner role in active agency bypass
  IF EXISTS (
    SELECT 1
    FROM public.agency_memberships
    WHERE user_id = v_uid
      AND role = 'owner'
      AND status = 'active'
  ) THEN
    RETURN true;
  END IF;

  -- Independent mode passthrough (no active agency selected)
  IF NOT EXISTS (
    SELECT 1
    FROM public.user_agency_context
    WHERE user_id = v_uid
      AND current_agency_id IS NOT NULL
  ) THEN
    RETURN true;
  END IF;

  -- App-scoped allowlist: exact app match (normalized) for active rows
  IF EXISTS (
    SELECT 1
    FROM public.user_app_access uaa
    WHERE uaa.user_id = v_uid
      AND coalesce(uaa.is_active, true) = true
      AND (
        v_requested_slug = ''
        OR regexp_replace(lower(coalesce(uaa.app_slug, '')), '[^a-z0-9]+', '', 'g') = v_requested_slug
      )
      AND (
        uaa.agency_id IS NULL
        OR v_agency_id IS NULL
        OR uaa.agency_id = v_agency_id
      )
  ) THEN
    RETURN true;
  END IF;

  -- Legacy fallback (do not break existing records)
  IF EXISTS (
    SELECT 1
    FROM public.user_agency_access
    WHERE user_id = v_uid
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;