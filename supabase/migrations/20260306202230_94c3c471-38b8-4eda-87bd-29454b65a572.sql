
-- SDC Training System tables

-- 1. SDC Training Modules (extends academy_modules with instructor/workbook content)
CREATE TABLE public.sdc_training_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_module_id UUID REFERENCES public.academy_modules(module_id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  estimated_minutes INT DEFAULT 30,
  training_objective TEXT,
  -- Instructor Guide content (JSON for flexible sections)
  instructor_talking_points JSONB DEFAULT '[]'::jsonb,
  discussion_prompts JSONB DEFAULT '[]'::jsonb,
  scenario_practice_prompts JSONB DEFAULT '[]'::jsonb,
  key_definitions JSONB DEFAULT '[]'::jsonb,
  examples JSONB DEFAULT '[]'::jsonb,
  staff_misconceptions JSONB DEFAULT '[]'::jsonb,
  fidelity_check_items JSONB DEFAULT '[]'::jsonb,
  coaching_recommendations JSONB DEFAULT '[]'::jsonb,
  instructor_script TEXT,
  demonstration_notes TEXT,
  common_staff_errors JSONB DEFAULT '[]'::jsonb,
  key_takeaways JSONB DEFAULT '[]'::jsonb,
  -- Workbook content
  workbook_reading_content TEXT,
  reflection_prompts JSONB DEFAULT '[]'::jsonb,
  guided_practice JSONB DEFAULT '[]'::jsonb,
  scenario_questions JSONB DEFAULT '[]'::jsonb,
  matching_activities JSONB DEFAULT '[]'::jsonb,
  abc_worksheets JSONB DEFAULT '[]'::jsonb,
  data_collection_practice JSONB DEFAULT '[]'::jsonb,
  intervention_planning_prompts JSONB DEFAULT '[]'::jsonb,
  reinforcement_planning JSONB DEFAULT '[]'::jsonb,
  knowledge_check JSONB DEFAULT '[]'::jsonb,
  -- Meta
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. SDC Certification requirements
CREATE TABLE public.sdc_certification_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.sdc_training_modules(id) ON DELETE CASCADE,
  requirement_type TEXT NOT NULL DEFAULT 'module_completion', -- module_completion, quiz_pass, live_observation
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. SDC Certification tracker per staff
CREATE TABLE public.sdc_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started', -- not_started, in_progress, pending_observation, certified, expired
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by UUID,
  certified_at TIMESTAMPTZ,
  renewal_date TIMESTAMPTZ,
  notes TEXT,
  agency_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. SDC Certification progress (per requirement per staff)
CREATE TABLE public.sdc_certification_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_id UUID NOT NULL REFERENCES public.sdc_certifications(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES public.sdc_certification_requirements(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  score NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(certification_id, requirement_id)
);

-- 5. SDC Training Downloads / Resources
CREATE TABLE public.sdc_training_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES public.sdc_training_modules(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  resource_type TEXT NOT NULL DEFAULT 'handout', -- handout, worksheet, guide, reference, template
  file_url TEXT,
  is_instructor_only BOOLEAN NOT NULL DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sdc_training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdc_certification_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdc_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdc_certification_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdc_training_resources ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Training modules are readable by all authenticated users
CREATE POLICY "Authenticated users can read sdc training modules"
  ON public.sdc_training_modules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read sdc certification requirements"
  ON public.sdc_certification_requirements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read sdc training resources"
  ON public.sdc_training_resources FOR SELECT TO authenticated USING (true);

-- Certifications: users can read their own, admins can read all
CREATE POLICY "Users can read own certifications"
  ON public.sdc_certifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can read own certification progress"
  ON public.sdc_certification_progress FOR SELECT TO authenticated
  USING (certification_id IN (SELECT id FROM public.sdc_certifications WHERE user_id = auth.uid()));

-- Admin insert/update policies
CREATE POLICY "Admins can manage sdc training modules"
  ON public.sdc_training_modules FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
    OR EXISTS (SELECT 1 FROM public.agency_memberships WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'bcba') AND status = 'active')
  );

CREATE POLICY "Admins can manage sdc certification requirements"
  ON public.sdc_certification_requirements FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
    OR EXISTS (SELECT 1 FROM public.agency_memberships WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'bcba') AND status = 'active')
  );

CREATE POLICY "Admins can manage sdc certifications"
  ON public.sdc_certifications FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
    OR EXISTS (SELECT 1 FROM public.agency_memberships WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'bcba') AND status = 'active')
  );

CREATE POLICY "Admins can manage sdc certification progress"
  ON public.sdc_certification_progress FOR ALL TO authenticated
  USING (
    certification_id IN (SELECT id FROM public.sdc_certifications WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
    OR EXISTS (SELECT 1 FROM public.agency_memberships WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'bcba') AND status = 'active')
  );

CREATE POLICY "Admins can manage sdc training resources"
  ON public.sdc_training_resources FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
    OR EXISTS (SELECT 1 FROM public.agency_memberships WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'bcba') AND status = 'active')
  );
