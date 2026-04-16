import { useMemo } from 'react';
import { isSameDay } from 'date-fns';
import { Activity, Repeat, Clock, Users } from 'lucide-react';
import { Student } from '@/types/behavior';
import { useDataStore } from '@/store/dataStore';

interface AllClientsOverviewProps {
  students: Student[];
  colorFor: (studentId: string) => string;
  /** Tap a student card to focus their workspace */
  onFocusStudent: (studentId: string) => void;
}

interface StudentRollup {
  totalFreq: number;
  activeBehaviors: number;
  runningTimers: number;
}

export function AllClientsOverview({
  students,
  colorFor,
  onFocusStudent,
}: AllClientsOverviewProps) {
  const frequencyEntries = useDataStore((s) => s.frequencyEntries);
  const durationEntries = useDataStore((s) => s.durationEntries);

  const rollups = useMemo(() => {
    const today = new Date();
    const map = new Map<string, StudentRollup>();
    for (const s of students) {
      let totalFreq = 0;
      for (const e of frequencyEntries) {
        if (e.studentId !== s.id) continue;
        const ts = (e as any).timestamps as unknown[] | undefined;
        if (Array.isArray(ts) && ts.length > 0) {
          totalFreq += ts.filter((t) => isSameDay(new Date(t as any), today)).length;
        } else {
          const d = new Date((e as any).timestamp);
          if (isSameDay(d, today)) totalFreq += (e as any).count ?? 0;
        }
      }
      const runningTimers = durationEntries.filter(
        (d: any) => d.studentId === s.id && d.startTime && !d.endTime,
      ).length;
      const activeBehaviors = s.behaviors.filter((b) => !b.isArchived && !b.isMastered).length;
      map.set(s.id, { totalFreq, activeBehaviors, runningTimers });
    }
    return map;
  }, [students, frequencyEntries, durationEntries]);

  if (students.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        No active clients in session.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
        <Users className="w-3.5 h-3.5" />
        Roll-up across {students.length} client{students.length === 1 ? '' : 's'} — tap any card
        to focus.
      </div>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {students.map((s) => {
          const color = colorFor(s.id);
          const r = rollups.get(s.id) ?? { totalFreq: 0, activeBehaviors: 0, runningTimers: 0 };
          return (
            <button
              key={s.id}
              onClick={() => onFocusStudent(s.id)}
              className="text-left rounded-md border bg-card p-3 hover:bg-muted/50 transition-colors border-l-4"
              style={{ borderLeftColor: color }}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="font-semibold truncate">{s.name}</div>
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded bg-muted/40 p-2">
                  <div className="text-base font-bold tabular-nums">{r.totalFreq}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                    <Repeat className="w-3 h-3" /> Freq
                  </div>
                </div>
                <div className="rounded bg-muted/40 p-2">
                  <div className="text-base font-bold tabular-nums">{r.activeBehaviors}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                    <Activity className="w-3 h-3" /> Active
                  </div>
                </div>
                <div className="rounded bg-muted/40 p-2">
                  <div className="text-base font-bold tabular-nums">{r.runningTimers}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" /> Timers
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
