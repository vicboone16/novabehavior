
-- Fix incident→signal trigger to use correct column names (student_id, not client_id)
CREATE OR REPLACE FUNCTION ci.trg_incident_to_signal()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF coalesce(NEW.severity, 0) >= 3 THEN
    PERFORM ci.create_supervisor_signal(
      p_client_id    => NEW.student_id,
      p_signal_type  => 'incident',
      p_title        => 'Incident logged',
      p_message      => coalesce(NEW.summary, 'Incident recorded'),
      p_severity     => 'critical',
      p_agency_id    => NULL,
      p_classroom_id => NEW.classroom_id,
      p_drivers      => jsonb_build_object('severity', NEW.severity),
      p_source       => jsonb_build_object('app', 'beacon', 'table', 'public.incidents', 'id', NEW.id)
    );
  END IF;
  RETURN NEW;
END $$;

-- Attach incident→signal trigger
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_incident_to_signal') THEN
    CREATE TRIGGER trg_incident_to_signal
    AFTER INSERT ON public.incidents
    FOR EACH ROW EXECUTE FUNCTION ci.trg_incident_to_signal();
  END IF;
END $$;

-- Incident→event-stream trigger
CREATE OR REPLACE FUNCTION behavior_intelligence.trg_incident_to_event()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM behavior_intelligence.insert_event(
    p_client_id    => NEW.student_id,
    p_occurred_at  => NEW.incident_start,
    p_event_type   => 'incident',
    p_event_name   => coalesce(NEW.incident_type, 'incident'),
    p_intensity    => NEW.severity,
    p_metadata     => jsonb_build_object(
                       'injuries', NEW.injuries,
                       'removal_required', NEW.removal_required,
                       'summary', NEW.summary
                     ),
    p_source_table => 'incidents',
    p_source_id    => NEW.id,
    p_classroom_id => NEW.classroom_id,
    p_school_id    => NEW.school_id
  );
  RETURN NEW;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_incident_to_event') THEN
    CREATE TRIGGER trg_incident_to_event
    AFTER INSERT ON public.incidents
    FOR EACH ROW EXECUTE FUNCTION behavior_intelligence.trg_incident_to_event();
  END IF;
END $$;

-- Incident timeline events→event-stream trigger
CREATE OR REPLACE FUNCTION behavior_intelligence.trg_incident_event_to_eventstream()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_student uuid;
  v_classroom uuid;
  v_school uuid;
BEGIN
  SELECT student_id, classroom_id, school_id
    INTO v_student, v_classroom, v_school
  FROM public.incidents
  WHERE id = NEW.incident_id;

  PERFORM behavior_intelligence.insert_event(
    p_client_id    => v_student,
    p_occurred_at  => NEW.event_time,
    p_event_type   => 'incident_step',
    p_event_name   => NEW.event_type,
    p_intensity    => NEW.intensity,
    p_metadata     => jsonb_build_object('details', NEW.details, 'metadata', NEW.metadata),
    p_source_table => 'incident_events',
    p_source_id    => NEW.id,
    p_classroom_id => v_classroom,
    p_school_id    => v_school
  );
  RETURN NEW;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_incident_event_to_eventstream') THEN
    CREATE TRIGGER trg_incident_event_to_eventstream
    AFTER INSERT ON public.incident_events
    FOR EACH ROW EXECUTE FUNCTION behavior_intelligence.trg_incident_event_to_eventstream();
  END IF;
END $$
