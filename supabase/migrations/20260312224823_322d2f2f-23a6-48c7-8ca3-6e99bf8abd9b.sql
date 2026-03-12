-- Add updated_at column to clinical_goals if missing
ALTER TABLE public.clinical_goals ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_clinical_goals_domain ON public.clinical_goals(domain);
CREATE INDEX IF NOT EXISTS idx_clinical_goals_subdomain ON public.clinical_goals(subdomain);
CREATE INDEX IF NOT EXISTS idx_clinical_goals_phase ON public.clinical_goals(phase);
CREATE INDEX IF NOT EXISTS idx_clinical_goals_program_name ON public.clinical_goals(program_name);
CREATE INDEX IF NOT EXISTS idx_clinical_goals_library_section ON public.clinical_goals(library_section);
CREATE INDEX IF NOT EXISTS idx_clinical_goals_collection_type ON public.clinical_goals(collection_type);
CREATE INDEX IF NOT EXISTS idx_clinical_goal_benchmarks_goal_id ON public.clinical_goal_benchmarks(goal_id);
CREATE INDEX IF NOT EXISTS idx_clinical_goal_targets_goal_id ON public.clinical_goal_targets(goal_id);

-- Unique index to prevent duplicate goals
CREATE UNIQUE INDEX IF NOT EXISTS ux_clinical_goals_title_domain_phase ON public.clinical_goals(title, domain, coalesce(phase, ''));