
-- Student Risk Snapshots
CREATE TABLE IF NOT EXISTS public.student_risk_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE SET NULL,
  snapshot_date date NOT NULL DEFAULT current_date,
  risk_score numeric(6,2) NOT NULL DEFAULT 0,
  risk_level text NOT NULL DEFAULT 'low',
  drivers jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_student_risk_snapshots_date ON public.student_risk_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_student_risk_snapshots_school ON public.student_risk_snapshots(school_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_student_risk_snapshots_classroom ON public.student_risk_snapshots(classroom_id, snapshot_date);

-- Incidents (Flight Recorder header)
CREATE TABLE IF NOT EXISTS public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE SET NULL,
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  district_id uuid REFERENCES public.districts(id) ON DELETE SET NULL,
  incident_start timestamptz NOT NULL DEFAULT now(),
  incident_end timestamptz,
  incident_type text,
  severity int,
  injuries boolean DEFAULT false,
  removal_required boolean DEFAULT false,
  summary text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_incidents_student_time ON public.incidents(student_id, incident_start DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_classroom_time ON public.incidents(classroom_id, incident_start DESC);

-- Incident Events (timeline "black box")
CREATE TABLE IF NOT EXISTS public.incident_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  event_time timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  intensity int,
  details text,
  metadata jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_incident_events_incident_time ON public.incident_events(incident_id, event_time);

-- Student Behavior Plans
CREATE TABLE IF NOT EXISTS public.student_behavior_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  plan_name text NOT NULL,
  function_hypothesis text,
  replacement_behavior text,
  reinforcement_plan text,
  active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Plan Steps
CREATE TABLE IF NOT EXISTS public.plan_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.student_behavior_plans(id) ON DELETE CASCADE,
  step_order int NOT NULL,
  step_text text NOT NULL,
  UNIQUE(plan_id, step_order)
);

-- Plan Step Logs (fidelity tracking)
CREATE TABLE IF NOT EXISTS public.plan_step_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.student_behavior_plans(id) ON DELETE CASCADE,
  step_id uuid REFERENCES public.plan_steps(id) ON DELETE SET NULL,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE SET NULL,
  log_time timestamptz DEFAULT now(),
  completed boolean DEFAULT true,
  notes text,
  logged_by uuid
);
CREATE INDEX IF NOT EXISTS idx_plan_step_logs_plan_time ON public.plan_step_logs(plan_id, log_time DESC);

-- Enable RLS on all new tables
ALTER TABLE public.mtss_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_mtss_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_mtss_plan_interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mtss_fidelity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_risk_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_behavior_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_step_logs ENABLE ROW LEVEL SECURITY;
