
-- ============================================================
-- BEHAVIOR ANALYTICS & REPORTING INFRASTRUCTURE
-- ============================================================

-- 1. behavior_daily_aggregates
CREATE TABLE IF NOT EXISTS public.behavior_daily_aggregates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  behavior_id text NOT NULL,
  behavior_name text,
  behavior_category text,
  service_date date NOT NULL,
  total_count integer NOT NULL DEFAULT 0,
  total_duration_seconds integer DEFAULT 0,
  avg_intensity numeric(5,2),
  session_count integer DEFAULT 0,
  rate_per_hour numeric(8,4),
  setting_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  staff_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  time_of_day_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  agency_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_behavior_daily_agg_unique
  ON public.behavior_daily_aggregates (student_id, behavior_id, service_date);

CREATE INDEX IF NOT EXISTS idx_behavior_daily_agg_student_date
  ON public.behavior_daily_aggregates (student_id, service_date DESC);

ALTER TABLE public.behavior_daily_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "behavior_daily_aggregates_read"
  ON public.behavior_daily_aggregates FOR SELECT TO authenticated USING (true);

CREATE POLICY "behavior_daily_aggregates_write"
  ON public.behavior_daily_aggregates FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_behavior_daily_agg_updated ON public.behavior_daily_aggregates;
CREATE TRIGGER trg_behavior_daily_agg_updated
  BEFORE UPDATE ON public.behavior_daily_aggregates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. behavior_period_summaries
CREATE TABLE IF NOT EXISTS public.behavior_period_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  behavior_id text NOT NULL,
  behavior_name text,
  period_type text NOT NULL DEFAULT 'custom',
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_count integer NOT NULL DEFAULT 0,
  pct_of_total numeric(7,4) DEFAULT 0,
  avg_per_day numeric(8,4) DEFAULT 0,
  avg_per_session numeric(8,4) DEFAULT 0,
  trend_delta integer DEFAULT 0,
  trend_pct_change numeric(8,4) DEFAULT 0,
  peak_day date,
  last_occurrence date,
  avg_duration_seconds numeric(10,2),
  avg_intensity numeric(5,2),
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  agency_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_behavior_period_summaries_student
  ON public.behavior_period_summaries (student_id, period_type, start_date DESC);

ALTER TABLE public.behavior_period_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "behavior_period_summaries_read"
  ON public.behavior_period_summaries FOR SELECT TO authenticated USING (true);

CREATE POLICY "behavior_period_summaries_write"
  ON public.behavior_period_summaries FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_behavior_period_summaries_updated ON public.behavior_period_summaries;
CREATE TRIGGER trg_behavior_period_summaries_updated
  BEFORE UPDATE ON public.behavior_period_summaries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. behavior_insights
CREATE TABLE IF NOT EXISTS public.behavior_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  behavior_id text,
  insight_type text NOT NULL,
  insight_text text NOT NULL,
  severity text DEFAULT 'info',
  date_range_start date,
  date_range_end date,
  is_active boolean NOT NULL DEFAULT true,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  agency_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_behavior_insights_student
  ON public.behavior_insights (student_id, insight_type, created_at DESC);

ALTER TABLE public.behavior_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "behavior_insights_read"
  ON public.behavior_insights FOR SELECT TO authenticated USING (true);

CREATE POLICY "behavior_insights_write"
  ON public.behavior_insights FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 4. saved_reporting_views
CREATE TABLE IF NOT EXISTS public.saved_reporting_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  student_id uuid,
  agency_id uuid,
  name text NOT NULL,
  description text,
  filters_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  graph_config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  table_config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  print_config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_reporting_views_user
  ON public.saved_reporting_views (user_id, student_id);

ALTER TABLE public.saved_reporting_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_reporting_views_own"
  ON public.saved_reporting_views FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS trg_saved_reporting_views_updated ON public.saved_reporting_views;
CREATE TRIGGER trg_saved_reporting_views_updated
  BEFORE UPDATE ON public.saved_reporting_views
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. export_jobs
CREATE TABLE IF NOT EXISTS public.export_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  student_id uuid,
  agency_id uuid,
  export_type text NOT NULL,
  bundle_type text,
  filters_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  file_url text,
  file_name text,
  mime_type text,
  error_message text,
  diagnostics_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_export_jobs_user
  ON public.export_jobs (user_id, created_at DESC);

ALTER TABLE public.export_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "export_jobs_own"
  ON public.export_jobs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. report_templates
CREATE TABLE IF NOT EXISTS public.report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  agency_id uuid,
  template_name text NOT NULL,
  template_type text NOT NULL DEFAULT 'custom',
  audience_type text NOT NULL DEFAULT 'clinical',
  description text,
  layout_style text NOT NULL DEFAULT 'packet',
  is_default boolean NOT NULL DEFAULT false,
  is_system_template boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_templates_user
  ON public.report_templates (user_id, agency_id);

ALTER TABLE public.report_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_templates_read"
  ON public.report_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "report_templates_write"
  ON public.report_templates FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "report_templates_update"
  ON public.report_templates FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR is_system_template = false);

CREATE POLICY "report_templates_delete"
  ON public.report_templates FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND is_system_template = false);

DROP TRIGGER IF EXISTS trg_report_templates_updated ON public.report_templates;
CREATE TRIGGER trg_report_templates_updated
  BEFORE UPDATE ON public.report_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. report_template_sections
CREATE TABLE IF NOT EXISTS public.report_template_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.report_templates(id) ON DELETE CASCADE,
  section_key text NOT NULL,
  display_label text NOT NULL,
  section_type text NOT NULL DEFAULT 'auto_generated',
  sort_order integer NOT NULL DEFAULT 0,
  is_enabled boolean NOT NULL DEFAULT true,
  is_required boolean NOT NULL DEFAULT false,
  is_locked boolean NOT NULL DEFAULT false,
  content_mode text NOT NULL DEFAULT 'hybrid',
  tone text DEFAULT 'clinical',
  format_style text DEFAULT 'paragraph',
  prompt_instructions text,
  fallback_text text,
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_template_sections_template
  ON public.report_template_sections (template_id, sort_order);

ALTER TABLE public.report_template_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_template_sections_read"
  ON public.report_template_sections FOR SELECT TO authenticated USING (true);

CREATE POLICY "report_template_sections_write"
  ON public.report_template_sections FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_report_template_sections_updated ON public.report_template_sections;
CREATE TRIGGER trg_report_template_sections_updated
  BEFORE UPDATE ON public.report_template_sections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 8. report_template_section_edits
CREATE TABLE IF NOT EXISTS public.report_template_section_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_section_id uuid NOT NULL REFERENCES public.report_template_sections(id) ON DELETE CASCADE,
  edited_by uuid,
  previous_value_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_value_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  edit_type text DEFAULT 'manual',
  edited_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_section_edits_section
  ON public.report_template_section_edits (template_section_id, edited_at DESC);

ALTER TABLE public.report_template_section_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_section_edits_read"
  ON public.report_template_section_edits FOR SELECT TO authenticated USING (true);

CREATE POLICY "report_section_edits_write"
  ON public.report_template_section_edits FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- 9. report_output_snapshots
CREATE TABLE IF NOT EXISTS public.report_output_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  template_id uuid REFERENCES public.report_templates(id) ON DELETE SET NULL,
  date_range_start date NOT NULL,
  date_range_end date NOT NULL,
  comparison_range_start date,
  comparison_range_end date,
  generated_output_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  edited_output_json jsonb,
  output_status text NOT NULL DEFAULT 'draft',
  layout_style text DEFAULT 'packet',
  filters_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  agency_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_output_snapshots_student
  ON public.report_output_snapshots (student_id, created_at DESC);

ALTER TABLE public.report_output_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_output_snapshots_read"
  ON public.report_output_snapshots FOR SELECT TO authenticated USING (true);

CREATE POLICY "report_output_snapshots_write"
  ON public.report_output_snapshots FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS trg_report_output_snapshots_updated ON public.report_output_snapshots;
CREATE TRIGGER trg_report_output_snapshots_updated
  BEFORE UPDATE ON public.report_output_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
