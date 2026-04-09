import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Clock, Minimize2, Maximize2, Square, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useDataStore } from '@/store/dataStore';
import { SessionEndFlow } from './SessionEndFlow';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionParticipants } from '@/hooks/useSessionParticipants';
import { NoteDelegationPanel } from './session/NoteDelegationPanel';
import { LeaveOrEndSessionDialog } from './session/LeaveOrEndSessionDialog';


export function SessionTimer() {
  const { user, userRole } = useAuth();
  const { 
    sessionStartTime, 
    startSession,
    resetSession,
    resetSessionData,
    forceEndAllSessions,
    currentSessionId,
    selectedStudentIds,
    students,
    getStudentSessionStatus
  } = useDataStore();

  const { participants, leaveSession } = useSessionParticipants(currentSessionId);
  // Other active participants (not the current user, and haven't left)
  const otherActiveParticipants = participants.filter(
    p => p.user_id !== user?.id && !p.left_at
  );
  const isMultiStaff = participants.filter(p => !p.left_at).length > 1;
  const isBcba = userRole === 'admin' || userRole === 'super_admin';

  const [isMinimized, setIsMinimized] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pausedTime, setPausedTime] = useState(0);
  const [pausedAt, setPausedAt] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showEndFlow, setShowEndFlow] = useState(false);
  const [showLeaveOrEnd, setShowLeaveOrEnd] = useState(false);
  
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

  const handleToggle = async () => {
    if (!sessionStartTime) {
      // Start a new session
      startSession();
      setIsPaused(false);
      setPausedTime(0);
      setPausedAt(null);
      // Register the session starter as the first participant (lead + default note delegate)
      // We use a short delay so currentSessionId is set in the store before we read it
      setTimeout(async () => {
        const newSessionId = useDataStore.getState().currentSessionId;
        if (newSessionId && user) {
          const { supabase } = await import('@/integrations/supabase/client');
          await supabase.from('session_participants').upsert({
            session_id: newSessionId,
            user_id: user.id,
            student_ids: useDataStore.getState().selectedStudentIds,
            role: 'lead',
            note_delegate: true,
            note_delegate_assigned_by: user.id,
            note_delegate_assigned_at: new Date().toISOString(),
          }, { onConflict: 'session_id,user_id' });
        }
      }, 50);
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
    // Use forceEndAllSessions to clear both session metadata AND data entries
    forceEndAllSessions();
  };

  const handleEndSession = () => {
    if (selectedStudentIds.length === 0) {
      toast({
        title: 'No students selected',
        description: 'Select students to end their sessions, or use Reset to clear the timer.',
        variant: 'destructive',
      });
      return;
    }

    // If other staff are still actively in the session, show the Leave/End dialog
    if (otherActiveParticipants.length > 0) {
      setShowLeaveOrEnd(true);
    } else {
      setShowEndFlow(true);
    }
  };

  /** Current user leaves the session without ending it for others */
  const handleLeaveSession = async () => {
    // Stamp the leave interval on their participant record
    await leaveSession();
    // Clear local session state for this user only
    setIsPaused(false);
    setPausedAt(null);
    setPausedTime(0);
    setElapsed(0);
    resetSessionData();
    toast({
      title: 'You left the session',
      description: 'Your data collection interval has been recorded. The session continues for other staff.',
    });
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
                {/* Multi-staff indicator */}
                {isMultiStaff && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 gap-1 cursor-default border-primary/40 text-primary">
                        <Users className="w-3 h-3" />
                        {participants.filter(p => !p.left_at).length} staff
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-sm">
                        <p className="font-medium mb-1">Active Collectors:</p>
                        {participants
                          .filter(p => !p.left_at)
                          .map(p => (
                            <div key={p.id} className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                              {p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Staff'}
                              {p.user_id === user?.id ? ' (you)' : ''}
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
            {sessionStartTime && (
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleEndSession}
                className="gap-1"
              >
                <Square className="w-4 h-4" />
                {otherActiveParticipants.length > 0 ? 'Leave / End' : 'End Session'}
              </Button>
            )}
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="ml-4">
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Clear Data</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Session Data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all session data for this session. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep Data</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleReset}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Clear Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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

      {/* Multi-staff note delegation panel - shown when >1 participant */}
      {currentSessionId && isMultiStaff && (
        <NoteDelegationPanel
          sessionId={currentSessionId}
          canAssign={isBcba}
        />
      )}

      {/* Leave vs End dialog for multi-staff sessions */}
      <LeaveOrEndSessionDialog
        open={showLeaveOrEnd}
        onOpenChange={setShowLeaveOrEnd}
        otherParticipants={otherActiveParticipants}
        onLeave={handleLeaveSession}
        onEndForEveryone={() => {
          setShowLeaveOrEnd(false);
          setShowEndFlow(true);
        }}
      />

      <SessionEndFlow
        open={showEndFlow}
        onOpenChange={setShowEndFlow}
        mode="all"
        onComplete={handleEndFlowComplete}
      />
    </>
  );
}
