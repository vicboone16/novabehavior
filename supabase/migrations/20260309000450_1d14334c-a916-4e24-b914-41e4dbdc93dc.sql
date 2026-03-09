
-- Add missing columns to parent_training_goal_assignments
ALTER TABLE public.parent_training_goal_assignments
ADD COLUMN IF NOT EXISTS mastery_status text DEFAULT 'not_started',
ADD COLUMN IF NOT EXISTS percent_to_goal numeric,
ADD COLUMN IF NOT EXISTS last_data_date date;

-- Backfill mastery_status
UPDATE public.parent_training_goal_assignments
SET mastery_status = COALESCE(mastery_status, 'not_started')
WHERE mastery_status IS NULL;

-- Backfill parent_training_goals title/description
UPDATE public.parent_training_goals
SET
  title = COALESCE(title, goal_title, initcap(replace(goal_key, '_', ' '))),
  description = COALESCE(description, goal_description),
  goal_title = COALESCE(goal_title, title, initcap(replace(goal_key, '_', ' '))),
  goal_description = COALESCE(goal_description, description),
  is_active = COALESCE(is_active, true)
WHERE title IS NULL OR goal_title IS NULL OR is_active IS NULL;

-- Backfill goal_source
UPDATE public.parent_training_goal_assignments
SET goal_source = COALESCE(goal_source, 'library')
WHERE goal_source IS NULL;

-- Create v_parent_training_goal_progress view
CREATE OR REPLACE VIEW public.v_parent_training_goal_progress AS
SELECT
  ga.id as goal_assignment_id,
  ga.client_id,
  ga.caregiver_id,
  ga.module_assignment_id,
  g.goal_key,
  g.goal_title,
  g.goal_description,
  g.measurement_method,
  ga.baseline_value,
  ga.target_value,
  ga.current_value,
  ga.status,
  ga.insurance_billable,
  ga.start_date,
  ga.target_date,
  count(d.id) as data_points
FROM public.parent_training_goal_assignments ga
JOIN public.parent_training_goals g ON g.id = ga.goal_id
LEFT JOIN public.parent_training_data d ON d.goal_assignment_id = ga.id
GROUP BY
  ga.id, ga.client_id, ga.caregiver_id, ga.module_assignment_id,
  g.goal_key, g.goal_title, g.goal_description, g.measurement_method,
  ga.baseline_value, ga.target_value, ga.current_value, ga.status,
  ga.insurance_billable, ga.start_date, ga.target_date;

-- Recreate v_parent_training_effective_goals with new columns
DROP VIEW IF EXISTS public.v_parent_training_effective_goals;
CREATE VIEW public.v_parent_training_effective_goals AS
SELECT
    ga.id as goal_assignment_id,
    ga.client_id,
    ga.caregiver_id,
    ga.module_assignment_id,
    ga.goal_id,
    ga.goal_source,
    COALESCE(ga.custom_goal_title, g.goal_title, g.title) as effective_goal_title,
    COALESCE(ga.custom_goal_description, g.goal_description, g.description) as effective_goal_description,
    COALESCE(ga.custom_measurement_method, g.measurement_method) as effective_measurement_method,
    COALESCE(ga.custom_baseline_definition, g.baseline_definition) as effective_baseline_definition,
    COALESCE(ga.custom_target_definition, g.target_definition) as effective_target_definition,
    COALESCE(ga.custom_mastery_criteria, g.mastery_criteria) as effective_mastery_criteria,
    COALESCE(ga.custom_unit, g.unit) as effective_unit,
    ga.baseline_value,
    ga.target_value,
    ga.current_value,
    ga.status,
    ga.mastery_status,
    ga.percent_to_goal,
    ga.insurance_billable,
    ga.start_date,
    ga.target_date,
    ga.last_data_date,
    ga.notes,
    ga.save_as_library_candidate
FROM public.parent_training_goal_assignments ga
LEFT JOIN public.parent_training_goals g ON g.id = ga.goal_id;

SELECT pg_notify('pgrst','reload schema');
