import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Clock, Minimize2, Maximize2, Square, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useDataStore } from '@/store/dataStore';
import { SessionEndFlow } from './SessionEndFlow';
import { toast } from '@/hooks/use-toast';

export function SessionTimer() {
  const { 
    sessionStartTime, 
    startSession,
    resetSession,
    resetSessionData,
    currentSessionId,
    selectedStudentIds,
    students,
    getStudentSessionStatus
  } = useDataStore();
  
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedTime, setPausedTime] = useState(0);
  const [pausedAt, setPausedAt] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showEndFlow, setShowEndFlow] = useState(false);
  
  const isRunning = !!sessionStartTime && !isPaused;

  // Count active students (not already ended)
  const activeStudents = students.filter(s => 
    selectedStudentIds.includes(s.id) && 
    !getStudentSessionStatus(s.id)?.hasEnded
  );

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
    // Clear session without auto-starting - user must click Start
    resetSession();
  };

  const handleEndSession = () => {
    // If no students selected at all, show a helpful message
    if (selectedStudentIds.length === 0) {
      toast({
        title: 'No students selected',
        description: 'Select students to end their sessions, or use Reset to clear the timer.',
        variant: 'destructive',
      });
      return;
    }
    setShowEndFlow(true);
  };

  const handleEndFlowComplete = () => {
    // Reset ALL timer state after session ends
    setIsPaused(false);
    setPausedAt(null);
    setPausedTime(0);
    setElapsed(0);
    // Clear session data from the summary display
    resetSessionData();
    toast({
      title: 'Sessions Ended',
      description: 'All student sessions have been completed. Data has been saved.',
    });
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
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">
                  {currentSessionId ? 'Session Time' : 'No Active Session'}
                </p>
                {activeStudents.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 cursor-default">
                        <Users className="w-3 h-3 mr-1" />
                        {activeStudents.length}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-sm">
                        <p className="font-medium mb-1">Active Students:</p>
                        {activeStudents.map(s => (
                          <div key={s.id} className="flex items-center gap-1.5">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: s.color }} 
                            />
                            {s.name}
                          </div>
                        ))}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
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
            {/* Always show End Session button when a session is active */}
            {sessionStartTime && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleEndSession}
                className="gap-1"
              >
                <Square className="w-4 h-4" />
                End Session
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

      <SessionEndFlow
        open={showEndFlow}
        onOpenChange={setShowEndFlow}
        mode="all"
        onComplete={handleEndFlowComplete}
      />
    </>
  );
}
