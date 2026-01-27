import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Settings, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDataStore } from '@/store/dataStore';

export function SyncedIntervalController() {
  const { 
    students, 
    selectedStudentIds, 
    sessionConfig, 
    updateSessionConfig,
    syncedIntervalsRunning,
    setSyncedIntervalsRunning,
  } = useDataStore();

  const [currentInterval, setCurrentInterval] = useState(0);
  const [timeInInterval, setTimeInInterval] = useState(0);

  const selectedStudents = students.filter(s => selectedStudentIds.includes(s.id));
  const intervalBehaviors = selectedStudents.flatMap(s => 
    s.behaviors.filter(b => (b.methods || [b.type]).includes('interval'))
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
  }, [setSyncedIntervalsRunning]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (syncedIntervalsRunning) {
      interval = setInterval(() => {
        setTimeInInterval(prev => {
          if (prev + 1 >= sessionConfig.intervalLength) {
            setCurrentInterval(prevInterval => {
              if (prevInterval + 1 >= sessionConfig.totalIntervals) {
                setSyncedIntervalsRunning(false);
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
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Start all interval trackers simultaneously across {intervalBehaviors.length} behavior(s)
        </p>

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
