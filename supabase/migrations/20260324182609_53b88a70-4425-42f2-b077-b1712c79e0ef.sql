
DROP POLICY IF EXISTS "Users can upload own voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own voice recordings" ON storage.objects;

CREATE POLICY "Authenticated users can upload voice recordings"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'voice-recordings'
  AND EXISTS (
    SELECT 1 FROM public.voice_recordings vr
    WHERE vr.created_by = auth.uid()
    AND position(vr.id::text in name) > 0
  )
);

CREATE POLICY "Authenticated users can read own voice recordings"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'voice-recordings'
  AND EXISTS (
    SELECT 1 FROM public.voice_recordings vr
    WHERE vr.created_by = auth.uid()
    AND position(vr.id::text in name) > 0
  )
);

CREATE POLICY "Authenticated users can delete own voice recordings"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'voice-recordings'
  AND EXISTS (
    SELECT 1 FROM public.voice_recordings vr
    WHERE vr.created_by = auth.uid()
    AND position(vr.id::text in name) > 0
  )
);

CREATE POLICY "Service role full access voice recordings"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'voice-recordings')
WITH CHECK (bucket_id = 'voice-recordings');
