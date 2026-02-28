
INSERT INTO storage.buckets (id, name, public)
VALUES ('signed-documents', 'signed-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS for signed-documents bucket
CREATE POLICY "Authenticated users can read signed documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'signed-documents');

CREATE POLICY "Anyone can insert signed documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'signed-documents');
