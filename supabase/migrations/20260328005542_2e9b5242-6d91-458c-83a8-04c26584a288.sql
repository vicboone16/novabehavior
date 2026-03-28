
-- ============================================
-- Phase 1: Create program_domains table
-- ============================================
CREATE TABLE IF NOT EXISTS public.program_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.program_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read program_domains"
  ON public.program_domains FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- Phase 2: Create program_subdomains table
-- ============================================
CREATE TABLE IF NOT EXISTS public.program_subdomains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid NOT NULL REFERENCES public.program_domains(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(domain_id, slug)
);

ALTER TABLE public.program_subdomains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read program_subdomains"
  ON public.program_subdomains FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- Phase 3: Create program_tag_categories table
-- ============================================
CREATE TABLE IF NOT EXISTS public.program_tag_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.program_tag_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read program_tag_categories"
  ON public.program_tag_categories FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- Phase 4: Create program_tags table
-- ============================================
CREATE TABLE IF NOT EXISTS public.program_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_category_id uuid NOT NULL REFERENCES public.program_tag_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  color text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tag_category_id, slug)
);

ALTER TABLE public.program_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read program_tags"
  ON public.program_tags FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- Phase 5: Create program_tag_links junction
-- ============================================
CREATE TABLE IF NOT EXISTS public.program_tag_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.skill_programs(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.program_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE(program_id, tag_id)
);

ALTER TABLE public.program_tag_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read program_tag_links"
  ON public.program_tag_links FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert program_tag_links"
  ON public.program_tag_links FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can delete program_tag_links"
  ON public.program_tag_links FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- Phase 6: Add new columns to skill_programs
-- ============================================
ALTER TABLE public.skill_programs
  ADD COLUMN IF NOT EXISTS top_level_domain_id uuid REFERENCES public.program_domains(id),
  ADD COLUMN IF NOT EXISTS subdomain_id uuid REFERENCES public.program_subdomains(id),
  ADD COLUMN IF NOT EXISTS legacy_domain_name text;

CREATE INDEX IF NOT EXISTS idx_skill_programs_top_level_domain ON public.skill_programs(top_level_domain_id);
CREATE INDEX IF NOT EXISTS idx_skill_programs_subdomain ON public.skill_programs(subdomain_id);

-- ============================================
-- Phase 7: Domain migration audit table
-- ============================================
CREATE TABLE IF NOT EXISTS public.program_domain_migration_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.skill_programs(id) ON DELETE CASCADE,
  old_domain_id uuid,
  old_domain_name text,
  new_domain_id uuid REFERENCES public.program_domains(id),
  new_domain_name text,
  new_subdomain_id uuid REFERENCES public.program_subdomains(id),
  new_subdomain_name text,
  tags_added text[],
  confidence text DEFAULT 'auto',
  migration_source text DEFAULT 'backfill_v1',
  needs_review boolean DEFAULT false,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.program_domain_migration_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read migration log"
  ON public.program_domain_migration_log FOR SELECT
  TO authenticated
  USING (true);
