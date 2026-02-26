
-- Skill Programs table (Domain → Program → Target hierarchy)
CREATE TABLE public.skill_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES public.domains(id),
  name TEXT NOT NULL,
  description TEXT,
  method TEXT NOT NULL DEFAULT 'discrete_trial',
  status TEXT NOT NULL DEFAULT 'baseline',
  status_effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  benchmark_enabled BOOLEAN NOT NULL DEFAULT false,
  benchmark_definition JSONB DEFAULT '{}',
  default_mastery_criteria TEXT,
  default_mastery_percent NUMERIC,
  default_mastery_consecutive_sessions INTEGER,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Skill Targets table (individual teachable units under a program)
CREATE TABLE public.skill_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.skill_programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  operational_definition TEXT,
  mastery_criteria TEXT,
  mastery_percent NUMERIC,
  mastery_consecutive_sessions INTEGER,
  status TEXT NOT NULL DEFAULT 'not_started',
  status_effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prompt levels reference table
CREATE TABLE public.prompt_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  rank INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT true,
  agency_id UUID REFERENCES public.agencies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default prompt levels
INSERT INTO public.prompt_levels (name, abbreviation, rank, is_default) VALUES
  ('Full Physical', 'FP', 1, true),
  ('Partial Physical', 'PP', 2, true),
  ('Model', 'M', 3, true),
  ('Gestural', 'G', 4, true),
  ('Verbal', 'V', 5, true),
  ('Positional', 'P', 6, true),
  ('Independent', 'I', 7, true);

-- Student-specific prompt assignments
CREATE TABLE public.student_prompt_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  prompt_level_id UUID NOT NULL REFERENCES public.prompt_levels(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  custom_label TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(student_id, prompt_level_id)
);

-- Target trial data (per-trial recording)
CREATE TABLE public.target_trials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_id UUID NOT NULL REFERENCES public.skill_targets(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id),
  trial_index INTEGER NOT NULL DEFAULT 0,
  outcome TEXT NOT NULL DEFAULT 'no_response',
  prompt_level_id UUID REFERENCES public.prompt_levels(id),
  prompt_success BOOLEAN,
  notes TEXT,
  recorded_by UUID,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Task analysis steps (per target)
CREATE TABLE public.task_analysis_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_id UUID NOT NULL REFERENCES public.skill_targets(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  step_label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(target_id, step_number)
);

-- Task analysis step data (per session)
CREATE TABLE public.task_analysis_step_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  step_id UUID NOT NULL REFERENCES public.task_analysis_steps(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id),
  outcome TEXT NOT NULL DEFAULT 'not_attempted',
  prompt_level_id UUID REFERENCES public.prompt_levels(id),
  notes TEXT,
  recorded_by UUID,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Program status history
CREATE TABLE public.program_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.skill_programs(id) ON DELETE CASCADE,
  status_from TEXT,
  status_to TEXT NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  changed_by UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Target status history
CREATE TABLE public.target_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_id UUID NOT NULL REFERENCES public.skill_targets(id) ON DELETE CASCADE,
  status_from TEXT,
  status_to TEXT NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  changed_by UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_skill_programs_student ON public.skill_programs(student_id);
CREATE INDEX idx_skill_programs_domain ON public.skill_programs(domain_id);
CREATE INDEX idx_skill_targets_program ON public.skill_targets(program_id);
CREATE INDEX idx_target_trials_target ON public.target_trials(target_id);
CREATE INDEX idx_target_trials_session ON public.target_trials(session_id);
CREATE INDEX idx_ta_steps_target ON public.task_analysis_steps(target_id);
CREATE INDEX idx_ta_step_data_step ON public.task_analysis_step_data(step_id);
CREATE INDEX idx_program_status_history_program ON public.program_status_history(program_id);
CREATE INDEX idx_target_status_history_target ON public.target_status_history(target_id);
CREATE INDEX idx_student_prompt_levels_student ON public.student_prompt_levels(student_id);

-- Enable RLS
ALTER TABLE public.skill_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_prompt_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.target_trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_analysis_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_analysis_step_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.target_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: skill_programs
CREATE POLICY "Users can view skill programs for accessible students" ON public.skill_programs
  FOR SELECT USING (
    public.is_student_owner(student_id, auth.uid()) OR
    public.has_student_access(student_id, auth.uid()) OR
    public.has_tag_based_access(auth.uid(), student_id) OR
    public.has_agency_student_access(auth.uid(), student_id) OR
    public.is_admin(auth.uid())
  );
CREATE POLICY "Users can insert skill programs" ON public.skill_programs
  FOR INSERT WITH CHECK (
    public.is_student_owner(student_id, auth.uid()) OR
    public.has_student_access(student_id, auth.uid()) OR
    public.has_tag_based_access(auth.uid(), student_id) OR
    public.has_agency_student_access(auth.uid(), student_id) OR
    public.is_admin(auth.uid())
  );
CREATE POLICY "Users can update skill programs" ON public.skill_programs
  FOR UPDATE USING (
    public.is_student_owner(student_id, auth.uid()) OR
    public.has_student_access(student_id, auth.uid()) OR
    public.has_tag_based_access(auth.uid(), student_id) OR
    public.has_agency_student_access(auth.uid(), student_id) OR
    public.is_admin(auth.uid())
  );
CREATE POLICY "Users can delete skill programs" ON public.skill_programs
  FOR DELETE USING (
    public.is_student_owner(student_id, auth.uid()) OR
    public.is_admin(auth.uid())
  );

-- RLS Policies: skill_targets (via program's student)
CREATE OR REPLACE FUNCTION public.skill_target_student_id(p_target_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT student_id FROM public.skill_programs WHERE id = (
    SELECT program_id FROM public.skill_targets WHERE id = p_target_id
  );
$$;

CREATE OR REPLACE FUNCTION public.skill_program_student_id(p_program_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT student_id FROM public.skill_programs WHERE id = p_program_id;
$$;

CREATE POLICY "Users can manage skill targets" ON public.skill_targets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.skill_programs sp
      WHERE sp.id = skill_targets.program_id
      AND (
        public.is_student_owner(sp.student_id, auth.uid()) OR
        public.has_student_access(sp.student_id, auth.uid()) OR
        public.has_tag_based_access(auth.uid(), sp.student_id) OR
        public.has_agency_student_access(auth.uid(), sp.student_id) OR
        public.is_admin(auth.uid())
      )
    )
  );

-- RLS: prompt_levels (global read)
CREATE POLICY "Anyone can read prompt levels" ON public.prompt_levels
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage prompt levels" ON public.prompt_levels
  FOR ALL USING (public.is_admin(auth.uid()));

-- RLS: student_prompt_levels
CREATE POLICY "Users can manage student prompt levels" ON public.student_prompt_levels
  FOR ALL USING (
    public.is_student_owner(student_id, auth.uid()) OR
    public.has_student_access(student_id, auth.uid()) OR
    public.has_tag_based_access(auth.uid(), student_id) OR
    public.has_agency_student_access(auth.uid(), student_id) OR
    public.is_admin(auth.uid())
  );

-- RLS: target_trials (via target's program's student)
CREATE POLICY "Users can manage target trials" ON public.target_trials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.skill_targets st
      JOIN public.skill_programs sp ON sp.id = st.program_id
      WHERE st.id = target_trials.target_id
      AND (
        public.is_student_owner(sp.student_id, auth.uid()) OR
        public.has_student_access(sp.student_id, auth.uid()) OR
        public.has_tag_based_access(auth.uid(), sp.student_id) OR
        public.has_agency_student_access(auth.uid(), sp.student_id) OR
        public.is_admin(auth.uid())
      )
    )
  );

-- RLS: task_analysis_steps
CREATE POLICY "Users can manage TA steps" ON public.task_analysis_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.skill_targets st
      JOIN public.skill_programs sp ON sp.id = st.program_id
      WHERE st.id = task_analysis_steps.target_id
      AND (
        public.is_student_owner(sp.student_id, auth.uid()) OR
        public.has_student_access(sp.student_id, auth.uid()) OR
        public.has_tag_based_access(auth.uid(), sp.student_id) OR
        public.has_agency_student_access(auth.uid(), sp.student_id) OR
        public.is_admin(auth.uid())
      )
    )
  );

-- RLS: task_analysis_step_data
CREATE POLICY "Users can manage TA step data" ON public.task_analysis_step_data
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.task_analysis_steps tas
      JOIN public.skill_targets st ON st.id = tas.target_id
      JOIN public.skill_programs sp ON sp.id = st.program_id
      WHERE tas.id = task_analysis_step_data.step_id
      AND (
        public.is_student_owner(sp.student_id, auth.uid()) OR
        public.has_student_access(sp.student_id, auth.uid()) OR
        public.has_tag_based_access(auth.uid(), sp.student_id) OR
        public.has_agency_student_access(auth.uid(), sp.student_id) OR
        public.is_admin(auth.uid())
      )
    )
  );

-- RLS: program_status_history
CREATE POLICY "Users can manage program status history" ON public.program_status_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.skill_programs sp
      WHERE sp.id = program_status_history.program_id
      AND (
        public.is_student_owner(sp.student_id, auth.uid()) OR
        public.has_student_access(sp.student_id, auth.uid()) OR
        public.has_tag_based_access(auth.uid(), sp.student_id) OR
        public.has_agency_student_access(auth.uid(), sp.student_id) OR
        public.is_admin(auth.uid())
      )
    )
  );

-- RLS: target_status_history
CREATE POLICY "Users can manage target status history" ON public.target_status_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.skill_targets st
      JOIN public.skill_programs sp ON sp.id = st.program_id
      WHERE st.id = target_status_history.target_id
      AND (
        public.is_student_owner(sp.student_id, auth.uid()) OR
        public.has_student_access(sp.student_id, auth.uid()) OR
        public.has_tag_based_access(auth.uid(), sp.student_id) OR
        public.has_agency_student_access(auth.uid(), sp.student_id) OR
        public.is_admin(auth.uid())
      )
    )
  );

-- Updated_at triggers
CREATE TRIGGER update_skill_programs_updated_at BEFORE UPDATE ON public.skill_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_skill_targets_updated_at BEFORE UPDATE ON public.skill_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
