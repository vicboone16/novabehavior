/**
 * Nova AI Copilot — Context Detection Hook
 * Auto-detects user, learner, route, session, and workflow type.
 */

import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { VoiceEncounterType } from '@/types/voiceCapture';

export type CopilotWorkflowType =
  | 'direct_session'
  | 'parent_training'
  | 'teacher_consult'
  | 'classroom_observation'
  | 'fba_observation'
  | 'fba_interview'
  | 'supervision'
  | 'narrative_note'
  | 'quick_note'
  | 'unknown';

export interface NovaContext {
  userId: string | null;
  userRole: string | null;
  userDisplayName: string | null;
  learnerId: string | null;
  currentRoute: string;
  workflowType: CopilotWorkflowType;
  encounterType: VoiceEncounterType;
  suggestedNoteType: string;
  isOnLearnerPage: boolean;
  isInActiveSession: boolean;
}

/** Map route patterns to workflow types */
function inferWorkflow(pathname: string): CopilotWorkflowType {
  const p = pathname.toLowerCase();
  if (p.includes('/supervision')) return 'supervision';
  if (p.includes('/parent-training') || p.includes('/caregiver')) return 'parent_training';
  if (p.includes('/teacher') || p.includes('/consult')) return 'teacher_consult';
  if (p.includes('/fba') && p.includes('/observation')) return 'fba_observation';
  if (p.includes('/fba') && p.includes('/interview')) return 'fba_interview';
  if (p.includes('/fba')) return 'fba_observation';
  if (p.includes('/classroom')) return 'classroom_observation';
  if (p.includes('/session') || p.includes('/capture/live')) return 'direct_session';
  if (p.includes('/notes') || p.includes('/narrative')) return 'narrative_note';
  if (p.includes('/student') || p.includes('/client') || p.includes('/learner')) return 'direct_session';
  return 'unknown';
}

function workflowToEncounter(wf: CopilotWorkflowType): VoiceEncounterType {
  const map: Record<CopilotWorkflowType, VoiceEncounterType> = {
    direct_session: 'direct_session_debrief',
    parent_training: 'parent_training',
    teacher_consult: 'teacher_consult',
    classroom_observation: 'classroom_observation',
    fba_observation: 'fba_observation',
    fba_interview: 'fba_interview',
    supervision: 'rbt_supervision',
    narrative_note: 'private_dictation',
    quick_note: 'quick_note',
    unknown: 'quick_note',
  };
  return map[wf];
}

function workflowToNoteType(wf: CopilotWorkflowType): string {
  const map: Record<CopilotWorkflowType, string> = {
    direct_session: 'soap',
    parent_training: 'parent_training',
    teacher_consult: 'narrative',
    classroom_observation: 'observation',
    fba_observation: 'observation',
    fba_interview: 'narrative',
    supervision: 'supervision',
    narrative_note: 'narrative',
    quick_note: 'quick',
    unknown: 'narrative',
  };
  return map[wf];
}

export function useNovaContext(): NovaContext {
  const { user, profile, userRole } = useAuth();
  const location = useLocation();
  const params = useParams<{ clientId?: string; studentId?: string; learnerId?: string; recordingId?: string }>();

  return useMemo(() => {
    const pathname = location.pathname;
    const learnerId = params.clientId || params.studentId || params.learnerId || null;
    const workflowType = inferWorkflow(pathname);
    const isOnLearnerPage = !!learnerId || pathname.includes('/student') || pathname.includes('/client');

    return {
      userId: user?.id || null,
      userRole: userRole || null,
      userDisplayName: profile?.display_name || profile?.first_name || user?.email || null,
      learnerId,
      currentRoute: pathname,
      workflowType,
      encounterType: workflowToEncounter(workflowType),
      suggestedNoteType: workflowToNoteType(workflowType),
      isOnLearnerPage,
      isInActiveSession: pathname.includes('/capture/live') || pathname.includes('/session'),
    };
  }, [user, profile, userRole, location.pathname, params]);
}
