import { useState, useEffect, useCallback } from 'react';
import { Check, X, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useDataStore } from '@/store/dataStore';
import { Behavior } from '@/types/behavior';
import { cn } from '@/lib/utils';

interface MobileIntervalTrackerProps {
  studentId: string;
  behavior: Behavior;
  studentColor: string;
}

export function MobileIntervalTracker({ studentId, behavior, studentColor }: MobileIntervalTrackerProps) {
  const { sessionConfig, recordInterval, getIntervalData } = useDataStore();
  const [currentInterval, setCurrentInterval] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);

  const intervalData = getIntervalData(studentId, behavior.id);
  const intervalLengthSeconds = sessionConfig.intervalLength;
  const totalIntervals = sessionConfig.totalIntervals;

  // Timer effect
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setElapsed(prev => {
        const newElapsed = prev + 0.1;
        if (newElapsed >= intervalLengthSeconds) {
          // Interval complete - auto-record as not occurred if not already recorded
          if (!hasRecorded) {
            recordInterval(studentId, behavior.id, currentInterval, false);
          }
          
          // Move to next interval
          if (currentInterval < totalIntervals) {
            setCurrentInterval(curr => curr + 1);
            setHasRecorded(false);
            return 0;
          } else {
            // Session complete
            setIsRunning(false);
            return intervalLengthSeconds;
          }
        }
        return newElapsed;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, currentInterval, totalIntervals, intervalLengthSeconds, hasRecorded, studentId, behavior.id, recordInterval]);

  const handleStart = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    setIsRunning(true);
    setElapsed(0);
    setCurrentInterval(1);
    setHasRecorded(false);
  }, []);

  const handleOccurred = useCallback(() => {
    if (hasRecorded) return;
    
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    recordInterval(studentId, behavior.id, currentInterval, true);
    setHasRecorded(true);
  }, [hasRecorded, studentId, behavior.id, currentInterval, recordInterval]);

  const handleNotOccurred = useCallback(() => {
    if (hasRecorded) return;
    
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 50]);
    }
    recordInterval(studentId, behavior.id, currentInterval, false);
    setHasRecorded(true);
  }, [hasRecorded, studentId, behavior.id, currentInterval, recordInterval]);

  const handleSkipToNext = useCallback(() => {
    if (!hasRecorded) {
      recordInterval(studentId, behavior.id, currentInterval, false);
    }
    
    if (currentInterval < totalIntervals) {
      setCurrentInterval(curr => curr + 1);
      setElapsed(0);
      setHasRecorded(false);
    } else {
      setIsRunning(false);
    }
  }, [hasRecorded, currentInterval, totalIntervals, studentId, behavior.id, recordInterval]);

  const progressPercent = (elapsed / intervalLengthSeconds) * 100;

  // Build interval grid
  const getIntervalResult = (intervalNum: number) => {
    const entry = intervalData.find(e => e.intervalNumber === intervalNum);
    if (!entry) return null;
    return entry.occurred;
  };

  return (
    <div className="flex-1 flex flex-col p-4">
      {/* Header */}
      <div className="text-center mb-4">
        <p className="text-sm text-muted-foreground">{behavior.name}</p>
        <p className="text-lg font-semibold">
          Interval {currentInterval} of {totalIntervals}
        </p>
      </div>

      {!isRunning ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <Button
            onClick={handleStart}
            size="lg"
            className="w-full max-w-xs h-16 text-xl font-semibold"
            style={{ backgroundColor: studentColor }}
          >
            Start Intervals
          </Button>
        </div>
      ) : (
        <>
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-1">
              <span>{Math.floor(elapsed)}s</span>
              <span>{intervalLengthSeconds}s</span>
            </div>
            <Progress 
              value={progressPercent} 
              className="h-4"
              style={{ '--progress-color': studentColor } as React.CSSProperties}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex-1 flex flex-col gap-4 items-center justify-center">
            <Button
              onClick={handleOccurred}
              size="lg"
              className={cn(
                "w-full max-w-xs h-20 text-xl font-semibold gap-3",
                hasRecorded && "opacity-50"
              )}
              disabled={hasRecorded}
              style={{ backgroundColor: studentColor }}
            >
              <Check className="w-8 h-8" />
              OCCURRED
            </Button>

            <Button
              onClick={handleNotOccurred}
              size="lg"
              variant="outline"
              className={cn(
                "w-full max-w-xs h-16 text-lg font-semibold gap-3",
                hasRecorded && "opacity-50"
              )}
              disabled={hasRecorded}
            >
              <X className="w-6 h-6" />
              DID NOT OCCUR
            </Button>

            <Button
              onClick={handleSkipToNext}
              size="sm"
              variant="ghost"
              className="gap-2"
            >
              <SkipForward className="w-4 h-4" />
              Skip to next interval
            </Button>
          </div>

          {/* Interval Grid */}
          <div className="mt-4 mb-16">
            <div className="flex flex-wrap gap-2 justify-center">
              {Array.from({ length: totalIntervals }, (_, i) => {
                const intervalNum = i + 1;
                const result = getIntervalResult(intervalNum);
                const isCurrent = intervalNum === currentInterval;
                
                return (
                  <div
                    key={intervalNum}
                    className={cn(
                      "w-8 h-8 rounded-md border-2 flex items-center justify-center text-xs font-medium",
                      isCurrent && "ring-2 ring-offset-2",
                      result === true && "bg-primary text-primary-foreground border-primary",
                      result === false && "bg-muted text-muted-foreground border-muted",
                      result === null && "border-border"
                    )}
                    style={isCurrent ? { '--tw-ring-color': studentColor } as React.CSSProperties : undefined}
                  >
                    {result === true && <Check className="w-4 h-4" />}
                    {result === false && <X className="w-4 h-4" />}
                    {result === null && intervalNum}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
