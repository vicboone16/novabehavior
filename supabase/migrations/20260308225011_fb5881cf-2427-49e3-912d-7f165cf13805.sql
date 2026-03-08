
-- Parent Training Goals (reusable library goals tied to modules)
CREATE TABLE IF NOT EXISTS public.parent_training_goals (
  goal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES public.parent_training_modules(module_id) ON DELETE CASCADE,
  goal_key TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  measurement_method TEXT DEFAULT 'frequency',
  unit TEXT DEFAULT 'occurrences',
  default_baseline TEXT,
  default_target TEXT,
  mastery_criteria TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(module_id, goal_key)
);

-- Goal assignments (case-specific goals linked to an assignment)
CREATE TABLE IF NOT EXISTS public.parent_training_goal_assignments (
  goal_assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.parent_training_assignments(assignment_id) ON DELETE CASCADE NOT NULL,
  goal_id UUID REFERENCES public.parent_training_goals(goal_id) ON DELETE SET NULL,
  custom_goal_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  measurement_method TEXT DEFAULT 'frequency',
  unit TEXT DEFAULT 'occurrences',
  baseline_value NUMERIC,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  baseline_text TEXT,
  target_text TEXT,
  mastery_criteria TEXT,
  target_date DATE,
  status TEXT DEFAULT 'active',
  goal_source TEXT DEFAULT 'library',
  save_as_library_candidate BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Custom goals (novel provider-created goals)
CREATE TABLE IF NOT EXISTS public.parent_training_custom_goals (
  custom_goal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID,
  module_id UUID REFERENCES public.parent_training_modules(module_id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  measurement_method TEXT DEFAULT 'frequency',
  unit TEXT DEFAULT 'occurrences',
  default_baseline TEXT,
  default_target TEXT,
  mastery_criteria TEXT,
  is_library_candidate BOOLEAN DEFAULT false,
  promoted_to_goal_id UUID REFERENCES public.parent_training_goals(goal_id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Goal data entries (progress logging)
CREATE TABLE IF NOT EXISTS public.parent_training_data (
  data_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_assignment_id UUID REFERENCES public.parent_training_goal_assignments(goal_assignment_id) ON DELETE CASCADE NOT NULL,
  value NUMERIC,
  text_value TEXT,
  logged_by UUID,
  logged_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Homework submissions
CREATE TABLE IF NOT EXISTS public.parent_training_homework (
  homework_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.parent_training_assignments(assignment_id) ON DELETE CASCADE NOT NULL,
  parent_user_id UUID NOT NULL,
  client_id UUID NOT NULL,
  title TEXT NOT NULL,
  response_text TEXT,
  file_url TEXT,
  notes TEXT,
  review_status TEXT DEFAULT 'pending',
  reviewer_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Session logs (97156 documentation)
CREATE TABLE IF NOT EXISTS public.parent_training_session_logs (
  session_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID,
  assignment_id UUID REFERENCES public.parent_training_assignments(assignment_id) ON DELETE SET NULL,
  parent_user_id UUID NOT NULL,
  client_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  session_date DATE NOT NULL,
  service_code TEXT DEFAULT '97156',
  duration_minutes INT NOT NULL,
  module_id UUID REFERENCES public.parent_training_modules(module_id) ON DELETE SET NULL,
  caregiver_response TEXT,
  session_summary TEXT,
  homework_assigned TEXT,
  next_steps TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add visibility columns to modules
ALTER TABLE public.parent_training_modules
  ADD COLUMN IF NOT EXISTS independent_mode_visible BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS agency_mode_visible BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS behavior_decoded_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;

-- Enable RLS
ALTER TABLE public.parent_training_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_training_goal_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_training_custom_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_training_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_training_homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_training_session_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies (authenticated users can read/write for now)
CREATE POLICY "Authenticated read parent_training_goals" ON public.parent_training_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert parent_training_goals" ON public.parent_training_goals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update parent_training_goals" ON public.parent_training_goals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read goal_assignments" ON public.parent_training_goal_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert goal_assignments" ON public.parent_training_goal_assignments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update goal_assignments" ON public.parent_training_goal_assignments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read custom_goals" ON public.parent_training_custom_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert custom_goals" ON public.parent_training_custom_goals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update custom_goals" ON public.parent_training_custom_goals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read pt_data" ON public.parent_training_data FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert pt_data" ON public.parent_training_data FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated read pt_homework" ON public.parent_training_homework FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert pt_homework" ON public.parent_training_homework FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update pt_homework" ON public.parent_training_homework FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated read pt_session_logs" ON public.parent_training_session_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert pt_session_logs" ON public.parent_training_session_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update pt_session_logs" ON public.parent_training_session_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- View: effective goals (library + custom merged)
CREATE OR REPLACE VIEW public.v_parent_training_effective_goals AS
SELECT
  ga.goal_assignment_id,
  ga.assignment_id,
  ga.goal_id,
  ga.custom_goal_id,
  ga.title,
  ga.description,
  ga.measurement_method,
  ga.unit,
  ga.baseline_value,
  ga.target_value,
  ga.current_value,
  ga.baseline_text,
  ga.target_text,
  ga.mastery_criteria,
  ga.target_date,
  ga.status,
  ga.goal_source,
  ga.save_as_library_candidate,
  ga.notes,
  a.module_id,
  a.parent_user_id,
  a.client_id,
  a.agency_id,
  m.title AS module_title
FROM public.parent_training_goal_assignments ga
JOIN public.parent_training_assignments a ON a.assignment_id = ga.assignment_id
LEFT JOIN public.parent_training_modules m ON m.module_id = a.module_id;

-- View: assignments dashboard
CREATE OR REPLACE VIEW public.v_parent_training_assignments_dashboard AS
SELECT
  a.*,
  m.title AS module_title,
  m.short_description AS module_description,
  m.est_minutes,
  (SELECT count(*) FROM public.parent_training_goal_assignments ga WHERE ga.assignment_id = a.assignment_id) AS goal_count,
  (SELECT count(*) FROM public.parent_training_homework h WHERE h.assignment_id = a.assignment_id) AS homework_count,
  (SELECT count(*) FROM public.parent_training_session_logs sl WHERE sl.assignment_id = a.assignment_id) AS session_log_count
FROM public.parent_training_assignments a
LEFT JOIN public.parent_training_modules m ON m.module_id = a.module_id;

-- View: module goal counts
CREATE OR REPLACE VIEW public.v_parent_training_module_goal_counts AS
SELECT
  m.module_id,
  m.title,
  m.status,
  m.scope,
  m.agency_id,
  m.display_order,
  (SELECT count(*) FROM public.parent_training_goals g WHERE g.module_id = m.module_id AND g.is_active = true) AS goal_count
FROM public.parent_training_modules m;

-- View: custom goals review
CREATE OR REPLACE VIEW public.v_parent_training_custom_goals AS
SELECT
  cg.*,
  m.title AS module_title
FROM public.parent_training_custom_goals cg
LEFT JOIN public.parent_training_modules m ON m.module_id = cg.module_id;

-- Function: assign module with auto-goal attachment
CREATE OR REPLACE FUNCTION public.assign_parent_training_module(
  p_module_id UUID,
  p_parent_user_id UUID,
  p_client_id UUID,
  p_agency_id UUID DEFAULT NULL,
  p_due_at TIMESTAMPTZ DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment_id UUID;
  v_version_id UUID;
BEGIN
  -- Get latest published version
  SELECT module_version_id INTO v_version_id
  FROM parent_training_module_versions
  WHERE module_id = p_module_id AND status = 'published'
  ORDER BY version_num DESC LIMIT 1;

  -- Fallback to any version
  IF v_version_id IS NULL THEN
    SELECT module_version_id INTO v_version_id
    FROM parent_training_module_versions
    WHERE module_id = p_module_id
    ORDER BY version_num DESC LIMIT 1;
  END IF;

  -- If still null, use module_id as placeholder
  IF v_version_id IS NULL THEN
    v_version_id := p_module_id;
  END IF;

  INSERT INTO parent_training_assignments (module_id, module_version_id, parent_user_id, client_id, agency_id, due_at, created_by, status)
  VALUES (p_module_id, v_version_id, p_parent_user_id, p_client_id, p_agency_id, p_due_at, p_created_by, 'assigned')
  RETURNING assignment_id INTO v_assignment_id;

  -- Auto-attach library goals
  INSERT INTO parent_training_goal_assignments (assignment_id, goal_id, title, description, measurement_method, unit, baseline_text, target_text, mastery_criteria, goal_source)
  SELECT v_assignment_id, g.goal_id, g.title, g.description, g.measurement_method, g.unit, g.default_baseline, g.default_target, g.mastery_criteria, 'library'
  FROM parent_training_goals g
  WHERE g.module_id = p_module_id AND g.is_active = true
  ORDER BY g.display_order;

  RETURN v_assignment_id;
END;
$$;

-- Function: log goal data
CREATE OR REPLACE FUNCTION public.log_parent_training_goal_data(
  p_goal_assignment_id UUID,
  p_value NUMERIC DEFAULT NULL,
  p_text_value TEXT DEFAULT NULL,
  p_logged_by UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_data_id UUID;
BEGIN
  INSERT INTO parent_training_data (goal_assignment_id, value, text_value, logged_by, notes)
  VALUES (p_goal_assignment_id, p_value, p_text_value, p_logged_by, p_notes)
  RETURNING data_id INTO v_data_id;

  -- Auto-update current value if numeric
  IF p_value IS NOT NULL THEN
    UPDATE parent_training_goal_assignments SET current_value = p_value, updated_at = now()
    WHERE goal_assignment_id = p_goal_assignment_id;
  END IF;

  RETURN v_data_id;
END;
$$;

-- Function: build insurance summary
CREATE OR REPLACE FUNCTION public.build_parent_training_insurance_summary(
  p_client_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'client_id', p_client_id,
    'period_start', COALESCE(p_start_date, (now() - interval '30 days')::date),
    'period_end', COALESCE(p_end_date, now()::date),
    'sessions', (
      SELECT COALESCE(json_agg(json_build_object(
        'date', sl.session_date,
        'service_code', sl.service_code,
        'duration_minutes', sl.duration_minutes,
        'summary', sl.session_summary,
        'provider_id', sl.provider_id
      ) ORDER BY sl.session_date), '[]'::json)
      FROM parent_training_session_logs sl
      WHERE sl.client_id = p_client_id
        AND sl.session_date >= COALESCE(p_start_date, (now() - interval '30 days')::date)
        AND sl.session_date <= COALESCE(p_end_date, now()::date)
    ),
    'goals', (
      SELECT COALESCE(json_agg(json_build_object(
        'title', eg.title,
        'baseline', eg.baseline_value,
        'target', eg.target_value,
        'current', eg.current_value,
        'status', eg.status,
        'mastery_criteria', eg.mastery_criteria
      )), '[]'::json)
      FROM v_parent_training_effective_goals eg
      WHERE eg.client_id = p_client_id
    ),
    'total_sessions', (
      SELECT count(*) FROM parent_training_session_logs sl
      WHERE sl.client_id = p_client_id
        AND sl.session_date >= COALESCE(p_start_date, (now() - interval '30 days')::date)
        AND sl.session_date <= COALESCE(p_end_date, now()::date)
    ),
    'total_minutes', (
      SELECT COALESCE(sum(sl.duration_minutes), 0) FROM parent_training_session_logs sl
      WHERE sl.client_id = p_client_id
        AND sl.session_date >= COALESCE(p_start_date, (now() - interval '30 days')::date)
        AND sl.session_date <= COALESCE(p_end_date, now()::date)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
