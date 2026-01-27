import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Check, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDataStore } from '@/store/dataStore';
import { Behavior } from '@/types/behavior';

interface IntervalTrackerProps {
  studentId: string;
  behavior: Behavior;
  studentColor: string;
}

export function IntervalTracker({ studentId, behavior, studentColor }: IntervalTrackerProps) {
  const { recordInterval, getIntervalData, sessionConfig, updateSessionConfig } = useDataStore();
  
  const [currentInterval, setCurrentInterval] = useState(0);
  const [timeInInterval, setTimeInInterval] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [awaitingResponse, setAwaitingResponse] = useState(false);

  const intervalData = getIntervalData(studentId, behavior.id);
  const completedIntervals = intervalData.filter(e => e.occurred !== undefined).length;
  const occurredCount = intervalData.filter(e => e.occurred).length;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleIntervalComplete = useCallback(() => {
    setIsRunning(false);
    setAwaitingResponse(true);
  }, []);

  const recordResponse = (occurred: boolean) => {
    recordInterval(studentId, behavior.id, currentInterval, occurred);
    setAwaitingResponse(false);
    
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
  };

  useEffect(() => {
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
  }, [isRunning, awaitingResponse, sessionConfig.intervalLength, handleIntervalComplete]);

  const progress = (timeInInterval / sessionConfig.intervalLength) * 100;
  const isComplete = currentInterval >= sessionConfig.totalIntervals;

  return (
    <div className="bg-secondary/30 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{behavior.name}</span>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {occurredCount}/{completedIntervals} intervals
          </Badge>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Settings className="w-3 h-3" />
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
      </div>

      {/* Timer Display */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Interval {currentInterval + 1} of {sessionConfig.totalIntervals}</span>
          <span>{formatTime(timeInInterval)} / {formatTime(sessionConfig.intervalLength)}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Response Prompt */}
      {awaitingResponse && (
        <div 
          className="p-4 rounded-lg text-center space-y-3 animate-pulse"
          style={{ backgroundColor: `${studentColor}20`, border: `2px solid ${studentColor}` }}
        >
          <p className="font-semibold text-foreground">Did the behavior occur?</p>
          <div className="flex gap-2 justify-center">
            <Button
              size="lg"
              className="flex-1 max-w-24"
              style={{ backgroundColor: studentColor }}
              onClick={() => recordResponse(true)}
            >
              <Check className="w-5 h-5 mr-1" />
              Yes
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1 max-w-24"
              onClick={() => recordResponse(false)}
            >
              <X className="w-5 h-5 mr-1" />
              No
            </Button>
          </div>
        </div>
      )}

      {/* Controls */}
      {!awaitingResponse && (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            style={{ 
              backgroundColor: isRunning ? studentColor : 'transparent',
              color: isRunning ? 'white' : studentColor,
              border: `2px solid ${studentColor}`
            }}
            onClick={() => setIsRunning(!isRunning)}
            disabled={isComplete}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 mr-1" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-1" />
                {currentInterval === 0 ? 'Start' : 'Resume'}
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={reset}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Interval Grid */}
      <div className="flex flex-wrap gap-1 pt-2">
        {Array.from({ length: sessionConfig.totalIntervals }).map((_, i) => {
          const entry = intervalData.find(e => e.intervalNumber === i);
          return (
            <div
              key={i}
              className={`
                w-6 h-6 rounded text-xs flex items-center justify-center font-medium
                ${i === currentInterval && isRunning ? 'ring-2 ring-primary ring-offset-1' : ''}
                ${entry?.occurred === true ? 'bg-success text-success-foreground' : ''}
                ${entry?.occurred === false ? 'bg-destructive/30 text-destructive' : ''}
                ${entry === undefined ? 'bg-muted text-muted-foreground' : ''}
              `}
            >
              {i + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
}
