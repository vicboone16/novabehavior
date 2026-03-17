/**
 * Nova AI Clinical Capture - Global Floating Mic Button
 * Visible on all pages. Shows recording state when active.
 */

import { useState } from 'react';
import { Mic, Square, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CaptureSetupSheet } from './CaptureSetupSheet';
import { useVoiceCaptureEngine, type VoiceCaptureEngineState } from '@/hooks/useVoiceCaptureEngine';
import { LiveRecordingBar } from './LiveRecordingBar';
import type { VoiceCaptureConfig } from '@/types/voiceCapture';
import { useLocation } from 'react-router-dom';

export function FloatingCaptureButton() {
  const [showSetup, setShowSetup] = useState(false);
  const [showLiveBar, setShowLiveBar] = useState(false);
  const location = useLocation();

  const engine = useVoiceCaptureEngine();
  const { state } = engine;

  // Detect if on a learner page
  const studentMatch = location.pathname.match(/\/students\/([^/]+)/);
  const defaultClientId = studentMatch ? studentMatch[1] : undefined;

  const handleQuickTap = () => {
    if (state.isRecording) {
      setShowLiveBar(!showLiveBar);
    } else {
      setShowSetup(true);
    }
  };

  const handleStart = async (config: VoiceCaptureConfig) => {
    setShowSetup(false);
    const recId = await engine.startRecording(config);
    if (recId) setShowLiveBar(true);
  };

  const handleStop = async () => {
    await engine.stopRecording();
    setShowLiveBar(false);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2">
        {state.isRecording && (
          <div className="flex items-center gap-2 bg-card border rounded-full px-3 py-1.5 shadow-lg">
            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-xs font-mono font-medium">{formatTime(state.elapsedSeconds)}</span>
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
          </div>
        )}

        <Button
          onClick={handleQuickTap}
          size="icon"
          className={`h-14 w-14 rounded-full shadow-xl transition-all ${
            state.isRecording
              ? 'bg-destructive hover:bg-destructive/90 animate-pulse'
              : 'bg-primary hover:bg-primary/90'
          }`}
        >
          <Mic className="w-6 h-6" />
        </Button>
      </div>

      {/* Setup Sheet */}
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
