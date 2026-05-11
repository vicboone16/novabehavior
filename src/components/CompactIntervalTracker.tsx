import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Check, Settings, Lightbulb, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDataStore } from '@/store/dataStore';
import { Behavior, ScheduleType } from '@/types/behavior';
import { IntervalGrid } from './IntervalGrid';
import { useVariableSchedule } from '@/hooks/useVariableSchedule';
import { useIntervalSmartSuggestion } from '@/hooks/useIntervalSmartSuggestion';
import { cn } from '@/lib/utils';

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

  // VI/VR schedule
  const scheduleType: ScheduleType = sessionConfig.scheduleType ?? 'FI';
  const { generateSchedule, getIntervalLength, getRatioTarget } = useVariableSchedule(
    scheduleType,
    sessionConfig.totalIntervals,
    sessionConfig.viMeanSeconds,
    sessionConfig.vrMeanRatio,
  );

  // VR: count responses accumulated toward next reinforcement
  const [vrResponseCount, setVrResponseCount] = useState(0);
  const [vrReinforceNow, setVrReinforceNow] = useState(false);

  // Smart suggestion (Group D)
  const suggestion = useIntervalSmartSuggestion(studentId, behavior.id, sessionConfig.intervalLength);

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
    // VR: accumulate response count
    if (scheduleType === 'VR') {
      const next = vrResponseCount + 1;
      const target = getRatioTarget(currentInterval);
      if (next >= target) {
        setVrReinforceNow(true);
        setVrResponseCount(0);
      } else {
        setVrResponseCount(next);
      }
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
    setVrResponseCount(0);
    setVrReinforceNow(false);
    generateSchedule();
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
      // VI: each interval uses its own scheduled length; FI uses the configured length
      const currentLength = getIntervalLength(currentInterval, sessionConfig.intervalLength);
      interval = setInterval(() => {
        setTimeInInterval(prev => {
          if (prev + 1 >= currentLength) {
            handleIntervalComplete();
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, awaitingResponse, currentInterval, sessionConfig.intervalLength, handleIntervalComplete, syncedMode, getIntervalLength]);

  const currentIntervalLength = getIntervalLength(effectiveInterval, sessionConfig.intervalLength);
  const progress = (effectiveTime / currentIntervalLength) * 100;
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
              <PopoverContent className="w-56 space-y-3">
                {/* Schedule type */}
                <div className="space-y-1">
                  <Label className="text-xs">Schedule</Label>
                  <Select
                    value={scheduleType}
                    onValueChange={(v) => {
                      updateSessionConfig({ scheduleType: v as ScheduleType });
                      generateSchedule();
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FI" className="text-xs">FI — Fixed Interval</SelectItem>
                      <SelectItem value="VI" className="text-xs">VI — Variable Interval</SelectItem>
                      <SelectItem value="VR" className="text-xs">VR — Variable Ratio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* FI / VI base interval length */}
                {scheduleType !== 'VR' && (
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {scheduleType === 'VI' ? 'Mean interval (sec)' : 'Interval (sec)'}
                    </Label>
                    <Input
                      type="number"
                      value={scheduleType === 'VI'
                        ? (sessionConfig.viMeanSeconds ?? sessionConfig.intervalLength)
                        : sessionConfig.intervalLength}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 10;
                        if (scheduleType === 'VI') {
                          updateSessionConfig({ viMeanSeconds: val, intervalLength: val });
                        } else {
                          updateSessionConfig({ intervalLength: val });
                        }
                        generateSchedule();
                      }}
                      min={5} max={300} className="h-7"
                    />
                  </div>
                )}

                {/* VR mean ratio */}
                {scheduleType === 'VR' && (
                  <div className="space-y-1">
                    <Label className="text-xs">Mean ratio (responses)</Label>
                    <Input
                      type="number"
                      value={sessionConfig.vrMeanRatio ?? 5}
                      onChange={(e) => {
                        updateSessionConfig({ vrMeanRatio: parseInt(e.target.value) || 5 });
                        generateSchedule();
                      }}
                      min={2} max={50} className="h-7"
                    />
                  </div>
                )}

                {/* Total intervals */}
                {scheduleType !== 'VR' && (
                  <div className="space-y-1">
                    <Label className="text-xs">Total intervals</Label>
                    <Input
                      type="number"
                      value={sessionConfig.totalIntervals}
                      onChange={(e) => updateSessionConfig({ totalIntervals: parseInt(e.target.value) || 6 })}
                      min={1} max={60} className="h-7"
                    />
                  </div>
                )}

                {/* Smart suggestion */}
                {suggestion && (
                  <div className={cn(
                    'rounded p-2 text-xs flex gap-1.5 items-start',
                    suggestion.level === 'optimal' ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                  )}>
                    <Lightbulb className="w-3 h-3 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium">{suggestion.message}</div>
                      {suggestion.hint && <div className="opacity-80">{suggestion.hint}</div>}
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* VR reinforcement alert */}
      {vrReinforceNow && (
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold animate-pulse"
          style={{ backgroundColor: `${studentColor}30`, color: studentColor }}
        >
          <Bell className="w-3 h-3" />
          Reinforce now!
          <Button
            size="sm"
            className="h-5 px-2 text-[10px] ml-auto"
            style={{ backgroundColor: studentColor, color: 'white' }}
            onClick={() => setVrReinforceNow(false)}
          >
            Done
          </Button>
        </div>
      )}

      {/* VR response counter */}
      {scheduleType === 'VR' && !vrReinforceNow && (
        <div className="text-[10px] text-muted-foreground">
          Responses toward reinf: <strong>{vrResponseCount}/{getRatioTarget(currentInterval)}</strong>
        </div>
      )}

      {/* Progress bar - minimal */}
      <div className="flex items-center gap-2">
        <Progress value={progress} className="h-1.5 flex-1" />
        <span className="text-[10px] text-muted-foreground text-right">
          {scheduleType !== 'VR' ? `${effectiveInterval + 1}/${sessionConfig.totalIntervals} • ` : ''}{formatTime(effectiveTime)}
          {scheduleType === 'VI' && (
            <span className="ml-1 opacity-60">/{currentIntervalLength}s</span>
          )}
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
        showBulkVoidButton={true}
      />
    </div>
  );
}
