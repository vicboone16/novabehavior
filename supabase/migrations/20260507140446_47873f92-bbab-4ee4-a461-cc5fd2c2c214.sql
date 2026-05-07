
-- 1) Set immutable search_path on all SECURITY-relevant public functions lacking it
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND NOT EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig,'{}')) c WHERE c LIKE 'search_path=%'
      )
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e'
      )
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', r.nspname, r.proname, r.args);
    EXCEPTION WHEN insufficient_privilege THEN
      -- Skip functions we don't own (e.g., supabase-managed)
      NULL;
    END;
  END LOOP;
END $$;

-- 2) Tighten "always-true" RLS policies on writable commands by requiring authentication
DO $$
DECLARE r record; new_qual text; new_check text;
BEGIN
  FOR r IN
    SELECT polname, polrelid::regclass::text AS tbl,
           polcmd,
           pg_get_expr(polqual, polrelid) AS qual,
           pg_get_expr(polwithcheck, polrelid) AS wcheck
    FROM pg_policy
    WHERE polrelid::regclass::text NOT LIKE 'storage.%'
      AND polcmd <> 'r'
      AND (pg_get_expr(polqual, polrelid) = 'true'
           OR pg_get_expr(polwithcheck, polrelid) = 'true')
  LOOP
    new_qual := CASE WHEN r.qual = 'true' THEN '(auth.uid() IS NOT NULL)' ELSE r.qual END;
    new_check := CASE WHEN r.wcheck = 'true' THEN '(auth.uid() IS NOT NULL)' ELSE r.wcheck END;

    BEGIN
      IF new_qual IS NOT NULL AND new_check IS NOT NULL THEN
        EXECUTE format('ALTER POLICY %I ON %s USING (%s) WITH CHECK (%s)', r.polname, r.tbl, new_qual, new_check);
      ELSIF new_qual IS NOT NULL THEN
        EXECUTE format('ALTER POLICY %I ON %s USING (%s)', r.polname, r.tbl, new_qual);
      ELSIF new_check IS NOT NULL THEN
        EXECUTE format('ALTER POLICY %I ON %s WITH CHECK (%s)', r.polname, r.tbl, new_check);
      END IF;
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;
  END LOOP;
END $$;

-- 3) Revoke EXECUTE on SECURITY DEFINER public functions from anon; keep authenticated where applicable
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
  LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon', r.nspname, r.proname, r.args);
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;
  END LOOP;
END $$;

-- 4) Materialized views should not be exposed via PostgREST (Data API)
REVOKE ALL ON public.library_audit_dashboard_mv FROM anon, authenticated;
REVOKE ALL ON public.unified_goal_engine_mv FROM anon, authenticated;

-- 5) Public bucket "shared-library" should require auth for listing/deleting
DROP POLICY IF EXISTS "Anyone can read shared library files" ON storage.objects;
CREATE POLICY "Authenticated users can read shared library files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'shared-library' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete own shared library files" ON storage.objects;
CREATE POLICY "Authenticated users can delete shared library files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'shared-library' AND auth.uid() IS NOT NULL);
