/**
 * Nova AI Clinical Capture - Type Definitions
 */

export type VoiceEncounterType =
  | 'quick_note'
  | 'direct_session_debrief'
  | 'parent_training'
  | 'parent_interview'
  | 'teacher_consult'
  | 'classroom_observation'
  | 'fba_interview'
  | 'fba_observation'
  | 'rbt_supervision'
  | 'bcba_supervision'
  | 'team_meeting'
  | 'crisis_debrief'
  | 'record_review_dictation'
  | 'private_dictation'
  | 'personal_admin_note';

export type VoiceCaptureMode = 'quick_note' | 'full_clinical' | 'upload_audio';

export type VoiceRecordingStatus =
  | 'draft_created'
  | 'ready_to_record'
  | 'recording_active'
  | 'paused'
  | 'stopping'
  | 'audio_secured'
  | 'processing'
  | 'review_ready'
  | 'saved_draft'
  | 'posted'
  | 'archived'
  | 'upload_degraded'
  | 'offline_buffering'
  | 'transcript_failed_retryable'
  | 'ai_failed_retryable'
  | 'finalization_failed_manual_review';

export type VoiceConsentStatus =
  | 'verbal_consent'
  | 'written_consent'
  | 'private_dictation_only'
  | 'no_recording_dictation_only'
  | 'not_set';

export type VoicePrivacyMode = 'private' | 'chart_linked_draft' | 'team_visible_draft';

export type VoiceSaveIntent =
  | 'private_only'
  | 'save_later'
  | 'narrative_note_draft'
  | 'session_note_draft'
  | 'supervision_draft'
  | 'fba_draft'
  | 'consult_draft'
  | 'task_list_only'
  | 'profile_update_suggestions';

export type VoiceSpeakerMode = 'auto' | 'tag_later' | 'single_speaker';
export type VoiceLanguageMode = 'auto' | 'en' | 'es' | 'bilingual' | 'custom';

export interface VoiceCaptureConfig {
  captureMode: VoiceCaptureMode;
  encounterType: VoiceEncounterType;
  saveIntent: VoiceSaveIntent;
  languageMode: VoiceLanguageMode;
  speakerMode: VoiceSpeakerMode;
  consentStatus: VoiceConsentStatus;
  privacyMode: VoicePrivacyMode;
  clientId?: string;
  clientName?: string;
  staffId?: string;
  staffName?: string;
  supervisorId?: string;
  sourcePage?: string;
  sourceEntityId?: string;
}

export interface VoiceRecording {
  id: string;
  created_by: string;
  client_id: string | null;
  staff_id: string | null;
  encounter_type: VoiceEncounterType;
  capture_mode: VoiceCaptureMode;
  save_intent: string;
  status: VoiceRecordingStatus;
  privacy_mode: VoicePrivacyMode;
  consent_status: VoiceConsentStatus;
  language_mode: string;
  speaker_mode: string;
  started_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  transcript_status: string;
  ai_status: string;
  created_at: string;
}

export const ENCOUNTER_TYPE_LABELS: Record<VoiceEncounterType, string> = {
  quick_note: 'Quick Note',
  direct_session_debrief: 'Direct Session Debrief',
  parent_training: 'Parent Training',
  parent_interview: 'Parent Interview',
  teacher_consult: 'Teacher Consult',
  classroom_observation: 'Classroom Observation',
  fba_interview: 'FBA Interview',
  fba_observation: 'FBA Observation',
  rbt_supervision: 'RBT Supervision',
  bcba_supervision: 'BCBA / Midlevel Supervision',
  team_meeting: 'Team Meeting',
  crisis_debrief: 'Crisis Debrief',
  record_review_dictation: 'Record Review Dictation',
  private_dictation: 'Private Clinical Dictation',
  personal_admin_note: 'Personal Admin Note',
};

export const CONSENT_LABELS: Record<VoiceConsentStatus, string> = {
  verbal_consent: 'Verbal consent obtained',
  written_consent: 'Written consent obtained',
  private_dictation_only: 'Private dictation only',
  no_recording_dictation_only: 'No recording — dictation only',
  not_set: 'Not set',
};

export const PRIVACY_LABELS: Record<VoicePrivacyMode, string> = {
  private: 'Private',
  chart_linked_draft: 'Chart-linked draft',
  team_visible_draft: 'Team-visible draft',
};

export const SAVE_INTENT_LABELS: Record<VoiceSaveIntent, string> = {
  private_only: 'Private only',
  save_later: 'Save later / Draft bin',
  narrative_note_draft: 'Narrative note draft',
  session_note_draft: 'Session note draft',
  supervision_draft: 'Supervision draft',
  fba_draft: 'FBA draft',
  consult_draft: 'Consult draft',
  task_list_only: 'Task list only',
  profile_update_suggestions: 'Profile update suggestions',
};

/** Returns true if this encounter type is "private" and doesn't require consent */
export function isPrivateEncounter(type: VoiceEncounterType): boolean {
  return type === 'private_dictation' || type === 'personal_admin_note' || type === 'record_review_dictation';
}
