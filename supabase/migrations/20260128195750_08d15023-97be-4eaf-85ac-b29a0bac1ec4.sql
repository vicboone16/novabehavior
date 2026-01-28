-- Fix the RLS policy bug for students table
-- The current policy incorrectly checks usa.student_id = usa.id instead of usa.student_id = students.id

DROP POLICY IF EXISTS "Users can view accessible students" ON public.students;

CREATE POLICY "Users can view accessible students"
ON public.students FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.user_student_access usa
    WHERE usa.student_id = students.id  -- FIXED: Now correctly references students.id
      AND usa.user_id = auth.uid()
      AND usa.permission_level != 'none'
  )
  OR public.is_admin(auth.uid())
);

-- Create a function to check if a user has tag-based access to a student
-- This allows users with matching tags to access students with the same tags
CREATE OR REPLACE FUNCTION public.has_tag_based_access(_user_id uuid, _student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_tags ut
    INNER JOIN public.student_tags st ON ut.tag_id = st.tag_id
    WHERE ut.user_id = _user_id
      AND st.student_id = _student_id
  )
$$;

-- Update the students SELECT policy to include tag-based access
DROP POLICY IF EXISTS "Users can view accessible students" ON public.students;

CREATE POLICY "Users can view accessible students"
ON public.students FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.user_student_access usa
    WHERE usa.student_id = students.id
      AND usa.user_id = auth.uid()
      AND usa.permission_level != 'none'
  )
  OR public.has_tag_based_access(auth.uid(), students.id)
  OR public.is_admin(auth.uid())
);

-- Add UPDATE policy for tag-based access (with can_edit_profile check)
DROP POLICY IF EXISTS "Users with tag access can update students" ON public.students;

CREATE POLICY "Users with tag access can update students"
ON public.students FOR UPDATE
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.user_student_access usa
    WHERE usa.student_id = students.id
      AND usa.user_id = auth.uid()
      AND usa.can_edit_profile = true
  )
  OR public.is_admin(auth.uid())
);

-- Update session_notes to use correct student access
DROP POLICY IF EXISTS "Users with access can view session notes" ON public.session_notes;

CREATE POLICY "Users with access can view session notes"
ON public.session_notes FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = session_notes.student_id
      AND s.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_student_access usa
    WHERE usa.student_id = session_notes.student_id
      AND usa.user_id = auth.uid()
      AND usa.can_view_notes = true
  )
  OR public.has_tag_based_access(auth.uid(), session_notes.student_id)
  OR public.is_admin(auth.uid())
);

-- Update student_files to check tag access and document permission
DROP POLICY IF EXISTS "Users with access can view student files" ON public.student_files;

CREATE POLICY "Users with access can view student files"
ON public.student_files FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = student_files.student_id
      AND s.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_student_access usa
    WHERE usa.student_id = student_files.student_id
      AND usa.user_id = auth.uid()
      AND usa.can_view_documents = true
  )
  OR public.has_tag_based_access(auth.uid(), student_files.student_id)
  OR public.is_admin(auth.uid())
);

-- Update session_data to use correct student access
DROP POLICY IF EXISTS "Users with access can view session data" ON public.session_data;

CREATE POLICY "Users with access can view session data"
ON public.session_data FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = session_data.student_id
      AND s.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_student_access usa
    WHERE usa.student_id = session_data.student_id
      AND usa.user_id = auth.uid()
      AND usa.can_collect_data = true
  )
  OR public.has_tag_based_access(auth.uid(), session_data.student_id)
  OR public.is_admin(auth.uid())
);

-- Allow users with tag access to insert session data
DROP POLICY IF EXISTS "Users with access can create session data" ON public.session_data;

CREATE POLICY "Users with access can create session data"
ON public.session_data FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.user_student_access usa
    WHERE usa.student_id = session_data.student_id
      AND usa.user_id = auth.uid()
      AND usa.can_collect_data = true
  )
  OR public.has_tag_based_access(auth.uid(), session_data.student_id)
);