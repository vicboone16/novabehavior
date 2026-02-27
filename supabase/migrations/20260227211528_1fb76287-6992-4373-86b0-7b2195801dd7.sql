
-- Update clients view to exclude students without agency_id
CREATE OR REPLACE VIEW public.clients AS
SELECT
  s.id          AS client_id,
  s.agency_id,
  (NOT coalesce(s.is_archived, false)) AS active,
  s.first_name,
  s.last_name,
  coalesce(s.display_name, s.name) AS full_name,
  s.primary_setting,
  NULL::text    AS communication_level,
  NULL::text    AS diagnosis_cluster,
  CASE
    WHEN s.dob IS NOT NULL THEN date_part('year', age(s.dob::date))::int
    WHEN s.date_of_birth IS NOT NULL THEN date_part('year', age(s.date_of_birth))::int
    ELSE NULL
  END           AS age_years
FROM public.students s
WHERE s.agency_id IS NOT NULL;

ALTER VIEW public.clients SET (security_invoker = on);
