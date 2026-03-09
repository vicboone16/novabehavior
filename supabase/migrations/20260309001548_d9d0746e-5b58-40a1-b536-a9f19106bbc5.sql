-- 1) Report snapshots table
CREATE TABLE IF NOT EXISTS public.parent_training_report_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid,
    caregiver_id uuid,
    report_type text NOT NULL,
    title text,
    report_payload jsonb DEFAULT '{}'::jsonb,
    created_by uuid,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pt_report_snapshots_client
ON public.parent_training_report_snapshots(client_id, caregiver_id);

CREATE INDEX IF NOT EXISTS idx_pt_report_snapshots_type
ON public.parent_training_report_snapshots(report_type);

-- 2) Goal engine summary view
CREATE OR REPLACE VIEW public.v_parent_training_goal_engine_summary AS
SELECT
    ga.id AS goal_assignment_id,
    ga.client_id,
    ga.caregiver_id,
    ga.module_assignment_id,
    ga.goal_id,
    ga.goal_source,
    COALESCE(ga.custom_goal_title, g.goal_title, g.title) AS goal_title,
    COALESCE(ga.custom_measurement_method, g.measurement_method) AS measurement_method,
    ga.baseline_value,
    ga.target_value,
    ga.current_value,
    ga.mastery_status,
    ga.percent_to_goal,
    ga.last_data_date,
    ga.status,
    ga.insurance_billable,
    ga.start_date,
    ga.target_date,
    ga.notes,
    COUNT(d.id) AS data_points
FROM public.parent_training_goal_assignments ga
LEFT JOIN public.parent_training_goals g ON g.id = ga.goal_id
LEFT JOIN public.parent_training_data d ON d.goal_assignment_id = ga.id
GROUP BY
    ga.id, ga.client_id, ga.caregiver_id, ga.module_assignment_id,
    ga.goal_id, ga.goal_source,
    g.goal_title, g.title, g.measurement_method,
    ga.custom_goal_title, ga.custom_measurement_method,
    ga.baseline_value, ga.target_value, ga.current_value,
    ga.mastery_status, ga.percent_to_goal, ga.last_data_date,
    ga.status, ga.insurance_billable, ga.start_date, ga.target_date, ga.notes;

-- 3) Caregiver goal sheet view
DROP VIEW IF EXISTS public.v_parent_training_caregiver_goal_sheet;
CREATE VIEW public.v_parent_training_caregiver_goal_sheet AS
SELECT
    eg.goal_assignment_id,
    eg.client_id,
    eg.caregiver_id,
    eg.module_assignment_id,
    eg.effective_goal_title,
    eg.effective_goal_description,
    eg.effective_measurement_method,
    eg.effective_baseline_definition,
    eg.effective_target_definition,
    eg.effective_mastery_criteria,
    eg.effective_unit,
    eg.baseline_value,
    eg.target_value,
    eg.current_value,
    eg.status,
    eg.mastery_status,
    eg.percent_to_goal,
    eg.target_date,
    eg.notes,
    eg.goal_source
FROM public.v_parent_training_effective_goals eg;

-- 4) Homework summary view
DROP VIEW IF EXISTS public.v_parent_training_homework_summary;
CREATE VIEW public.v_parent_training_homework_summary AS
SELECT
    h.id AS homework_id,
    COALESCE(h.module_assignment_id, h.assignment_id) AS module_assignment_id,
    COALESCE(h.caregiver_id, h.parent_user_id) AS caregiver_id,
    h.title AS homework_title,
    h.submission_type,
    h.file_url,
    h.notes,
    h.review_status,
    h.reviewer_notes,
    h.submitted_at,
    a.client_id,
    COALESCE(a.id, a.assignment_id) AS assignment_pk,
    m.module_key,
    m.title AS module_title
FROM public.parent_training_homework h
LEFT JOIN public.parent_training_assignments a
  ON COALESCE(a.id, a.assignment_id) = COALESCE(h.module_assignment_id, h.assignment_id)
LEFT JOIN public.parent_training_modules m
  ON COALESCE(m.id, m.module_id) = a.module_id;

-- 5) Module completion summary view
DROP VIEW IF EXISTS public.v_parent_training_module_completion_summary;
CREATE VIEW public.v_parent_training_module_completion_summary AS
SELECT
    COALESCE(a.id, a.assignment_id) AS module_assignment_id,
    a.client_id,
    COALESCE(a.caregiver_id, a.parent_user_id) AS caregiver_id,
    m.module_key,
    m.title AS module_title,
    a.status,
    COALESCE(a.assigned_at, a.created_at) AS assigned_at,
    COALESCE(a.due_date, a.due_at::date) AS due_date,
    COUNT(ga.id) AS assigned_goal_count
FROM public.parent_training_assignments a
LEFT JOIN public.parent_training_modules m
  ON COALESCE(m.id, m.module_id) = a.module_id
LEFT JOIN public.parent_training_goal_assignments ga
  ON ga.module_assignment_id = COALESCE(a.id, a.assignment_id)
GROUP BY
    a.id, a.assignment_id, a.client_id, a.caregiver_id, a.parent_user_id,
    m.module_key, m.title, a.status, a.assigned_at, a.created_at, a.due_date, a.due_at;

-- 6) Progress report summary view
DROP VIEW IF EXISTS public.v_parent_training_progress_report_summary;
CREATE VIEW public.v_parent_training_progress_report_summary AS
SELECT
    mcs.client_id,
    mcs.caregiver_id,
    COUNT(DISTINCT mcs.module_assignment_id) AS assigned_module_count,
    COUNT(DISTINCT mcs.module_assignment_id) FILTER (WHERE LOWER(COALESCE(mcs.status,'')) = 'completed') AS completed_module_count,
    COUNT(DISTINCT g.goal_assignment_id) AS total_goal_count,
    COUNT(DISTINCT g.goal_assignment_id) FILTER (WHERE LOWER(COALESCE(g.mastery_status,'')) = 'mastered') AS mastered_goal_count,
    COUNT(DISTINCT g.goal_assignment_id) FILTER (WHERE LOWER(COALESCE(g.mastery_status,'')) = 'in_progress') AS in_progress_goal_count,
    COUNT(DISTINCT h.homework_id) AS homework_submission_count,
    COUNT(DISTINCT s.id) AS session_log_count
FROM public.v_parent_training_module_completion_summary mcs
LEFT JOIN public.v_parent_training_goal_engine_summary g
  ON g.client_id = mcs.client_id AND g.caregiver_id = mcs.caregiver_id
LEFT JOIN public.v_parent_training_homework_summary h
  ON h.client_id = mcs.client_id AND h.caregiver_id = mcs.caregiver_id
LEFT JOIN public.parent_training_session_logs s
  ON s.client_id = mcs.client_id AND s.caregiver_id = mcs.caregiver_id
GROUP BY mcs.client_id, mcs.caregiver_id;

SELECT pg_notify('pgrst','reload schema');