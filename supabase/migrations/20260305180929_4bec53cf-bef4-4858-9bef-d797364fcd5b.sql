
-- ================================================
-- MULTI-TENANT DISTRICT ARCHITECTURE
-- ================================================
CREATE TABLE IF NOT EXISTS public.districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  state text,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id uuid REFERENCES public.districts(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  address text,
  grade_levels text[],
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.classrooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  grade_level text,
  classroom_type text DEFAULT 'general',
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.classroom_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'student',
  created_at timestamptz DEFAULT now(),
  UNIQUE(classroom_id, user_id, student_id)
);

-- Add district/school references to students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS district_id uuid REFERENCES public.districts(id);
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id);
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS classroom_id uuid REFERENCES public.classrooms(id);

-- Indexes for tenant isolation performance
CREATE INDEX IF NOT EXISTS idx_schools_district ON public.schools(district_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_school ON public.classrooms(school_id);
CREATE INDEX IF NOT EXISTS idx_classroom_members_classroom ON public.classroom_members(classroom_id);
CREATE INDEX IF NOT EXISTS idx_students_district ON public.students(district_id);
CREATE INDEX IF NOT EXISTS idx_students_school ON public.students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_classroom ON public.students(classroom_id);

-- ================================================
-- LMS CERTIFICATIONS & BADGES
-- ================================================
CREATE TABLE IF NOT EXISTS public.lms_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.lms_courses(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  requirements jsonb DEFAULT '{}',
  valid_months integer DEFAULT 12,
  badge_image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lms_user_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  certification_id uuid REFERENCES public.lms_certifications(id) ON DELETE CASCADE NOT NULL,
  earned_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  quiz_score numeric,
  status text DEFAULT 'active',
  certificate_pdf_url text,
  UNIQUE(user_id, certification_id)
);

CREATE TABLE IF NOT EXISTS public.lms_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  icon text,
  xp_value integer DEFAULT 0,
  criteria jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lms_user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_id uuid REFERENCES public.lms_badges(id) ON DELETE CASCADE NOT NULL,
  earned_at timestamptz DEFAULT now(),
  context jsonb DEFAULT '{}',
  UNIQUE(user_id, badge_id)
);

-- ================================================
-- BEHAVIOR SIMULATION ENGINE
-- ================================================
CREATE TABLE IF NOT EXISTS public.lms_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL,
  difficulty text DEFAULT 'intermediate',
  audience text DEFAULT 'staff',
  description text,
  scenario_context text,
  estimated_minutes integer DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lms_simulation_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid REFERENCES public.lms_simulations(id) ON DELETE CASCADE NOT NULL,
  step_order integer NOT NULL,
  scenario_text text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  correct_option_index integer NOT NULL DEFAULT 0,
  feedback_correct text,
  feedback_incorrect text,
  behavior_function text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lms_simulation_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  simulation_id uuid REFERENCES public.lms_simulations(id) ON DELETE CASCADE NOT NULL,
  responses jsonb DEFAULT '[]',
  score numeric,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ================================================
-- AI TEACHER COACH LOGS
-- ================================================
CREATE TABLE IF NOT EXISTS public.ai_teacher_coach_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  student_id uuid REFERENCES public.students(id),
  input_description text NOT NULL,
  ai_response jsonb NOT NULL DEFAULT '{}',
  model_used text,
  agency_id uuid,
  district_id uuid REFERENCES public.districts(id),
  school_id uuid REFERENCES public.schools(id),
  created_at timestamptz DEFAULT now()
);

-- ================================================
-- BEHAVIOR KNOWLEDGE BASE
-- ================================================
CREATE TABLE IF NOT EXISTS public.behavior_knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  subcategory text,
  title text NOT NULL,
  content text NOT NULL,
  evidence_base text,
  audience text[] DEFAULT '{staff,teacher,bcba}',
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ================================================
-- BEHAVIOR DECISION TREES
-- ================================================
CREATE TABLE IF NOT EXISTS public.behavior_decision_trees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  behavior_type text NOT NULL,
  trigger_context text NOT NULL,
  function_of_behavior text,
  recommended_response text NOT NULL,
  replacement_behavior text,
  reinforcement_strategy text,
  escalation_protocol text,
  data_to_collect text[],
  audience text DEFAULT 'teacher',
  severity text DEFAULT 'moderate',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ================================================
-- STUDENT RISK INDEX
-- ================================================
CREATE TABLE IF NOT EXISTS public.student_risk_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE NOT NULL UNIQUE,
  risk_score integer DEFAULT 0,
  risk_level text DEFAULT 'low',
  factors jsonb DEFAULT '{}',
  last_calculated_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ================================================
-- RLS POLICIES
-- ================================================
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classroom_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_user_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_simulation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_simulation_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_teacher_coach_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavior_decision_trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_risk_scores ENABLE ROW LEVEL SECURITY;

-- Admins can see everything
CREATE POLICY "admin_full_districts" ON public.districts FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "admin_full_schools" ON public.schools FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "admin_full_classrooms" ON public.classrooms FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "admin_full_classroom_members" ON public.classroom_members FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Authenticated users can read reference/knowledge data
CREATE POLICY "auth_read_certifications" ON public.lms_certifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_certifications" ON public.lms_certifications FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "user_read_own_certs" ON public.lms_user_certifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admin_manage_user_certs" ON public.lms_user_certifications FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "user_insert_own_certs" ON public.lms_user_certifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "auth_read_badges" ON public.lms_badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_badges" ON public.lms_badges FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "user_read_own_badges" ON public.lms_user_badges FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admin_manage_user_badges" ON public.lms_user_badges FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "user_insert_own_badges" ON public.lms_user_badges FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "auth_read_simulations" ON public.lms_simulations FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_simulations" ON public.lms_simulations FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "auth_read_sim_steps" ON public.lms_simulation_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_sim_steps" ON public.lms_simulation_steps FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "user_own_sim_attempts" ON public.lms_simulation_attempts FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admin_read_sim_attempts" ON public.lms_simulation_attempts FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "user_own_coach_logs" ON public.ai_teacher_coach_logs FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admin_read_coach_logs" ON public.ai_teacher_coach_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "auth_read_knowledge_base" ON public.behavior_knowledge_base FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_knowledge_base" ON public.behavior_knowledge_base FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "auth_read_decision_trees" ON public.behavior_decision_trees FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_manage_decision_trees" ON public.behavior_decision_trees FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

CREATE POLICY "admin_manage_risk_scores" ON public.student_risk_scores FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "staff_read_risk_scores" ON public.student_risk_scores FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.user_student_access usa
    WHERE usa.student_id = student_risk_scores.student_id
    AND usa.user_id = auth.uid()
  )
);
