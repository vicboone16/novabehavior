
-- Create fill_state enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE public.vb_mapp_fill_state AS ENUM ('EMPTY', 'HALF', 'FULL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- VB-MAPP Milestones Template (static items, shared across all learners)
CREATE TABLE IF NOT EXISTS public.vb_mapp_milestones_items (
  item_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT NOT NULL,
  level INT NOT NULL CHECK (level IN (1, 2, 3)),
  code TEXT NOT NULL UNIQUE,
  label_short TEXT NOT NULL,
  label_full TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vb_mapp_items_domain_level ON public.vb_mapp_milestones_items (domain, level, sort_order);

ALTER TABLE public.vb_mapp_milestones_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "All authenticated users can read milestones template"
    ON public.vb_mapp_milestones_items FOR SELECT
    USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage milestones template"
    ON public.vb_mapp_milestones_items FOR ALL
    USING (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- VB-MAPP Assessment Instances (one per learner per date)
CREATE TABLE IF NOT EXISTS public.vb_mapp_assessments (
  assessment_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  learner_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  examiner TEXT,
  notes_global TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vb_mapp_assessments_learner ON public.vb_mapp_assessments (learner_id, assessment_date DESC);

ALTER TABLE public.vb_mapp_assessments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can view vb assessments"
    ON public.vb_mapp_assessments FOR SELECT USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can create vb assessments"
    ON public.vb_mapp_assessments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can update vb assessments"
    ON public.vb_mapp_assessments FOR UPDATE USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can delete vb assessments"
    ON public.vb_mapp_assessments FOR DELETE USING (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.update_vb_mapp_assessments_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_vb_mapp_assessments_updated_at ON public.vb_mapp_assessments;
CREATE TRIGGER trg_vb_mapp_assessments_updated_at
  BEFORE UPDATE ON public.vb_mapp_assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_vb_mapp_assessments_updated_at();

-- VB-MAPP Assessment Results (per item per assessment)
CREATE TABLE IF NOT EXISTS public.vb_mapp_assessment_results (
  result_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.vb_mapp_assessments(assessment_id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.vb_mapp_milestones_items(item_id) ON DELETE CASCADE,
  fill_state public.vb_mapp_fill_state NOT NULL DEFAULT 'EMPTY',
  tested_circle BOOLEAN NOT NULL DEFAULT false,
  notes_item TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_in_assessment_id UUID REFERENCES public.vb_mapp_assessments(assessment_id),
  UNIQUE (assessment_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_vb_mapp_results_assessment ON public.vb_mapp_assessment_results (assessment_id, item_id);

ALTER TABLE public.vb_mapp_assessment_results ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can view vb results"
    ON public.vb_mapp_assessment_results FOR SELECT USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can insert vb results"
    ON public.vb_mapp_assessment_results FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can update vb results"
    ON public.vb_mapp_assessment_results FOR UPDATE USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can delete vb results"
    ON public.vb_mapp_assessment_results FOR DELETE USING (public.is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
