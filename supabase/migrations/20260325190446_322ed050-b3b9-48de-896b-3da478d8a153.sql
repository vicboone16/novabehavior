
-- ============================================================
-- 1. REPORT TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agency_id uuid,
  template_name text NOT NULL,
  template_type text NOT NULL DEFAULT 'custom',
  audience_type text NOT NULL DEFAULT 'clinical',
  description text,
  is_default boolean NOT NULL DEFAULT false,
  is_system_template boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own report templates"
  ON public.report_templates FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read system templates"
  ON public.report_templates FOR SELECT TO authenticated
  USING (is_system_template = true);

-- ============================================================
-- 2. REPORT TEMPLATE SECTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.report_template_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.report_templates(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  display_label text NOT NULL,
  section_type text NOT NULL DEFAULT 'auto_generated',
  sort_order integer NOT NULL DEFAULT 0,
  is_enabled boolean NOT NULL DEFAULT true,
  is_required boolean NOT NULL DEFAULT false,
  content_mode text NOT NULL DEFAULT 'hybrid',
  tone text NOT NULL DEFAULT 'clinical',
  format_style text NOT NULL DEFAULT 'paragraph',
  prompt_instructions text,
  fallback_text text,
  config_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.report_template_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage template sections via template ownership"
  ON public.report_template_sections FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.report_templates rt WHERE rt.id = template_id AND (rt.user_id = auth.uid() OR rt.is_system_template = true)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.report_templates rt WHERE rt.id = template_id AND rt.user_id = auth.uid()));

-- ============================================================
-- 3. SAVED REPORTING VIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.saved_reporting_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  student_id uuid,
  name text NOT NULL,
  filters_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  graph_config_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  table_config_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  print_config_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_reporting_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved views"
  ON public.saved_reporting_views FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 4. EXPORT JOBS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  student_id uuid,
  export_type text NOT NULL,
  bundle_type text,
  filters_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  file_url text,
  error_message text,
  diagnostics_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own export jobs"
  ON public.export_jobs FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 5. REPORT OUTPUT SNAPSHOTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.report_output_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  template_id uuid REFERENCES public.report_templates(id) ON DELETE SET NULL,
  date_range_start date NOT NULL,
  date_range_end date NOT NULL,
  comparison_range_start date,
  comparison_range_end date,
  generated_output_jsonb jsonb NOT NULL DEFAULT '{}'::jsonb,
  edited_output_jsonb jsonb,
  output_status text NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.report_output_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own report snapshots"
  ON public.report_output_snapshots FOR ALL TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ============================================================
-- 6. AGGREGATION FUNCTION: Backfill behavior_daily_aggregates
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_backfill_behavior_daily_aggregates(p_student_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_inserted integer := 0;
BEGIN
  INSERT INTO behavior_daily_aggregates (
    student_id, behavior_id, behavior_name, service_date,
    total_count, total_duration_seconds, session_count,
    rate_per_hour, setting_breakdown, staff_breakdown, time_of_day_breakdown
  )
  SELECT
    bsd.student_id,
    bsd.behavior_id::text,
    COALESCE(b.name, 'Unknown'),
    (s.start_time AT TIME ZONE 'America/New_York')::date AS service_date,
    SUM(COALESCE(bsd.frequency, 0)) AS total_count,
    SUM(COALESCE(bsd.duration_seconds, 0)) AS total_duration_seconds,
    COUNT(DISTINCT bsd.session_id) AS session_count,
    CASE WHEN SUM(COALESCE(bsd.observation_minutes, 0)) > 0
      THEN ROUND(SUM(COALESCE(bsd.frequency, 0))::numeric / (SUM(COALESCE(bsd.observation_minutes, 0)) / 60.0), 2)
      ELSE NULL
    END AS rate_per_hour,
    '{}'::jsonb AS setting_breakdown,
    '{}'::jsonb AS staff_breakdown,
    '{}'::jsonb AS time_of_day_breakdown
  FROM behavior_session_data bsd
  JOIN sessions s ON s.id = bsd.session_id
  LEFT JOIN behaviors b ON b.id = bsd.behavior_id
  WHERE bsd.data_state = 'measured'
    AND (p_student_id IS NULL OR bsd.student_id = p_student_id)
  GROUP BY bsd.student_id, bsd.behavior_id, b.name, (s.start_time AT TIME ZONE 'America/New_York')::date
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS rows_inserted = ROW_COUNT;
  RETURN rows_inserted;
END;
$$;

-- ============================================================
-- 7. TRIGGER: Auto-aggregate on behavior_session_data insert/update
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_fn_update_daily_aggregate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_service_date date;
  v_behavior_name text;
BEGIN
  SELECT (s.start_time AT TIME ZONE 'America/New_York')::date INTO v_service_date
  FROM sessions s WHERE s.id = NEW.session_id;

  SELECT COALESCE(b.name, 'Unknown') INTO v_behavior_name
  FROM behaviors b WHERE b.id = NEW.behavior_id;

  IF v_service_date IS NULL THEN
    v_service_date := CURRENT_DATE;
  END IF;

  INSERT INTO behavior_daily_aggregates (
    student_id, behavior_id, behavior_name, service_date,
    total_count, total_duration_seconds, session_count,
    rate_per_hour, setting_breakdown, staff_breakdown, time_of_day_breakdown
  )
  VALUES (
    NEW.student_id, NEW.behavior_id::text, COALESCE(v_behavior_name, 'Unknown'), v_service_date,
    COALESCE(NEW.frequency, 0), COALESCE(NEW.duration_seconds, 0), 1,
    NULL, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_aggregate_behavior_daily ON public.behavior_session_data;
CREATE TRIGGER trg_aggregate_behavior_daily
  AFTER INSERT ON public.behavior_session_data
  FOR EACH ROW
  WHEN (NEW.data_state = 'measured')
  EXECUTE FUNCTION public.trg_fn_update_daily_aggregate();

-- ============================================================
-- 8. Unique constraint for daily aggregates upsert
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_bda_student_behavior_date'
  ) THEN
    CREATE UNIQUE INDEX idx_bda_student_behavior_date 
    ON public.behavior_daily_aggregates (student_id, behavior_id, service_date);
  END IF;
END;
$$;
