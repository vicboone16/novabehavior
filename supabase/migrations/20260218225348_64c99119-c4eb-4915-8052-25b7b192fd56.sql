
-- Fix 1: Update has_data flag for all sessions that have actual session_data entries
UPDATE public.sessions s
SET has_data = true
WHERE EXISTS (
  SELECT 1 FROM public.session_data sd WHERE sd.session_id = s.id
)
AND has_data = false;

-- Fix 2: Also ensure sessions with NO data get has_data = false (normalize)
UPDATE public.sessions s
SET has_data = false
WHERE NOT EXISTS (
  SELECT 1 FROM public.session_data sd WHERE sd.session_id = s.id
)
AND has_data = true;

-- Fix 3: Create a trigger to automatically maintain has_data flag going forward
CREATE OR REPLACE FUNCTION public.update_session_has_data()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- When a session_data row is added, mark the parent session as has_data = true
    UPDATE public.sessions
    SET has_data = true
    WHERE id = NEW.session_id AND has_data = false;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- When a session_data row is deleted, check if session still has any data
    UPDATE public.sessions
    SET has_data = EXISTS (
      SELECT 1 FROM public.session_data WHERE session_id = OLD.session_id
    )
    WHERE id = OLD.session_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Drop if exists then recreate
DROP TRIGGER IF EXISTS trg_update_session_has_data ON public.session_data;

CREATE TRIGGER trg_update_session_has_data
AFTER INSERT OR DELETE ON public.session_data
FOR EACH ROW EXECUTE FUNCTION public.update_session_has_data();
