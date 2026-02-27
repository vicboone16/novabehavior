
-- ===== Clinical Authorization & Hours Tracking Tables =====

-- Service bucket definitions per agency (direct, supervision, parent_training, group, etc.)
CREATE TABLE IF NOT EXISTS public.clinical_service_buckets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id uuid NOT NULL REFERENCES public.agencies(id),
  bucket_key text NOT NULL,
  bucket_label text NOT NULL,
  required_weekly_hours numeric DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agency_id, bucket_key)
);

ALTER TABLE public.clinical_service_buckets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members read service buckets"
  ON public.clinical_service_buckets FOR SELECT TO authenticated
  USING (public.has_agency_access(auth.uid(), agency_id));

CREATE POLICY "Agency admins manage service buckets"
  ON public.clinical_service_buckets FOR ALL TO authenticated
  USING (public.is_agency_admin(auth.uid(), agency_id));

-- Clinical service logs (clinician-safe: no rates)
CREATE TABLE IF NOT EXISTS public.clinical_service_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id uuid NOT NULL REFERENCES public.agencies(id),
  client_id uuid NOT NULL,
  staff_user_id uuid NOT NULL,
  authorization_id uuid REFERENCES public.authorizations(id),
  bucket_key text NOT NULL,
  service_date date NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 0,
  units_delivered numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'delivered',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_service_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members read service logs"
  ON public.clinical_service_logs FOR SELECT TO authenticated
  USING (public.has_agency_access(auth.uid(), agency_id));

CREATE POLICY "Staff manage own service logs"
  ON public.clinical_service_logs FOR INSERT TO authenticated
  WITH CHECK (staff_user_id = auth.uid() AND public.has_agency_access(auth.uid(), agency_id));

CREATE POLICY "Staff update own service logs"
  ON public.clinical_service_logs FOR UPDATE TO authenticated
  USING (staff_user_id = auth.uid() AND public.has_agency_access(auth.uid(), agency_id));

-- Clinical schedule events (for forecasting)
CREATE TABLE IF NOT EXISTS public.clinical_schedule_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id uuid NOT NULL REFERENCES public.agencies(id),
  client_id uuid NOT NULL,
  staff_user_id uuid NOT NULL,
  authorization_id uuid REFERENCES public.authorizations(id),
  bucket_key text NOT NULL DEFAULT 'direct',
  scheduled_date date NOT NULL,
  scheduled_minutes integer NOT NULL DEFAULT 60,
  scheduled_units numeric NOT NULL DEFAULT 1,
  outcome text NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_schedule_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members read schedule events"
  ON public.clinical_schedule_events FOR SELECT TO authenticated
  USING (public.has_agency_access(auth.uid(), agency_id));

CREATE POLICY "Staff manage own schedule events"
  ON public.clinical_schedule_events FOR ALL TO authenticated
  USING (public.has_agency_access(auth.uid(), agency_id));

-- ===== Views =====

-- v_clinical_authorization_summary: clinician-safe authorization view (no billing rates)
CREATE OR REPLACE VIEW public.v_clinical_authorization_summary AS
SELECT
  a.id AS authorization_id,
  a.student_id AS client_id,
  s.agency_id,
  c.full_name AS client_name,
  a.auth_number,
  a.service_codes,
  a.start_date,
  a.end_date,
  a.units_approved,
  a.units_used,
  COALESCE(a.units_remaining, a.units_approved - a.units_used) AS units_remaining,
  a.status,
  GREATEST(0, (a.end_date::date - CURRENT_DATE)) AS days_remaining,
  CASE
    WHEN a.units_approved > 0
    THEN ROUND((a.units_used::numeric / a.units_approved) * 100, 1)
    ELSE 0
  END AS pct_used,
  CASE
    WHEN (a.end_date::date - a.start_date::date) > 0
    THEN ROUND(
      GREATEST(0, (CURRENT_DATE - a.start_date::date))::numeric
      / (a.end_date::date - a.start_date::date)::numeric * 100, 1)
    ELSE 0
  END AS pct_time_elapsed,
  CASE
    WHEN (a.end_date::date - CURRENT_DATE) <= 0 THEN 'expired'
    WHEN (a.end_date::date - CURRENT_DATE) <= 30
      AND COALESCE(a.units_remaining, a.units_approved - a.units_used) > (a.units_approved * 0.3) THEN 'critical'
    WHEN a.units_approved > 0
      AND (a.units_used::numeric / a.units_approved * 100) < (
        GREATEST(0, (CURRENT_DATE - a.start_date::date))::numeric
        / GREATEST(1, (a.end_date::date - a.start_date::date))::numeric * 100 - 15
      ) THEN 'at_risk'
    ELSE 'on_track'
  END AS computed_status
FROM public.authorizations a
JOIN public.students s ON s.id = a.student_id
JOIN public.clients c ON c.client_id = a.student_id;

-- v_clinical_hours_forecast: forecast on-track / at-risk / off-track
CREATE OR REPLACE VIEW public.v_clinical_hours_forecast AS
SELECT
  a.id AS authorization_id,
  a.student_id AS client_id,
  s.agency_id,
  c.full_name AS client_name,
  a.auth_number,
  a.units_approved,
  a.units_used,
  COALESCE(a.units_remaining, a.units_approved - a.units_used) AS units_remaining,
  a.end_date,
  GREATEST(0, (a.end_date::date - CURRENT_DATE)) AS days_remaining,
  COALESCE(sched.scheduled_units, 0) AS scheduled_remaining_units,
  CASE
    WHEN (a.end_date::date - CURRENT_DATE) <= 0 THEN 'expired'
    WHEN (COALESCE(a.units_remaining, a.units_approved - a.units_used) - COALESCE(sched.scheduled_units, 0)) <= 0 THEN 'on_track'
    WHEN COALESCE(sched.scheduled_units, 0) >= (COALESCE(a.units_remaining, a.units_approved - a.units_used) * 0.7) THEN 'on_track'
    WHEN COALESCE(sched.scheduled_units, 0) >= (COALESCE(a.units_remaining, a.units_approved - a.units_used) * 0.4) THEN 'at_risk'
    ELSE 'off_track'
  END AS forecast_status
FROM public.authorizations a
JOIN public.students s ON s.id = a.student_id
JOIN public.clients c ON c.client_id = a.student_id
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(cse.scheduled_units), 0) AS scheduled_units
  FROM public.clinical_schedule_events cse
  WHERE cse.authorization_id = a.id
    AND cse.scheduled_date >= CURRENT_DATE
    AND cse.outcome = 'scheduled'
) sched ON true
WHERE (a.end_date::date - CURRENT_DATE) > -30;

-- Set security_invoker for all new views
ALTER VIEW public.v_clinical_authorization_summary SET (security_invoker = on);
ALTER VIEW public.v_clinical_hours_forecast SET (security_invoker = on);
