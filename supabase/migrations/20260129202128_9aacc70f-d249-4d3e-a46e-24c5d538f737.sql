-- Make the student-documents bucket private
-- This will activate the existing RLS policies on storage.objects
UPDATE storage.buckets 
SET public = false 
WHERE id = 'student-documents';