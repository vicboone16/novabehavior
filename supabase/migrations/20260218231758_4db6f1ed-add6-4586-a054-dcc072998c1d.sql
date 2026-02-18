
-- Function to auto-update sessions.student_ids whenever a session_data row is inserted
CREATE OR REPLACE FUNCTION public.update_session_student_ids()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.sessions
  SET student_ids = (
    SELECT ARRAY_AGG(DISTINCT student_id)
    FROM public.session_data
    WHERE session_id = NEW.session_id
  )
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

-- Trigger: fires after every INSERT on session_data
CREATE TRIGGER trg_update_session_student_ids
AFTER INSERT ON public.session_data
FOR EACH ROW
EXECUTE FUNCTION public.update_session_student_ids();
