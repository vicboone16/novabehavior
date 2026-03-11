-- Fix security definer views: set security_invoker=on using dynamic SQL
DO $$
DECLARE
  v_name text;
BEGIN
  FOR v_name IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'v'
      AND (c.reloptions IS NULL OR NOT (c.reloptions @> ARRAY['security_invoker=on']))
  LOOP
    EXECUTE format('ALTER VIEW public.%I SET (security_invoker = on)', v_name);
  END LOOP;
END;
$$;