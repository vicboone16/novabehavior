
CREATE TABLE IF NOT EXISTS public.ci_compute_runs (
  run_id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  agency_id uuid REFERENCES public.agencies(id),
  data_source_id uuid,
  metrics_upserted_count integer DEFAULT 0,
  alerts_upserted_count integer DEFAULT 0,
  alerts_resolved_count integer DEFAULT 0,
  errors_json jsonb,
  duration_ms integer
);

ALTER TABLE public.ci_compute_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view compute runs"
  ON public.ci_compute_runs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_ci_compute_runs_started ON public.ci_compute_runs (started_at DESC);
