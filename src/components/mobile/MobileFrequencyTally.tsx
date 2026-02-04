import { useState, useCallback, useMemo } from 'react';
import { isSameDay } from 'date-fns';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDataStore } from '@/store/dataStore';
import { Behavior } from '@/types/behavior';

interface MobileFrequencyTallyProps {
  studentId: string;
  behavior: Behavior;
  studentColor: string;
}

export function MobileFrequencyTally({ studentId, behavior, studentColor }: MobileFrequencyTallyProps) {
  const { incrementFrequency, decrementFrequency, frequencyEntries } = useDataStore();
  const [pulseKey, setPulseKey] = useState(0);

  const entry = useMemo(
    () => frequencyEntries.find((e) => e.studentId === studentId && e.behaviorId === behavior.id),
    [frequencyEntries, studentId, behavior.id]
  );

  // Count for this behavior today.
  // NOTE: frequencyEntries store a single row per (studentId, behaviorId) with an aggregated `count`.
  // Using `.filter(...).length` would get stuck at 1 once an entry exists.
  const todayCount = useMemo(() => {
    if (!entry) return 0;
    const today = new Date();

    // Prefer per-occurrence timestamps when present (supports partial-day / historical entries).
    const ts = (entry as any).timestamps as unknown[] | undefined;
    if (Array.isArray(ts) && ts.length > 0) {
      return ts.filter((t) => isSameDay(new Date(t as any), today)).length;
    }

    // Fall back to aggregated count if the entry itself is on today's date.
    const entryDate = new Date((entry as any).timestamp);
    return isSameDay(entryDate, today) ? (entry as any).count ?? 0 : 0;
  }, [entry]);

  const handleIncrement = useCallback(() => {
    // Haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
    incrementFrequency(studentId, behavior.id);
    setPulseKey(prev => prev + 1);
  }, [studentId, behavior.id, incrementFrequency]);

  const handleDecrement = useCallback(() => {
    if (todayCount > 0) {
      // Haptic feedback - double pulse for decrement
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }
      decrementFrequency(studentId, behavior.id);
      setPulseKey(prev => prev + 1);
    }
  }, [todayCount, studentId, behavior.id, decrementFrequency]);

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden">
      {/* Count Display */}
      <div className="absolute top-4 left-0 right-0 text-center pointer-events-none z-10">
        <span 
          key={pulseKey}
          className="text-7xl font-bold tabular-nums animate-in zoom-in-95 duration-150"
          style={{ color: studentColor }}
        >
          {todayCount}
        </span>
        <p className="text-muted-foreground mt-1">{behavior.name}</p>
      </div>

      {/* Giant Tap Zone for +1 */}
      <button
        onClick={handleIncrement}
        className="flex-1 w-full min-h-[40vh] flex items-center justify-center active:bg-primary/10 transition-colors touch-manipulation select-none"
        style={{ WebkitTapHighlightColor: 'transparent' }}
        aria-label={`Increment ${behavior.name}`}
      >
        <div 
          key={pulseKey}
          className="w-32 h-32 rounded-full border-4 flex items-center justify-center animate-in zoom-in-95 duration-100"
          style={{ 
            borderColor: studentColor,
            backgroundColor: `${studentColor}20`,
          }}
        >
          <Plus className="w-16 h-16" style={{ color: studentColor }} />
        </div>
      </button>

      {/* Large Decrement Button - Bottom Left */}
      <div className="absolute bottom-20 left-4">
        <Button
          variant="outline"
          size="lg"
          onClick={handleDecrement}
          className="w-20 h-20 rounded-full shadow-lg text-2xl font-bold"
          disabled={todayCount === 0}
        >
          <Minus className="w-10 h-10" />
        </Button>
      </div>

      {/* Session Info */}
      <div className="absolute bottom-20 right-4">
        <div className="bg-card border rounded-lg px-3 py-2 shadow-sm">
          <p className="text-xs text-muted-foreground">Tap anywhere +1</p>
        </div>
      </div>
    </div>
  );
}
