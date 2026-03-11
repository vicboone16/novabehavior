-- Enable RLS on all public tables that don't have it
DO $$
DECLARE
  t_name text;
BEGIN
  FOR t_name IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t_name);
  END LOOP;
END;
$$;