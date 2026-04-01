
CREATE OR REPLACE VIEW public.v_bops_engine_roster AS
SELECT
  d.student_id,
  coalesce(s.first_name || ' ' || s.last_name, 'Unknown') as student_name,
  d.bops_enabled,
  d.bops_assessment_status,
  d.assessment_date,
  d.calculated_training_name,
  d.bops_programming_active,
  d.latest_scored_session_id,
  d.current_day_state as nova_day_state,
  cfi.classroom_name as best_fit_model_name,
  cfi.fit_score as best_fit_score,
  cfi.fit_band as best_fit_band,
  b.beacon_day_state
FROM public.v_student_bops_dashboard d
LEFT JOIN public.students s ON s.id = d.student_id
LEFT JOIN (
  SELECT DISTINCT ON (student_id) student_id, classroom_name, fit_score, fit_band
  FROM public.v_bops_cfi_best_fit
  ORDER BY student_id, recommended_rank ASC NULLS LAST
) cfi ON cfi.student_id = d.student_id
LEFT JOIN (
  SELECT student_id, beacon_day_state
  FROM public.v_beacon_teacher_dashboard
) b ON b.student_id = d.student_id;
