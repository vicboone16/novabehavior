
-- Enums
DO $$ BEGIN CREATE TYPE public.criteria_type AS ENUM ('mastery','probe','generalization','maintenance'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.scope_type AS ENUM ('global','student','program','target','benchmark'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.criteria_result AS ENUM ('met','not_met','insufficient_data'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.automation_mode AS ENUM ('manual','alert','queue_for_review','auto_advance'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.trigger_next_on AS ENUM ('mastery_met','probe_met','generalization_met','maintenance_met','target_closed','any_criteria_met'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.next_action_mode AS ENUM ('none','next_target_in_program','next_benchmark_stage','next_program_in_pathway'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.queue_status AS ENUM ('pending','approved','rejected','snoozed','applied','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.progression_action_type AS ENUM ('advance_phase','advance_benchmark','activate_next_target','activate_next_program','close_target','notify_review'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- criteria_assignments table
CREATE TABLE IF NOT EXISTS public.criteria_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope public.scope_type NOT NULL,
  scope_id uuid,
  criteria_type public.criteria_type NOT NULL,
  criteria_template_id uuid NOT NULL REFERENCES public.criteria_templates(id) ON DELETE RESTRICT,
  override_definition jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE public.criteria_assignments
    ADD CONSTRAINT criteria_assignments_unique_active UNIQUE (scope, scope_id, criteria_type);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_criteria_assignments_scope ON public.criteria_assignments(scope, scope_id);
CREATE INDEX IF NOT EXISTS idx_criteria_assignments_type ON public.criteria_assignments(criteria_type);

-- RLS
ALTER TABLE public.criteria_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view criteria assignments"
  ON public.criteria_assignments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage criteria assignments"
  ON public.criteria_assignments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
