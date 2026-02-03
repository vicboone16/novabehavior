-- Behavior Intervention Planner Tables

-- Presenting Problems (core behavior issues organized by domain)
CREATE TABLE public.bx_presenting_problems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  problem_code VARCHAR(20) NOT NULL UNIQUE,
  source_origin VARCHAR(50) NOT NULL DEFAULT 'internal',
  source_title TEXT,
  source_section TEXT,
  source_problem_number TEXT,
  source_page INTEGER,
  domain VARCHAR(100) NOT NULL,
  title TEXT NOT NULL,
  definition TEXT,
  examples TEXT[] DEFAULT '{}',
  risk_level VARCHAR(20) NOT NULL DEFAULT 'low',
  function_tags TEXT[] DEFAULT '{}',
  trigger_tags TEXT[] DEFAULT '{}',
  topics TEXT[] DEFAULT '{}',
  contraindications TEXT[] DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Objectives linked to presenting problems
CREATE TABLE public.bx_objectives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  objective_code VARCHAR(20) NOT NULL UNIQUE,
  objective_title TEXT NOT NULL,
  operational_definition TEXT,
  mastery_criteria TEXT,
  measurement_recommendations TEXT[] DEFAULT '{}',
  replacement_skill_tags TEXT[] DEFAULT '{}',
  prerequisites TEXT[] DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Strategies for implementing objectives
CREATE TABLE public.bx_strategies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  strategy_code VARCHAR(20) NOT NULL UNIQUE,
  strategy_name TEXT NOT NULL,
  strategy_type TEXT[] DEFAULT '{}',
  risk_level VARCHAR(20) NOT NULL DEFAULT 'low',
  requires_bcba BOOLEAN DEFAULT false,
  implementation_steps TEXT[] DEFAULT '{}',
  staff_script TEXT,
  materials TEXT[] DEFAULT '{}',
  fidelity_checklist TEXT[] DEFAULT '{}',
  data_targets TEXT[] DEFAULT '{}',
  contraindications TEXT[] DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Link problems to objectives
CREATE TABLE public.bx_problem_objective_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  problem_id UUID NOT NULL REFERENCES public.bx_presenting_problems(id) ON DELETE CASCADE,
  objective_id UUID NOT NULL REFERENCES public.bx_objectives(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(problem_id, objective_id)
);

-- Link objectives to strategies
CREATE TABLE public.bx_objective_strategy_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  objective_id UUID NOT NULL REFERENCES public.bx_objectives(id) ON DELETE CASCADE,
  strategy_id UUID NOT NULL REFERENCES public.bx_strategies(id) ON DELETE CASCADE,
  priority INTEGER DEFAULT 1,
  phase VARCHAR(30) DEFAULT 'teaching',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(objective_id, strategy_id)
);

-- Student-specific intervention plan links
CREATE TABLE public.student_bx_plan_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  problem_id UUID REFERENCES public.bx_presenting_problems(id) ON DELETE SET NULL,
  objective_id UUID REFERENCES public.bx_objectives(id) ON DELETE SET NULL,
  strategy_id UUID REFERENCES public.bx_strategies(id) ON DELETE SET NULL,
  link_status VARCHAR(30) NOT NULL DEFAULT 'considering',
  target_behavior_label TEXT,
  function_hypothesis TEXT[] DEFAULT '{}',
  setting_notes TEXT,
  data_summary TEXT,
  implementation_owner TEXT[] DEFAULT '{}',
  start_date DATE,
  review_due DATE,
  notes TEXT,
  recommended_score NUMERIC(5,2),
  recommendation_reason TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Recommendation tuning settings
CREATE TABLE public.bx_recommendation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE,
  tuning_profile VARCHAR(50) DEFAULT 'default',
  weight_domain_match NUMERIC(3,1) DEFAULT 5,
  weight_problem_title_match NUMERIC(3,1) DEFAULT 6,
  weight_topic_overlap NUMERIC(3,1) DEFAULT 3,
  weight_function_match NUMERIC(3,1) DEFAULT 3,
  weight_trigger_match NUMERIC(3,1) DEFAULT 2,
  weight_risk_safe_bonus NUMERIC(3,1) DEFAULT 1,
  weight_risk_high_penalty NUMERIC(3,1) DEFAULT -2,
  weight_risk_crisis_penalty NUMERIC(3,1) DEFAULT -4,
  weight_bcba_penalty_school NUMERIC(3,1) DEFAULT -2,
  weight_contraindication NUMERIC(3,1) DEFAULT -5,
  weight_rejected_penalty NUMERIC(3,1) DEFAULT -6,
  guardrail_exclude_existing BOOLEAN DEFAULT true,
  guardrail_exclude_rejected BOOLEAN DEFAULT true,
  guardrail_block_contraindicated BOOLEAN DEFAULT true,
  guardrail_school_reduce_high_risk BOOLEAN DEFAULT true,
  threshold_high_confidence NUMERIC(4,1) DEFAULT 12,
  threshold_medium_confidence NUMERIC(4,1) DEFAULT 7,
  max_objectives INTEGER DEFAULT 5,
  max_strategies_per_objective INTEGER DEFAULT 6,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agency_id, tuning_profile)
);

-- Enable RLS
ALTER TABLE public.bx_presenting_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bx_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bx_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bx_problem_objective_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bx_objective_strategy_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_bx_plan_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bx_recommendation_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies using agency_memberships for role checks
CREATE POLICY "Users can view presenting problems" ON public.bx_presenting_problems
  FOR SELECT USING (
    agency_id IS NULL OR 
    agency_id IN (SELECT agency_id FROM public.agency_memberships WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Admins can manage presenting problems" ON public.bx_presenting_problems
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.agency_memberships 
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('admin', 'super_admin', 'bcba')
    )
  );

CREATE POLICY "Users can view objectives" ON public.bx_objectives
  FOR SELECT USING (
    agency_id IS NULL OR 
    agency_id IN (SELECT agency_id FROM public.agency_memberships WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Admins can manage objectives" ON public.bx_objectives
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.agency_memberships 
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('admin', 'super_admin', 'bcba')
    )
  );

CREATE POLICY "Users can view strategies" ON public.bx_strategies
  FOR SELECT USING (
    agency_id IS NULL OR 
    agency_id IN (SELECT agency_id FROM public.agency_memberships WHERE user_id = auth.uid() AND status = 'active')
  );

CREATE POLICY "Admins can manage strategies" ON public.bx_strategies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.agency_memberships 
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('admin', 'super_admin', 'bcba')
    )
  );

CREATE POLICY "Users can view problem-objective links" ON public.bx_problem_objective_links
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage problem-objective links" ON public.bx_problem_objective_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.agency_memberships 
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('admin', 'super_admin', 'bcba')
    )
  );

CREATE POLICY "Users can view objective-strategy links" ON public.bx_objective_strategy_links
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage objective-strategy links" ON public.bx_objective_strategy_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.agency_memberships 
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('admin', 'super_admin', 'bcba')
    )
  );

CREATE POLICY "Users can view student plan links" ON public.student_bx_plan_links
  FOR SELECT USING (true);

CREATE POLICY "Staff can manage student plan links" ON public.student_bx_plan_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.agency_memberships 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can view recommendation settings" ON public.bx_recommendation_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage recommendation settings" ON public.bx_recommendation_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.agency_memberships 
      WHERE user_id = auth.uid() AND status = 'active' AND role IN ('admin', 'super_admin')
    )
  );

-- Indexes
CREATE INDEX idx_bx_presenting_problems_domain ON public.bx_presenting_problems(domain);
CREATE INDEX idx_bx_presenting_problems_status ON public.bx_presenting_problems(status);
CREATE INDEX idx_bx_problem_objective_links_problem ON public.bx_problem_objective_links(problem_id);
CREATE INDEX idx_bx_problem_objective_links_objective ON public.bx_problem_objective_links(objective_id);
CREATE INDEX idx_bx_objective_strategy_links_objective ON public.bx_objective_strategy_links(objective_id);
CREATE INDEX idx_bx_objective_strategy_links_strategy ON public.bx_objective_strategy_links(strategy_id);
CREATE INDEX idx_student_bx_plan_links_student ON public.student_bx_plan_links(student_id);
CREATE INDEX idx_student_bx_plan_links_status ON public.student_bx_plan_links(link_status);

-- Triggers for updated_at
CREATE TRIGGER update_bx_presenting_problems_updated_at
  BEFORE UPDATE ON public.bx_presenting_problems
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bx_objectives_updated_at
  BEFORE UPDATE ON public.bx_objectives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bx_strategies_updated_at
  BEFORE UPDATE ON public.bx_strategies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_bx_plan_links_updated_at
  BEFORE UPDATE ON public.student_bx_plan_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bx_recommendation_settings_updated_at
  BEFORE UPDATE ON public.bx_recommendation_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();