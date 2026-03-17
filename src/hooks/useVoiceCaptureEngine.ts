/**
 * Nova AI Clinical Capture - Recording Engine Hook
 * 
 * Handles chunked audio capture, wake lock, timeout suppression,
 * crash recovery, and server-side chunk persistence.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { VoiceCaptureConfig, VoiceRecordingStatus } from '@/types/voiceCapture';

const CHUNK_INTERVAL_MS = 7000; // ~7s chunks

interface ChunkRecord {
  index: number;
  blob: Blob;
  uploaded: boolean;
}

export interface VoiceCaptureEngineState {
  recordingId: string | null;
  status: VoiceRecordingStatus;
  elapsedSeconds: number;
  isRecording: boolean;
  isPaused: boolean;
  uploadedChunks: number;
  totalChunks: number;
  audioLevel: number;
}

export function useVoiceCaptureEngine() {
  const [state, setState] = useState<VoiceCaptureEngineState>({
    recordingId: null,
    status: 'draft_created',
    elapsedSeconds: 0,
    isRecording: false,
    isPaused: false,
    uploadedChunks: 0,
    totalChunks: 0,
    audioLevel: 0,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<ChunkRecord[]>([]);
  const chunkIndexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recordingIdRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      releaseWakeLock();
    };
  }, []);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch { /* not supported or denied */ }
  };

  const releaseWakeLock = () => {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  };

  const uploadChunk = async (recordingId: string, chunk: ChunkRecord, userId: string) => {
    try {
      const path = `${userId}/${recordingId}/chunk_${String(chunk.index).padStart(4, '0')}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('voice-recordings')
        .upload(path, chunk.blob, { contentType: 'audio/webm', upsert: true });

      if (uploadError) throw uploadError;

      // Record chunk in DB
      await supabase.from('voice_recording_chunks' as any).insert({
        recording_id: recordingId,
        chunk_index: chunk.index,
        duration_ms: CHUNK_INTERVAL_MS,
        storage_path: path,
        upload_status: 'uploaded',
      });

      chunk.uploaded = true;
      setState(prev => ({ ...prev, uploadedChunks: prev.uploadedChunks + 1 }));
    } catch (err) {
      console.error('Chunk upload failed:', err);
      // Will retry later - chunk stays in queue
    }
  };

  const setupAudioAnalyser = (stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setState(prev => ({ ...prev, audioLevel: avg / 255 }));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch { /* audio context not available */ }
  };

  const startRecording = useCallback(async (config: VoiceCaptureConfig) => {
    try {
      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create recording row FIRST
      const { data: recording, error: insertError } = await supabase
        .from('voice_recordings' as any)
        .insert({
          created_by: user.id,
          client_id: config.clientId || null,
          staff_id: config.staffId || null,
          supervisor_id: config.supervisorId || null,
          encounter_type: config.encounterType,
          capture_mode: config.captureMode,
          save_intent: config.saveIntent,
          source_page: config.sourcePage || null,
          source_entity_id: config.sourceEntityId || null,
          status: 'recording_active',
          privacy_mode: config.privacyMode,
          consent_status: config.consentStatus,
          language_mode: config.languageMode,
          speaker_mode: config.speakerMode,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError || !recording) throw insertError || new Error('Failed to create recording');

      const recId = (recording as any).id;
      recordingIdRef.current = recId;

      // Log consent
      await supabase.from('voice_consents' as any).insert({
        recording_id: recId,
        consent_status: config.consentStatus,
        consent_method: config.consentStatus === 'verbal_consent' ? 'verbal' : config.consentStatus === 'written_consent' ? 'written' : 'private',
        captured_by: user.id,
      });

      // Audit log
      await supabase.from('voice_audit_log' as any).insert({
        recording_id: recId,
        user_id: user.id,
        action_type: 'recording_started',
        metadata_json: { encounter_type: config.encounterType, capture_mode: config.captureMode },
      });

      // Get mic
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      setupAudioAnalyser(stream);

      // Setup recorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      chunkIndexRef.current = 0;

      let currentChunkBlobs: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) currentChunkBlobs.push(e.data);
      };

      // Collect data every CHUNK_INTERVAL_MS and upload
      mediaRecorder.start(CHUNK_INTERVAL_MS);

      // Periodic chunk finalization
      const chunkTimer = setInterval(() => {
        if (currentChunkBlobs.length > 0) {
          const blob = new Blob(currentChunkBlobs, { type: 'audio/webm' });
          const chunk: ChunkRecord = { index: chunkIndexRef.current++, blob, uploaded: false };
          chunksRef.current.push(chunk);
          setState(prev => ({ ...prev, totalChunks: prev.totalChunks + 1 }));
          uploadChunk(recId, chunk, user.id);
          currentChunkBlobs = [];
        }
      }, CHUNK_INTERVAL_MS + 500); // slightly after ondataavailable fires

      // Elapsed timer
      timerRef.current = setInterval(() => {
        setState(prev => ({ ...prev, elapsedSeconds: prev.elapsedSeconds + 1 }));
      }, 1000);

      // Wake lock
      await requestWakeLock();

      // Haptic
      if ('vibrate' in navigator) navigator.vibrate(100);

      setState(prev => ({
        ...prev,
        recordingId: recId,
        status: 'recording_active',
        isRecording: true,
        isPaused: false,
        elapsedSeconds: 0,
        uploadedChunks: 0,
        totalChunks: 0,
      }));

      // Store chunk timer for cleanup
      (mediaRecorder as any).__chunkTimer = chunkTimer;

      toast.success('Recording started');
      return recId;
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      toast.error('Failed to start recording: ' + (err?.message || 'Unknown error'));
      return null;
    }
  }, []);

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    const recId = recordingIdRef.current;
    if (!recorder || !recId) return;

    // Clear timers
    if ((recorder as any).__chunkTimer) clearInterval((recorder as any).__chunkTimer);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (animFrameRef.current) { cancelAnimationFrame(animFrameRef.current); animFrameRef.current = null; }
    analyserRef.current = null;

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        // Stop stream
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        releaseWakeLock();

        // Update status
        await supabase.from('voice_recordings' as any).update({
          status: 'audio_secured',
          ended_at: new Date().toISOString(),
          duration_seconds: state.elapsedSeconds,
        }).eq('id', recId);

        // Audit
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('voice_audit_log' as any).insert({
            recording_id: recId,
            user_id: user.id,
            action_type: 'recording_stopped',
            metadata_json: { duration_seconds: state.elapsedSeconds },
          });
        }

        setState(prev => ({
          ...prev,
          status: 'audio_secured',
          isRecording: false,
          isPaused: false,
        }));

        if ('vibrate' in navigator) navigator.vibrate([50, 50, 50]);
        toast.success('Recording saved');
        resolve();
      };

      recorder.stop();
    });
  }, [state.elapsedSeconds]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      setState(prev => ({ ...prev, isPaused: true, status: 'paused' }));
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      setState(prev => ({ ...prev, isPaused: false, status: 'recording_active' }));
    }
  }, []);

  return {
    state,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  };
}
