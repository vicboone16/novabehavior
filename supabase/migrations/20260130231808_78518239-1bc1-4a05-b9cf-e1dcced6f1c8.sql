-- =====================================================
-- SKILL ACQUISITION & CURRICULUM SYSTEM
-- =====================================================

-- 1) DOMAINS - Shared taxonomy across all curriculum systems
CREATE TABLE public.domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

-- Everyone can view domains
CREATE POLICY "Authenticated users can view domains" 
ON public.domains FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Only admins can manage domains
CREATE POLICY "Admins can manage domains" 
ON public.domains FOR ALL 
USING (is_admin(auth.uid()));

-- 2) CURRICULUM SYSTEMS - Assessment/curriculum frameworks
CREATE TABLE public.curriculum_systems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'curriculum', -- assessment, curriculum, adaptive, social
  description TEXT,
  publisher TEXT,
  version TEXT,
  age_range_min_months INTEGER,
  age_range_max_months INTEGER,
  tags TEXT[] DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.curriculum_systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view curriculum systems" 
ON public.curriculum_systems FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage curriculum systems" 
ON public.curriculum_systems FOR ALL 
USING (is_admin(auth.uid()));

-- 3) CURRICULUM ITEMS - Goals/skills from curriculum systems
CREATE TABLE public.curriculum_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  curriculum_system_id UUID NOT NULL REFERENCES public.curriculum_systems(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES public.domains(id),
  level TEXT, -- e.g., "Level 1", "Level 2", "Level 3"
  code TEXT, -- e.g., "M1-Mand-3"
  title TEXT NOT NULL,
  description TEXT,
  mastery_criteria TEXT,
  teaching_notes TEXT,
  prerequisites UUID[] DEFAULT '{}', -- array of curriculum_item IDs
  age_band_min INTEGER,
  age_band_max INTEGER,
  keywords TEXT[] DEFAULT '{}',
  source_reference TEXT,
  display_order INTEGER DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.curriculum_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view curriculum items" 
ON public.curriculum_items FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage curriculum items" 
ON public.curriculum_items FOR ALL 
USING (is_admin(auth.uid()));

-- 4) ORG GOAL TEMPLATES - Organization-approved common targets
CREATE TABLE public.org_goal_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain_id UUID REFERENCES public.domains(id),
  title TEXT NOT NULL,
  description TEXT,
  mastery_criteria TEXT,
  prompting_notes TEXT,
  data_collection_type TEXT DEFAULT 'discrete_trial', -- discrete_trial, frequency, duration, task_analysis, probe
  generalization_notes TEXT,
  tags TEXT[] DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.org_goal_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view org goal templates" 
ON public.org_goal_templates FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage org goal templates" 
ON public.org_goal_templates FOR ALL 
USING (is_admin(auth.uid()));

-- 5) STUDENT TARGETS - The single source of truth for skill acquisition
CREATE TABLE public.student_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES public.domains(id),
  title TEXT NOT NULL,
  description TEXT,
  mastery_criteria TEXT,
  data_collection_type TEXT DEFAULT 'discrete_trial',
  priority TEXT DEFAULT 'medium', -- high, medium, low
  status TEXT NOT NULL DEFAULT 'active', -- active, paused, mastered, discontinued
  source_type TEXT NOT NULL DEFAULT 'custom', -- curriculum, org_template, custom
  source_id UUID, -- references curriculum_items or org_goal_templates
  customized BOOLEAN NOT NULL DEFAULT false,
  linked_prerequisite_ids UUID[] DEFAULT '{}',
  baseline_data JSONB DEFAULT '{}',
  current_performance JSONB DEFAULT '{}',
  date_added TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  date_mastered TIMESTAMP WITH TIME ZONE,
  added_by UUID,
  notes_for_staff TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.student_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view targets for accessible students" 
ON public.student_targets FOR SELECT 
USING (
  is_student_owner(student_id, auth.uid()) OR 
  has_student_access(student_id, auth.uid()) OR 
  has_tag_based_access(auth.uid(), student_id) OR 
  is_admin(auth.uid())
);

CREATE POLICY "Users can create targets for accessible students" 
ON public.student_targets FOR INSERT 
WITH CHECK (
  is_student_owner(student_id, auth.uid()) OR 
  has_student_access(student_id, auth.uid()) OR 
  has_tag_based_access(auth.uid(), student_id) OR 
  is_admin(auth.uid())
);

CREATE POLICY "Users can update targets for accessible students" 
ON public.student_targets FOR UPDATE 
USING (
  is_student_owner(student_id, auth.uid()) OR 
  has_student_access(student_id, auth.uid()) OR 
  has_tag_based_access(auth.uid(), student_id) OR 
  is_admin(auth.uid())
);

CREATE POLICY "Users can delete targets for their students" 
ON public.student_targets FOR DELETE 
USING (
  is_student_owner(student_id, auth.uid()) OR 
  is_admin(auth.uid())
);

-- 6) STUDENT CURRICULUM PLANS - Links student to curriculum system
CREATE TABLE public.student_curriculum_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  curriculum_system_id UUID NOT NULL REFERENCES public.curriculum_systems(id) ON DELETE CASCADE,
  date_started TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  active BOOLEAN NOT NULL DEFAULT true,
  current_level TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, curriculum_system_id)
);

ALTER TABLE public.student_curriculum_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view curriculum plans for accessible students" 
ON public.student_curriculum_plans FOR SELECT 
USING (
  is_student_owner(student_id, auth.uid()) OR 
  has_student_access(student_id, auth.uid()) OR 
  has_tag_based_access(auth.uid(), student_id) OR 
  is_admin(auth.uid())
);

CREATE POLICY "Users can manage curriculum plans for accessible students" 
ON public.student_curriculum_plans FOR ALL 
USING (
  is_student_owner(student_id, auth.uid()) OR 
  has_student_access(student_id, auth.uid()) OR 
  has_tag_based_access(auth.uid(), student_id) OR 
  is_admin(auth.uid())
);

-- 7) STUDENT ASSESSMENTS - Assessment events and results
CREATE TABLE public.student_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  curriculum_system_id UUID NOT NULL REFERENCES public.curriculum_systems(id) ON DELETE CASCADE,
  date_administered TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  administered_by UUID,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, final
  raw_attachment_path TEXT,
  results_json JSONB DEFAULT '{}',
  domain_scores JSONB DEFAULT '{}', -- domain-level summary scores
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.student_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view assessments for accessible students" 
ON public.student_assessments FOR SELECT 
USING (
  is_student_owner(student_id, auth.uid()) OR 
  has_student_access(student_id, auth.uid()) OR 
  has_tag_based_access(auth.uid(), student_id) OR 
  is_admin(auth.uid())
);

CREATE POLICY "Users can manage assessments for accessible students" 
ON public.student_assessments FOR ALL 
USING (
  is_student_owner(student_id, auth.uid()) OR 
  has_student_access(student_id, auth.uid()) OR 
  has_tag_based_access(auth.uid(), student_id) OR 
  is_admin(auth.uid())
);

-- Create indexes for performance
CREATE INDEX idx_curriculum_items_system ON public.curriculum_items(curriculum_system_id);
CREATE INDEX idx_curriculum_items_domain ON public.curriculum_items(domain_id);
CREATE INDEX idx_student_targets_student ON public.student_targets(student_id);
CREATE INDEX idx_student_targets_status ON public.student_targets(status);
CREATE INDEX idx_student_targets_domain ON public.student_targets(domain_id);
CREATE INDEX idx_student_curriculum_plans_student ON public.student_curriculum_plans(student_id);
CREATE INDEX idx_student_assessments_student ON public.student_assessments(student_id);

-- Insert VB-MAPP curriculum system
INSERT INTO public.curriculum_systems (name, type, description, publisher, version, age_range_min_months, age_range_max_months, tags)
VALUES (
  'VB-MAPP',
  'assessment',
  'Verbal Behavior Milestones Assessment and Placement Program - A criterion-referenced assessment tool, curriculum guide, and skill tracking system.',
  'AVB Press',
  '2nd Edition',
  0,
  48,
  ARRAY['verbal behavior', 'language', 'ABA', 'milestones']
);

-- Insert standard domains
INSERT INTO public.domains (name, category, description, display_order) VALUES
('Mand', 'Language', 'Requesting behavior - asking for desired items, actions, or information', 1),
('Tact', 'Language', 'Labeling/naming objects, actions, events, and properties in the environment', 2),
('Listener Responding', 'Language', 'Following instructions and responding to the verbal behavior of others', 3),
('Visual Perceptual Skills & Matching-to-Sample', 'Academic', 'Visual discrimination and matching skills', 4),
('Independent Play', 'Play', 'Engaging in age-appropriate play activities without direct supervision', 5),
('Social Behavior & Social Play', 'Social', 'Interacting appropriately with peers and adults in social contexts', 6),
('Motor Imitation', 'Motor', 'Copying the motor movements of others', 7),
('Echoic', 'Language', 'Repeating the verbal behavior of others', 8),
('Spontaneous Vocal Behavior', 'Language', 'Unprompted vocal productions', 9),
('Listener Responding by Function, Feature, and Class', 'Language', 'Selecting items based on their properties or category membership', 10),
('Intraverbal', 'Language', 'Conversational exchanges and verbal associations', 11),
('Classroom Routines & Group Skills', 'Academic', 'Following classroom expectations and participating in group activities', 12),
('Linguistic Structure', 'Language', 'Grammar, syntax, and sentence construction', 13),
('Reading', 'Academic', 'Decoding and comprehension of written text', 14),
('Writing', 'Academic', 'Producing written text', 15),
('Math', 'Academic', 'Numerical and mathematical skills', 16),
('Gross Motor', 'Motor', 'Large muscle movement and coordination', 17),
('Fine Motor', 'Motor', 'Small muscle movement and hand-eye coordination', 18),
('Self-Care', 'Adaptive', 'Daily living skills and personal care routines', 19),
('Vocal Play', 'Language', 'Early vocal explorations and sound production', 20);