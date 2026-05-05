import { useState, useEffect, useCallback } from 'react';
import { Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDataStore } from '@/store/dataStore';
import { Behavior } from '@/types/behavior';

interface CompactDurationTrackerProps {
  studentId: string;
  behavior: Behavior;
  studentColor: string;
}

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function fmtTotal(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/** In-grid duration tracker for BehaviorCard. */
export function CompactDurationTracker({ studentId, behavior, studentColor }: CompactDurationTrackerProps) {
  const { startDuration, stopDuration, getActiveDuration, durationEntries } = useDataStore();
  const [elapsed, setElapsed] = useState(0);

  const active = getActiveDuration(studentId, behavior.id);
  const isRunning = !!active;

  const todayEntries = durationEntries.filter(
    (e) =>
      e.studentId === studentId &&
      e.behaviorId === behavior.id &&
      e.endTime &&
      new Date(e.startTime).toDateString() === new Date().toDateString()
  );
  const totalSec = todayEntries.reduce((sum, e) => {
    if (e.endTime) {
      return sum + Math.floor((new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / 1000);
    }
    return sum;
  }, 0);

  useEffect(() => {
    if (!isRunning || !active) {
      setElapsed(0);
      return;
    }
    const update = () => {
      const start = new Date(active.startTime).getTime();
      setElapsed(Math.floor((Date.now() - start) / 1000));
    };
    update();
    const id = setInterval(update, 250);
    return () => clearInterval(id);
  }, [isRunning, active]);

  const toggle = useCallback(() => {
    if ('vibrate' in navigator) navigator.vibrate(isRunning ? [20, 20] : 30);
    if (isRunning) stopDuration(studentId, behavior.id);
    else startDuration(studentId, behavior.id);
  }, [isRunning, studentId, behavior.id, startDuration, stopDuration]);

  return (
    <div className="flex flex-col gap-2">
      <div
        className="rounded-md border-2 border-dashed py-3 px-3 flex flex-col items-center justify-center"
        style={{ borderColor: `${studentColor}55` }}
      >
        <span
          className="text-2xl font-mono font-bold tabular-nums leading-none"
          style={{ color: isRunning ? studentColor : 'hsl(var(--foreground))' }}
        >
          {fmt(elapsed)}
        </span>
        <span className="text-[10px] text-muted-foreground mt-1">
          Today: {fmtTotal(totalSec)} · {todayEntries.length} ep
        </span>
      </div>

      <Button
        size="sm"
        onClick={toggle}
        variant={isRunning ? 'destructive' : 'default'}
        style={!isRunning ? { backgroundColor: studentColor } : undefined}
        className="w-full h-8 gap-1.5 text-xs"
      >
        {isRunning ? (
          <>
            <Square className="w-3.5 h-3.5" /> Stop
          </>
        ) : (
          <>
            <Play className="w-3.5 h-3.5" /> Start
          </>
        )}
      </Button>
    </div>
  );
}
