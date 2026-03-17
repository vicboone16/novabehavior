
-- Add missing capability columns to assessment_library_registry
ALTER TABLE assessment_library_registry
  ADD COLUMN IF NOT EXISTS supports_domains boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS supports_subdomains boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS supports_goal_bank boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS supports_benchmarks boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS supports_age_bands boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS supports_progress_tracking boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notes text;

-- Add missing crosswalk columns
ALTER TABLE library_crosswalk_rules
  ADD COLUMN IF NOT EXISTS target_domain_key text,
  ADD COLUMN IF NOT EXISTS target_subdomain_key text;

-- Create library_benchmark_variants
CREATE TABLE IF NOT EXISTS library_benchmark_variants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    library_goal_id uuid NOT NULL REFERENCES library_goal_bank(id) ON DELETE CASCADE,
    benchmark_key text NOT NULL,
    benchmark_label text,
    age_band_key text,
    benchmark_text text NOT NULL,
    display_order int DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_library_benchmark_variants_goal
  ON library_benchmark_variants(library_goal_id);

-- RLS
ALTER TABLE library_benchmark_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read benchmark variants"
  ON library_benchmark_variants FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage benchmark variants"
  ON library_benchmark_variants FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
