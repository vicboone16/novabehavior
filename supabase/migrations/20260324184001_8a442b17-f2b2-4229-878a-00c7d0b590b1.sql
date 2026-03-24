-- Fix voice_recording_chunks RLS for public schema
DROP POLICY IF EXISTS "Access own recording chunks" ON public.voice_recording_chunks;

CREATE POLICY "Insert own recording chunks"
ON public.voice_recording_chunks FOR INSERT
TO authenticated
WITH CHECK (
  recording_id IN (
    SELECT id FROM voice_recordings WHERE created_by = auth.uid()
  )
);

CREATE POLICY "Select own recording chunks"
ON public.voice_recording_chunks FOR SELECT
TO authenticated
USING (
  recording_id IN (
    SELECT id FROM voice_recordings WHERE created_by = auth.uid()
  )
);

CREATE POLICY "Service role full access chunks"
ON public.voice_recording_chunks FOR ALL
TO service_role
USING (true)
WITH CHECK (true);