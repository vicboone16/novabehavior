
-- Security scan results table
CREATE TABLE public.security_scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_type TEXT NOT NULL DEFAULT 'full', -- 'full', 'database', 'edge_functions', 'client'
  triggered_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.security_scan_results ENABLE ROW LEVEL SECURITY;

-- Only admins can view/create scan results
CREATE POLICY "Admins can manage security scans"
  ON public.security_scan_results
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
