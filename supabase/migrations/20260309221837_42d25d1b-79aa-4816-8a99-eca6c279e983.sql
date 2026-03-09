-- Add missing columns to clinical_curricula_goals
ALTER TABLE public.clinical_curricula_goals
  ADD COLUMN IF NOT EXISTS benchmark_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS search_text tsvector,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Make clinical_goal NOT NULL (it's currently nullable)
ALTER TABLE public.clinical_curricula_goals
  ALTER COLUMN clinical_goal SET NOT NULL;

-- Make vbmapp_domain NOT NULL
ALTER TABLE public.clinical_curricula_goals
  ALTER COLUMN vbmapp_domain SET NOT NULL;

-- Add unique constraints
ALTER TABLE public.clinical_curricula_goals
  ADD CONSTRAINT clinical_curricula_goals_domain_key_unique UNIQUE (domain_id, key);

ALTER TABLE public.clinical_curricula_benchmarks
  ADD CONSTRAINT clinical_curricula_benchmarks_goal_order_unique UNIQUE (goal_id, benchmark_order);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_clinical_curricula_domains_collection_sort
  ON public.clinical_curricula_domains(collection_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_clinical_curricula_goals_domain_sort
  ON public.clinical_curricula_goals(domain_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_clinical_curricula_goals_vbmapp_domain
  ON public.clinical_curricula_goals(vbmapp_domain);

CREATE INDEX IF NOT EXISTS idx_clinical_curricula_goals_search_text
  ON public.clinical_curricula_goals USING gin(search_text);

CREATE INDEX IF NOT EXISTS idx_clinical_curricula_goals_title_trgm
  ON public.clinical_curricula_goals USING gin(title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clinical_curricula_goals_objective_trgm
  ON public.clinical_curricula_goals USING gin(objective_text gin_trgm_ops);

-- Backfill benchmark_count from existing data
UPDATE public.clinical_curricula_goals g
SET benchmark_count = (
  SELECT COUNT(*) FROM public.clinical_curricula_benchmarks b WHERE b.goal_id = g.id
);

-- Backfill search_text from existing data
UPDATE public.clinical_curricula_goals
SET search_text = to_tsvector('english',
  coalesce(title, '') || ' ' ||
  coalesce(clinical_goal, '') || ' ' ||
  coalesce(objective_text, '') || ' ' ||
  coalesce(vbmapp_domain, '') || ' ' ||
  coalesce(array_to_string(skill_tags, ' '), '') || ' ' ||
  coalesce(array_to_string(age_group_tags, ' '), '') || ' ' ||
  coalesce(array_to_string(setting_tags, ' '), '')
);