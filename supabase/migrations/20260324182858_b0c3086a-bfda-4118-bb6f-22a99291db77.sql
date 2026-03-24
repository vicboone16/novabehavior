
-- Reset stuck recordings so they can be re-processed after the fix
UPDATE public.voice_recordings 
SET status = 'audio_secured', 
    transcript_status = 'pending', 
    ai_status = 'pending'
WHERE id IN (
  '534eb318-878f-4eb4-9e34-a8abe2b393e7',
  'ff6867c1-785f-4daa-b486-2c7f168afbfc',
  '9988d138-ca3a-4110-8a06-90a83f14da34'
);
