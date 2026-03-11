
-- Helper function: get tables without RLS
CREATE OR REPLACE FUNCTION public.get_tables_without_rls()
RETURNS TABLE(table_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.relname::text as table_name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND NOT c.relrowsecurity
  ORDER BY c.relname;
$$;

-- Helper function: get SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION public.get_security_definer_functions()
RETURNS TABLE(function_name text, search_path_set boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.proname::text as function_name,
         (p.proconfig IS NOT NULL AND EXISTS (
           SELECT 1 FROM unnest(p.proconfig) cfg WHERE cfg LIKE 'search_path=%'
         )) as search_path_set
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
  ORDER BY p.proname;
$$;

-- Helper function: get views without security_invoker
CREATE OR REPLACE FUNCTION public.get_views_without_security_invoker()
RETURNS TABLE(view_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.relname::text as view_name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_options_to_table(c.reloptions) opt ON opt.option_name = 'security_invoker'
  WHERE n.nspname = 'public'
    AND c.relkind = 'v'
    AND (opt.option_value IS NULL OR opt.option_value != 'on')
  ORDER BY c.relname;
$$;
