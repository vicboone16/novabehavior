
-- Add org_id to all voice tables that are missing it
ALTER TABLE public.voice_ai_runs ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE public.voice_transcripts ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE public.voice_transcript_segments ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE public.voice_speakers ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE public.voice_ai_drafts ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE public.voice_ai_extractions ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE public.voice_ai_questions ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE public.voice_ai_answers ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE public.voice_tasks ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE public.voice_audit_log ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE public.voice_consents ADD COLUMN IF NOT EXISTS org_id uuid;

-- Add draft versioning fields
ALTER TABLE public.voice_ai_drafts
  ADD COLUMN IF NOT EXISTS generation_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_system_generated boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS superseded_at timestamptz;

-- Add extraction versioning fields
ALTER TABLE public.voice_ai_extractions
  ADD COLUMN IF NOT EXISTS generation_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_current boolean NOT NULL DEFAULT true;

-- Indexes for draft versioning
CREATE INDEX IF NOT EXISTS idx_voice_drafts_recording_type_version
  ON public.voice_ai_drafts(recording_id, draft_type, generation_version DESC);

CREATE INDEX IF NOT EXISTS idx_voice_drafts_recording_active
  ON public.voice_ai_drafts(recording_id, draft_type)
  WHERE superseded_at IS NULL;

-- Index for extraction versioning
CREATE INDEX IF NOT EXISTS idx_voice_extractions_recording_type_current
  ON public.voice_ai_extractions(recording_id, extraction_type)
  WHERE is_current = true;

-- Indexes for org_id lookups
CREATE INDEX IF NOT EXISTS idx_voice_ai_runs_org ON public.voice_ai_runs(org_id);
CREATE INDEX IF NOT EXISTS idx_voice_transcripts_org ON public.voice_transcripts(org_id);
CREATE INDEX IF NOT EXISTS idx_voice_ai_drafts_org ON public.voice_ai_drafts(org_id);
CREATE INDEX IF NOT EXISTS idx_voice_ai_extractions_org ON public.voice_ai_extractions(org_id);
CREATE INDEX IF NOT EXISTS idx_voice_audit_log_org ON public.voice_audit_log(org_id);

-- Backfill existing data
UPDATE public.voice_ai_drafts SET is_system_generated = true WHERE is_system_generated IS DISTINCT FROM true;
UPDATE public.voice_ai_extractions SET is_current = true WHERE is_current IS DISTINCT FROM true;
