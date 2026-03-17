
-- Staff training engagement tracking for detailed progress monitoring
CREATE TABLE public.sdc_training_staff_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  module_id UUID REFERENCES public.sdc_training_modules(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  time_spent_seconds INTEGER NOT NULL DEFAULT 0,
  current_section TEXT,
  score NUMERIC,
  attempts INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  assigned_by UUID,
  assigned_at TIMESTAMPTZ,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_id)
);

ALTER TABLE public.sdc_training_staff_progress ENABLE ROW LEVEL SECURITY;

-- Staff can read their own progress
CREATE POLICY "Users can read own training progress"
  ON public.sdc_training_staff_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all progress
CREATE POLICY "Admins can read all training progress"
  ON public.sdc_training_staff_progress FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
    OR EXISTS (SELECT 1 FROM public.agency_memberships WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'bcba') AND status = 'active')
  );

-- Users can update their own progress (time tracking, completion)
CREATE POLICY "Users can update own training progress"
  ON public.sdc_training_staff_progress FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can insert/manage all progress (assignments)
CREATE POLICY "Admins can manage training progress"
  ON public.sdc_training_staff_progress FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
    OR EXISTS (SELECT 1 FROM public.agency_memberships WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'bcba') AND status = 'active')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
    OR EXISTS (SELECT 1 FROM public.agency_memberships WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'bcba') AND status = 'active')
  );

-- Also add admin insert policy for sdc_training_modules for agencies
CREATE POLICY "Agency admins can manage sdc training modules"
  ON public.sdc_training_modules FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.agency_memberships WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'bcba') AND status = 'active')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.agency_memberships WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'bcba') AND status = 'active')
  );

-- Agency admins can manage sdc training resources
CREATE POLICY "Agency admins can manage sdc training resources"
  ON public.sdc_training_resources FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.agency_memberships WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'bcba') AND status = 'active')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.agency_memberships WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'bcba') AND status = 'active')
  );
