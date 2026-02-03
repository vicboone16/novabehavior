-- =============================================
-- FIX REMAINING SECURITY ISSUES
-- =============================================

-- Fix functions missing search_path
CREATE OR REPLACE FUNCTION public.generate_agency_slug(_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT lower(regexp_replace(regexp_replace(_name, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g'))
$function$;

CREATE OR REPLACE FUNCTION public.update_student_iep_support_links_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  NEW.date_updated = CURRENT_DATE;
  RETURN NEW;
END;
$function$;

-- Note: generate_claim_number was already fixed in earlier migration
-- list_changes is a supabase internal function we cannot modify