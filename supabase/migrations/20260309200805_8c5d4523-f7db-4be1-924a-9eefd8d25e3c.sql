
-- 1. Add target_id to student_targets (nullable, references targets)
ALTER TABLE public.student_targets
  ADD COLUMN IF NOT EXISTS target_id uuid REFERENCES public.targets(id);

-- 2. Add target_name to targets if missing
ALTER TABLE public.targets
  ADD COLUMN IF NOT EXISTS target_name text;

-- 3. Create task_analysis_progress_steps table
CREATE TABLE IF NOT EXISTS public.task_analysis_progress_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid,
  client_id uuid,
  student_target_id uuid,
  target_id uuid,
  session_date date NOT NULL,
  step_number integer NOT NULL DEFAULT 1,
  step_label text,
  outcome text, -- '+', '-', 'no_opp'
  prompt_level text,
  independent boolean DEFAULT false,
  notes text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_analysis_progress_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage task analysis progress steps"
  ON public.task_analysis_progress_steps
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. Create v_objective_target_progression_candidates view
CREATE OR REPLACE VIEW public.v_objective_target_progression_candidates AS
SELECT
    st.student_id,
    st.id AS student_target_id,
    st.target_id,
    coalesce(t.target_name, t.name, 'Target') AS step_label
FROM public.student_targets st
LEFT JOIN public.targets t
  ON t.id = st.target_id;

-- 5. Create v_task_analysis_progress_summary view
CREATE OR REPLACE VIEW public.v_task_analysis_progress_summary AS
SELECT
    student_id,
    client_id,
    student_target_id,
    target_id,
    session_date,
    count(*) AS total_steps,
    count(*) FILTER (WHERE coalesce(independent, false) = true) AS independent_steps,
    round(
      100.0 * count(*) FILTER (WHERE coalesce(independent, false) = true) / nullif(count(*), 0),
      2
    ) AS independent_step_percent
FROM public.task_analysis_progress_steps
GROUP BY student_id, client_id, student_target_id, target_id, session_date;
