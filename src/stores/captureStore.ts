/**
 * Nova AI Clinical Capture - Global Recording State Store (Zustand)
 * Persists lightweight state locally to drive floating mic UI,
 * mobile sticky bar, and prevent accidental navigation loss.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { VoiceRecordingStatus, VoiceEncounterType, VoicePrivacyMode } from '@/types/voiceCapture';

interface CaptureState {
  recordingId: string | null;
  orgId: string | null;
  linkedLearnerId: string | null;
  linkedLearnerName: string | null;
  encounterType: VoiceEncounterType | null;
  privacyMode: VoicePrivacyMode | null;
  status: VoiceRecordingStatus | null;
  startedAt: string | null;
  elapsedSeconds: number;
  uploadedChunkCount: number;
  pendingChunkCount: number;
  connectionState: 'connected' | 'reconnecting' | 'offline';
  liveRoute: string | null;
}

interface CaptureActions {
  startSession: (params: {
    recordingId: string;
    orgId: string;
    learnerId?: string;
    learnerName?: string;
    encounterType: VoiceEncounterType;
    privacyMode: VoicePrivacyMode;
  }) => void;
  updateStatus: (status: VoiceRecordingStatus) => void;
  updateChunks: (uploaded: number, pending: number) => void;
  updateElapsed: (seconds: number) => void;
  updateConnection: (state: 'connected' | 'reconnecting' | 'offline') => void;
  clearSession: () => void;
}

const initialState: CaptureState = {
  recordingId: null,
  orgId: null,
  linkedLearnerId: null,
  linkedLearnerName: null,
  encounterType: null,
  privacyMode: null,
  status: null,
  startedAt: null,
  elapsedSeconds: 0,
  uploadedChunkCount: 0,
  pendingChunkCount: 0,
  connectionState: 'connected',
  liveRoute: null,
};

export const useCaptureStore = create<CaptureState & CaptureActions>()(
  persist(
    (set) => ({
      ...initialState,

      startSession: ({ recordingId, orgId, learnerId, learnerName, encounterType, privacyMode }) =>
        set({
          recordingId,
          orgId,
          linkedLearnerId: learnerId || null,
          linkedLearnerName: learnerName || null,
          encounterType,
          privacyMode,
          status: 'recording_active',
          startedAt: new Date().toISOString(),
          elapsedSeconds: 0,
          uploadedChunkCount: 0,
          pendingChunkCount: 0,
          connectionState: 'connected',
          liveRoute: `/capture/live/${recordingId}`,
        }),

      updateStatus: (status) => set({ status }),
      updateChunks: (uploaded, pending) => set({ uploadedChunkCount: uploaded, pendingChunkCount: pending }),
      updateElapsed: (seconds) => set({ elapsedSeconds: seconds }),
      updateConnection: (connectionState) => set({ connectionState }),
      clearSession: () => set(initialState),
    }),
    {
      name: 'nova-capture-session',
      partialize: (state) => ({
        recordingId: state.recordingId,
        orgId: state.orgId,
        linkedLearnerId: state.linkedLearnerId,
        linkedLearnerName: state.linkedLearnerName,
        encounterType: state.encounterType,
        privacyMode: state.privacyMode,
        status: state.status,
        startedAt: state.startedAt,
        liveRoute: state.liveRoute,
      }),
    }
  )
);
