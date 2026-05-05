import { useEffect, useMemo, useState } from 'react';
import { Timer, BarChart3, Activity } from 'lucide-react';
import { useDataStore } from '@/store/dataStore';
import { isSameDay } from 'date-fns';

interface SessionStatsHeaderProps {
  studentIds: string[];
  /** Optional end action button rendered on the right */
  endAction?: React.ReactNode;
}

function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function SessionStatsHeader({ studentIds, endAction }: SessionStatsHeaderProps) {
  const sessionStartTime = useDataStore((s) => s.sessionStartTime);
  const frequencyEntries = useDataStore((s) => s.frequencyEntries);
  const durationEntries = useDataStore((s) => s.durationEntries);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!sessionStartTime) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sessionStartTime]);

  const elapsedMs = sessionStartTime ? now - new Date(sessionStartTime).getTime() : 0;

  const { totalFreq, ratePerMin, runningTimers } = useMemo(() => {
    const today = new Date();
    let totalFreq = 0;
    for (const e of frequencyEntries) {
      if (!studentIds.includes(e.studentId)) continue;
      const ts = (e as any).timestamps as unknown[] | undefined;
      if (Array.isArray(ts) && ts.length > 0) {
        totalFreq += ts.filter((t) => isSameDay(new Date(t as any), today)).length;
      } else {
        const d = new Date((e as any).timestamp);
        if (isSameDay(d, today)) totalFreq += (e as any).count ?? 0;
      }
    }
    const minutes = Math.max(elapsedMs / 60000, 1 / 60);
    const ratePerMin = sessionStartTime ? totalFreq / minutes : 0;

    const runningTimers = durationEntries.filter(
      (d: any) => studentIds.includes(d.studentId) && d.startTime && !d.endTime,
    ).length;

    return { totalFreq, ratePerMin, runningTimers };
  }, [frequencyEntries, durationEntries, studentIds, elapsedMs, sessionStartTime]);

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b">
      <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm overflow-x-auto">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <Timer className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono font-semibold tabular-nums">
              {sessionStartTime ? formatElapsed(elapsedMs) : '--:--'}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <span>
              <span className="font-semibold">{totalFreq}</span>{' '}
              <span className="text-muted-foreground">freq</span>
              {sessionStartTime && (
                <>
                  {' · '}
                  <span className="font-semibold">{ratePerMin.toFixed(1)}</span>
                  <span className="text-muted-foreground">/min</span>
                </>
              )}
            </span>
          </div>
          {runningTimers > 0 && (
            <div className="hidden md:flex items-center gap-1.5 shrink-0 text-primary">
              <Activity className="w-4 h-4 animate-pulse" />
              <span>{runningTimers} timer{runningTimers === 1 ? '' : 's'} running</span>
            </div>
          )}
        </div>
        <div className="shrink-0">{endAction}</div>
      </div>
    </div>
  );
}
