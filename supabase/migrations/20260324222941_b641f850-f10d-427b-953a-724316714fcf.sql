
-- Recreate lightweight trigger for auto-syncing session_data → behavior_session_data
-- This version avoids the ON CONFLICT issue by using a simple upsert per-row

CREATE OR REPLACE FUNCTION public.sync_bsd_after_session_data_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sid uuid;
  _student_id uuid;
  _behavior_id uuid;
  _freq int;
  _dur int;
BEGIN
  _sid := COALESCE(NEW.session_id, OLD.session_id);
  _student_id := COALESCE(NEW.student_id, OLD.student_id);
  
  -- Only process if behavior_id is a valid UUID
  IF NEW.behavior_id IS NULL OR NEW.behavior_id !~ '^[0-9a-f]{8}-' THEN
    RETURN NEW;
  END IF;
  
  -- Check if behavior exists in behaviors table
  BEGIN
    _behavior_id := NEW.behavior_id::uuid;
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;
  
  IF NOT EXISTS (SELECT 1 FROM behaviors WHERE id = _behavior_id) THEN
    RETURN NEW;
  END IF;
  
  -- Aggregate this session+student+behavior combo
  SELECT 
    COUNT(*) FILTER (WHERE event_type = 'frequency')::int,
    COALESCE(SUM(duration_seconds) FILTER (WHERE event_type = 'duration'), 0)::int
  INTO _freq, _dur
  FROM session_data
  WHERE session_id = _sid AND student_id = _student_id AND behavior_id = NEW.behavior_id;
  
  -- Upsert into behavior_session_data
  INSERT INTO behavior_session_data (id, session_id, student_id, behavior_id, frequency, duration_seconds, data_state, created_at)
  VALUES (gen_random_uuid(), _sid, _student_id, _behavior_id, _freq, _dur, 'measured', now())
  ON CONFLICT (session_id, behavior_id) DO UPDATE SET
    frequency = EXCLUDED.frequency,
    duration_seconds = EXCLUDED.duration_seconds,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_bsd
  AFTER INSERT ON session_data
  FOR EACH ROW
  EXECUTE FUNCTION sync_bsd_after_session_data_change();
