
-- ============================================================
-- 1) Fix skill_targets: add criteria_source, sort_order, active_benchmark_stage_id
-- ============================================================
ALTER TABLE public.skill_targets 
  ADD COLUMN IF NOT EXISTS criteria_source text NOT NULL DEFAULT 'inherit_global'
    CHECK (criteria_source IN ('inherit_program', 'inherit_global', 'inherit_student', 'custom')),
  ADD COLUMN IF NOT EXISTS global_criteria_id uuid REFERENCES public.criteria_templates(id),
  ADD COLUMN IF NOT EXISTS program_criteria_id uuid REFERENCES public.criteria_templates(id),
  ADD COLUMN IF NOT EXISTS custom_rule_json jsonb,
  ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_benchmark_stage_id uuid;

-- ============================================================
-- 2) Fix prompt_levels ranks: VP=1, G=2, M=3, PP=4, FP=5
--    and remove 'I' (Independent) prompt level
-- ============================================================
UPDATE public.prompt_levels SET rank = 1 WHERE abbreviation = 'VP';
UPDATE public.prompt_levels SET rank = 2 WHERE abbreviation = 'G';
UPDATE public.prompt_levels SET rank = 3 WHERE abbreviation = 'M';
UPDATE public.prompt_levels SET rank = 4 WHERE abbreviation = 'PP';
UPDATE public.prompt_levels SET rank = 5 WHERE abbreviation = 'FP';
UPDATE public.prompt_levels SET is_active = false WHERE abbreviation = 'I';

-- ============================================================
-- 3) Create benchmark_stages table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.benchmark_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('global', 'student', 'program', 'target')),
  scope_id uuid,
  name text NOT NULL,
  stage_order int NOT NULL DEFAULT 0,
  criteria_type text NOT NULL CHECK (criteria_type IN ('mastery', 'probe', 'generalization', 'maintenance')),
  criteria_template_id uuid REFERENCES public.criteria_templates(id),
  phase_sync_enabled boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.benchmark_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage benchmark_stages"
  ON public.benchmark_stages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add FK from skill_targets to benchmark_stages
ALTER TABLE public.skill_targets
  ADD CONSTRAINT skill_targets_active_benchmark_stage_id_fkey
  FOREIGN KEY (active_benchmark_stage_id) REFERENCES public.benchmark_stages(id);

-- ============================================================
-- 4) Create program_pathways and program_pathway_steps
-- ============================================================
CREATE TABLE IF NOT EXISTS public.program_pathways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('global', 'student')),
  scope_id uuid,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.program_pathways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage program_pathways"
  ON public.program_pathways FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.program_pathway_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_pathway_id uuid NOT NULL REFERENCES public.program_pathways(id) ON DELETE CASCADE,
  program_id uuid NOT NULL,
  step_order int NOT NULL DEFAULT 0,
  start_when jsonb,
  complete_when jsonb,
  auto_create_targets boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.program_pathway_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage program_pathway_steps"
  ON public.program_pathway_steps FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 5) Extend automation_settings with progression fields
-- ============================================================
ALTER TABLE public.automation_settings
  ADD COLUMN IF NOT EXISTS trigger_next_on text NOT NULL DEFAULT 'maintenance_met'
    CHECK (trigger_next_on IN ('mastery_met', 'probe_met', 'generalization_met', 'maintenance_met', 'closed', 'any_met')),
  ADD COLUMN IF NOT EXISTS next_action_mode text NOT NULL DEFAULT 'none'
    CHECK (next_action_mode IN ('none', 'next_target_in_program', 'next_benchmark_stage', 'next_program_in_pathway')),
  ADD COLUMN IF NOT EXISTS auto_start_phase text,
  ADD COLUMN IF NOT EXISTS sequence_mode text NOT NULL DEFAULT 'sort_order'
    CHECK (sequence_mode IN ('sort_order', 'custom_list')),
  ADD COLUMN IF NOT EXISTS sequence_list_json jsonb,
  ADD COLUMN IF NOT EXISTS end_of_ladder_action text NOT NULL DEFAULT 'none'
    CHECK (end_of_ladder_action IN ('suggest_close', 'auto_close', 'next_target', 'next_program', 'none')),
  ADD COLUMN IF NOT EXISTS pathway_id uuid REFERENCES public.program_pathways(id),
  ADD COLUMN IF NOT EXISTS notification_mode text NOT NULL DEFAULT 'immediate'
    CHECK (notification_mode IN ('immediate', 'daily_digest', 'none'));

-- ============================================================
-- 6) Add data_state to session-level data tables
-- ============================================================
ALTER TABLE public.target_trials
  ADD COLUMN IF NOT EXISTS data_state text NOT NULL DEFAULT 'measured'
    CHECK (data_state IN ('no_data', 'observed_zero', 'measured'));

ALTER TABLE public.task_analysis_step_data
  ADD COLUMN IF NOT EXISTS data_state text NOT NULL DEFAULT 'measured'
    CHECK (data_state IN ('no_data', 'observed_zero', 'measured'));
