
-- Fix clients view to exclude students without agency_id
CREATE OR REPLACE VIEW public.clients AS
SELECT
  s.id AS client_id,
  s.agency_id,
  ((COALESCE(s.is_archived, false) = false) AND (s.archived_at IS NULL)) AS active,
  COALESCE(NULLIF(s.preferred_name, ''), NULLIF(s.display_name, ''), NULLIF(TRIM(BOTH FROM (COALESCE(s.first_name, '') || ' ' || COALESCE(s.last_name, ''))), ''), NULLIF(s.name, '')) AS full_name,
  s.first_name,
  s.last_name,
  s.grade,
  s.school_name,
  s.district_name,
  s.primary_setting,
  s.case_opened_date,
  s.case_closed_date,
  s.activation_status,
  s.created_at,
  s.updated_at
FROM public.students s
WHERE s.agency_id IS NOT NULL;

ALTER VIEW public.clients SET (security_invoker = on);
