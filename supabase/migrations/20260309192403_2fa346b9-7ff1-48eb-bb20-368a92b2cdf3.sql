
-- 1. Student risk scores view (derives risk_level from CI final score)
CREATE OR REPLACE VIEW behavior_intelligence.v_student_risk_scores AS
SELECT
  fs.client_id AS student_id,
  fs.agency_id,
  fs.total_risk_score AS risk_score,
  CASE
    WHEN fs.total_risk_score >= 70 THEN 'high'
    WHEN fs.total_risk_score >= 40 THEN 'moderate'
    ELSE 'low'
  END AS risk_level
FROM public.v_ci_client_final_score fs;

-- 2. Classroom climate view (average risk per classroom)
CREATE OR REPLACE VIEW behavior_intelligence.v_classroom_climate AS
SELECT
  s.classroom_id,
  ROUND(AVG(fs.total_risk_score), 1) AS climate_score,
  COUNT(s.id) AS student_count,
  COUNT(*) FILTER (WHERE fs.total_risk_score >= 70) AS high_risk_count
FROM public.students s
LEFT JOIN public.v_ci_client_final_score fs ON fs.client_id = s.id
WHERE s.classroom_id IS NOT NULL
GROUP BY s.classroom_id;

-- 3. Command center view
CREATE OR REPLACE VIEW behavior_intelligence.v_command_center AS
SELECT
  s.id AS student_id,
  s.first_name,
  s.last_name,
  rs.risk_score,
  rs.risk_level,
  cc.climate_score,
  CASE
    WHEN rs.risk_level = 'high'     THEN 'monitor closely'
    WHEN rs.risk_level = 'moderate' THEN 'provide reinforcement'
    ELSE 'continue support'
  END AS recommendation
FROM public.students s
LEFT JOIN behavior_intelligence.v_student_risk_scores rs
  ON rs.student_id = s.id
LEFT JOIN behavior_intelligence.v_classroom_climate cc
  ON cc.classroom_id = s.classroom_id;
