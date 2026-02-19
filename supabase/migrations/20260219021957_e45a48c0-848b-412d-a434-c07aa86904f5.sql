
-- Add trigger to auto-maintain sessions.student_ids from session_data inserts
-- This prevents the "empty student_ids" bug from recurring in future sessions

CREATE OR REPLACE FUNCTION public.update_session_student_ids()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = 'public'
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

-- Drop trigger if it already exists, then recreate
DROP TRIGGER IF EXISTS trg_update_session_student_ids ON public.session_data;

CREATE TRIGGER trg_update_session_student_ids
AFTER INSERT ON public.session_data
FOR EACH ROW
EXECUTE FUNCTION public.update_session_student_ids();
