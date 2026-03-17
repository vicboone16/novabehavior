/**
 * Nova AI Clinical Capture - Recording Safety Guards
 * Route-leave warning, timeout suppression, and crash recovery.
 */

import { useEffect, useCallback, useRef } from 'react';

interface SafetyGuardOptions {
  isRecording: boolean;
  recordingId: string | null;
}

const STORAGE_KEY = 'nova_active_recording';

export function useRecordingSafetyGuards({ isRecording, recordingId }: SafetyGuardOptions) {
  const wasRecordingRef = useRef(false);

  // ── beforeunload warning ──
  useEffect(() => {
    if (!isRecording) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Recording is active. Leaving may interrupt your capture.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isRecording]);

  // ── Persist active recording for crash recovery ──
  useEffect(() => {
    if (isRecording && recordingId) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        recordingId,
        startedAt: Date.now(),
      }));
      wasRecordingRef.current = true;
    } else if (wasRecordingRef.current && !isRecording) {
      localStorage.removeItem(STORAGE_KEY);
      wasRecordingRef.current = false;
    }
  }, [isRecording, recordingId]);

  // ── Suppress idle/session timeout ──
  useEffect(() => {
    if (!isRecording) return;
    // Dispatch synthetic mouse move every 30s to keep idle detectors alive
    const interval = setInterval(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 0, clientY: 0 }));
    }, 30000);
    return () => clearInterval(interval);
  }, [isRecording]);

  // ── Check for crashed recording on mount ──
  const getRecoveryState = useCallback((): { recordingId: string } | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Only recover if less than 2 hours old
      if (Date.now() - parsed.startedAt > 2 * 60 * 60 * 1000) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return { recordingId: parsed.recordingId };
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  }, []);

  const clearRecovery = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { getRecoveryState, clearRecovery };
}
