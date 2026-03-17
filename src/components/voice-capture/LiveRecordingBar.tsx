/**
 * Compact live recording bar that persists across navigation.
 */

import { Mic, Pause, Play, Square, ChevronDown, Upload, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { VoiceCaptureEngineState } from '@/hooks/useVoiceCaptureEngine';

interface LiveRecordingBarProps {
  state: VoiceCaptureEngineState;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onMinimize: () => void;
}

export function LiveRecordingBar({ state, onPause, onResume, onStop, onMinimize }: LiveRecordingBarProps) {
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const uploadProgress = state.totalChunks > 0
    ? Math.round((state.uploadedChunks / state.totalChunks) * 100)
    : 0;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground">
      <div className="container flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            <span className="text-sm font-bold">REC</span>
          </div>
          <span className="font-mono text-sm font-medium">{formatTime(state.elapsedSeconds)}</span>

          {/* Audio level indicator */}
          <div className="hidden sm:flex items-end gap-0.5 h-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-white/40 transition-all"
                style={{
                  height: `${Math.max(4, (state.audioLevel > (i / 8) ? state.audioLevel * 16 : 2))}px`,
                  opacity: state.audioLevel > (i / 8) ? 1 : 0.3,
                }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Upload status */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            <Upload className="w-3 h-3" />
            <span>{state.uploadedChunks}/{state.totalChunks}</span>
          </div>

          <Badge variant="outline" className="text-[10px] border-white/30 text-white">
            <Shield className="w-2.5 h-2.5 mr-0.5" />
            Secured
          </Badge>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white hover:bg-white/20"
            onClick={() => state.isPaused ? onResume() : onPause()}
          >
            {state.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white hover:bg-white/20"
            onClick={onStop}
          >
            <Square className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white hover:bg-white/20"
            onClick={onMinimize}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Chunk upload progress */}
      <Progress value={uploadProgress} className="h-0.5 rounded-none bg-white/20" />
    </div>
  );
}
