
-- =============================================
-- Pairwise Comparisons Table
-- =============================================
CREATE TABLE IF NOT EXISTS vineland3_pairwise_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_assessment_id uuid NOT NULL REFERENCES vineland3_student_assessments(id) ON DELETE CASCADE,
  comparison_level text NOT NULL, -- 'domain' or 'subdomain'
  domain_key text, -- parent domain for subdomain comparisons
  comparison_label text NOT NULL,
  score_1_key text NOT NULL,
  score_2_key text NOT NULL,
  score_1_value numeric,
  score_2_value numeric,
  difference_value numeric,
  significant_difference boolean DEFAULT false,
  base_rate text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_assessment_id, comparison_level, score_1_key, score_2_key)
);

-- =============================================
-- Scoring Status Table
-- =============================================
CREATE TABLE IF NOT EXISTS vineland3_scoring_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_assessment_id uuid NOT NULL REFERENCES vineland3_student_assessments(id) ON DELETE CASCADE UNIQUE,
  age_resolution_status text DEFAULT 'pending',
  raw_score_status text DEFAULT 'pending',
  subdomain_lookup_status text DEFAULT 'pending',
  domain_score_status text DEFAULT 'pending',
  composite_score_status text DEFAULT 'pending',
  comparison_status text DEFAULT 'pending',
  overall_scoring_status text DEFAULT 'pending',
  status_notes text,
  last_scored_at timestamptz,
  scored_by uuid,
  rescored_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =============================================
-- Add confidence interval + percent_estimated + flags to derived scores
-- =============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vineland3_derived_scores' AND column_name='confidence_interval_low') THEN
    ALTER TABLE vineland3_derived_scores
      ADD COLUMN confidence_interval_low numeric,
      ADD COLUMN confidence_interval_high numeric,
      ADD COLUMN percent_estimated numeric,
      ADD COLUMN relative_strength_flag boolean DEFAULT false,
      ADD COLUMN relative_weakness_flag boolean DEFAULT false,
      ADD COLUMN lookup_status text DEFAULT 'pending',
      ADD COLUMN vscale_sum_lookup integer;
  END IF;
END $$;

-- =============================================
-- Goal Crosswalk Rules Table
-- =============================================
CREATE TABLE IF NOT EXISTS vineland3_goal_crosswalks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_key text DEFAULT 'vineland_3',
  domain_key text NOT NULL,
  subdomain_key text,
  score_band text NOT NULL, -- 'high_need','moderate_need','mild_need','monitor_only'
  recommendation_type text NOT NULL, -- 'priority_area','curriculum','goal_theme','parent_training','behavior_support'
  recommended_library text,
  recommended_program_area text,
  recommended_tags text[],
  recommendation_text text NOT NULL,
  priority_level integer DEFAULT 50,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_v3_crosswalk_lookup ON vineland3_goal_crosswalks(domain_key, score_band, is_active);
