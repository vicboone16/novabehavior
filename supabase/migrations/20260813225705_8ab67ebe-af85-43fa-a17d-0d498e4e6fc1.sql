CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.cleanup_purge_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  purged_count integer NOT NULL DEFAULT 0,
  oldest_retention_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cleanup_purge_runs TO authenticated;
GRANT ALL ON public.cleanup_purge_runs TO service_role;

ALTER TABLE public.cleanup_purge_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view purge runs" ON public.cleanup_purge_runs;
CREATE POLICY "Admins can view purge runs"
ON public.cleanup_purge_runs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

CREATE OR REPLACE FUNCTION public.purge_expired_cleanup_archives()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_oldest timestamptz;
BEGIN
  SELECT min(retention_until) INTO v_oldest
  FROM public.cleanup_archived_records
  WHERE retention_until < now();

  WITH deleted AS (
    DELETE FROM public.cleanup_archived_records
    WHERE retention_until < now()
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM deleted;

  INSERT INTO public.cleanup_purge_runs (purged_count, oldest_retention_until)
  VALUES (v_count, v_oldest);

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_cleanup_archives() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_expired_cleanup_archives() TO service_role;

SELECT cron.unschedule('purge-expired-cleanup-archives')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'purge-expired-cleanup-archives'
);

SELECT cron.schedule(
  'purge-expired-cleanup-archives',
  '15 3 * * *',
  $$SELECT public.purge_expired_cleanup_archives();$$
);