
-- 1. Create student_behavior_map table
CREATE TABLE IF NOT EXISTS public.student_behavior_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  behavior_entry_id uuid NOT NULL REFERENCES public.behavior_bank_entries(id),
  behavior_domain text NOT NULL DEFAULT 'Externalizing',
  behavior_subtype text NOT NULL,
  default_event_type text NOT NULL DEFAULT 'frequency',
  intensity_level text NOT NULL DEFAULT 'moderate',
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS student_behavior_map_unique
  ON public.student_behavior_map (student_id, behavior_entry_id, behavior_subtype);

CREATE INDEX IF NOT EXISTS idx_sbm_student ON public.student_behavior_map(student_id);
CREATE INDEX IF NOT EXISTS idx_sbm_behavior ON public.student_behavior_map(behavior_entry_id);

CREATE OR REPLACE FUNCTION trg_sbm_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_student_behavior_map_updated ON public.student_behavior_map;
CREATE TRIGGER trg_student_behavior_map_updated
  BEFORE UPDATE ON public.student_behavior_map
  FOR EACH ROW EXECUTE FUNCTION trg_sbm_updated_at();

ALTER TABLE public.student_behavior_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users with student access can view behavior map"
  ON public.student_behavior_map FOR SELECT TO authenticated
  USING (has_student_access(auth.uid(), student_id));

CREATE POLICY "Users with student access can manage behavior map"
  ON public.student_behavior_map FOR ALL TO authenticated
  USING (has_student_access(auth.uid(), student_id))
  WITH CHECK (has_student_access(auth.uid(), student_id))
