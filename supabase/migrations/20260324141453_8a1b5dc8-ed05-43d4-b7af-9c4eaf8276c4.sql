
-- =========================================================
-- DISTRICT & AGENCY INTELLIGENCE VIEWS
-- =========================================================

-- 1. District Overview KPIs
CREATE OR REPLACE VIEW public.v_district_overview AS
SELECT
  d.id AS district_id,
  d.name AS district_name,
  d.state,
  count(DISTINCT s.id) AS total_students,
  count(DISTINCT sc.id) AS total_schools,
  count(DISTINCT cl.id) AS total_classrooms,
  count(DISTINCT s.id) FILTER (WHERE s.activation_status = 'active') AS active_students,
  count(DISTINCT s.id) FILTER (WHERE s.diagnosis_cluster IS NOT NULL AND s.diagnosis_cluster != '{}') AS diagnosed_students,
  count(DISTINCT s.id) FILTER (WHERE s.communication_level IN ('nonverbal','minimally_verbal','limited')) AS communication_support_needed
FROM districts d
LEFT JOIN schools sc ON sc.district_id = d.id
LEFT JOIN students s ON s.district_id = d.id
LEFT JOIN classrooms cl ON cl.school_id = sc.id
GROUP BY d.id, d.name, d.state;

-- 2. Agency Overview KPIs
CREATE OR REPLACE VIEW public.v_agency_overview AS
SELECT
  a.id AS agency_id,
  a.name AS agency_name,
  a.state,
  a.agency_type,
  count(DISTINCT s.id) AS total_clients,
  count(DISTINCT s.id) FILTER (WHERE s.activation_status = 'active') AS active_clients,
  count(DISTINCT al.id) AS total_locations,
  count(DISTINCT am.user_id) FILTER (WHERE am.status = 'active') AS total_staff,
  count(DISTINCT s.id) FILTER (WHERE s.communication_level IN ('nonverbal','minimally_verbal','limited')) AS communication_support_count,
  count(DISTINCT s.id) FILTER (WHERE s.diagnosis_cluster IS NOT NULL AND s.diagnosis_cluster != '{}') AS diagnosed_count
FROM agencies a
LEFT JOIN students s ON s.agency_id = a.id
LEFT JOIN agency_locations al ON al.agency_id = a.id AND al.is_active = true
LEFT JOIN agency_memberships am ON am.agency_id = a.id
GROUP BY a.id, a.name, a.state, a.agency_type;

-- 3. School Comparison View
CREATE OR REPLACE VIEW public.v_school_comparison AS
SELECT
  sc.id AS school_id,
  sc.name AS school_name,
  sc.district_id,
  d.name AS district_name,
  count(DISTINCT s.id) AS student_count,
  count(DISTINCT s.id) FILTER (WHERE s.activation_status = 'active') AS active_students,
  count(DISTINCT cl.id) AS classroom_count,
  count(DISTINCT s.id) FILTER (WHERE s.communication_level IN ('nonverbal','minimally_verbal','limited')) AS comm_support_count,
  CASE WHEN count(DISTINCT s.id) > 0
    THEN round(100.0 * count(DISTINCT s.id) FILTER (WHERE s.communication_level IN ('nonverbal','minimally_verbal','limited')) / count(DISTINCT s.id), 1)
    ELSE 0 END AS comm_support_pct
FROM schools sc
LEFT JOIN districts d ON d.id = sc.district_id
LEFT JOIN students s ON s.school_id = sc.id
LEFT JOIN classrooms cl ON cl.school_id = sc.id
GROUP BY sc.id, sc.name, sc.district_id, d.name;

-- 4. Location Comparison View
CREATE OR REPLACE VIEW public.v_location_comparison AS
SELECT
  al.id AS location_id,
  al.name AS location_name,
  al.agency_id,
  a.name AS agency_name,
  al.location_type,
  al.city,
  al.state,
  al.is_active,
  count(DISTINCT cl.student_id) AS client_count,
  count(DISTINCT sa.user_id) FILTER (WHERE sa.is_active = true) AS staff_count
FROM agency_locations al
LEFT JOIN agencies a ON a.id = al.agency_id
LEFT JOIN staff_assignments sa ON sa.agency_id = al.agency_id AND sa.is_active = true
LEFT JOIN staff_caseloads cl ON cl.clinician_user_id = sa.user_id AND cl.status = 'active'
GROUP BY al.id, al.name, al.agency_id, a.name, al.location_type, al.city, al.state, al.is_active;

-- 5. Staffing Per Clinician Load
CREATE OR REPLACE VIEW public.v_staffing_clinician_load AS
SELECT
  p.id AS profile_id,
  p.user_id,
  p.first_name,
  p.last_name,
  p.credential,
  p.primary_agency_id AS agency_id,
  a.name AS agency_name,
  p.status AS staff_status,
  count(DISTINCT sc.student_id) FILTER (WHERE sc.status = 'active') AS active_caseload,
  count(DISTINCT sc.student_id) FILTER (WHERE sc.assignment_type = 'primary') AS primary_cases,
  count(DISTINCT sc.student_id) FILTER (WHERE sc.assignment_type = 'supervisor') AS supervised_cases,
  CASE
    WHEN p.credential IN ('BCBA','BCBA-D','BCaBA') THEN 'supervisor'
    WHEN p.credential IN ('RBT','BT') THEN 'direct_care'
    ELSE 'other'
  END AS staff_tier,
  CASE
    WHEN p.credential IN ('RBT','BT') AND count(DISTINCT sc.student_id) FILTER (WHERE sc.status = 'active') > 8 THEN 'overloaded'
    WHEN p.credential IN ('BCBA','BCBA-D') AND count(DISTINCT sc.student_id) FILTER (WHERE sc.status = 'active') > 15 THEN 'overloaded'
    WHEN p.credential IN ('RBT','BT') AND count(DISTINCT sc.student_id) FILTER (WHERE sc.status = 'active') > 5 THEN 'high'
    WHEN p.credential IN ('BCBA','BCBA-D') AND count(DISTINCT sc.student_id) FILTER (WHERE sc.status = 'active') > 10 THEN 'high'
    WHEN count(DISTINCT sc.student_id) FILTER (WHERE sc.status = 'active') = 0 THEN 'idle'
    ELSE 'normal'
  END AS load_status
FROM profiles p
LEFT JOIN agencies a ON a.id = p.primary_agency_id
LEFT JOIN staff_caseloads sc ON sc.clinician_user_id = p.user_id
WHERE p.credential IS NOT NULL
  AND p.status = 'active'
GROUP BY p.id, p.user_id, p.first_name, p.last_name, p.credential, p.primary_agency_id, a.name, p.status;

-- 6. Staffing Agency Summary
CREATE OR REPLACE VIEW public.v_staffing_agency_summary AS
SELECT
  cl.agency_id,
  cl.agency_name,
  count(DISTINCT cl.profile_id) AS total_staff,
  count(DISTINCT cl.profile_id) FILTER (WHERE cl.staff_tier = 'supervisor') AS total_supervisors,
  count(DISTINCT cl.profile_id) FILTER (WHERE cl.staff_tier = 'direct_care') AS total_direct_care,
  count(DISTINCT cl.profile_id) FILTER (WHERE cl.load_status = 'overloaded') AS overloaded_staff,
  count(DISTINCT cl.profile_id) FILTER (WHERE cl.load_status = 'high') AS high_load_staff,
  count(DISTINCT cl.profile_id) FILTER (WHERE cl.load_status = 'idle') AS idle_staff,
  coalesce(avg(cl.active_caseload), 0)::numeric(5,1) AS avg_caseload,
  coalesce(max(cl.active_caseload), 0) AS max_caseload,
  CASE
    WHEN count(DISTINCT cl.profile_id) = 0 THEN 0
    ELSE round(100.0 * count(DISTINCT cl.profile_id) FILTER (WHERE cl.load_status IN ('overloaded','high')) / count(DISTINCT cl.profile_id), 1)
  END AS strain_index
FROM v_staffing_clinician_load cl
GROUP BY cl.agency_id, cl.agency_name;

-- 7. Unstaffed Students
CREATE OR REPLACE VIEW public.v_unstaffed_students AS
SELECT
  s.id AS student_id,
  s.first_name,
  s.last_name,
  s.agency_id,
  a.name AS agency_name,
  s.school_name,
  s.district_name,
  s.activation_status,
  s.communication_level,
  s.diagnosis_cluster
FROM students s
LEFT JOIN agencies a ON a.id = s.agency_id
WHERE s.activation_status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM staff_caseloads sc
    WHERE sc.student_id = s.id
      AND sc.status = 'active'
  );

-- 8. Org Program Recommendations
CREATE OR REPLACE VIEW public.v_org_program_recommendations AS
WITH comm_stats AS (
  SELECT
    s.agency_id,
    s.district_id,
    s.school_id,
    count(*) AS total,
    count(*) FILTER (WHERE s.communication_level IN ('nonverbal','minimally_verbal','limited')) AS comm_need
  FROM students s
  WHERE s.activation_status = 'active'
  GROUP BY s.agency_id, s.district_id, s.school_id
)
SELECT
  cs.agency_id,
  cs.district_id,
  cs.school_id,
  'communication_program_need' AS recommendation_type,
  'High communication support need detected' AS title,
  format('%s of %s active students need communication support (%s%%)',
    cs.comm_need, cs.total,
    round(100.0 * cs.comm_need / NULLIF(cs.total, 0), 0)) AS rationale,
  cs.comm_need AS affected_count,
  cs.total AS total_count,
  round(100.0 * cs.comm_need / NULLIF(cs.total, 0), 1) AS pct
FROM comm_stats cs
WHERE cs.total > 0 AND (100.0 * cs.comm_need / cs.total) >= 25;
