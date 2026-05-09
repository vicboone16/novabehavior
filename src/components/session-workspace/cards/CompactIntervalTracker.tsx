import { useState, useEffect, useCallback } from 'react';
import { Check, X, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useDataStore } from '@/store/dataStore';
import { Behavior } from '@/types/behavior';
import { cn } from '@/lib/utils';

interface CompactIntervalTrackerProps {
  studentId: string;
  behavior: Behavior;
  studentColor: string;
}

/** In-grid interval tracker for BehaviorCard. */
export function CompactIntervalTracker({ studentId, behavior, studentColor }: CompactIntervalTrackerProps) {
  const { sessionConfig, recordInterval, getIntervalData } = useDataStore();
  const [currentInterval, setCurrentInterval] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);

  const intervalData = getIntervalData(studentId, behavior.id);
  const intervalLength = sessionConfig.intervalLength;
  const totalIntervals = sessionConfig.totalIntervals;

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 0.1;
        if (next >= intervalLength) {
          if (!hasRecorded) {
            recordInterval(studentId, behavior.id, currentInterval, false);
          }
          if (currentInterval < totalIntervals) {
            setCurrentInterval((c) => c + 1);
            setHasRecorded(false);
            return 0;
          }
          setIsRunning(false);
          return intervalLength;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [isRunning, currentInterval, totalIntervals, intervalLength, hasRecorded, studentId, behavior.id, recordInterval]);

  const start = useCallback(() => {
    setIsRunning(true);
    setElapsed(0);
    setCurrentInterval(1);
    setHasRecorded(false);
  }, []);

  const occurred = useCallback(() => {
    if (hasRecorded) return;
    recordInterval(studentId, behavior.id, currentInterval, true);
    setHasRecorded(true);
  }, [hasRecorded, studentId, behavior.id, currentInterval, recordInterval]);

  const notOccurred = useCallback(() => {
    if (hasRecorded) return;
    recordInterval(studentId, behavior.id, currentInterval, false);
    setHasRecorded(true);
  }, [hasRecorded, studentId, behavior.id, currentInterval, recordInterval]);

  const skip = useCallback(() => {
    if (!hasRecorded) recordInterval(studentId, behavior.id, currentInterval, false);
    if (currentInterval < totalIntervals) {
      setCurrentInterval((c) => c + 1);
      setElapsed(0);
      setHasRecorded(false);
    } else {
      setIsRunning(false);
    }
  }, [hasRecorded, currentInterval, totalIntervals, studentId, behavior.id, recordInterval]);

  const pct = (elapsed / intervalLength) * 100;
  const getResult = (n: number) => intervalData.find((e) => e.intervalNumber === n)?.occurred ?? null;

  if (!isRunning) {
    return (
      <div className="flex flex-col gap-2">
        <div
          className="rounded-md border-2 border-dashed py-3 px-3 text-center"
          style={{ borderColor: `${studentColor}55` }}
        >
          <p className="text-xs text-muted-foreground">
            {totalIntervals} intervals · {intervalLength}s each
          </p>
        </div>
        <Button
          size="sm"
          onClick={start}
          style={{ backgroundColor: studentColor }}
          className="w-full h-8 text-xs"
        >
          Start Intervals
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>
          Interval {currentInterval}/{totalIntervals}
        </span>
        <span className="tabular-nums">
          {Math.floor(elapsed)}s / {intervalLength}s
        </span>
      </div>
      <Progress value={pct} className="h-1.5" />

      <div className="grid grid-cols-2 gap-1.5">
        <Button
          size="sm"
          onClick={occurred}
          disabled={hasRecorded}
          style={!hasRecorded ? { backgroundColor: studentColor } : undefined}
          className="h-8 text-xs gap-1"
        >
          <Check className="w-3.5 h-3.5" /> Yes
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={notOccurred}
          disabled={hasRecorded}
          className="h-8 text-xs gap-1"
        >
          <X className="w-3.5 h-3.5" /> No
        </Button>
      </div>

      <Button size="sm" variant="ghost" onClick={skip} className="h-6 text-[10px] gap-1">
        <SkipForward className="w-3 h-3" /> Skip
      </Button>

      <div className="flex flex-wrap gap-0.5">
        {Array.from({ length: totalIntervals }, (_, i) => {
          const n = i + 1;
          const r = getResult(n);
          const isCur = n === currentInterval;
          return (
            <div
              key={n}
              className={cn(
                'w-3.5 h-3.5 rounded-sm border flex items-center justify-center',
                isCur && 'ring-1 ring-offset-1',
                r === true && 'bg-primary border-primary',
                r === false && 'bg-muted border-muted-foreground/30',
                r === null && 'border-border'
              )}
              style={isCur ? ({ '--tw-ring-color': studentColor } as React.CSSProperties) : undefined}
              title={`Interval ${n}: ${r === true ? 'Yes' : r === false ? 'No' : 'pending'}`}
            />
          );
        })}
      </div>
    </div>
  );
}
