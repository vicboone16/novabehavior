-- ============================================
-- Agency Data Isolation Migration
-- Creates helper functions and updates RLS policies
-- ============================================

-- 1. Create agency access helper function
CREATE OR REPLACE FUNCTION public.has_agency_student_access(
  _user_id UUID,
  _student_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql 
SECURITY DEFINER 
STABLE
SET search_path = public
AS $$
DECLARE
  _student_agency_id UUID;
  _user_in_agency BOOLEAN;
BEGIN
  -- Get the student's agency
  SELECT agency_id INTO _student_agency_id
  FROM students WHERE id = _student_id;
  
  -- If student has no agency, allow access based on other rules (return false to let other policies handle)
  IF _student_agency_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is a member of the student's agency
  SELECT EXISTS(
    SELECT 1 FROM agency_memberships
    WHERE user_id = _user_id
    AND agency_id = _student_agency_id
    AND status = 'active'
  ) INTO _user_in_agency;
  
  RETURN _user_in_agency;
END;
$$;

-- 2. Update students SELECT policy to include agency-based access
DROP POLICY IF EXISTS "Users can view accessible students" ON students;
CREATE POLICY "Users can view accessible students" ON students
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR has_student_access(id, auth.uid())
    OR has_tag_based_access(auth.uid(), id)
    OR has_agency_student_access(auth.uid(), id)
    OR is_admin(auth.uid())
  );

-- 3. Update students INSERT/UPDATE/DELETE policies if they exist
DROP POLICY IF EXISTS "Users can insert own students" ON students;
CREATE POLICY "Users can insert students" ON students
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can update accessible students" ON students;
CREATE POLICY "Users can update accessible students" ON students
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    OR has_student_access(id, auth.uid())
    OR has_agency_student_access(auth.uid(), id)
    OR is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete own students" ON students;
CREATE POLICY "Users can delete own students" ON students
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR is_admin(auth.uid())
  );

-- 4. Update client_documents RLS to include agency-based access
DROP POLICY IF EXISTS "Authenticated users can view documents" ON client_documents;
DROP POLICY IF EXISTS "Users can view client documents" ON client_documents;
CREATE POLICY "Users can view client documents with visibility rules" ON client_documents
  FOR SELECT TO authenticated
  USING (
    -- Uploader always sees their uploads
    uploaded_by = auth.uid()
    -- Or based on visibility level + access
    OR (
      visibility_permission = 'clinical_team' AND
      (has_student_access(client_id, auth.uid()) OR has_agency_student_access(auth.uid(), client_id))
    )
    OR (
      visibility_permission = 'internal_only' AND
      has_student_access(client_id, auth.uid())
    )
    OR (
      visibility_permission = 'school_team' AND
      (has_student_access(client_id, auth.uid()) OR has_agency_student_access(auth.uid(), client_id))
    )
    OR (
      visibility_permission = 'parent_shareable' AND
      (has_student_access(client_id, auth.uid()) OR has_agency_student_access(auth.uid(), client_id))
    )
    OR is_admin(auth.uid())
  );

-- 5. Update student_files RLS to include agency-based access  
DROP POLICY IF EXISTS "Users can view student files" ON student_files;
CREATE POLICY "Users can view student files" ON student_files
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR has_student_access(student_id, auth.uid())
    OR has_agency_student_access(auth.uid(), student_id)
    OR is_admin(auth.uid())
  );

-- 6. Add uploaded_by_user_id and legacy_file_id columns to client_documents for migration
ALTER TABLE client_documents
ADD COLUMN IF NOT EXISTS uploaded_by_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS legacy_file_id UUID;

-- 7. Create index for faster agency-based lookups
CREATE INDEX IF NOT EXISTS idx_students_agency_id ON students(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_memberships_user_agency ON agency_memberships(user_id, agency_id, status);