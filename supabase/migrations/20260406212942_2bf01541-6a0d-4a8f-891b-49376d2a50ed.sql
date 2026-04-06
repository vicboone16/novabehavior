
-- 1. Report Snippet Library
CREATE TABLE IF NOT EXISTS public.report_snippet_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_slug text NOT NULL,
  section_key text NOT NULL,
  snippet_key text NOT NULL,
  tone text NOT NULL DEFAULT 'clinical',
  report_length text NOT NULL DEFAULT 'full',
  trigger_json jsonb,
  snippet_text text NOT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_slug, section_key, snippet_key, tone, report_length)
);

ALTER TABLE public.report_snippet_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read report snippets"
  ON public.report_snippet_library FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage report snippets"
  ON public.report_snippet_library FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Generated Goal Bank
CREATE TABLE IF NOT EXISTS public.generated_goal_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_slug text NOT NULL,
  goal_type text NOT NULL,
  goal_domain text NOT NULL,
  trigger_json jsonb,
  title text NOT NULL,
  goal_text text NOT NULL,
  measurable_text text,
  mastery_criteria text,
  progress_monitoring text,
  implementation_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_goal_bank ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read goal bank"
  ON public.generated_goal_bank FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage goal bank"
  ON public.generated_goal_bank FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Instance Generated Goals
CREATE TABLE IF NOT EXISTS public.instance_generated_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.nova_assessment_sessions(id) ON DELETE CASCADE,
  source_goal_id uuid REFERENCES public.generated_goal_bank(id) ON DELETE SET NULL,
  goal_type text NOT NULL,
  goal_domain text,
  title text NOT NULL,
  goal_text text NOT NULL,
  measurable_text text,
  mastery_criteria text,
  progress_monitoring text,
  implementation_notes text,
  is_selected boolean NOT NULL DEFAULT true,
  is_custom boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft',
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.instance_generated_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read instance goals"
  ON public.instance_generated_goals FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage instance goals"
  ON public.instance_generated_goals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Master Report Instances
CREATE TABLE IF NOT EXISTS public.master_report_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  agency_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Master Clinical Report',
  tone text NOT NULL DEFAULT 'clinical',
  report_length text NOT NULL DEFAULT 'full',
  include_iep_language boolean NOT NULL DEFAULT false,
  include_parent_friendly boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.master_report_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read master reports"
  ON public.master_report_instances FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage master reports"
  ON public.master_report_instances FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Master Report Sections
CREATE TABLE IF NOT EXISTS public.master_report_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_report_id uuid NOT NULL REFERENCES public.master_report_instances(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  section_title text,
  generated_text text,
  sort_order int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (master_report_id, section_key)
);

ALTER TABLE public.master_report_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read master report sections"
  ON public.master_report_sections FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage master report sections"
  ON public.master_report_sections FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_report_snippets_slug ON public.report_snippet_library(assessment_slug, section_key, tone, report_length);
CREATE INDEX IF NOT EXISTS idx_goal_bank_slug ON public.generated_goal_bank(assessment_slug, goal_type);
CREATE INDEX IF NOT EXISTS idx_instance_goals_session ON public.instance_generated_goals(session_id);
CREATE INDEX IF NOT EXISTS idx_master_reports_student ON public.master_report_instances(student_id);
CREATE INDEX IF NOT EXISTS idx_master_sections_report ON public.master_report_sections(master_report_id);

-- Updated-at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_instance_goals_updated_at
  BEFORE UPDATE ON public.instance_generated_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_master_reports_updated_at
  BEFORE UPDATE ON public.master_report_instances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_master_sections_updated_at
  BEFORE UPDATE ON public.master_report_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
