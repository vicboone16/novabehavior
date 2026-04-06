-- Fix the trigger that prevents historical start_time values
CREATE OR REPLACE FUNCTION public.validate_session_start_time()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow start_time to match started_at (the observation date) for historical imports.
  -- Only clamp if start_time is set but started_at is not, and it's unreasonably old.
  IF NEW.started_at IS NOT NULL THEN
    -- Trust started_at as the source of truth; allow start_time to align
    RETURN NEW;
  END IF;

  -- For live sessions without started_at, clamp extreme values
  IF NEW.start_time < (COALESCE(NEW.created_at, now()) - interval '365 days') THEN
    NEW.start_time := COALESCE(NEW.created_at, now());
  END IF;
  RETURN NEW;
END;
$$;

-- Now fix all stale start_time values
UPDATE public.sessions
SET start_time = started_at
WHERE start_time IS NOT NULL
  AND started_at IS NOT NULL
  AND start_time::date != started_at::date;