
-- MTSS Enums
DO $$ BEGIN CREATE TYPE public.mtss_tier AS ENUM ('tier_1','tier_2','tier_3'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.mtss_status AS ENUM ('active','monitoring','exited','paused'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.fidelity_rating AS ENUM ('not_started','partial','met','exceeded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- MTSS Interventions Library
CREATE TABLE IF NOT EXISTS public.mtss_interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id uuid REFERENCES public.districts(id) ON DELETE CASCADE,
  name text NOT NULL,
  tier public.mtss_tier NOT NULL,
  description text,
  recommended_minutes_per_day int,
  recommended_days_per_week int,
  materials jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mtss_interventions_district ON public.mtss_interventions(district_id);
CREATE INDEX IF NOT EXISTS idx_mtss_interventions_tier ON public.mtss_interventions(tier);

-- Student MTSS Plans
CREATE TABLE IF NOT EXISTS public.student_mtss_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  district_id uuid REFERENCES public.districts(id) ON DELETE SET NULL,
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  tier public.mtss_tier NOT NULL,
  status public.mtss_status NOT NULL DEFAULT 'active',
  start_date date DEFAULT current_date,
  review_interval_days int DEFAULT 30,
  next_review_date date,
  primary_goal text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_student_mtss_plans_student ON public.student_mtss_plans(student_id);
CREATE INDEX IF NOT EXISTS idx_student_mtss_plans_school ON public.student_mtss_plans(school_id);
CREATE INDEX IF NOT EXISTS idx_student_mtss_plans_tier ON public.student_mtss_plans(tier);

-- Auto-fill next_review_date trigger
CREATE OR REPLACE FUNCTION public.set_mtss_next_review_date()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF new.next_review_date IS NULL THEN
    new.next_review_date := (COALESCE(new.start_date, current_date) + (COALESCE(new.review_interval_days,30) || ' days')::interval)::date;
  END IF;
  RETURN new;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_set_mtss_next_review') THEN
    CREATE TRIGGER trg_set_mtss_next_review
    BEFORE INSERT OR UPDATE ON public.student_mtss_plans
    FOR EACH ROW EXECUTE PROCEDURE public.set_mtss_next_review_date();
  END IF;
END $$;

-- Plan Interventions
CREATE TABLE IF NOT EXISTS public.student_mtss_plan_interventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.student_mtss_plans(id) ON DELETE CASCADE,
  intervention_id uuid NOT NULL REFERENCES public.mtss_interventions(id) ON DELETE RESTRICT,
  dosage_minutes_per_day int,
  dosage_days_per_week int,
  start_date date DEFAULT current_date,
  end_date date,
  owner_user_id uuid,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (plan_id, intervention_id, start_date)
);

-- Fidelity Logs
CREATE TABLE IF NOT EXISTS public.mtss_fidelity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_intervention_id uuid NOT NULL REFERENCES public.student_mtss_plan_interventions(id) ON DELETE CASCADE,
  log_date date DEFAULT current_date,
  rating public.fidelity_rating NOT NULL DEFAULT 'not_started',
  minutes_delivered int,
  notes text,
  logged_by uuid,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mtss_fidelity_logs_pi ON public.mtss_fidelity_logs(plan_intervention_id, log_date);
