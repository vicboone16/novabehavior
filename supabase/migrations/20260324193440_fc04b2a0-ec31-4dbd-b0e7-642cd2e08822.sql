-- Backfill voice_recording_chunks from actual storage objects
INSERT INTO public.voice_recording_chunks (recording_id, chunk_index, duration_ms, storage_path, upload_status)
VALUES
  ('2e8f479c-d753-4dcc-8761-81d271b06b2d', 0, 10000, 'org/recording/2e8f479c-d753-4dcc-8761-81d271b06b2d/chunks/chunk_0000.webm', 'uploaded'),
  ('2e8f479c-d753-4dcc-8761-81d271b06b2d', 1, 10000, 'org/recording/2e8f479c-d753-4dcc-8761-81d271b06b2d/chunks/chunk_0001.webm', 'uploaded'),
  ('2e8f479c-d753-4dcc-8761-81d271b06b2d', 2, 10000, 'org/recording/2e8f479c-d753-4dcc-8761-81d271b06b2d/chunks/chunk_0002.webm', 'uploaded'),
  ('b648388f-6cb0-4286-9173-634fb52f4045', 0, 10000, 'org/recording/b648388f-6cb0-4286-9173-634fb52f4045/chunks/chunk_0000.webm', 'uploaded'),
  ('b5466138-c18b-4538-8880-08931da54ad6', 0, 10000, 'org/recording/b5466138-c18b-4538-8880-08931da54ad6/chunks/chunk_0000.webm', 'uploaded'),
  ('b5466138-c18b-4538-8880-08931da54ad6', 1, 10000, 'org/recording/b5466138-c18b-4538-8880-08931da54ad6/chunks/chunk_0001.webm', 'uploaded')
ON CONFLICT DO NOTHING;

UPDATE public.voice_recordings
SET status = 'audio_secured', transcript_status = 'pending'
WHERE id IN ('2e8f479c-d753-4dcc-8761-81d271b06b2d', 'b648388f-6cb0-4286-9173-634fb52f4045', 'b5466138-c18b-4538-8880-08931da54ad6')
  AND transcript_status != 'completed';