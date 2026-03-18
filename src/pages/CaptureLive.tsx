/**
 * Nova AI Clinical Capture - Live Recording Screen
 * /capture/live/:recordingId
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Mic, Pause, Play, Square, Upload, Shield, Bookmark, StickyNote, Wifi, WifiOff, Clock, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useVoiceCaptureEngine } from '@/hooks/useVoiceCaptureEngine';
import { useCaptureStore } from '@/stores/captureStore';
import { ENCOUNTER_TYPE_LABELS, PRIVACY_LABELS } from '@/types/voiceCapture';

export default function CaptureLive() {
  const { recordingId } = useParams<{ recordingId: string }>();
  const navigate = useNavigate();
  const engine = useVoiceCaptureEngine();
  const { state } = engine;
  const captureState = useCaptureStore();

  const isActive = state.isRecording || captureState.status === 'recording_active';
  const elapsed = state.elapsedSeconds || captureState.elapsedSeconds;

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleStop = async () => {
    await engine.stopRecording();
    captureState.clearSession();
    if (recordingId) navigate(`/capture/review/${recordingId}`);
  };

  const uploadProgress = state.totalChunks > 0
    ? Math.round((state.uploadedChunks / state.totalChunks) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <div className="bg-destructive text-destructive-foreground px-4 py-3">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive-foreground hover:bg-white/20" onClick={() => navigate('/capture')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-white animate-pulse" />
              <span className="font-bold text-sm">REC</span>
            </div>
            <span className="font-mono text-lg font-bold">{formatTime(elapsed)}</span>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-white/30 text-white text-[10px]">
              <Shield className="w-2.5 h-2.5 mr-0.5" />
              {captureState.privacyMode ? PRIVACY_LABELS[captureState.privacyMode] : 'Private'}
            </Badge>
            {captureState.encounterType && (
              <Badge variant="outline" className="border-white/30 text-white text-[10px]">
                {ENCOUNTER_TYPE_LABELS[captureState.encounterType]}
              </Badge>
            )}
          </div>
        </div>
        <Progress value={uploadProgress} className="h-0.5 rounded-none bg-white/20 mt-1" />
      </div>

      {/* Main Content */}
      <div className="flex-1 container py-6 space-y-6 max-w-2xl mx-auto">
        {/* Learner Context */}
        {captureState.linkedLearnerName && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
            <span className="text-sm text-muted-foreground">Recording for:</span>
            <Badge variant="secondary">{captureState.linkedLearnerName}</Badge>
          </div>
        )}

        {/* Waveform Visualization */}
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center gap-1 h-20">
              {Array.from({ length: 32 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-destructive/60 transition-all duration-150"
                  style={{
                    height: `${Math.max(4, (state.audioLevel > (i / 32) ? state.audioLevel * 80 : 4 + Math.random() * 8))}px`,
                    opacity: state.audioLevel > (i / 32) ? 1 : 0.3,
                  }}
                />
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-4">
              {state.isPaused ? '⏸ Paused' : '🎙 Listening… transcript will appear after processing'}
            </p>
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="lg"
            className="rounded-full h-14 w-14"
            onClick={() => state.isPaused ? engine.resumeRecording() : engine.pauseRecording()}
          >
            {state.isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
          </Button>
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full h-16 w-16 shadow-xl"
            onClick={handleStop}
          >
            <Square className="w-6 h-6" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="rounded-full h-14 w-14"
            onClick={() => {/* bookmark */}}
          >
            <Bookmark className="w-5 h-5" />
          </Button>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="py-3 flex items-center gap-2">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{state.uploadedChunks}/{state.totalChunks}</p>
                <p className="text-[10px] text-muted-foreground">Chunks uploaded</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 flex items-center gap-2">
              {captureState.connectionState === 'connected' ? (
                <Wifi className="w-4 h-4 text-primary" />
              ) : (
                <WifiOff className="w-4 h-4 text-destructive" />
              )}
              <div>
                <p className="text-sm font-medium capitalize">{captureState.connectionState}</p>
                <p className="text-[10px] text-muted-foreground">Connection</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Transcript Placeholder */}
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-2 mb-3">
              <StickyNote className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Live Transcript</span>
              <Badge variant="secondary" className="text-[10px]">Coming Soon</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Audio is being securely captured and uploaded. Full transcript will be generated after recording stops.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
