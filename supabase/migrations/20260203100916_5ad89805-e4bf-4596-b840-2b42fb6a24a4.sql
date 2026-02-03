-- =============================================
-- STAFF PROFILE 2.0 + PERMISSIONS + SCHEDULING + SESSION LIFECYCLE + IEP
-- (Without staff_credentials which already exists)
-- =============================================

-- 1. Extend profiles table for Staff Profile 2.0
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS staff_id TEXT,
ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Los_Angeles',
ADD COLUMN IF NOT EXISTS home_base_address TEXT,
ADD COLUMN IF NOT EXISTS home_base_city TEXT,
ADD COLUMN IF NOT EXISTS home_base_state TEXT,
ADD COLUMN IF NOT EXISTS home_base_zip TEXT,
ADD COLUMN IF NOT EXISTS geocode_lat NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS geocode_lng NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS geocode_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS max_travel_radius_miles INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS min_buffer_minutes INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS allowed_service_types JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS settings_willing_to_serve JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS languages_spoken JSONB DEFAULT '["English"]'::jsonb,
ADD COLUMN IF NOT EXISTS transportation_method TEXT,
ADD COLUMN IF NOT EXISTS preferred_regions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS session_length_preferences JSONB DEFAULT '[60, 90, 120]'::jsonb,
ADD COLUMN IF NOT EXISTS secondary_email TEXT,
ADD COLUMN IF NOT EXISTS secondary_phone TEXT,
ADD COLUMN IF NOT EXISTS staff_notes TEXT,
ADD COLUMN IF NOT EXISTS staff_notes_visibility TEXT DEFAULT 'internal_only';

-- 2. Staff Availability Windows
CREATE TABLE IF NOT EXISTS public.staff_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_user_id UUID NOT NULL,
  day_of_week TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  effective_from DATE,
  effective_until DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Supervisor Links (for RBT/BT supervision chain)
CREATE TABLE IF NOT EXISTS public.supervisor_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supervisee_staff_id UUID NOT NULL,
  supervisor_staff_id UUID NOT NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  supervision_type TEXT DEFAULT 'primary',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Override Log (immutable audit trail for constraint bypasses)
CREATE TABLE IF NOT EXISTS public.override_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  override_type TEXT NOT NULL,
  overridden_by UUID NOT NULL,
  reason TEXT NOT NULL,
  affected_object_type TEXT NOT NULL,
  affected_object_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  original_constraint JSONB,
  override_context JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Schedule Requests
CREATE TABLE IF NOT EXISTS public.schedule_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  location_id UUID,
  requested_day TEXT,
  requested_start_time TIME,
  requested_end_time TIME,
  frequency TEXT DEFAULT 'one_time',
  duration_minutes INTEGER NOT NULL,
  preferred_staff_ids JSONB DEFAULT '[]'::jsonb,
  constraints JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Scheduled Sessions
CREATE TABLE IF NOT EXISTS public.scheduled_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID,
  session_id UUID,
  schedule_request_id UUID,
  client_id UUID NOT NULL REFERENCES public.students(id),
  staff_user_id UUID NOT NULL,
  supervisor_user_id UUID,
  location_id UUID,
  service_type TEXT NOT NULL,
  start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  end_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  computed_distance_miles NUMERIC(6, 2),
  travel_time_estimate_minutes INTEGER,
  status TEXT DEFAULT 'scheduled',
  override_applied BOOLEAN DEFAULT false,
  override_log_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Session Blocking Reasons
CREATE TABLE IF NOT EXISTS public.session_blocking_reasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  blocking_reason_code TEXT NOT NULL,
  message TEXT NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. IEP Goals
CREATE TABLE IF NOT EXISTS public.iep_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  goal_area TEXT NOT NULL,
  goal_text TEXT NOT NULL,
  short_description TEXT,
  baseline_summary TEXT,
  measurement_type TEXT NOT NULL,
  target_criteria TEXT,
  start_date DATE,
  end_date DATE,
  responsible_provider_role TEXT,
  status TEXT DEFAULT 'active',
  data_completeness_status TEXT DEFAULT 'insufficient',
  last_progress_update TIMESTAMP WITH TIME ZONE,
  narrative_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. Goal Links
CREATE TABLE IF NOT EXISTS public.goal_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL,
  link_type TEXT NOT NULL,
  linked_object_id UUID NOT NULL,
  linked_object_table TEXT NOT NULL,
  link_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. Service Plan Minutes
CREATE TABLE IF NOT EXISTS public.service_plan_minutes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  service_line TEXT NOT NULL,
  mandated_minutes_per_period INTEGER NOT NULL,
  period_type TEXT DEFAULT 'week',
  source TEXT NOT NULL,
  effective_start_date DATE NOT NULL,
  effective_end_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 11. Delivered Minutes Log
CREATE TABLE IF NOT EXISTS public.delivered_minutes_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_id UUID,
  service_line TEXT NOT NULL,
  provider_user_id UUID NOT NULL,
  provider_credential TEXT,
  location_type TEXT,
  minutes_delivered INTEGER NOT NULL,
  session_date DATE NOT NULL,
  is_billable BOOLEAN DEFAULT true,
  is_makeup BOOLEAN DEFAULT false,
  makeup_for_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.staff_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supervisor_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.override_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_blocking_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iep_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_plan_minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivered_minutes_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view availability" ON public.staff_availability FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can manage availability" ON public.staff_availability FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "View supervisor links" ON public.supervisor_links FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Manage supervisor links" ON public.supervisor_links FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "View override logs" ON public.override_logs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Insert override logs" ON public.override_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "View schedule requests" ON public.schedule_requests FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Manage schedule requests" ON public.schedule_requests FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "View scheduled sessions" ON public.scheduled_sessions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Manage scheduled sessions" ON public.scheduled_sessions FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "View blocking reasons" ON public.session_blocking_reasons FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Manage blocking reasons" ON public.session_blocking_reasons FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "View IEP goals" ON public.iep_goals FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Manage IEP goals" ON public.iep_goals FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "View goal links" ON public.goal_links FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Manage goal links" ON public.goal_links FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "View service plan minutes" ON public.service_plan_minutes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Manage service plan minutes" ON public.service_plan_minutes FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "View delivered minutes" ON public.delivered_minutes_log FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Insert delivered minutes" ON public.delivered_minutes_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Helper function to check if staff has active supervisor
CREATE OR REPLACE FUNCTION public.has_active_supervisor(_staff_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.supervisor_links
    WHERE supervisee_staff_id = _staff_user_id
      AND status = 'active'
      AND (end_date IS NULL OR end_date > CURRENT_DATE)
  )
$$;

-- Helper function to get staff supervisor
CREATE OR REPLACE FUNCTION public.get_staff_supervisor(_staff_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT supervisor_staff_id
  FROM public.supervisor_links
  WHERE supervisee_staff_id = _staff_user_id
    AND status = 'active'
    AND supervision_type = 'primary'
    AND (end_date IS NULL OR end_date > CURRENT_DATE)
  LIMIT 1
$$;

-- Helper function to compute distance between two geocodes (Haversine formula)
CREATE OR REPLACE FUNCTION public.compute_distance_miles(lat1 NUMERIC, lng1 NUMERIC, lat2 NUMERIC, lng2 NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  r NUMERIC := 3959;
  dlat NUMERIC;
  dlng NUMERIC;
  a NUMERIC;
  c NUMERIC;
BEGIN
  IF lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN
    RETURN NULL;
  END IF;
  
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  a := sin(dlat/2) * sin(dlat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng/2) * sin(dlng/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN ROUND(r * c, 2);
END;
$$;

-- Helper function to estimate travel time
CREATE OR REPLACE FUNCTION public.estimate_travel_time_minutes(distance_miles NUMERIC)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE 
    WHEN distance_miles IS NULL THEN NULL
    ELSE CEIL(distance_miles * 3)::INTEGER
  END
$$;