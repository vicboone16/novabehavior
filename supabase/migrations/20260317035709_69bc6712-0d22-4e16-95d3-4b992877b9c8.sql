-- Fix Dounya's session: start_time should reflect when data was actually collected
UPDATE sessions 
SET start_time = '2026-03-13T18:23:21.635884+00'
WHERE id = '772479cf-21ce-4383-88ff-b909b2e6a3e8' 
  AND start_time = '2025-07-22T14:25:00+00';

-- Add a trigger to validate start_time is not absurdly in the past relative to created_at
CREATE OR REPLACE FUNCTION validate_session_start_time()
RETURNS TRIGGER AS $$
BEGIN
  -- If start_time is more than 30 days before created_at, clamp to created_at
  -- This prevents historical data timestamps from being used as session start times
  IF NEW.start_time < (COALESCE(NEW.created_at, now()) - interval '30 days') THEN
    NEW.start_time := COALESCE(NEW.created_at, now());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_session_start_time ON sessions;
CREATE TRIGGER trg_validate_session_start_time
  BEFORE INSERT OR UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION validate_session_start_time();