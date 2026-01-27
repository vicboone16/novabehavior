import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings, Link, Volume2, VolumeX, Bell, UserPlus, UserMinus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDataStore } from '@/store/dataStore';
import { toast } from 'sonner';

// Audio context for beep sound
let audioContext: AudioContext | null = null;

const playBeep = (frequency: number = 800, duration: number = 200) => {
  try {
    if (!audioContext) {
      audioContext = new AudioContext();
    }
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
  } catch (e) {
    console.log('Audio playback failed:', e);
  }
};

export function SyncedIntervalController() {
  const { 
    students, 
    selectedStudentIds, 
    sessionConfig, 
    updateSessionConfig,
    syncedIntervalsRunning,
    setSyncedIntervalsRunning,
    addStudentLate,
    markStudentDeparted,
    getStudentIntervalStatus,
    resetStudentIntervalStatus,
    voidIntervalsForLateArrival,
    voidIntervalsForEarlyDeparture,
    studentIntervalStatus,
  } = useDataStore();

  const [currentInterval, setCurrentInterval] = useState(0);
  const [timeInInterval, setTimeInInterval] = useState(0);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showLateArrival, setShowLateArrival] = useState(false);
  const [showDeparture, setShowDeparture] = useState(false);
  const prevIntervalRef = useRef(currentInterval);

  const selectedStudents = students.filter(s => selectedStudentIds.includes(s.id));
  const intervalBehaviors = selectedStudents.flatMap(s => 
    s.behaviors.filter(b => (b.methods || [b.type]).includes('interval'))
  );

  // Students with interval behaviors
  const studentsWithIntervals = selectedStudents.filter(s => 
    s.behaviors.some(b => (b.methods || [b.type]).includes('interval'))
  );

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const start = useCallback(() => {
    setSyncedIntervalsRunning(true);
  }, [setSyncedIntervalsRunning]);

  const pause = useCallback(() => {
    setSyncedIntervalsRunning(false);
  }, [setSyncedIntervalsRunning]);

  const reset = useCallback(() => {
    setSyncedIntervalsRunning(false);
    setCurrentInterval(0);
    setTimeInInterval(0);
    prevIntervalRef.current = 0;
  }, [setSyncedIntervalsRunning]);

  const handleAddStudentLate = (studentId: string) => {
    const nextInterval = currentInterval + (syncedIntervalsRunning ? 1 : 0);
    addStudentLate(studentId, nextInterval);
    voidIntervalsForLateArrival(studentId, nextInterval);
    toast.success(`Student will join at interval ${nextInterval + 1}`, {
      description: `Previous ${nextInterval} intervals marked as N/A`,
    });
    setShowLateArrival(false);
  };

  const handleMarkDeparted = (studentId: string) => {
    const departInterval = currentInterval;
    markStudentDeparted(studentId, departInterval);
    voidIntervalsForEarlyDeparture(studentId, departInterval, sessionConfig.totalIntervals);
    toast.info(`Student marked as departed`, {
      description: `Remaining intervals marked as N/A`,
    });
    setShowDeparture(false);
  };

  const handleResetStudentStatus = (studentId: string) => {
    resetStudentIntervalStatus(studentId);
    toast.info('Student interval status reset');
  };

  // Handle interval end alerts
  useEffect(() => {
    if (currentInterval !== prevIntervalRef.current && currentInterval > 0) {
      if (alertsEnabled) {
        toast.info(`Interval ${currentInterval} complete`, {
          description: `Starting interval ${currentInterval + 1} of ${sessionConfig.totalIntervals}`,
          duration: 2000,
        });
      }
      if (soundEnabled) {
        playBeep(800, 150);
        setTimeout(() => playBeep(1000, 150), 200);
      }
      prevIntervalRef.current = currentInterval;
    }
  }, [currentInterval, alertsEnabled, soundEnabled, sessionConfig.totalIntervals]);

  // Handle session complete
  useEffect(() => {
    if (currentInterval >= sessionConfig.totalIntervals && prevIntervalRef.current < sessionConfig.totalIntervals) {
      if (alertsEnabled) {
        toast.success('All intervals complete!', {
          description: 'Session interval recording finished.',
          duration: 4000,
        });
      }
      if (soundEnabled) {
        playBeep(600, 100);
        setTimeout(() => playBeep(800, 100), 150);
        setTimeout(() => playBeep(1000, 200), 300);
      }
      prevIntervalRef.current = currentInterval;
    }
  }, [currentInterval, sessionConfig.totalIntervals, alertsEnabled, soundEnabled]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (syncedIntervalsRunning) {
      interval = setInterval(() => {
        setTimeInInterval(prev => {
          if (prev + 1 >= sessionConfig.intervalLength) {
            setCurrentInterval(prevInterval => {
              if (prevInterval + 1 >= sessionConfig.totalIntervals) {
                setSyncedIntervalsRunning(false);
                return prevInterval + 1;
              }
              return prevInterval + 1;
            });
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [syncedIntervalsRunning, sessionConfig.intervalLength, sessionConfig.totalIntervals, setSyncedIntervalsRunning]);

  const progress = (timeInInterval / sessionConfig.intervalLength) * 100;
  const totalProgress = ((currentInterval * sessionConfig.intervalLength + timeInInterval) / (sessionConfig.totalIntervals * sessionConfig.intervalLength)) * 100;
  const isComplete = currentInterval >= sessionConfig.totalIntervals;

  if (intervalBehaviors.length === 0) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Link className="w-4 h-4 text-primary" />
            Synced Interval Recording
          </CardTitle>
          <div className="flex gap-1">
            {/* Late Arrival Dialog */}
            <Dialog open={showLateArrival} onOpenChange={setShowLateArrival}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Add student late">
                  <UserPlus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    Add Student Late
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Select students arriving late. Intervals 1-{currentInterval + (syncedIntervalsRunning ? 1 : 0)} will be marked as N/A (not counted).
                  </p>
                  <ScrollArea className="max-h-[200px]">
                    <div className="space-y-2">
                      {studentsWithIntervals.map(student => {
                        const status = getStudentIntervalStatus(student.id);
                        const hasJoined = status?.joinedAtInterval !== undefined;
                        
                        return (
                          <div 
                            key={student.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-secondary/30"
                          >
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: student.color }}
                              />
                              <span className="text-sm font-medium">{student.name}</span>
                              {hasJoined && (
                                <Badge variant="outline" className="text-xs">
                                  Joined at #{status.joinedAtInterval! + 1}
                                </Badge>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant={hasJoined ? "outline" : "default"}
                              className="h-7"
                              onClick={() => hasJoined 
                                ? handleResetStudentStatus(student.id) 
                                : handleAddStudentLate(student.id)
                              }
                            >
                              {hasJoined ? 'Reset' : 'Add Late'}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>

            {/* Early Departure Dialog */}
            <Dialog open={showDeparture} onOpenChange={setShowDeparture}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Mark student departed">
                  <UserMinus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <UserMinus className="w-5 h-5" />
                    Mark Student Departed
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Select students leaving early. Intervals {currentInterval + 1}-{sessionConfig.totalIntervals} will be marked as N/A.
                  </p>
                  <ScrollArea className="max-h-[200px]">
                    <div className="space-y-2">
                      {studentsWithIntervals.map(student => {
                        const status = getStudentIntervalStatus(student.id);
                        const hasDeparted = status?.departedAtInterval !== undefined;
                        
                        return (
                          <div 
                            key={student.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-secondary/30"
                          >
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: student.color }}
                              />
                              <span className="text-sm font-medium">{student.name}</span>
                              {hasDeparted && (
                                <Badge variant="outline" className="text-xs text-destructive">
                                  Left at #{status.departedAtInterval! + 1}
                                </Badge>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant={hasDeparted ? "outline" : "destructive"}
                              className="h-7"
                              onClick={() => hasDeparted 
                                ? handleResetStudentStatus(student.id) 
                                : handleMarkDeparted(student.id)
                              }
                            >
                              {hasDeparted ? 'Undo' : 'Mark Left'}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Settings className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Interval Length (seconds)</Label>
                    <Input
                      type="number"
                      value={sessionConfig.intervalLength}
                      onChange={(e) => updateSessionConfig({ intervalLength: parseInt(e.target.value) || 10 })}
                      min={5}
                      max={300}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Total Intervals</Label>
                    <Input
                      type="number"
                      value={sessionConfig.totalIntervals}
                      onChange={(e) => updateSessionConfig({ totalIntervals: parseInt(e.target.value) || 6 })}
                      min={1}
                      max={60}
                    />
                  </div>
                  
                  {/* Alert Settings */}
                  <div className="border-t pt-3 space-y-2">
                    <Label className="text-xs font-medium">Alerts</Label>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-3 h-3" />
                        <span className="text-xs">Visual alerts</span>
                      </div>
                      <Switch
                        checked={alertsEnabled}
                        onCheckedChange={setAlertsEnabled}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                        <span className="text-xs">Sound alerts</span>
                      </div>
                      <Switch
                        checked={soundEnabled}
                        onCheckedChange={setSoundEnabled}
                      />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Start all interval trackers simultaneously across {intervalBehaviors.length} behavior(s)
        </p>

        {/* Student Status Summary */}
        {studentIntervalStatus.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {studentIntervalStatus.map(status => {
              const student = students.find(s => s.id === status.studentId);
              if (!student) return null;
              return (
                <Badge 
                  key={status.studentId}
                  variant="outline" 
                  className="text-xs"
                  style={{ borderColor: student.color, color: student.color }}
                >
                  {student.name}: 
                  {status.joinedAtInterval !== undefined && status.joinedAtInterval > 0 && 
                    ` Late (${status.joinedAtInterval})`}
                  {status.departedAtInterval !== undefined && 
                    ` Left (${status.departedAtInterval})`}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Timer Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Interval {currentInterval + 1} of {sessionConfig.totalIntervals}</span>
            <span className="font-mono text-lg">{formatTime(timeInInterval)}</span>
          </div>
          <Progress value={progress} className="h-3" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total Progress</span>
            <span>{Math.round(totalProgress)}%</span>
          </div>
          <Progress value={totalProgress} className="h-1" />
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button
            className="flex-1"
            variant={syncedIntervalsRunning ? "default" : "outline"}
            onClick={syncedIntervalsRunning ? pause : start}
            disabled={isComplete}
          >
            {syncedIntervalsRunning ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Pause All
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start All
              </>
            )}
          </Button>
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {isComplete && (
          <Badge variant="secondary" className="w-full justify-center py-2">
            All intervals complete
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

// Export state for child components
export function useSyncedIntervalState() {
  const { syncedIntervalsRunning, sessionConfig } = useDataStore();
  const [currentInterval, setCurrentInterval] = useState(0);
  const [timeInInterval, setTimeInInterval] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (syncedIntervalsRunning) {
      interval = setInterval(() => {
        setTimeInInterval(prev => {
          if (prev + 1 >= sessionConfig.intervalLength) {
            setCurrentInterval(prevInterval => {
              if (prevInterval + 1 >= sessionConfig.totalIntervals) {
                return prevInterval;
              }
              return prevInterval + 1;
            });
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [syncedIntervalsRunning, sessionConfig.intervalLength, sessionConfig.totalIntervals]);

  // Reset when not running
  useEffect(() => {
    if (!syncedIntervalsRunning) {
      // Keep the current state, don't reset
    }
  }, [syncedIntervalsRunning]);

  return {
    syncedRunning: syncedIntervalsRunning,
    syncedInterval: currentInterval,
    syncedTime: timeInInterval,
    reset: () => {
      setCurrentInterval(0);
      setTimeInInterval(0);
    }
  };
}
