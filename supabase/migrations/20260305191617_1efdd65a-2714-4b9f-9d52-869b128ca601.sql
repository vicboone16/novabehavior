
-- Add missing columns to behavior_events to match the target schema
ALTER TABLE behavior_intelligence.behavior_events
  ADD COLUMN IF NOT EXISTS client_id uuid,
  ADD COLUMN IF NOT EXISTS agency_id uuid,
  ADD COLUMN IF NOT EXISTS source_app text;

-- Backfill client_id from student_id where null
UPDATE behavior_intelligence.behavior_events
SET client_id = student_id
WHERE client_id IS NULL AND student_id IS NOT NULL;

-- Create indexes on new columns
CREATE INDEX IF NOT EXISTS idx_be_client_time
  ON behavior_intelligence.behavior_events(client_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_be_agency_time
  ON behavior_intelligence.behavior_events(agency_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_be_type_name_time
  ON behavior_intelligence.behavior_events(event_type, event_name, occurred_at DESC);

-- =============================================================
-- 1) Signal Generator Functions
-- =============================================================

CREATE OR REPLACE FUNCTION ci.generate_escalation_signals(
  p_window_minutes int DEFAULT 10,
  p_min_count int DEFAULT 3,
  p_behavior_name text DEFAULT 'aggression'
)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  v_count int := 0;
  r record;
BEGIN
  FOR r IN
    SELECT
      e.agency_id,
      COALESCE(e.client_id, e.student_id) AS client_id,
      e.classroom_id,
      count(*) AS cnt,
      max(e.occurred_at) AS last_time
    FROM behavior_intelligence.behavior_events e
    WHERE e.event_type = 'behavior'
      AND e.event_name = p_behavior_name
      AND e.occurred_at > now() - make_interval(mins => p_window_minutes)
    GROUP BY e.agency_id, COALESCE(e.client_id, e.student_id), e.classroom_id
    HAVING count(*) >= p_min_count
  LOOP
    PERFORM ci.create_supervisor_signal(
      p_client_id    => r.client_id,
      p_signal_type  => 'escalation',
      p_title        => 'Escalation detected',
      p_message      => format('%s spike: %s events within %s minutes', p_behavior_name, r.cnt, p_window_minutes),
      p_severity     => 'action',
      p_agency_id    => r.agency_id,
      p_classroom_id => r.classroom_id,
      p_drivers      => jsonb_build_object('behavior', p_behavior_name, 'count', r.cnt, 'window_minutes', p_window_minutes),
      p_source       => jsonb_build_object('engine', 'ci.generate_escalation_signals', 'table', 'behavior_intelligence.behavior_events')
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END $$;

GRANT EXECUTE ON FUNCTION ci.generate_escalation_signals TO authenticated;

CREATE OR REPLACE FUNCTION ci.generate_risk_threshold_signals(
  p_threshold numeric DEFAULT 80
)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  v_count int := 0;
  r record;
BEGIN
  FOR r IN
    SELECT agency_id, client_id, risk_score
    FROM public.ci_client_metrics
    WHERE risk_score >= p_threshold
  LOOP
    PERFORM ci.create_supervisor_signal(
      p_client_id   => r.client_id,
      p_signal_type => 'risk',
      p_title       => 'High risk threshold',
      p_message     => format('Risk score %s >= %s', r.risk_score, p_threshold),
      p_severity    => 'action',
      p_agency_id   => r.agency_id,
      p_drivers     => jsonb_build_object('risk_score', r.risk_score, 'threshold', p_threshold),
      p_source      => jsonb_build_object('engine', 'ci.generate_risk_threshold_signals', 'table', 'public.ci_client_metrics')
    );
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END $$;

GRANT EXECUTE ON FUNCTION ci.generate_risk_threshold_signals TO authenticated;

CREATE OR REPLACE FUNCTION ci.generate_pattern_signals(
  p_trigger_event text DEFAULT 'transition',
  p_behavior_event text DEFAULT 'aggression',
  p_min_conf numeric DEFAULT 0.70
)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  v_count int := 0;
  r record;
  v_conf numeric;
BEGIN
  FOR r IN
    WITH seq AS (
      SELECT
        COALESCE(client_id, student_id) AS client_id,
        agency_id,
        classroom_id,
        occurred_at,
        lag(event_name) OVER (PARTITION BY COALESCE(client_id, student_id) ORDER BY occurred_at) AS prev_name,
        event_name AS curr_name
      FROM behavior_intelligence.behavior_events
      WHERE occurred_at > now() - interval '14 days'
    ),
    stats AS (
      SELECT
        client_id, agency_id, classroom_id,
        count(*) FILTER (WHERE prev_name = p_trigger_event) AS trigger_count,
        count(*) FILTER (WHERE prev_name = p_trigger_event AND curr_name = p_behavior_event) AS pair_count
      FROM seq
      GROUP BY client_id, agency_id, classroom_id
    )
    SELECT *, (pair_count::numeric / nullif(trigger_count, 0)) AS conf
    FROM stats
    WHERE trigger_count >= 5
  LOOP
    v_conf := r.conf;
    IF v_conf IS NOT NULL AND v_conf >= p_min_conf THEN
      PERFORM ci.create_supervisor_signal(
        p_client_id    => r.client_id,
        p_signal_type  => 'pattern',
        p_title        => 'Pattern detected',
        p_message      => format('%s -> %s (confidence %s)', p_trigger_event, p_behavior_event, round(v_conf::numeric, 2)),
        p_severity     => 'watch',
        p_agency_id    => r.agency_id,
        p_classroom_id => r.classroom_id,
        p_drivers      => jsonb_build_object('trigger', p_trigger_event, 'behavior', p_behavior_event, 'confidence', v_conf, 'samples', r.trigger_count),
        p_source       => jsonb_build_object('engine', 'ci.generate_pattern_signals')
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END $$;

GRANT EXECUTE ON FUNCTION ci.generate_pattern_signals TO authenticated;

-- Incident trigger
CREATE OR REPLACE FUNCTION ci.trg_incident_to_signal()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF coalesce(new.severity, 0) >= 3 THEN
    PERFORM ci.create_supervisor_signal(
      p_client_id    => new.client_id,
      p_signal_type  => 'incident',
      p_title        => 'Incident logged',
      p_message      => coalesce(new.summary, 'Incident recorded'),
      p_severity     => 'critical',
      p_agency_id    => new.agency_id,
      p_classroom_id => new.classroom_id,
      p_drivers      => jsonb_build_object('severity', new.severity),
      p_source       => jsonb_build_object('app', 'beacon', 'table', 'public.incidents', 'id', new.id)
    );
  END IF;
  RETURN new;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'incidents') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_incident_to_signal') THEN
      CREATE TRIGGER trg_incident_to_signal
      AFTER INSERT ON public.incidents
      FOR EACH ROW EXECUTE FUNCTION ci.trg_incident_to_signal();
    END IF;
  END IF;
END $$;

-- =============================================================
-- 2) Storyboard & Timeline Views
-- =============================================================

CREATE OR REPLACE VIEW behavior_intelligence.v_storyboard_events AS
SELECT
  COALESCE(client_id, student_id) AS client_id,
  occurred_at, event_type, event_name,
  value, intensity, phase, prompt_code, correctness, metadata,
  CASE
    WHEN event_type = 'behavior' THEN 'red'
    WHEN event_type = 'reinforcement' THEN 'green'
    WHEN event_type = 'skill_trial' THEN 'blue'
    WHEN event_type IN ('incident', 'incident_step') THEN 'orange'
    ELSE 'gray'
  END AS color
FROM behavior_intelligence.behavior_events;

CREATE OR REPLACE FUNCTION behavior_intelligence.get_storyboard_json(
  p_client_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
RETURNS jsonb
LANGUAGE sql
AS $$
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'occurred_at', occurred_at,
      'event_type', event_type,
      'event_name', event_name,
      'value', value,
      'intensity', intensity,
      'phase', phase,
      'prompt_code', prompt_code,
      'correctness', correctness,
      'color', color,
      'metadata', metadata
    )
    ORDER BY occurred_at ASC
  ), '[]'::jsonb)
  FROM behavior_intelligence.v_storyboard_events
  WHERE client_id = p_client_id
    AND occurred_at >= p_start
    AND occurred_at <= p_end;
$$;

GRANT EXECUTE ON FUNCTION behavior_intelligence.get_storyboard_json TO authenticated;

CREATE OR REPLACE VIEW behavior_intelligence.v_staff_timeline AS
SELECT
  COALESCE(client_id, student_id) AS client_id,
  occurred_at, event_type, event_name,
  value, intensity, phase, prompt_code, correctness, metadata
FROM behavior_intelligence.behavior_events;

CREATE OR REPLACE VIEW behavior_intelligence.v_supervisor_timeline AS
SELECT
  id, COALESCE(client_id, student_id) AS client_id,
  agency_id, classroom_id, school_id, source_app, source_table, source_id,
  event_type, event_name, value, intensity, phase, prompt_code, correctness,
  metadata, occurred_at, recorded_by, created_at
FROM behavior_intelligence.behavior_events;

CREATE OR REPLACE VIEW behavior_intelligence.v_parent_timeline AS
SELECT
  COALESCE(client_id, student_id) AS client_id,
  occurred_at,
  CASE
    WHEN event_type IN ('incident', 'incident_step') THEN 'support_event'
    WHEN event_type = 'behavior' THEN 'behavior_event'
    WHEN event_type = 'skill_trial' THEN 'learning_event'
    WHEN event_type = 'reinforcement' THEN 'encouragement'
    ELSE event_type
  END AS event_type,
  CASE
    WHEN event_type = 'behavior' AND event_name IN ('aggression', 'property_destruction') THEN 'big feelings / dysregulation'
    WHEN event_type = 'behavior' AND event_name = 'refusal' THEN 'difficulty starting a task'
    ELSE event_name
  END AS event_name,
  value,
  (metadata - 'staff_notes' - 'peer_names' - 'injury_details') AS metadata
FROM behavior_intelligence.behavior_events;

CREATE OR REPLACE FUNCTION behavior_intelligence.export_timeline_json(
  p_client_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_audience text DEFAULT 'staff'
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_view text;
  v_out jsonb;
BEGIN
  v_view := CASE
    WHEN p_audience = 'parent' THEN 'behavior_intelligence.v_parent_timeline'
    WHEN p_audience = 'supervisor' THEN 'behavior_intelligence.v_supervisor_timeline'
    ELSE 'behavior_intelligence.v_staff_timeline'
  END;
  EXECUTE format($f$
    SELECT jsonb_build_object(
      'client_id', $1,
      'audience', %L,
      'start', $2,
      'end', $3,
      'events', coalesce(jsonb_agg(
        jsonb_build_object(
          'occurred_at', occurred_at,
          'event_type', event_type,
          'event_name', event_name,
          'value', value,
          'intensity', intensity,
          'phase', phase,
          'prompt_code', prompt_code,
          'correctness', correctness,
          'metadata', metadata
        )
        ORDER BY occurred_at ASC
      ), '[]'::jsonb)
    )
    FROM %s
    WHERE client_id = $1
      AND occurred_at >= $2
      AND occurred_at <= $3
  $f$, p_audience, v_view)
  INTO v_out
  USING p_client_id, p_start, p_end;
  RETURN v_out;
END $$;

GRANT EXECUTE ON FUNCTION behavior_intelligence.export_timeline_json TO authenticated;

-- =============================================================
-- 3) Sync ci.supervisor_signals <-> public.ci_signals
-- =============================================================

CREATE OR REPLACE FUNCTION ci.sync_signal_to_public()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.ci_signals (
    id, agency_id, client_id, signal_type, severity,
    title, message, context_json, source, created_at
  ) VALUES (
    NEW.id, NEW.agency_id, NEW.client_id, NEW.signal_type, NEW.severity,
    NEW.title, NEW.message, NEW.drivers,
    COALESCE((NEW.source->>'engine'), (NEW.source->>'app'), 'ci'),
    NEW.created_at
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_signal_to_public ON ci.supervisor_signals;
CREATE TRIGGER trg_sync_signal_to_public
AFTER INSERT ON ci.supervisor_signals
FOR EACH ROW EXECUTE FUNCTION ci.sync_signal_to_public();

CREATE OR REPLACE FUNCTION ci.sync_resolution_to_ci()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.resolved_at IS NOT NULL AND OLD.resolved_at IS NULL THEN
    UPDATE ci.supervisor_signals
    SET resolved_at = NEW.resolved_at,
        resolved_by = NEW.resolved_by
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_resolution_to_ci ON public.ci_signals;
CREATE TRIGGER trg_sync_resolution_to_ci
AFTER UPDATE ON public.ci_signals
FOR EACH ROW EXECUTE FUNCTION ci.sync_resolution_to_ci();
