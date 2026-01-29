import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Clock, Minimize2, Maximize2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDataStore } from '@/store/dataStore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function SessionTimer() {
  const { sessionStartTime, startSession, currentSessionId } = useDataStore();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedTime, setPausedTime] = useState(0);
  const [pausedAt, setPausedAt] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  
  const isRunning = !!sessionStartTime && !isPaused;

  // Calculate elapsed time
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (sessionStartTime && !isPaused) {
      const updateElapsed = () => {
        const startMs = new Date(sessionStartTime).getTime();
        const now = Date.now();
        const totalPausedMs = pausedTime * 1000;
        setElapsed(Math.floor((now - startMs - totalPausedMs) / 1000));
      };
      
      updateElapsed();
      interval = setInterval(updateElapsed, 1000);
    }
    
    return () => clearInterval(interval);
  }, [sessionStartTime, isPaused, pausedTime]);

  const formatTime = useCallback((seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleToggle = () => {
    if (!sessionStartTime) {
      // Start a new session
      startSession();
      setIsPaused(false);
      setPausedTime(0);
      setPausedAt(null);
    } else if (isPaused) {
      // Resume from pause
      if (pausedAt) {
        const pauseDuration = Math.floor((Date.now() - pausedAt.getTime()) / 1000);
        setPausedTime(prev => prev + pauseDuration);
      }
      setIsPaused(false);
      setPausedAt(null);
    } else {
      // Pause the timer
      setIsPaused(true);
      setPausedAt(new Date());
    }
  };

  const handleReset = () => {
    setIsPaused(false);
    setPausedTime(0);
    setPausedAt(null);
    setElapsed(0);
    // Start fresh session
    startSession();
  };

  const handleEndSession = () => {
    setShowEndConfirm(true);
  };

  const confirmEndSession = () => {
    // Reset local state - session data is preserved in the store
    setIsPaused(true);
    setShowEndConfirm(false);
  };

  const formattedTime = formatTime(elapsed);

  if (isMinimized) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsMinimized(false)}
        className="gap-2 h-9"
      >
        <Clock className="w-4 h-4 text-primary" />
        <span className="font-mono font-medium">{formattedTime}</span>
        {isRunning && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
        <Maximize2 className="w-3 h-3 text-muted-foreground" />
      </Button>
    );
  }

  return (
    <>
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {currentSessionId ? 'Session Time' : 'No Active Session'}
              </p>
              <p className="timer-display text-foreground">{formattedTime}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant={isRunning ? 'default' : 'outline'}
              size="sm"
              onClick={handleToggle}
              className="gap-2"
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pause
                </>
              ) : isPaused ? (
                <>
                  <Play className="w-4 h-4" />
                  Resume
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start
                </>
              )}
            </Button>
            {sessionStartTime && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleEndSession}
                className="gap-1 text-destructive hover:text-destructive"
              >
                <Square className="w-4 h-4" />
                End
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsMinimized(true)}
              className="h-8 w-8 p-0"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End Session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop the session timer. Your collected data will be preserved.
              You can save the session from the Session History or use End All Sessions for a complete session workflow.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmEndSession}>
              End Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
