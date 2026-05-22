import { useState, useEffect, useRef } from 'react';
import { Play, Square, Clock, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDataStore } from '@/store/dataStore';
import { Behavior } from '@/types/behavior';

interface ConcurrentDurationTrackerProps {
  studentId: string;
  behaviors: Behavior[];
  studentColor: string;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface BehaviorTimer {
  behaviorId: string;
  behaviorName: string;
  isActive: boolean;
  elapsed: number;
  totalCompleted: number;
}

export function ConcurrentDurationTracker({ studentId, behaviors, studentColor }: ConcurrentDurationTrackerProps) {
  const { startDuration, stopDuration, getActiveDuration, durationEntries } = useDataStore();
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if any behavior is active
  const anyActive = behaviors.some((b) => !!getActiveDuration(studentId, b.id));

  // Tick every 100ms to update elapsed displays
  useEffect(() => {
    intervalRef.current = setInterval(() => setTick((t) => t + 1), 100);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const timers: BehaviorTimer[] = behaviors
    .filter((b) => !b.isArchived && !b.isMastered)
    .map((b) => {
      const active = getActiveDuration(studentId, b.id);
      const elapsed = active
        ? Math.floor((Date.now() - new Date(active.startTime).getTime()) / 1000)
        : 0;
      const totalCompleted = durationEntries
        .filter((e) => e.studentId === studentId && e.behaviorId === b.id && e.endTime)
        .reduce((sum, e) => sum + e.duration, 0);
      return {
        behaviorId: b.id,
        behaviorName: b.name,
        isActive: !!active,
        elapsed,
        totalCompleted,
      };
    });

  const handleToggle = (behaviorId: string, isActive: boolean) => {
    if (isActive) {
      stopDuration(studentId, behaviorId);
    } else {
      startDuration(studentId, behaviorId);
    }
  };

  // Overlap detection: find behaviors running simultaneously
  const activeIds = timers.filter((t) => t.isActive).map((t) => t.behaviorId);
  const hasOverlap = activeIds.length > 1;

  if (timers.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="w-4 h-4" style={{ color: studentColor }} />
          Duration Timers
          {hasOverlap && (
            <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 ml-auto">
              {activeIds.length} simultaneous
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {timers.map((timer) => (
          <div
            key={timer.behaviorId}
            className={`flex items-center justify-between rounded-md border px-3 py-2 transition-all ${
              timer.isActive ? 'border-primary bg-primary/5' : 'border-border'
            }`}
          >
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant={timer.isActive ? 'default' : 'outline'}
                className="h-8 w-8 p-0"
                style={timer.isActive ? { backgroundColor: studentColor } : { borderColor: studentColor }}
                onClick={() => handleToggle(timer.behaviorId, timer.isActive)}
              >
                {timer.isActive ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </Button>
              <span className="text-sm font-medium">{timer.behaviorName}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {timer.isActive && (
                <span
                  className="font-mono font-semibold tabular-nums text-sm"
                  style={{ color: studentColor }}
                >
                  {formatTime(timer.elapsed)}
                </span>
              )}
              <div className="flex items-center gap-1">
                <BarChart2 className="w-3 h-3" />
                Total: {formatTime(timer.totalCompleted + (timer.isActive ? timer.elapsed : 0))}
              </div>
            </div>
          </div>
        ))}

        {/* Timeline view when multiple behaviors are active */}
        {hasOverlap && (
          <div className="mt-2 rounded-md bg-blue-50 dark:bg-blue-950/20 px-3 py-2">
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Concurrent episode detected</p>
            <div className="flex gap-2 flex-wrap">
              {timers.filter((t) => t.isActive).map((t) => (
                <Badge key={t.behaviorId} variant="secondary" className="text-[10px] gap-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: studentColor }}
                  />
                  {t.behaviorName}: {formatTime(t.elapsed)}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
