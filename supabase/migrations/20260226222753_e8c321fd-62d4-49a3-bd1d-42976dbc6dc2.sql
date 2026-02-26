
-- ============================================
-- Phase/Criteria/Prompt Sets/Automation Schema
-- ============================================

-- 1) Add 'phase' column to skill_targets (coexists with existing 'status')
ALTER TABLE public.skill_targets
  ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'baseline';

-- Add phase to skill_programs too
ALTER TABLE public.skill_programs
  ADD COLUMN IF NOT EXISTS phase TEXT NOT NULL DEFAULT 'baseline';

-- 2) Criteria Templates (unified, scoped)
CREATE TABLE public.criteria_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('global', 'student', 'program', 'target')),
  scope_id UUID, -- nullable; references student_id/program_id/target_id depending on scope
  criteria_type TEXT NOT NULL CHECK (criteria_type IN ('mastery', 'probe', 'generalization', 'maintenance')),
  name TEXT NOT NULL,
  rule_json JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_criteria_templates_scope ON public.criteria_templates(scope, scope_id);
CREATE INDEX idx_criteria_templates_type ON public.criteria_templates(criteria_type);

-- 3) Prompt Sets (scoped, override ladder)
CREATE TABLE public.prompt_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('global', 'student', 'program', 'target')),
  scope_id UUID,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prompt_sets_scope ON public.prompt_sets(scope, scope_id);

-- 4) Add prompt_set_id to existing prompt_levels table
ALTER TABLE public.prompt_levels
  ADD COLUMN IF NOT EXISTS prompt_set_id UUID REFERENCES public.prompt_sets(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS counts_as_prompted BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 5) Automation Settings (scoped)
CREATE TABLE public.automation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('global', 'student', 'program', 'target')),
  scope_id UUID,
  auto_advance_enabled BOOLEAN NOT NULL DEFAULT false,
  advance_mode TEXT NOT NULL DEFAULT 'alert_only' CHECK (advance_mode IN ('alert_only', 'queue_for_review', 'auto_advance')),
  require_confirmation BOOLEAN NOT NULL DEFAULT true,
  auto_open_next_target BOOLEAN NOT NULL DEFAULT false,
  next_target_rule JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_automation_settings_scope ON public.automation_settings(scope, scope_id);

-- 6) Criteria Evaluation Results (computed state)
CREATE TABLE public.criteria_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_id UUID NOT NULL REFERENCES public.skill_targets(id) ON DELETE CASCADE,
  criteria_type TEXT NOT NULL CHECK (criteria_type IN ('mastery', 'probe', 'generalization', 'maintenance')),
  met_status BOOLEAN NOT NULL DEFAULT false,
  met_at TIMESTAMPTZ,
  metric_value NUMERIC,
  window_used JSONB,
  filters_applied JSONB,
  evidence JSONB,
  recommended_action TEXT,
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_criteria_evaluations_target ON public.criteria_evaluations(target_id);
CREATE UNIQUE INDEX idx_criteria_evaluations_unique ON public.criteria_evaluations(target_id, criteria_type);

-- 7) Review Queue entries
CREATE TABLE public.review_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_id UUID NOT NULL REFERENCES public.skill_targets(id) ON DELETE CASCADE,
  program_id UUID REFERENCES public.skill_programs(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  criteria_type TEXT NOT NULL,
  current_phase TEXT NOT NULL,
  suggested_phase TEXT,
  evidence JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'dismissed', 'snoozed')),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_review_queue_status ON public.review_queue(status);
CREATE INDEX idx_review_queue_student ON public.review_queue(student_id);

-- 8) Add step_notes and default_prompt_level to task_analysis_steps
ALTER TABLE public.task_analysis_steps
  ADD COLUMN IF NOT EXISTS step_notes TEXT,
  ADD COLUMN IF NOT EXISTS default_prompt_level UUID REFERENCES public.prompt_levels(id),
  ADD COLUMN IF NOT EXISTS step_status TEXT NOT NULL DEFAULT 'baseline',
  ADD COLUMN IF NOT EXISTS mastered_at TIMESTAMPTZ;

-- 9) Add session_type to target_trials and task_analysis_step_data
ALTER TABLE public.target_trials
  ADD COLUMN IF NOT EXISTS session_type TEXT NOT NULL DEFAULT 'teaching' CHECK (session_type IN ('teaching', 'probe'));

ALTER TABLE public.task_analysis_step_data
  ADD COLUMN IF NOT EXISTS session_type TEXT NOT NULL DEFAULT 'teaching' CHECK (session_type IN ('teaching', 'probe'));

-- 10) Create default global prompt set and link existing prompt levels
INSERT INTO public.prompt_sets (id, scope, name, is_default, active)
VALUES ('00000000-0000-0000-0000-000000000001', 'global', 'Default Prompt Set', true, true);

-- Link existing prompt_levels to the global set
UPDATE public.prompt_levels SET prompt_set_id = '00000000-0000-0000-0000-000000000001' WHERE prompt_set_id IS NULL;

-- 11) Insert default global criteria templates
INSERT INTO public.criteria_templates (scope, criteria_type, name, is_default, rule_json) VALUES
  ('global', 'mastery', 'Default Mastery ≥80% (3 sessions)', true, '{
    "measure": "percent_correct",
    "threshold": 80,
    "success_definition": {"count_prompted_as_correct": false, "max_prompt_rank_allowed": null},
    "window": {"type": "consecutive_sessions", "n": 3, "min_opportunities_per_session": 5},
    "filters": {"session_type": "teaching"}
  }'),
  ('global', 'probe', 'Default Probe (2 probes ≥80% in 14d)', true, '{
    "measure": "percent_correct",
    "threshold": 80,
    "success_definition": {"count_prompted_as_correct": false, "max_prompt_rank_allowed": null},
    "window": {"type": "within_time_period", "required_successes": 2, "days": 14},
    "filters": {"session_type": "probe"}
  }'),
  ('global', 'generalization', 'Default Generalization (2 people + 2 settings)', true, '{
    "measure": "percent_correct",
    "threshold": 80,
    "success_definition": {"count_prompted_as_correct": false, "max_prompt_rank_allowed": null},
    "window": {"type": "per_condition", "min_sessions_per_condition": 1},
    "filters": {"session_type": "any", "people_required": 2, "settings_required": 2, "materials_required": 0}
  }'),
  ('global', 'maintenance', 'Default Maintenance (4 weeks ≥80%)', true, '{
    "measure": "percent_correct",
    "threshold": 80,
    "success_definition": {"count_prompted_as_correct": true, "max_prompt_rank_allowed": 2},
    "window": {"type": "scheduled_frequency", "frequency": "weekly", "duration_weeks": 4, "min_successes": 4},
    "filters": {"session_type": "probe"}
  }');

-- 12) Insert default global automation settings
INSERT INTO public.automation_settings (scope, auto_advance_enabled, advance_mode, require_confirmation, auto_open_next_target)
VALUES ('global', false, 'alert_only', true, false);

-- 13) Enable RLS on new tables
ALTER TABLE public.criteria_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criteria_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_queue ENABLE ROW LEVEL SECURITY;

-- 14) RLS Policies

-- criteria_templates: global readable, scoped by access
CREATE POLICY "Anyone can read global criteria" ON public.criteria_templates
  FOR SELECT USING (scope = 'global' OR auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage criteria" ON public.criteria_templates
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update criteria" ON public.criteria_templates
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete criteria" ON public.criteria_templates
  FOR DELETE USING (auth.uid() IS NOT NULL AND public.is_admin(auth.uid()));

-- prompt_sets: global readable, auth managed
CREATE POLICY "Anyone can read prompt sets" ON public.prompt_sets
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage prompt sets" ON public.prompt_sets
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update prompt sets" ON public.prompt_sets
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete prompt sets" ON public.prompt_sets
  FOR DELETE USING (public.is_admin(auth.uid()));

-- automation_settings: auth users
CREATE POLICY "Authenticated users can read automation settings" ON public.automation_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage automation settings" ON public.automation_settings
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update automation settings" ON public.automation_settings
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- criteria_evaluations: through target access
CREATE POLICY "Users can read criteria evaluations" ON public.criteria_evaluations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.skill_targets st
      JOIN public.skill_programs sp ON sp.id = st.program_id
      WHERE st.id = criteria_evaluations.target_id
      AND (public.is_student_owner(sp.student_id, auth.uid()) OR public.has_student_access(sp.student_id, auth.uid()))
    )
  );

CREATE POLICY "Users can manage criteria evaluations" ON public.criteria_evaluations
  FOR ALL USING (auth.uid() IS NOT NULL);

-- review_queue: through student access
CREATE POLICY "Users can read review queue" ON public.review_queue
  FOR SELECT USING (
    public.is_student_owner(student_id, auth.uid()) OR
    public.has_student_access(student_id, auth.uid()) OR
    public.is_admin(auth.uid())
  );

CREATE POLICY "Users can manage review queue" ON public.review_queue
  FOR ALL USING (auth.uid() IS NOT NULL);

-- 15) Helper function: resolve criteria for a target
CREATE OR REPLACE FUNCTION public.resolve_criteria(
  _target_id UUID,
  _criteria_type TEXT
) RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT id FROM (
    -- Target level
    SELECT id, 1 as priority FROM criteria_templates
    WHERE scope = 'target' AND scope_id = _target_id AND criteria_type = _criteria_type AND active = true
    UNION ALL
    -- Program level
    SELECT ct.id, 2 FROM criteria_templates ct
    JOIN skill_targets st ON st.id = _target_id
    WHERE ct.scope = 'program' AND ct.scope_id = st.program_id AND ct.criteria_type = _criteria_type AND ct.active = true
    UNION ALL
    -- Student level
    SELECT ct.id, 3 FROM criteria_templates ct
    JOIN skill_targets st ON st.id = _target_id
    JOIN skill_programs sp ON sp.id = st.program_id
    WHERE ct.scope = 'student' AND ct.scope_id = sp.student_id AND ct.criteria_type = _criteria_type AND ct.active = true
    UNION ALL
    -- Global level
    SELECT id, 4 FROM criteria_templates
    WHERE scope = 'global' AND criteria_type = _criteria_type AND is_default = true AND active = true
  ) ranked
  ORDER BY priority
  LIMIT 1;
$$;
