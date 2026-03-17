
-- =============================================
-- Nova AI Clinical Capture - Core Schema
-- Migration 1 of 2: Tables + Indexes
-- =============================================

-- Enum for encounter types
CREATE TYPE public.voice_encounter_type AS ENUM (
  'quick_note',
  'direct_session_debrief',
  'parent_training',
  'parent_interview',
  'teacher_consult',
  'classroom_observation',
  'fba_interview',
  'fba_observation',
  'rbt_supervision',
  'bcba_supervision',
  'team_meeting',
  'crisis_debrief',
  'record_review_dictation',
  'private_dictation',
  'personal_admin_note'
);

-- Enum for capture mode
CREATE TYPE public.voice_capture_mode AS ENUM (
  'quick_note',
  'full_clinical',
  'upload_audio'
);

-- Enum for recording status
CREATE TYPE public.voice_recording_status AS ENUM (
  'draft_created',
  'ready_to_record',
  'recording_active',
  'paused',
  'stopping',
  'audio_secured',
  'processing',
  'review_ready',
  'saved_draft',
  'posted',
  'archived',
  'upload_degraded',
  'offline_buffering',
  'transcript_failed_retryable',
  'ai_failed_retryable',
  'finalization_failed_manual_review'
);

-- Enum for consent
CREATE TYPE public.voice_consent_status AS ENUM (
  'verbal_consent',
  'written_consent',
  'private_dictation_only',
  'no_recording_dictation_only',
  'not_set'
);

-- Enum for privacy mode
CREATE TYPE public.voice_privacy_mode AS ENUM (
  'private',
  'chart_linked_draft',
  'team_visible_draft'
);

-- =============================================
-- 1. voice_recordings - Core parent record
-- =============================================
CREATE TABLE public.voice_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  created_by UUID NOT NULL,
  client_id UUID,
  staff_id UUID,
  supervisor_id UUID,
  encounter_type public.voice_encounter_type NOT NULL DEFAULT 'quick_note',
  capture_mode public.voice_capture_mode NOT NULL DEFAULT 'quick_note',
  save_intent TEXT DEFAULT 'private_only',
  source_page TEXT,
  source_entity_id TEXT,
  status public.voice_recording_status NOT NULL DEFAULT 'draft_created',
  privacy_mode public.voice_privacy_mode NOT NULL DEFAULT 'private',
  consent_status public.voice_consent_status NOT NULL DEFAULT 'not_set',
  consent_method TEXT,
  language_mode TEXT DEFAULT 'auto',
  detected_languages TEXT[],
  speaker_mode TEXT DEFAULT 'auto',
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  secure_storage_path TEXT,
  upload_status TEXT DEFAULT 'pending',
  transcript_status TEXT DEFAULT 'pending',
  ai_status TEXT DEFAULT 'pending',
  finalized_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 2. voice_recording_chunks
-- =============================================
CREATE TABLE public.voice_recording_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.voice_recordings(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_ms INTEGER,
  storage_path TEXT,
  checksum TEXT,
  upload_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 3. voice_transcripts
-- =============================================
CREATE TABLE public.voice_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.voice_recordings(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  source_language TEXT,
  target_language TEXT,
  is_bilingual BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending',
  full_text TEXT,
  speaker_count INTEGER DEFAULT 0,
  confidence_summary JSONB,
  created_by_model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 4. voice_transcript_segments
-- =============================================
CREATE TABLE public.voice_transcript_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID NOT NULL REFERENCES public.voice_transcripts(id) ON DELETE CASCADE,
  speaker_id UUID,
  segment_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  start_ms INTEGER,
  end_ms INTEGER,
  confidence NUMERIC(4,3),
  language_code TEXT,
  is_user_edited BOOLEAN DEFAULT false
);

-- =============================================
-- 5. voice_speakers
-- =============================================
CREATE TABLE public.voice_speakers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.voice_recordings(id) ON DELETE CASCADE,
  speaker_label TEXT NOT NULL,
  speaker_role TEXT,
  linked_user_id UUID,
  linked_client_id UUID,
  is_user_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 6. voice_ai_runs
-- =============================================
CREATE TABLE public.voice_ai_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.voice_recordings(id) ON DELETE CASCADE,
  run_type TEXT NOT NULL,
  model_name TEXT,
  model_version TEXT,
  status TEXT DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 7. voice_ai_extractions
-- =============================================
CREATE TABLE public.voice_ai_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.voice_recordings(id) ON DELETE CASCADE,
  extraction_type TEXT NOT NULL,
  json_payload JSONB NOT NULL DEFAULT '{}',
  confidence_score NUMERIC(4,3),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 8. voice_ai_drafts
-- =============================================
CREATE TABLE public.voice_ai_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.voice_recordings(id) ON DELETE CASCADE,
  draft_type TEXT NOT NULL,
  tone TEXT DEFAULT 'clinical',
  output_language TEXT DEFAULT 'en',
  content TEXT,
  structured_json JSONB,
  model_name TEXT,
  model_version TEXT,
  is_user_edited BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 9. voice_ai_questions
-- =============================================
CREATE TABLE public.voice_ai_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.voice_recordings(id) ON DELETE CASCADE,
  asked_by UUID NOT NULL,
  question_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 10. voice_ai_answers
-- =============================================
CREATE TABLE public.voice_ai_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.voice_ai_questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  grounding_json JSONB,
  model_name TEXT,
  model_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 11. voice_save_actions
-- =============================================
CREATE TABLE public.voice_save_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.voice_recordings(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  destination_module TEXT,
  destination_id UUID,
  performed_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 12. voice_posted_artifacts
-- =============================================
CREATE TABLE public.voice_posted_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.voice_recordings(id) ON DELETE CASCADE,
  draft_id UUID REFERENCES public.voice_ai_drafts(id),
  posted_module TEXT NOT NULL,
  posted_record_id UUID,
  posted_by UUID NOT NULL,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 13. voice_tasks
-- =============================================
CREATE TABLE public.voice_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.voice_recordings(id) ON DELETE CASCADE,
  client_id UUID,
  assigned_to UUID,
  task_text TEXT NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 14. voice_consents
-- =============================================
CREATE TABLE public.voice_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.voice_recordings(id) ON DELETE CASCADE,
  consent_status public.voice_consent_status NOT NULL,
  consent_method TEXT,
  captured_by UUID NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

-- =============================================
-- 15. voice_links
-- =============================================
CREATE TABLE public.voice_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.voice_recordings(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  relationship_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 16. voice_audit_log
-- =============================================
CREATE TABLE public.voice_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id UUID NOT NULL REFERENCES public.voice_recordings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  metadata_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- Indexes
-- =============================================
CREATE INDEX idx_voice_recordings_created_by ON public.voice_recordings(created_by);
CREATE INDEX idx_voice_recordings_client_id ON public.voice_recordings(client_id);
CREATE INDEX idx_voice_recordings_status ON public.voice_recordings(status);
CREATE INDEX idx_voice_recordings_org ON public.voice_recordings(org_id);
CREATE INDEX idx_voice_chunks_recording ON public.voice_recording_chunks(recording_id);
CREATE INDEX idx_voice_transcripts_recording ON public.voice_transcripts(recording_id);
CREATE INDEX idx_voice_segments_transcript ON public.voice_transcript_segments(transcript_id);
CREATE INDEX idx_voice_speakers_recording ON public.voice_speakers(recording_id);
CREATE INDEX idx_voice_ai_runs_recording ON public.voice_ai_runs(recording_id);
CREATE INDEX idx_voice_extractions_recording ON public.voice_ai_extractions(recording_id);
CREATE INDEX idx_voice_drafts_recording ON public.voice_ai_drafts(recording_id);
CREATE INDEX idx_voice_questions_recording ON public.voice_ai_questions(recording_id);
CREATE INDEX idx_voice_answers_question ON public.voice_ai_answers(question_id);
CREATE INDEX idx_voice_save_recording ON public.voice_save_actions(recording_id);
CREATE INDEX idx_voice_posted_recording ON public.voice_posted_artifacts(recording_id);
CREATE INDEX idx_voice_tasks_recording ON public.voice_tasks(recording_id);
CREATE INDEX idx_voice_consents_recording ON public.voice_consents(recording_id);
CREATE INDEX idx_voice_links_recording ON public.voice_links(recording_id);
CREATE INDEX idx_voice_audit_recording ON public.voice_audit_log(recording_id);

-- =============================================
-- RLS - Enable on all tables
-- =============================================
ALTER TABLE public.voice_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_recording_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_transcript_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_ai_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_ai_extractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_ai_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_ai_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_ai_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_save_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_posted_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_audit_log ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies - Owner-based access for recordings
-- =============================================

-- voice_recordings: creator can CRUD their own
CREATE POLICY "Users can view own recordings" ON public.voice_recordings
  FOR SELECT TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can insert own recordings" ON public.voice_recordings
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own recordings" ON public.voice_recordings
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete own recordings" ON public.voice_recordings
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Child tables: access through recording ownership
-- voice_recording_chunks
CREATE POLICY "Access own recording chunks" ON public.voice_recording_chunks
  FOR ALL TO authenticated
  USING (recording_id IN (SELECT id FROM public.voice_recordings WHERE created_by = auth.uid()))
  WITH CHECK (recording_id IN (SELECT id FROM public.voice_recordings WHERE created_by = auth.uid()));

-- voice_transcripts
CREATE POLICY "Access own transcripts" ON public.voice_transcripts
  FOR ALL TO authenticated
  USING (recording_id IN (SELECT id FROM public.voice_recordings WHERE created_by = auth.uid()))
  WITH CHECK (recording_id IN (SELECT id FROM public.voice_recordings WHERE created_by = auth.uid()));

-- voice_transcript_segments
CREATE POLICY "Access own segments" ON public.voice_transcript_segments
  FOR ALL TO authenticated
  USING (transcript_id IN (
    SELECT t.id FROM public.voice_transcripts t
    JOIN public.voice_recordings r ON r.id = t.recording_id
    WHERE r.created_by = auth.uid()
  ))
  WITH CHECK (transcript_id IN (
    SELECT t.id FROM public.voice_transcripts t
    JOIN public.voice_recordings r ON r.id = t.recording_id
    WHERE r.created_by = auth.uid()
  ));

-- voice_speakers
CREATE POLICY "Access own speakers" ON public.voice_speakers
  FOR ALL TO authenticated
  USING (recording_id IN (SELECT id FROM public.voice_recordings WHERE created_by = auth.uid()))
  WITH CHECK (recording_id IN (SELECT id FROM public.voice_recordings WHERE created_by = auth.uid()));

-- voice_ai_runs
CREATE POLICY "Access own ai runs" ON public.voice_ai_runs
  FOR ALL TO authenticated
  USING (recording_id IN (SELECT id FROM public.voice_recordings WHERE created_by = auth.uid()))
  WITH CHECK (recording_id IN (SELECT id FROM public.voice_recordings WHERE created_by = auth.uid()));

-- voice_ai_extractions
CREATE POLICY "Access own extractions" ON public.voice_ai_extractions
  FOR ALL TO authenticated
  USING (recording_id IN (SELECT id FROM public.voice_recordings WHERE created_by = auth.uid()))
  WITH CHECK (recording_id IN (SELECT id FROM public.voice_recordings WHERE created_by = auth.uid()));

-- voice_ai_drafts
CREATE POLICY "Access own drafts" ON public.voice_ai_drafts
  FOR ALL TO authenticated
  USING (recording_id IN (SELECT id FROM public.voice_recordings WHERE created_by = auth.uid()))
  WITH CHECK (recording_id IN (SELECT id FROM public.voice_recordings WHERE created_by = auth.uid()));

-- voice_ai_questions
CREATE POLICY "Access own questions" ON public.voice_ai_questions
  FOR ALL TO authenticated
  USING (recording_id IN (SELECT id FROM public.voice_recordings WHERE created_by = auth.uid()))
  WITH CHECK (recording_id IN (SELECT id FROM public.voice_recordings WHERE created_by = auth.uid()));

-- voice_ai_answers
CREATE POLICY "Access own answers" ON public.voice_ai_answers
  FOR ALL TO authenticated
  USING (question_id IN (
    SELECT q.id FROM public.voice_ai_questions q
    JOIN public.voice_recordings r ON r.id = q.recording_id
    WHERE r.created_by = auth.uid()
  ))
  WITH CHECK (question_id IN (
    SELECT q.id FROM public.voice_ai_questions q
    JOIN public.voice_recordings r ON r.id = q.recording_id
    WHERE r.created_by = auth.uid()
  ));

-- voice_save_actions
CREATE POLICY "Access own save actions" ON public.voice_save_actions
  FOR ALL TO authenticated
  USING (recording_id IN (SELECT id FROM public.voice_recordings WHERE created_by = auth.uid()))
  WITH CHECK (recording_id IN (SELECT id FROM public.voice_recordings WHERE created_by = auth.uid()));

-- voice_posted_artifacts
CREATE POLICY "Access own posted artifacts" ON public.voice_posted_artifacts
  FOR ALL TO authenticated
  USING (recording_id IN (SELECT id FROM public.voice_recordings WHERE created_by = auth.uid()))
  WITH CHECK (recording_id IN (SELECT id FROM public.voice_recordings WHERE created_by = auth.uid()));

-- voice_tasks
CREATE POLICY "Access own voice tasks" ON public.voice_tasks
  FOR ALL TO authenticated
  USING (recording_id IN (SELECT id FROM public.voice_recordings WHERE created_by = auth.uid()))
  WITH CHECK (recording_id IN (SELECT id FROM public.voice_recordings WHERE created_by = auth.uid()));

-- voice_consents
CREATE POLICY "Access own consents" ON public.voice_consents
  FOR ALL TO authenticated
  USING (recording_id IN (SELECT id FROM public.voice_recordings WHERE created_by = auth.uid()))
  WITH CHECK (recording_id IN (SELECT id FROM public.voice_recordings WHERE created_by = auth.uid()));

-- voice_links
CREATE POLICY "Access own links" ON public.voice_links
  FOR ALL TO authenticated
  USING (recording_id IN (SELECT id FROM public.voice_recordings WHERE created_by = auth.uid()))
  WITH CHECK (recording_id IN (SELECT id FROM public.voice_recordings WHERE created_by = auth.uid()));

-- voice_audit_log
CREATE POLICY "Access own audit logs" ON public.voice_audit_log
  FOR ALL TO authenticated
  USING (recording_id IN (SELECT id FROM public.voice_recordings WHERE created_by = auth.uid()))
  WITH CHECK (recording_id IN (SELECT id FROM public.voice_recordings WHERE created_by = auth.uid()));

-- Storage bucket for voice recordings
INSERT INTO storage.buckets (id, name, public) VALUES ('voice-recordings', 'voice-recordings', false);

-- Storage RLS for voice recordings bucket
CREATE POLICY "Users can upload own voice recordings" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'voice-recordings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own voice recordings" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'voice-recordings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own voice recordings" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'voice-recordings' AND (storage.foldername(name))[1] = auth.uid()::text);
