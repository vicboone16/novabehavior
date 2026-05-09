-- ============================================================
-- PHASE 1: Schema foundation for unified curriculum library
-- ============================================================

-- 1. Add framework metadata to library_programs
ALTER TABLE public.library_programs
  ADD COLUMN IF NOT EXISTS framework_source TEXT,
  ADD COLUMN IF NOT EXISTS framework_native_domain TEXT,
  ADD COLUMN IF NOT EXISTS framework_native_subdomain TEXT,
  ADD COLUMN IF NOT EXISTS framework_source_id TEXT,
  ADD COLUMN IF NOT EXISTS framework_metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_library_programs_framework_source 
  ON public.library_programs(framework_source) WHERE framework_source IS NOT NULL;

-- 2. Add framework metadata to library_program_objectives
ALTER TABLE public.library_program_objectives
  ADD COLUMN IF NOT EXISTS framework_source TEXT,
  ADD COLUMN IF NOT EXISTS framework_source_id TEXT,
  ADD COLUMN IF NOT EXISTS framework_metadata JSONB DEFAULT '{}'::jsonb;

-- 3. Add framework metadata to library_objective_targets
ALTER TABLE public.library_objective_targets
  ADD COLUMN IF NOT EXISTS framework_source TEXT,
  ADD COLUMN IF NOT EXISTS framework_source_id TEXT,
  ADD COLUMN IF NOT EXISTS framework_metadata JSONB DEFAULT '{}'::jsonb;

-- 4. Create unified_domains table (shared taxonomy across all frameworks)
CREATE TABLE IF NOT EXISTS public.unified_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create unified_subdomains table
CREATE TABLE IF NOT EXISTS public.unified_subdomains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unified_domain_id UUID NOT NULL REFERENCES public.unified_domains(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (unified_domain_id, slug)
);

-- 6. Create domain crosswalk (framework domain -> unified domain)
CREATE TABLE IF NOT EXISTS public.framework_domain_crosswalk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_source TEXT NOT NULL,           -- e.g. 'srs_2','abas_3','ablls_r','afls','vb_mapp'
  framework_domain TEXT NOT NULL,           -- e.g. 'Communication', 'Mand'
  framework_subdomain TEXT,                 -- nullable, optional 2nd level
  unified_domain_id UUID NOT NULL REFERENCES public.unified_domains(id) ON DELETE RESTRICT,
  unified_subdomain_id UUID REFERENCES public.unified_subdomains(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (framework_source, framework_domain, framework_subdomain)
);

CREATE INDEX IF NOT EXISTS idx_crosswalk_framework
  ON public.framework_domain_crosswalk(framework_source, framework_domain);
CREATE INDEX IF NOT EXISTS idx_crosswalk_unified
  ON public.framework_domain_crosswalk(unified_domain_id);

-- 7. Seed initial unified domains (the "umbrella" categories)
INSERT INTO public.unified_domains (name, slug, description, color, display_order)
VALUES
  ('Communication', 'communication', 'Expressive and receptive language, AAC, mands, tacts, intraverbals', '#3b82f6', 10),
  ('Social Skills', 'social-skills', 'Peer interaction, joint attention, turn-taking, social reciprocity', '#8b5cf6', 20),
  ('Daily Living', 'daily-living', 'Self-care, hygiene, dressing, household, community living', '#10b981', 30),
  ('Academic', 'academic', 'Reading, writing, math, school readiness', '#f59e0b', 40),
  ('Motor', 'motor', 'Gross motor, fine motor, motor imitation', '#ef4444', 50),
  ('Play & Leisure', 'play-leisure', 'Independent play, cooperative play, hobbies', '#ec4899', 60),
  ('Behavior & Self-Regulation', 'behavior-regulation', 'Coping, emotional regulation, replacement behaviors, executive function', '#6366f1', 70),
  ('Vocational', 'vocational', 'Work skills, employment readiness, transition', '#14b8a6', 80),
  ('Cognitive', 'cognitive', 'Problem-solving, attention, memory, reasoning', '#a855f7', 90),
  ('Safety', 'safety', 'Personal safety, community safety, emergency awareness', '#dc2626', 100)
ON CONFLICT (slug) DO NOTHING;

-- 8. RLS
ALTER TABLE public.unified_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_subdomains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.framework_domain_crosswalk ENABLE ROW LEVEL SECURITY;

-- Read: anyone signed in
CREATE POLICY "Authenticated can view unified domains"
  ON public.unified_domains FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can view unified subdomains"
  ON public.unified_subdomains FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can view crosswalk"
  ON public.framework_domain_crosswalk FOR SELECT TO authenticated USING (true);

-- Write: super admins or agency admins
CREATE POLICY "Admins can manage unified domains"
  ON public.unified_domains FOR ALL TO authenticated
  USING (public.is_super_admin() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_super_admin() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage unified subdomains"
  ON public.unified_subdomains FOR ALL TO authenticated
  USING (public.is_super_admin() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_super_admin() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage crosswalk"
  ON public.framework_domain_crosswalk FOR ALL TO authenticated
  USING (public.is_super_admin() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_super_admin() OR public.has_role(auth.uid(), 'admin'::app_role));

-- 9. updated_at triggers
CREATE TRIGGER trg_unified_domains_updated_at
  BEFORE UPDATE ON public.unified_domains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_unified_subdomains_updated_at
  BEFORE UPDATE ON public.unified_subdomains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_crosswalk_updated_at
  BEFORE UPDATE ON public.framework_domain_crosswalk
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();