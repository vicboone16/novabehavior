import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Check, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDataStore } from '@/store/dataStore';
import { Behavior } from '@/types/behavior';
import { IntervalGrid } from './IntervalGrid';

interface CompactIntervalTrackerProps {
  studentId: string;
  behavior: Behavior;
  studentColor: string;
  syncedMode?: boolean;
  syncedRunning?: boolean;
  syncedInterval?: number;
  syncedTime?: number;
}

export function CompactIntervalTracker({ 
  studentId, 
  behavior, 
  studentColor,
  syncedMode = false,
  syncedRunning = false,
  syncedInterval = 0,
  syncedTime = 0,
}: CompactIntervalTrackerProps) {
  const { recordInterval, getIntervalData, sessionConfig, updateSessionConfig } = useDataStore();
  
  const [currentInterval, setCurrentInterval] = useState(0);
  const [timeInInterval, setTimeInInterval] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [awaitingResponse, setAwaitingResponse] = useState(false);
  const [markedOccurred, setMarkedOccurred] = useState(false);

  const intervalData = getIntervalData(studentId, behavior.id);
  const completedIntervals = intervalData.filter(e => e.occurred !== undefined).length;
  const occurredCount = intervalData.filter(e => e.occurred).length;

  // Use synced values in synced mode
  const effectiveInterval = syncedMode ? syncedInterval : currentInterval;
  const effectiveTime = syncedMode ? syncedTime : timeInInterval;
  const effectiveRunning = syncedMode ? syncedRunning : isRunning;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleIntervalComplete = useCallback(() => {
    if (syncedMode) {
      recordInterval(studentId, behavior.id, effectiveInterval, markedOccurred);
      setMarkedOccurred(false);
    } else {
      setIsRunning(false);
      setAwaitingResponse(true);
    }
  }, [syncedMode, markedOccurred, recordInterval, studentId, behavior.id, effectiveInterval]);

  const markOccurred = () => {
    setMarkedOccurred(true);
    if (syncedMode) {
      recordInterval(studentId, behavior.id, effectiveInterval, true);
    }
  };

  const recordResponse = (occurred: boolean) => {
    recordInterval(studentId, behavior.id, currentInterval, occurred);
    setAwaitingResponse(false);
    setMarkedOccurred(false);
    
    if (currentInterval < sessionConfig.totalIntervals - 1) {
      setCurrentInterval(prev => prev + 1);
      setTimeInInterval(0);
      setIsRunning(true);
    }
  };

  const reset = () => {
    setIsRunning(false);
    setCurrentInterval(0);
    setTimeInInterval(0);
    setAwaitingResponse(false);
    setMarkedOccurred(false);
  };

  useEffect(() => {
    if (syncedMode && syncedTime === 0 && syncedInterval > 0) {
      const prevInterval = syncedInterval - 1;
      const existing = intervalData.find(e => e.intervalNumber === prevInterval);
      if (!existing) {
        recordInterval(studentId, behavior.id, prevInterval, markedOccurred);
        setMarkedOccurred(false);
      }
    }
  }, [syncedMode, syncedInterval, syncedTime, markedOccurred, intervalData, recordInterval, studentId, behavior.id]);

  useEffect(() => {
    if (syncedMode) return;
    
    let interval: NodeJS.Timeout;
    if (isRunning && !awaitingResponse) {
      interval = setInterval(() => {
        setTimeInInterval(prev => {
          if (prev + 1 >= sessionConfig.intervalLength) {
            handleIntervalComplete();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, awaitingResponse, sessionConfig.intervalLength, handleIntervalComplete, syncedMode]);

  const progress = (effectiveTime / sessionConfig.intervalLength) * 100;
  const isComplete = effectiveInterval >= sessionConfig.totalIntervals;
  const currentIntervalEntry = intervalData.find(e => e.intervalNumber === effectiveInterval);
  const hasCurrentResponse = currentIntervalEntry !== undefined;

  return (
    <div className="bg-secondary/20 rounded-lg p-2 space-y-2">
      {/* Header row - compact */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-xs font-medium text-foreground truncate">{behavior.name}</span>
          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 shrink-0">
            {occurredCount}/{completedIntervals}
          </Badge>
        </div>
        
        {/* Real-time mark button - compact */}
        {effectiveRunning && !awaitingResponse && !isComplete && !hasCurrentResponse && (
          <Button
            size="sm"
            className={`h-6 px-2 text-xs ${markedOccurred ? 'ring-1 ring-offset-1' : ''}`}
            style={{ 
              backgroundColor: markedOccurred ? studentColor : `${studentColor}30`,
              color: markedOccurred ? 'white' : studentColor,
            }}
            onClick={markOccurred}
          >
            <Check className="w-3 h-3 mr-1" />
            {markedOccurred ? '✓' : 'Mark'}
          </Button>
        )}
        
        {!syncedMode && (
          <div className="flex gap-1 shrink-0">
            <Button
              size="sm"
              className="h-6 w-6 p-0"
              variant={isRunning ? "default" : "outline"}
              style={isRunning ? { backgroundColor: studentColor } : { borderColor: studentColor, color: studentColor }}
              onClick={() => setIsRunning(!isRunning)}
              disabled={isComplete || awaitingResponse}
            >
              {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            </Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={reset}>
              <RotateCcw className="w-3 h-3" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Settings className="w-3 h-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48">
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Interval (sec)</Label>
                    <Input
                      type="number"
                      value={sessionConfig.intervalLength}
                      onChange={(e) => updateSessionConfig({ intervalLength: parseInt(e.target.value) || 10 })}
                      min={5}
                      max={300}
                      className="h-7"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Total</Label>
                    <Input
                      type="number"
                      value={sessionConfig.totalIntervals}
                      onChange={(e) => updateSessionConfig({ totalIntervals: parseInt(e.target.value) || 6 })}
                      min={1}
                      max={60}
                      className="h-7"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* Progress bar - minimal */}
      <div className="flex items-center gap-2">
        <Progress value={progress} className="h-1.5 flex-1" />
        <span className="text-[10px] text-muted-foreground w-16 text-right">
          {effectiveInterval + 1}/{sessionConfig.totalIntervals} • {formatTime(effectiveTime)}
        </span>
      </div>

      {/* Response prompt for non-synced mode */}
      {awaitingResponse && !syncedMode && (
        <div 
          className="p-2 rounded text-center space-y-1 animate-pulse"
          style={{ backgroundColor: `${studentColor}20`, border: `1px solid ${studentColor}` }}
        >
          <p className="text-xs font-medium">Did behavior occur?</p>
          <div className="flex gap-2 justify-center">
            <Button
              size="sm"
              className="h-6 px-3 text-xs"
              style={{ backgroundColor: studentColor }}
              onClick={() => recordResponse(true)}
            >
              Yes
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-3 text-xs"
              onClick={() => recordResponse(false)}
            >
              No
            </Button>
          </div>
        </div>
      )}

      {/* Interval Grid - clickable for corrections */}
      <IntervalGrid
        studentId={studentId}
        behaviorId={behavior.id}
        studentColor={studentColor}
        totalIntervals={sessionConfig.totalIntervals}
        currentInterval={effectiveInterval}
        isRunning={effectiveRunning}
      />
    </div>
  );
}
