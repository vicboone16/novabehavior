
CREATE TABLE IF NOT EXISTS public.parent_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  insight_date date NOT NULL DEFAULT CURRENT_DATE,
  insight_type text NOT NULL DEFAULT 'daily',
  headline text,
  behavior_summary jsonb NOT NULL DEFAULT '[]'::jsonb,
  what_this_means text,
  what_you_can_do jsonb NOT NULL DEFAULT '[]'::jsonb,
  rewards_summary jsonb DEFAULT '{}'::jsonb,
  teacher_note text,
  points_earned integer NOT NULL DEFAULT 0,
  points_redeemed integer NOT NULL DEFAULT 0,
  trend_data jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.parent_insights
  ADD CONSTRAINT parent_insights_student_date_type_uq
  UNIQUE (student_id, insight_date, insight_type);

CREATE INDEX IF NOT EXISTS idx_parent_insights_student_date
  ON public.parent_insights (student_id, insight_date DESC);

ALTER TABLE public.parent_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage parent_insights"
  ON public.parent_insights FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Staff read parent_insights"
  ON public.parent_insights FOR SELECT TO authenticated
  USING (public.has_student_access(auth.uid(), student_id));
