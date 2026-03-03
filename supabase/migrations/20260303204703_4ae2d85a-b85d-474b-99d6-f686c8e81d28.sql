DROP FUNCTION IF EXISTS public.has_app_access(text, text, text);

CREATE FUNCTION public.has_app_access(
  _user_id text,
  _app_slug text,
  _agency_id text
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