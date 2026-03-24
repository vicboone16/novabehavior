-- Fix: Drop conflicting cc_chunks policies that reference clinical_capture schema columns
-- These policies reference org_id and created_by which don't exist in public.voice_recording_chunks
DROP POLICY IF EXISTS "cc_chunks_insert" ON public.voice_recording_chunks;
DROP POLICY IF EXISTS "cc_chunks_select" ON public.voice_recording_chunks;
DROP POLICY IF EXISTS "cc_chunks_update" ON public.voice_recording_chunks;

-- Fix stuck recording fba503f4
UPDATE public.voice_recordings
SET status = 'audio_secured', ended_at = now(), duration_seconds = 0
WHERE id = 'fba503f4-14f2-4f6e-b762-6e2da057d6ca' AND status = 'recording_active';

-- Fix recordings with failed transcript_status so they can be reprocessed
UPDATE public.voice_recordings
SET transcript_status = 'pending'
WHERE transcript_status = 'failed' AND status = 'audio_secured';