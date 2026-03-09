
-- 1. Create interval_definitions if not exists
CREATE TABLE IF NOT EXISTS public.interval_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid,
  client_id uuid,
  behavior_name text,
  definition_name text NOT NULL,
  interval_type text NOT NULL DEFAULT 'whole', -- whole, partial, momentary
  interval_seconds integer NOT NULL DEFAULT 60,
  observation_duration_minutes integer NOT NULL DEFAULT 15,
  mts_enabled boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.interval_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage interval_definitions" ON public.interval_definitions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Create teacher_interval_sessions
CREATE TABLE IF NOT EXISTS public.teacher_interval_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id uuid,
  student_id uuid,
  client_id uuid,
  interval_type text,
  started_at timestamptz,
  ended_at timestamptz,
  expected_intervals integer,
  completed_intervals integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.teacher_interval_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage teacher_interval_sessions" ON public.teacher_interval_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Create teacher_interval_data
CREATE TABLE IF NOT EXISTS public.teacher_interval_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid,
  interval_number integer,
  interval_timestamp timestamptz,
  observed_present boolean,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.teacher_interval_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage teacher_interval_data" ON public.teacher_interval_data FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Create v_teacher_mts_summary view
CREATE VIEW public.v_teacher_mts_summary AS
SELECT
  s.id AS session_id,
  s.student_id,
  s.client_id,
  s.definition_id,
  s.interval_type,
  s.started_at,
  s.ended_at,
  s.expected_intervals,
  count(d.id) AS intervals_completed,
  count(d.id) FILTER (WHERE d.observed_present = true) AS observed_present,
  round(
    100.0 * count(d.id) FILTER (WHERE d.observed_present = true)
    / nullif(count(d.id), 0),
    2
  ) AS observed_percent
FROM public.teacher_interval_sessions s
LEFT JOIN public.teacher_interval_data d
  ON d.session_id = s.id
GROUP BY s.id, s.student_id, s.client_id, s.definition_id, s.interval_type, s.started_at, s.ended_at, s.expected_intervals;
