-- Create storage bucket for student documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-documents', 'student-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for authenticated users to upload documents
CREATE POLICY "Authenticated users can upload student documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'student-documents');

-- Create policy for authenticated users to read documents
CREATE POLICY "Authenticated users can read student documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'student-documents');

-- Create policy for authenticated users to delete their documents
CREATE POLICY "Authenticated users can delete student documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'student-documents');