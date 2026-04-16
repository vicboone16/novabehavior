import { useState, useCallback, useMemo } from 'react';
import { isSameDay } from 'date-fns';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDataStore } from '@/store/dataStore';
import { Behavior } from '@/types/behavior';

interface CompactFrequencyTallyProps {
  studentId: string;
  behavior: Behavior;
  studentColor: string;
}

/**
 * In-grid frequency tally control. Designed to render inside a small BehaviorCard
 * (no absolute positioning, no oversize tap zones). Use MobileFrequencyTally for
 * dedicated full-screen mobile collection.
 */
export function CompactFrequencyTally({ studentId, behavior, studentColor }: CompactFrequencyTallyProps) {
  const { incrementFrequency, decrementFrequency, frequencyEntries } = useDataStore();
  const [pulse, setPulse] = useState(0);

  const entry = useMemo(
    () => frequencyEntries.find((e) => e.studentId === studentId && e.behaviorId === behavior.id),
    [frequencyEntries, studentId, behavior.id]
  );

  const todayCount = useMemo(() => {
    if (!entry) return 0;
    const today = new Date();
    const ts = (entry as any).timestamps as unknown[] | undefined;
    if (Array.isArray(ts) && ts.length > 0) {
      return ts.filter((t) => isSameDay(new Date(t as any), today)).length;
    }
    const entryDate = new Date((entry as any).timestamp);
    return isSameDay(entryDate, today) ? (entry as any).count ?? 0 : 0;
  }, [entry]);

  const handleInc = useCallback(() => {
    if ('vibrate' in navigator) navigator.vibrate(20);
    incrementFrequency(studentId, behavior.id);
    setPulse((p) => p + 1);
  }, [studentId, behavior.id, incrementFrequency]);

  const handleDec = useCallback(() => {
    if (todayCount === 0) return;
    if ('vibrate' in navigator) navigator.vibrate([20, 20]);
    decrementFrequency(studentId, behavior.id);
    setPulse((p) => p + 1);
  }, [todayCount, studentId, behavior.id, decrementFrequency]);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleInc}
        className="relative w-full rounded-md border-2 border-dashed py-4 px-3 flex flex-col items-center justify-center gap-1 hover:bg-muted/40 active:bg-muted/60 transition-colors touch-manipulation select-none"
        style={{ borderColor: `${studentColor}55`, WebkitTapHighlightColor: 'transparent' }}
        aria-label={`Increment ${behavior.name}`}
      >
        <span
          key={pulse}
          className="text-3xl font-bold tabular-nums leading-none animate-in zoom-in-95 duration-150"
          style={{ color: studentColor }}
        >
          {todayCount}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1">
          <Plus className="w-3 h-3" /> Tap to count
        </span>
      </button>

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDec}
          disabled={todayCount === 0}
          className="h-7 px-2"
          aria-label={`Decrement ${behavior.name}`}
        >
          <Minus className="w-3.5 h-3.5" />
        </Button>
        <span className="text-[10px] text-muted-foreground">Today</span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleInc}
          className="h-7 px-2"
          aria-label={`Increment ${behavior.name}`}
        >
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
