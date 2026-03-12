
-- =============================================
-- Missing teacher data tables for Core ownership
-- =============================================

-- 1. teacher_data_events: generic event log from teacher app
CREATE TABLE IF NOT EXISTS public.teacher_data_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'behavior',
  event_label TEXT NOT NULL,
  value_number NUMERIC,
  value_text TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  setting TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL,
  created_in_app TEXT DEFAULT 'teacherhub',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. teacher_frequency_entries: frequency counts from teacher
CREATE TABLE IF NOT EXISTS public.teacher_frequency_entries (
  entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  behavior_name TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  interval_minutes INTEGER,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  setting TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_in_app TEXT DEFAULT 'teacherhub',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. teacher_duration_entries: duration tracking from teacher
CREATE TABLE IF NOT EXISTS public.teacher_duration_entries (
  entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  behavior_name TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  setting TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_in_app TEXT DEFAULT 'teacherhub',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. teacher_interval_settings: interval config definitions
CREATE TABLE IF NOT EXISTS public.teacher_interval_settings (
  setting_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  interval_type TEXT NOT NULL DEFAULT 'momentary',
  interval_seconds INTEGER NOT NULL DEFAULT 60,
  total_intervals INTEGER NOT NULL DEFAULT 10,
  target_behavior TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. teacher_weekly_summaries: aggregated weekly summaries for BCBA review
CREATE TABLE IF NOT EXISTS public.teacher_weekly_summaries (
  summary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  summary_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  behavior_totals JSONB DEFAULT '[]'::jsonb,
  engagement_pct NUMERIC,
  prompt_completion_pct NUMERIC,
  top_antecedents JSONB DEFAULT '[]'::jsonb,
  skill_probe_summary JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_comment TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, week_start)
);

-- RLS on all new tables
ALTER TABLE public.teacher_data_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_frequency_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_duration_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_interval_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_weekly_summaries ENABLE ROW LEVEL SECURITY;

-- RLS policies: authenticated users can read data for their agency or if they have student access
CREATE POLICY "Authenticated users can read teacher_data_events"
  ON public.teacher_data_events FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert teacher_data_events"
  ON public.teacher_data_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can read teacher_frequency_entries"
  ON public.teacher_frequency_entries FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert teacher_frequency_entries"
  ON public.teacher_frequency_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can read teacher_duration_entries"
  ON public.teacher_duration_entries FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert teacher_duration_entries"
  ON public.teacher_duration_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can read teacher_interval_settings"
  ON public.teacher_interval_settings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert teacher_interval_settings"
  ON public.teacher_interval_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can read teacher_weekly_summaries"
  ON public.teacher_weekly_summaries FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert teacher_weekly_summaries"
  ON public.teacher_weekly_summaries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update teacher_weekly_summaries"
  ON public.teacher_weekly_summaries FOR UPDATE TO authenticated
  USING (true);

-- Enable realtime for weekly summaries
ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_weekly_summaries;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_teacher_data_events_client ON public.teacher_data_events(client_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_frequency_entries_client ON public.teacher_frequency_entries(client_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_duration_entries_client ON public.teacher_duration_entries(client_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_interval_settings_client ON public.teacher_interval_settings(client_id);
CREATE INDEX IF NOT EXISTS idx_teacher_weekly_summaries_client ON public.teacher_weekly_summaries(client_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_weekly_summaries_agency ON public.teacher_weekly_summaries(agency_id, week_start DESC);
