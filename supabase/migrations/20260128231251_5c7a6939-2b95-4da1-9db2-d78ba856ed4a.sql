-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view accessible students" ON public.students;
DROP POLICY IF EXISTS "Student owners can manage access to their students" ON public.user_student_access;

-- Create a SECURITY DEFINER function to check student ownership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_student_owner(_student_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students 
    WHERE id = _student_id AND user_id = _user_id
  );
$$;

-- Create a SECURITY DEFINER function to check user_student_access without triggering RLS
CREATE OR REPLACE FUNCTION public.has_student_access(_student_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_student_access 
    WHERE student_id = _student_id 
      AND user_id = _user_id 
      AND permission_level <> 'none'
  );
$$;

-- Recreate the students SELECT policy using the SECURITY DEFINER function
CREATE POLICY "Users can view accessible students"
ON public.students
FOR SELECT
USING (
  auth.uid() = user_id 
  OR has_student_access(id, auth.uid())
  OR has_tag_based_access(auth.uid(), id) 
  OR is_admin(auth.uid())
);

-- Recreate the user_student_access policy using the SECURITY DEFINER function
CREATE POLICY "Student owners can manage access to their students"
ON public.user_student_access
FOR ALL
USING (is_student_owner(student_id, auth.uid()));