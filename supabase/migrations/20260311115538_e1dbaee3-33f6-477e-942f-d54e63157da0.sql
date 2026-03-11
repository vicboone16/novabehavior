
-- ============================================================
-- 1) Create target_status enum for skill_targets
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.target_status AS ENUM ('active', 'on_hold', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2) Add lifecycle columns to skill_targets
-- ============================================================
ALTER TABLE public.skill_targets
  ADD COLUMN IF NOT EXISTS hold_at timestamptz,
  ADD COLUMN IF NOT EXISTS hold_reason text,
  ADD COLUMN IF NOT EXISTS reinstated_at timestamptz,
  ADD COLUMN IF NOT EXISTS reopened_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz,
  ADD COLUMN IF NOT EXISTS closed_reason public.target_closed_reason,
  ADD COLUMN IF NOT EXISTS discontinue_reason_text text,
  ADD COLUMN IF NOT EXISTS replaces_target_id uuid REFERENCES public.skill_targets(id),
  ADD COLUMN IF NOT EXISTS replaced_by_target_id uuid REFERENCES public.skill_targets(id),
  ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS version_group_id uuid,
  ADD COLUMN IF NOT EXISTS is_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS lifecycle_status public.target_status NOT NULL DEFAULT 'active';

-- ============================================================
-- 3) Create target_activity_log table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.target_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id uuid NOT NULL REFERENCES public.skill_targets(id) ON DELETE CASCADE,
  action text NOT NULL,
  previous_status text,
  new_status text,
  previous_phase text,
  new_phase text,
  reason text,
  notes text,
  performed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_target_activity_log_target ON public.target_activity_log(target_id, created_at DESC);

ALTER TABLE public.target_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read target activity logs"
  ON public.target_activity_log FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert target activity logs"
  ON public.target_activity_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 4) Create student_programs table (program instances per student)
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.program_instance_status AS ENUM ('active', 'on_hold', 'completed', 'paused', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.student_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.skill_programs(id) ON DELETE CASCADE,
  status public.program_instance_status NOT NULL DEFAULT 'active',
  completed_at timestamptz,
  hold_at timestamptz,
  hold_reason text,
  count_replaced_as_closed boolean NOT NULL DEFAULT true,
  count_discontinued_as_closed boolean NOT NULL DEFAULT false,
  auto_complete_on_required_closed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, program_id)
);

CREATE INDEX IF NOT EXISTS idx_student_programs_student ON public.student_programs(student_id);
CREATE INDEX IF NOT EXISTS idx_student_programs_status ON public.student_programs(status);

ALTER TABLE public.student_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage student_programs"
  ON public.student_programs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 5) Auto-log trigger for lifecycle changes on skill_targets
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_log_target_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log status changes
  IF OLD.lifecycle_status IS DISTINCT FROM NEW.lifecycle_status THEN
    INSERT INTO target_activity_log (target_id, action, previous_status, new_status, performed_by)
    VALUES (
      NEW.id,
      CASE
        WHEN NEW.lifecycle_status = 'on_hold' THEN 'hold'
        WHEN NEW.lifecycle_status = 'closed' AND NEW.closed_reason = 'discontinued' THEN 'discontinue'
        WHEN NEW.lifecycle_status = 'closed' AND NEW.closed_reason = 'replaced' THEN 'replace'
        WHEN NEW.lifecycle_status = 'closed' THEN 'close'
        WHEN NEW.lifecycle_status = 'active' AND OLD.lifecycle_status = 'on_hold' THEN 'reinstate'
        WHEN NEW.lifecycle_status = 'active' AND OLD.lifecycle_status = 'closed' THEN 'reopen'
        ELSE 'status_change'
      END,
      OLD.lifecycle_status::text,
      NEW.lifecycle_status::text,
      auth.uid()
    );
  END IF;

  -- Log phase changes
  IF OLD.phase IS DISTINCT FROM NEW.phase THEN
    INSERT INTO target_activity_log (target_id, action, previous_phase, new_phase, performed_by)
    VALUES (NEW.id, 'phase_change', OLD.phase, NEW.phase, auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_target_lifecycle_log ON public.skill_targets;
CREATE TRIGGER trg_target_lifecycle_log
  AFTER UPDATE ON public.skill_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_log_target_lifecycle();
