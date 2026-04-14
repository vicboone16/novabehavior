-- 1. Add objectives_enabled toggle to skill_programs
ALTER TABLE public.skill_programs 
ADD COLUMN IF NOT EXISTS objectives_enabled boolean NOT NULL DEFAULT false;

-- 2. Create skill_program_objectives table
CREATE TABLE IF NOT EXISTS public.skill_program_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.skill_programs(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.skill_program_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view objectives"
  ON public.skill_program_objectives FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can create objectives"
  ON public.skill_program_objectives FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update objectives"
  ON public.skill_program_objectives FOR UPDATE
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete objectives"
  ON public.skill_program_objectives FOR DELETE
  TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_skill_program_objectives_program 
  ON public.skill_program_objectives(program_id);

-- 3. Add objective_id FK to skill_targets
ALTER TABLE public.skill_targets 
ADD COLUMN IF NOT EXISTS objective_id uuid REFERENCES public.skill_program_objectives(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_skill_targets_objective 
  ON public.skill_targets(objective_id);

-- 4. Enhance benchmarks table with additional mastery fields
ALTER TABLE public.benchmarks
ADD COLUMN IF NOT EXISTS phase text NOT NULL DEFAULT 'baseline',
ADD COLUMN IF NOT EXISTS mastery_percent numeric,
ADD COLUMN IF NOT EXISTS mastery_consecutive_sessions integer,
ADD COLUMN IF NOT EXISTS prompt_level_expectations text,
ADD COLUMN IF NOT EXISTS reinforcement_schedule text,
ADD COLUMN IF NOT EXISTS generalization_requirements text,
ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT false;

-- Trigger for updated_at on skill_program_objectives
CREATE OR REPLACE FUNCTION public.update_skill_program_objectives_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_skill_program_objectives_updated_at
  BEFORE UPDATE ON public.skill_program_objectives
  FOR EACH ROW
  EXECUTE FUNCTION public.update_skill_program_objectives_updated_at();