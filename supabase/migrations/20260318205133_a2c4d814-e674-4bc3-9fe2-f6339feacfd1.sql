
-- Tables that were NOT created in the failed migration
-- (demo_organizations and related were created; help_faq_items failed midway)

-- Check: demo tables were created successfully before the failure point
-- help_faq_items table exists but the RLS policy failed on is_active column
-- Let's create remaining tables that didn't get created

-- Help articles table
CREATE TABLE IF NOT EXISTS public.help_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text,
  content text,
  category text NOT NULL,
  article_type text NOT NULL DEFAULT 'guide',
  sort_order int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published help articles"
  ON public.help_articles FOR SELECT TO authenticated
  USING (is_published = true);

-- Feature inventory
CREATE TABLE IF NOT EXISTS public.feature_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name text NOT NULL,
  feature_slug text NOT NULL UNIQUE,
  app_name text NOT NULL DEFAULT 'core',
  category text NOT NULL,
  role_audience text[],
  description text,
  why_it_matters text,
  where_it_lives text,
  demo_learner_names text[],
  status text NOT NULL DEFAULT 'active',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view feature inventory"
  ON public.feature_inventory FOR SELECT TO authenticated
  USING (true);

-- Training tracks
CREATE TABLE IF NOT EXISTS public.training_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  icon_name text,
  audience text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view training tracks"
  ON public.training_tracks FOR SELECT TO authenticated
  USING (true);

-- Training lessons
CREATE TABLE IF NOT EXISTS public.training_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL,
  title text NOT NULL,
  content text,
  demo_page_path text,
  demo_record_id uuid,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view training lessons"
  ON public.training_lessons FOR SELECT TO authenticated
  USING (true);

-- Training progress
CREATE TABLE IF NOT EXISTS public.training_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'not_started',
  started_at timestamptz,
  completed_at timestamptz,
  last_lesson_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_id)
);

ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own training progress"
  ON public.training_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own training progress"
  ON public.training_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own training progress"
  ON public.training_progress FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Fix RLS on help_faq_items if it exists without the policy
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'help_faq_items') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'help_faq_items' AND policyname = 'Anyone can view active FAQ items') THEN
      EXECUTE 'CREATE POLICY "Anyone can view active FAQ items" ON public.help_faq_items FOR SELECT TO authenticated USING (true)';
    END IF;
  END IF;
END$$;

-- Clinical capture enum expansions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'clinical_capture' AND t.typname = 'cc_extraction_type') THEN
    BEGIN ALTER TYPE clinical_capture.cc_extraction_type ADD VALUE IF NOT EXISTS 'one_line_summary'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE clinical_capture.cc_extraction_type ADD VALUE IF NOT EXISTS 'concise_summary'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE clinical_capture.cc_extraction_type ADD VALUE IF NOT EXISTS 'detailed_clinical_summary'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE clinical_capture.cc_extraction_type ADD VALUE IF NOT EXISTS 'parent_friendly_summary'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE clinical_capture.cc_extraction_type ADD VALUE IF NOT EXISTS 'action_items'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE clinical_capture.cc_extraction_type ADD VALUE IF NOT EXISTS 'missing_information'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE clinical_capture.cc_extraction_type ADD VALUE IF NOT EXISTS 'risk_flags'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE clinical_capture.cc_extraction_type ADD VALUE IF NOT EXISTS 'follow_up_steps'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'clinical_capture' AND t.typname = 'cc_action_type') THEN
    BEGIN ALTER TYPE clinical_capture.cc_action_type ADD VALUE IF NOT EXISTS 'recording_finalized'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE clinical_capture.cc_action_type ADD VALUE IF NOT EXISTS 'processing_completed'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE clinical_capture.cc_action_type ADD VALUE IF NOT EXISTS 'export'; EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END$$;

-- Draft versioning fields
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'clinical_capture' AND table_name = 'voice_ai_drafts') THEN
    ALTER TABLE clinical_capture.voice_ai_drafts ADD COLUMN IF NOT EXISTS generation_version integer NOT NULL DEFAULT 1;
    ALTER TABLE clinical_capture.voice_ai_drafts ADD COLUMN IF NOT EXISTS is_system_generated boolean NOT NULL DEFAULT true;
    ALTER TABLE clinical_capture.voice_ai_drafts ADD COLUMN IF NOT EXISTS superseded_at timestamptz;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'clinical_capture' AND table_name = 'voice_ai_extractions') THEN
    ALTER TABLE clinical_capture.voice_ai_extractions ADD COLUMN IF NOT EXISTS generation_version integer NOT NULL DEFAULT 1;
    ALTER TABLE clinical_capture.voice_ai_extractions ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT true;
  END IF;
END$$;
