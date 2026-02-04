import { useState, useEffect, useCallback } from 'react';
import { Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDataStore } from '@/store/dataStore';
import { Behavior } from '@/types/behavior';

interface MobileDurationTrackerProps {
  studentId: string;
  behavior: Behavior;
  studentColor: string;
}

export function MobileDurationTracker({ studentId, behavior, studentColor }: MobileDurationTrackerProps) {
  const { startDuration, stopDuration, getActiveDuration, durationEntries } = useDataStore();
  const [elapsed, setElapsed] = useState(0);
  
  const activeDuration = getActiveDuration(studentId, behavior.id);
  const isRunning = !!activeDuration;

  // Calculate total duration for today
  const todayEntries = durationEntries.filter(e => 
    e.studentId === studentId && 
    e.behaviorId === behavior.id &&
    e.endTime && // Only completed entries
    new Date(e.startTime).toDateString() === new Date().toDateString()
  );
  
  const totalDurationSeconds = todayEntries.reduce((sum, e) => {
    if (e.endTime) {
      return sum + Math.floor((new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / 1000);
    }
    return sum;
  }, 0);

  // Update elapsed time when running
  useEffect(() => {
    if (!isRunning || !activeDuration) {
      setElapsed(0);
      return;
    }

    const updateElapsed = () => {
      const start = new Date(activeDuration.startTime).getTime();
      setElapsed(Math.floor((Date.now() - start) / 1000));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 100);
    return () => clearInterval(interval);
  }, [isRunning, activeDuration]);

  const handleToggle = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(isRunning ? [50, 50, 50] : 100);
    }

    if (isRunning) {
      stopDuration(studentId, behavior.id);
    } else {
      startDuration(studentId, behavior.id);
    }
  }, [isRunning, studentId, behavior.id, startDuration, stopDuration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTotalTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      {/* Total Duration Summary */}
      <div className="text-center mb-8">
        <p className="text-sm text-muted-foreground">Total Today</p>
        <p className="text-2xl font-semibold">
          {formatTotalTime(totalDurationSeconds)} 
          <span className="text-muted-foreground text-lg ml-1">
            ({todayEntries.length} episode{todayEntries.length !== 1 ? 's' : ''})
          </span>
        </p>
      </div>

      {/* Current Timer Display */}
      <div 
        className="w-48 h-48 rounded-full border-8 flex items-center justify-center mb-8 transition-colors"
        style={{ 
          borderColor: isRunning ? studentColor : 'hsl(var(--border))',
          backgroundColor: isRunning ? `${studentColor}10` : 'transparent',
        }}
      >
        <span 
          className="text-5xl font-mono font-bold tabular-nums"
          style={{ color: isRunning ? studentColor : 'inherit' }}
        >
          {formatTime(elapsed)}
        </span>
      </div>

      {/* Behavior Name */}
      <p className="text-muted-foreground mb-6">{behavior.name}</p>

      {/* Giant Start/Stop Button */}
      <Button
        onClick={handleToggle}
        size="lg"
        className="w-full max-w-xs h-16 text-xl font-semibold gap-3"
        variant={isRunning ? 'destructive' : 'default'}
        style={!isRunning ? { backgroundColor: studentColor } : undefined}
      >
        {isRunning ? (
          <>
            <Square className="w-6 h-6" />
            STOP TIMER
          </>
        ) : (
          <>
            <Play className="w-6 h-6" />
            START TIMER
          </>
        )}
      </Button>
    </div>
  );
}
