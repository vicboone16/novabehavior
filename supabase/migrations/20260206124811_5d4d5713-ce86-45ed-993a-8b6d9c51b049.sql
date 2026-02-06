
-- Create storage bucket for report logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-logos', 'report-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload report logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'report-logos'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update their logos
CREATE POLICY "Authenticated users can update report logos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'report-logos'
  AND auth.role() = 'authenticated'
);

-- Allow public read access to logos
CREATE POLICY "Report logos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'report-logos');

-- Allow authenticated users to delete logos
CREATE POLICY "Authenticated users can delete report logos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'report-logos'
  AND auth.role() = 'authenticated'
);
