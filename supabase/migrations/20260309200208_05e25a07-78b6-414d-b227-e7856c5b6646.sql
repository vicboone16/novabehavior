
DROP VIEW IF EXISTS public.v_benchmark_changing_criterion_design;

CREATE VIEW public.v_benchmark_changing_criterion_design AS
SELECT
  bcs.id AS benchmark_step_id,
  bcs.student_target_id,
  bcs.target_id,
  bcs.benchmark_label,
  bcs.benchmark_order,
  bcs.criterion_value,
  bcs.criterion_unit,
  bcs.phase_label,
  bcs.phase_start_date,
  bcs.start_date,
  bcs.end_date,
  bcs.is_active,
  bcs.is_met,
  bcs.met_at,
  bcs.notes,
  CASE
    WHEN bcs.is_met THEN 'met'
    WHEN bcs.is_active THEN 'active'
    ELSE 'pending'
  END AS step_status
FROM public.goal_benchmark_criterion_steps bcs
ORDER BY bcs.target_id, bcs.benchmark_order;
