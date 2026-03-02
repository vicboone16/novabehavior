-- Validation trigger: require first_name on student insert
CREATE OR REPLACE FUNCTION public.validate_student_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.first_name IS NULL OR trim(NEW.first_name) = '' THEN
    RAISE EXCEPTION 'Student first_name is required';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_student_name
  BEFORE INSERT ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_student_name();