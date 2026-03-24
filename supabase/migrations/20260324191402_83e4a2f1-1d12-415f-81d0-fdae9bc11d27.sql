-- Add Physical Aggression to Ranger Dan's behavior map
INSERT INTO public.student_behavior_map (
  student_id,
  behavior_entry_id,
  behavior_domain,
  behavior_subtype,
  default_event_type,
  active
) VALUES (
  'bdbfeb6d-b66a-4bf5-998c-5711aea2bb5c',
  '347fad3e-b1a2-43d8-a079-efc37bae8c8f',
  'externalizing',
  'Physical Aggression',
  'frequency',
  true
) ON CONFLICT DO NOTHING;

-- Ensure RLS on voice_recording_chunks allows insert and select
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'voice_recording_chunks' 
    AND policyname = 'Users can insert own recording chunks'
  ) THEN
    CREATE POLICY "Users can insert own recording chunks"
    ON public.voice_recording_chunks FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.voice_recordings vr
        WHERE vr.id = recording_id AND vr.created_by = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'voice_recording_chunks' 
    AND policyname = 'Users can read own recording chunks'
  ) THEN
    CREATE POLICY "Users can read own recording chunks"
    ON public.voice_recording_chunks FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.voice_recordings vr
        WHERE vr.id = recording_id AND vr.created_by = auth.uid()
      )
    );
  END IF;
END $$;