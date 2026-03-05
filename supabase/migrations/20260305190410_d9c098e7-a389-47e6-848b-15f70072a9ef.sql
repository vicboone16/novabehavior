-- Signal rules table (configurable thresholds)
CREATE TABLE public.ci_signal_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.agencies(id) ON DELETE CASCADE,
  rule_key text NOT NULL,
  display_name text NOT NULL,
  category text NOT NULL DEFAULT 'escalation',
  severity text NOT NULL DEFAULT 'high',
  threshold_value numeric NOT NULL,
  threshold_unit text NOT NULL DEFAULT 'count',
  time_window_minutes integer,
  comparison text NOT NULL DEFAULT 'gte',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agency_id, rule_key)
);

-- Supervisor signals table (the feed)
CREATE TABLE public.ci_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  rule_id uuid REFERENCES public.ci_signal_rules(id) ON DELETE SET NULL,
  signal_type text NOT NULL,
  severity text NOT NULL DEFAULT 'high',
  title text NOT NULL,
  message text,
  context_json jsonb DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid,
  resolved_note text
);

-- Indexes
CREATE INDEX idx_ci_signals_agency_active ON public.ci_signals(agency_id, resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX idx_ci_signals_client ON public.ci_signals(client_id);
CREATE INDEX idx_ci_signals_severity ON public.ci_signals(severity);
CREATE INDEX idx_ci_signal_rules_agency ON public.ci_signal_rules(agency_id);

-- RLS
ALTER TABLE public.ci_signal_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ci_signals ENABLE ROW LEVEL SECURITY;

-- Policies for ci_signal_rules
CREATE POLICY "Authenticated users can read signal rules" ON public.ci_signal_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Agency admins can manage signal rules" ON public.ci_signal_rules
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.agency_memberships am
      WHERE am.user_id = auth.uid()
        AND am.agency_id = ci_signal_rules.agency_id
        AND am.role IN ('admin', 'owner')
        AND am.status = 'active'
    )
  );

-- Policies for ci_signals
CREATE POLICY "Authenticated users can read signals" ON public.ci_signals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert signals" ON public.ci_signals
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update signals" ON public.ci_signals
  FOR UPDATE TO authenticated USING (true);

-- Insert default global rules (agency_id NULL = global defaults)
INSERT INTO public.ci_signal_rules (agency_id, rule_key, display_name, category, severity, threshold_value, threshold_unit, time_window_minutes, comparison, description) VALUES
  (NULL, 'escalation_spike', 'Escalation Spike', 'escalation', 'high', 3, 'count', 10, 'gte', '≥3 target events within 10 minutes'),
  (NULL, 'incident_severity', 'High-Severity Incident', 'incident', 'critical', 3, 'severity', NULL, 'gte', 'Incident logged with severity ≥3'),
  (NULL, 'risk_threshold', 'High Risk Score', 'risk', 'high', 80, 'score', NULL, 'gte', 'Client risk_score ≥80'),
  (NULL, 'pattern_confidence', 'Pattern Detected', 'pattern', 'action', 0.70, 'confidence', NULL, 'gte', 'Pattern detection confidence ≥0.70'),
  (NULL, 'reinforcement_gap', 'Reinforcement Gap', 'reinforcement', 'watch', 10, 'minutes', NULL, 'gte', '≥10 min gap in high-demand context');

-- RPC for Beacon / external signal insertion
CREATE OR REPLACE FUNCTION public.insert_supervisor_signal(
  _agency_id uuid,
  _client_id uuid DEFAULT NULL,
  _signal_type text DEFAULT 'escalation',
  _severity text DEFAULT 'high',
  _title text DEFAULT 'Signal',
  _message text DEFAULT NULL,
  _context_json jsonb DEFAULT '{}'::jsonb,
  _source text DEFAULT 'beacon'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _signal_id uuid;
BEGIN
  INSERT INTO public.ci_signals (agency_id, client_id, signal_type, severity, title, message, context_json, source)
  VALUES (_agency_id, _client_id, _signal_type, _severity, _title, _message, _context_json, _source)
  RETURNING id INTO _signal_id;
  
  RETURN _signal_id;
END;
$$;

-- Enable realtime for signals
ALTER PUBLICATION supabase_realtime ADD TABLE public.ci_signals;