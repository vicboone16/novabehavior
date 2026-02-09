import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { 
  Clock, 
  Pause, 
  Play, 
  Square, 
  User,
  AlertCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDataStore } from '@/store/dataStore';
import { SessionEndFlow } from './SessionEndFlow';

interface StudentSessionTimerProps {
  studentId: string;
  studentName: string;
  studentColor: string;
  compact?: boolean;
}

export function StudentSessionTimer({
  studentId,
  studentName,
  studentColor,
  compact = false,
}: StudentSessionTimerProps) {
  const {
    sessionStartTime,
    getStudentSessionStatus,
    pauseStudentSession,
    resumeStudentSession,
    isStudentSessionPaused,
    isStudentSessionEnded,
  } = useDataStore();

  const [elapsed, setElapsed] = useState(0);
  const [showEndFlow, setShowEndFlow] = useState(false);

  const sessionStatus = getStudentSessionStatus(studentId);
  const isPaused = isStudentSessionPaused(studentId);
  const hasEnded = isStudentSessionEnded(studentId);

  // Calculate elapsed time for this student
  useEffect(() => {
    if (!sessionStartTime || hasEnded) {
      setElapsed(0);
      return;
    }

    const updateElapsed = () => {
      // Use global session start time as the base
      // Handle both Date objects and ISO strings (from zustand persist restoration)
      const startDate = sessionStartTime instanceof Date ? sessionStartTime : new Date(sessionStartTime);
      const startMs = startDate.getTime();
      
      // Guard against invalid dates
      if (isNaN(startMs)) {
        setElapsed(0);
        return;
      }
      
      const now = Date.now();
      
      // Calculate total pause time from pause durations array
      const totalPauseMs = sessionStatus?.pauseDurations?.reduce((sum, d) => sum + d, 0) || 0;
      
      // If currently paused, add current pause duration
      const currentPauseMs = isPaused && sessionStatus?.pausedAt
        ? Date.now() - new Date(sessionStatus.pausedAt).getTime()
        : 0;
      
      const activeMs = now - startMs - totalPauseMs - currentPauseMs;
      setElapsed(Math.max(0, Math.floor(activeMs / 1000)));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime, sessionStatus, isPaused, hasEnded]);

  const formatTime = useCallback((seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleTogglePause = () => {
    if (isPaused) {
      resumeStudentSession(studentId);
    } else {
      pauseStudentSession(studentId);
    }
  };

  if (hasEnded) {
    return (
      <div className={`flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50 ${compact ? 'text-xs' : 'text-sm'}`}>
        <div 
          className="w-2 h-2 rounded-full opacity-50"
          style={{ backgroundColor: studentColor }}
        />
        <span className="text-muted-foreground line-through">{studentName}</span>
        <Badge variant="outline" className="text-[10px] ml-auto">Ended</Badge>
      </div>
    );
  }

  if (compact) {
    return (
      <>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-card border border-border">
          <div 
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: studentColor }}
          />
          <span className="text-xs font-medium truncate flex-1">{studentName}</span>
          
          <div className="flex items-center gap-1">
            <span className={`font-mono text-xs ${isPaused ? 'text-warning' : 'text-foreground'}`}>
              {formatTime(elapsed)}
            </span>
            {!isPaused && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            )}
          </div>
          
          <div className="flex gap-0.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isPaused ? 'default' : 'ghost'}
                    size="sm"
                    className={`h-6 w-6 p-0 ${isPaused ? 'bg-warning text-warning-foreground' : ''}`}
                    onClick={handleTogglePause}
                  >
                    {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {isPaused ? 'Resume' : 'Pause'}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    onClick={() => setShowEndFlow(true)}
                  >
                    <Square className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">End session</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <SessionEndFlow
          open={showEndFlow}
          onOpenChange={setShowEndFlow}
          mode="single"
          singleStudentId={studentId}
          onComplete={() => {}}
        />
      </>
    );
  }

  // Full size timer
  return (
    <>
      <div 
        className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border"
        style={{ borderLeftColor: studentColor, borderLeftWidth: '3px' }}
      >
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${studentColor}20` }}
        >
          <User className="w-4 h-4" style={{ color: studentColor }} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{studentName}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            Started {sessionStartTime 
              ? format(new Date(sessionStartTime), 'h:mm a')
              : '--:--'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className={`font-mono text-lg font-bold ${isPaused ? 'text-warning' : 'text-foreground'}`}>
              {formatTime(elapsed)}
            </p>
            {isPaused && (
              <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/30">
                <AlertCircle className="w-3 h-3 mr-1" />
                Paused
              </Badge>
            )}
          </div>

          <div className="flex gap-1">
            <Button
              variant={isPaused ? 'default' : 'outline'}
              size="sm"
              className={isPaused ? 'bg-warning hover:bg-warning/90 text-warning-foreground' : ''}
              onClick={handleTogglePause}
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowEndFlow(true)}
            >
              <Square className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <SessionEndFlow
        open={showEndFlow}
        onOpenChange={setShowEndFlow}
        mode="single"
        singleStudentId={studentId}
        onComplete={() => {}}
      />
    </>
  );
}
