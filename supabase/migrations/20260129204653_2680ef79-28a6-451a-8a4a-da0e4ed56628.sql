-- Drop existing overly permissive policies on student-documents bucket
DROP POLICY IF EXISTS "Authenticated users can read student documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload student documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete student documents" ON storage.objects;

-- Users can only upload files to folders for students they own or have access to
CREATE POLICY "Users can upload to their students folders"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'student-documents' AND
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE (storage.foldername(name))[1] = s.id::text
    AND (s.user_id = auth.uid() OR has_student_access(s.id, auth.uid()) OR is_admin(auth.uid()))
  )
);

-- Users can only read files from students they own or have access to
CREATE POLICY "Users can read their students files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'student-documents' AND
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE (storage.foldername(name))[1] = s.id::text
    AND (s.user_id = auth.uid() OR has_student_access(s.id, auth.uid()) OR is_admin(auth.uid()))
  )
);

-- Users can only update files for students they own or are admin
CREATE POLICY "Users can update their students files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'student-documents' AND
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE (storage.foldername(name))[1] = s.id::text
    AND (s.user_id = auth.uid() OR is_admin(auth.uid()))
  )
);

-- Users can only delete files from students they own or are admin
CREATE POLICY "Users can delete their students files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'student-documents' AND
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE (storage.foldername(name))[1] = s.id::text
    AND (s.user_id = auth.uid() OR is_admin(auth.uid()))
  )
);