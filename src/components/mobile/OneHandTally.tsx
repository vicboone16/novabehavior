import { useState, useCallback } from 'react';
import { Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDataStore } from '@/store/dataStore';
import { Behavior } from '@/types/behavior';

interface OneHandTallyProps {
  studentId: string;
  behavior: Behavior;
  studentColor: string;
}

export function OneHandTally({ studentId, behavior, studentColor }: OneHandTallyProps) {
  const { incrementFrequency, decrementFrequency, frequencyEntries } = useDataStore();
  const [pulseKey, setPulseKey] = useState(0);

  // Count for this behavior today
  const todayCount = frequencyEntries.filter(e => 
    e.studentId === studentId && 
    e.behaviorId === behavior.id &&
    new Date(e.timestamp).toDateString() === new Date().toDateString()
  ).length;

  const handleTap = useCallback(() => {
    // Haptic feedback if available
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    incrementFrequency(studentId, behavior.id);
    setPulseKey(prev => prev + 1);
  }, [studentId, behavior.id, incrementFrequency]);

  const handleUndo = useCallback(() => {
    if (todayCount > 0) {
      decrementFrequency(studentId, behavior.id);
      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]);
      }
    }
  }, [frequencyEntries, studentId, behavior.id]);

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

      {/* Giant Tap Zone */}
      <button
        onClick={handleTap}
        className="flex-1 w-full min-h-[50vh] flex items-center justify-center active:bg-primary/10 transition-colors touch-manipulation select-none"
        style={{ WebkitTapHighlightColor: 'transparent' }}
        aria-label={`Record ${behavior.name}`}
      >
        <div 
          key={pulseKey}
          className="w-32 h-32 rounded-full border-4 flex items-center justify-center animate-in zoom-in-95 duration-100"
          style={{ 
            borderColor: studentColor,
            backgroundColor: `${studentColor}20`,
          }}
        >
          <span className="text-4xl font-bold" style={{ color: studentColor }}>
            +1
          </span>
        </div>
      </button>

      {/* Undo Button - Corner placement for easy reach */}
      <div className="absolute bottom-4 right-4">
        <Button
          variant="outline"
          size="icon"
          onClick={handleUndo}
          className="w-14 h-14 rounded-full shadow-lg"
          disabled={todayCount === 0}
        >
          <Undo2 className="w-6 h-6" />
        </Button>
      </div>

      {/* Session Timer */}
      <div className="absolute bottom-4 left-4">
        <div className="bg-card border rounded-lg px-3 py-2 shadow-sm">
          <p className="text-xs text-muted-foreground">Session Active</p>
        </div>
      </div>
    </div>
  );
}
