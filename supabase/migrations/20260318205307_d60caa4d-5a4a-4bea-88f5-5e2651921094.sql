
-- Create demo tables that were not created in the first failed migration
CREATE TABLE IF NOT EXISTS public.demo_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  settings jsonb DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view demo orgs"
  ON public.demo_organizations FOR SELECT TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS public.demo_staff_personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_org_id uuid REFERENCES public.demo_organizations(id) ON DELETE CASCADE NOT NULL,
  display_name text NOT NULL,
  role_label text NOT NULL,
  credential text,
  persona_type text NOT NULL DEFAULT 'staff',
  profile_data jsonb DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_staff_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view demo staff"
  ON public.demo_staff_personas FOR SELECT TO authenticated
  USING (true);

CREATE TABLE IF NOT EXISTS public.demo_learner_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demo_org_id uuid REFERENCES public.demo_organizations(id) ON DELETE CASCADE NOT NULL,
  learner_name text NOT NULL,
  age int,
  grade text,
  diagnosis text,
  setting text,
  funding_source text,
  purpose text,
  assigned_bcba text,
  assigned_rbt text,
  caregiver_name text,
  teacher_name text,
  scenario_data jsonb DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_learner_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view demo learners"
  ON public.demo_learner_scenarios FOR SELECT TO authenticated
  USING (true);
