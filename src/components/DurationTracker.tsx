import { useState, useEffect } from 'react';
import { Play, Square, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDataStore } from '@/store/dataStore';
import { Behavior } from '@/types/behavior';

interface DurationTrackerProps {
  studentId: string;
  behavior: Behavior;
  studentColor: string;
}

export function DurationTracker({ studentId, behavior, studentColor }: DurationTrackerProps) {
  const { startDuration, stopDuration, getActiveDuration, durationEntries } = useDataStore();
  const [elapsed, setElapsed] = useState(0);
  
  const activeDuration = getActiveDuration(studentId, behavior.id);
  const isActive = !!activeDuration;

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

  return (
    <div className="bg-secondary/30 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">{behavior.name}</span>
        <div className="flex items-center gap-1 text-muted-foreground text-xs">
          <Clock className="w-3 h-3" />
          Total: {formatTime(totalDuration + elapsed)}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className={`h-12 flex-1 gap-2 transition-all ${isActive ? 'pulse-active' : ''}`}
          style={{ 
            backgroundColor: isActive ? studentColor : 'transparent',
            color: isActive ? 'white' : studentColor,
            border: `2px solid ${studentColor}`
          }}
          onClick={handleToggle}
        >
          {isActive ? (
            <>
              <Square className="w-4 h-4" />
              <span className="timer-display text-lg">{formatTime(elapsed)}</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Start
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
