import { useState, useEffect, useRef } from 'react';
import { Play, Square, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDataStore } from '@/store/dataStore';
import { Behavior } from '@/types/behavior';
import { useGestureData, FEEDBACK_STYLES } from '@/hooks/useGestureData';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DurationTrackerProps {
  studentId: string;
  behavior: Behavior;
  studentColor: string;
  minimal?: boolean;
}

export function DurationTracker({ studentId, behavior, studentColor, minimal = false }: DurationTrackerProps) {
  const { startDuration, stopDuration, getActiveDuration, durationEntries } = useDataStore();
  const [elapsed, setElapsed] = useState(0);
  const recoveredRef = useRef(false);

  const activeDuration = getActiveDuration(studentId, behavior.id);
  const isActive = !!activeDuration;

  // On mount: restore any in-flight timer that survived a page refresh
  useEffect(() => {
    if (recoveredRef.current || isActive) return;
    recoveredRef.current = true;
    try {
      const key = `nova_active_duration_${studentId}_${behavior.id}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const { startTime } = JSON.parse(raw) as { id: string; startTime: string };
        const elapsed = Math.floor((Date.now() - new Date(startTime).getTime()) / 1000);
        if (elapsed > 0 && elapsed < 3600) {
          // Re-create the active entry in the store using the original start time
          useDataStore.getState().startDuration(studentId, behavior.id);
          toast(`Duration timer for "${behavior.name}" recovered after page refresh.`);
        } else {
          localStorage.removeItem(key);
        }
      }
    } catch {}
  }, [studentId, behavior.id, behavior.name, isActive]);

  // Get total duration for this session
  const totalDuration = durationEntries
    .filter(e => e.studentId === studentId && e.behaviorId === behavior.id && e.endTime)
    .reduce((sum, e) => sum + e.duration, 0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && activeDuration) {
      interval = setInterval(() => {
        const startTime = new Date(activeDuration.startTime).getTime();
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 100);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [isActive, activeDuration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggle = () => {
    if (isActive) {
      stopDuration(studentId, behavior.id);
    } else {
      startDuration(studentId, behavior.id);
    }
  };

  const { longPressHandlers, feedback } = useGestureData({
    onLongPress: handleToggle,
  });

  return (
    <div className="bg-secondary/30 rounded-lg p-3">
      {!minimal && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">{behavior.name}</span>
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <Clock className="w-3 h-3" />
            Total: {formatTime(totalDuration + elapsed)}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        {/* Long-press also toggles duration */}
        <Button
          size="sm"
          className={cn(
            'flex-1 gap-2 transition-all',
            minimal ? 'h-16 text-lg' : 'h-12',
            isActive ? 'pulse-active' : '',
            feedback === 'duration' && FEEDBACK_STYLES.duration
          )}
          style={{
            backgroundColor: isActive ? studentColor : 'transparent',
            color: isActive ? 'white' : studentColor,
            border: `2px solid ${studentColor}`,
          }}
          onClick={handleToggle}
          {...longPressHandlers()}
        >
          {isActive ? (
            <>
              <Square className={minimal ? 'w-6 h-6' : 'w-4 h-4'} />
              <span className="timer-display text-lg">{formatTime(elapsed)}</span>
            </>
          ) : (
            <>
              <Play className={minimal ? 'w-6 h-6' : 'w-4 h-4'} />
              {minimal ? '' : 'Start'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
