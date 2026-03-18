/**
 * Nova AI Clinical Capture - Global Floating Mic Button
 * Visible on all authenticated pages. Shows recording state when active.
 * Includes safety guards for route-leave, timeout suppression, and recovery.
 */

import { useState, useEffect } from 'react';
import { Mic, Square, Pause, Play, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { QuickStartModal } from './QuickStartModal';
import { CaptureSetupSheet } from './CaptureSetupSheet';
import { useVoiceCaptureEngine } from '@/hooks/useVoiceCaptureEngine';
import { useRecordingSafetyGuards } from '@/hooks/useRecordingSafetyGuards';
import { useCaptureStore } from '@/stores/captureStore';
import { LiveRecordingBar } from './LiveRecordingBar';
import type { VoiceCaptureConfig } from '@/types/voiceCapture';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function FloatingCaptureButton() {
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showLiveBar, setShowLiveBar] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const engine = useVoiceCaptureEngine();
  const { state } = engine;
  const captureState = useCaptureStore();

  const { getRecoveryState, clearRecovery } = useRecordingSafetyGuards({
    isRecording: state.isRecording,
    recordingId: state.recordingId,
  });

  // Check for crashed recording on mount
  useEffect(() => {
    const recovery = getRecoveryState();
    if (recovery && !state.isRecording) {
      toast.info('A previous recording session was interrupted.', {
        action: {
          label: 'View Recording',
          onClick: () => {
            clearRecovery();
            navigate(`/capture/review/${recovery.recordingId}`);
          },
        },
        duration: 10000,
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Also check zustand persisted state for recovery
  useEffect(() => {
    if (captureState.recordingId && captureState.status === 'recording_active' && !state.isRecording) {
      // Stale session from a crash
      toast.info('A previous capture session was found.', {
        action: {
          label: 'Review',
          onClick: () => {
            navigate(`/capture/review/${captureState.recordingId}`);
            captureState.clearSession();
          },
        },
        duration: 8000,
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Detect if on a learner page
  const studentMatch = location.pathname.match(/\/students\/([^/]+)/);
  const defaultClientId = studentMatch ? studentMatch[1] : undefined;

  const handleQuickTap = () => {
    if (state.isRecording) {
      setShowLiveBar(!showLiveBar);
    } else {
      setShowQuickStart(true);
    }
  };

  const handleStart = async (config: VoiceCaptureConfig) => {
    setShowQuickStart(false);
    setShowSetup(false);
    const recId = await engine.startRecording(config);
    if (recId) {
      setShowLiveBar(true);
      navigate(`/capture/live/${recId}`);
    }
  };

  const handleStop = async () => {
    const recId = state.recordingId;
    await engine.stopRecording();
    setShowLiveBar(false);
    captureState.clearSession();
    if (recId) navigate(`/capture/review/${recId}`);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Don't show on auth pages
  if (location.pathname.startsWith('/auth') || location.pathname.startsWith('/questionnaire') || location.pathname.startsWith('/consent') || location.pathname.startsWith('/observation') || location.pathname.startsWith('/form/')) {
    return null;
  }

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        {/* Recording mini-controls */}
        {state.isRecording && (
          <div className="flex items-center gap-2 bg-card border rounded-full px-3 py-1.5 shadow-lg">
            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-xs font-mono font-medium">{formatTime(state.elapsedSeconds)}</span>
            <Badge variant="outline" className="text-[9px] h-4">{state.uploadedChunks}/{state.totalChunks}</Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => state.isPaused ? engine.resumeRecording() : engine.pauseRecording()}
            >
              {state.isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive"
              onClick={handleStop}
            >
              <Square className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => navigate(`/capture/live/${state.recordingId}`)}
            >
              <ChevronUp className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* Main FAB */}
        <Button
          onClick={handleQuickTap}
          size="icon"
          className={`h-14 w-14 rounded-full shadow-xl transition-all md:h-14 md:w-14 ${
            state.isRecording
              ? 'bg-destructive hover:bg-destructive/90 animate-pulse'
              : 'bg-primary hover:bg-primary/90'
          }`}
          style={{ minWidth: 56, minHeight: 56 }}
        >
          <Mic className="w-6 h-6" />
        </Button>
      </div>

      {/* Quick Start Modal */}
      {showQuickStart && (
        <QuickStartModal
          onStart={handleStart}
          onMoreOptions={() => { setShowQuickStart(false); setShowSetup(true); }}
          onClose={() => setShowQuickStart(false)}
          defaultClientId={defaultClientId}
          defaultSourcePage={location.pathname}
        />
      )}

      {/* Full Setup Sheet */}
      {showSetup && (
        <CaptureSetupSheet
          onStart={handleStart}
          onClose={() => setShowSetup(false)}
          defaultClientId={defaultClientId}
          defaultSourcePage={location.pathname}
        />
      )}

      {/* Live Recording Bar */}
      {showLiveBar && state.isRecording && (
        <LiveRecordingBar
          state={state}
          onPause={engine.pauseRecording}
          onResume={engine.resumeRecording}
          onStop={handleStop}
          onMinimize={() => setShowLiveBar(false)}
        />
      )}
    </>
  );
}
