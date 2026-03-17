-- Fix broken storage RLS policies for student-documents bucket
-- The policies incorrectly reference s.name (student's display name) instead of objects.name (file path)
-- This causes ALL uploads, reads, updates, and deletes to be blocked

-- Drop all existing student-documents policies
DROP POLICY IF EXISTS "Users can upload to their students folders" ON storage.objects;
DROP POLICY IF EXISTS "Users can read their students files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their students files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their students files" ON storage.objects;

-- Recreate with correct object path references
-- Upload: user can upload if first path segment is a student they own or have access to
CREATE POLICY "Users can upload to their students folders"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'student-documents'
  AND (
    -- Allow extraction-temp uploads (keyed by user_id)
    (storage.foldername(name))[1] = 'extraction-temp'
    OR
    -- Allow documents/ prefix where second segment is a student ID they own
    (
      (storage.foldername(name))[1] = 'documents'
      AND EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id::text = (storage.foldername(name))[2]
          AND (s.user_id = auth.uid() OR public.has_student_access(s.id, auth.uid()) OR public.is_admin(auth.uid()))
      )
    )
    OR
    -- Allow direct studentId/ prefix uploads
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND (s.user_id = auth.uid() OR public.has_student_access(s.id, auth.uid()) OR public.is_admin(auth.uid()))
    )
  )
);

-- Read: user can read files in student folders they have access to
CREATE POLICY "Users can read their students files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'student-documents'
  AND (
    (storage.foldername(name))[1] = 'extraction-temp'
    OR
    (
      (storage.foldername(name))[1] = 'documents'
      AND EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id::text = (storage.foldername(name))[2]
          AND (s.user_id = auth.uid() OR public.has_student_access(s.id, auth.uid()) OR public.is_admin(auth.uid()))
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND (s.user_id = auth.uid() OR public.has_student_access(s.id, auth.uid()) OR public.is_admin(auth.uid()))
    )
  )
);

-- Update
CREATE POLICY "Users can update their students files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'student-documents'
  AND (
    (storage.foldername(name))[1] = 'extraction-temp'
    OR
    (
      (storage.foldername(name))[1] = 'documents'
      AND EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id::text = (storage.foldername(name))[2]
          AND (s.user_id = auth.uid() OR public.is_admin(auth.uid()))
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND (s.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  )
);

-- Delete
CREATE POLICY "Users can delete their students files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'student-documents'
  AND (
    (storage.foldername(name))[1] = 'extraction-temp'
    OR
    (
      (storage.foldername(name))[1] = 'documents'
      AND EXISTS (
        SELECT 1 FROM public.students s
        WHERE s.id::text = (storage.foldername(name))[2]
          AND (s.user_id = auth.uid() OR public.is_admin(auth.uid()))
      )
    )
    OR
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND (s.user_id = auth.uid() OR public.is_admin(auth.uid()))
    )
  )
);