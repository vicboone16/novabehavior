import { useMemo } from 'react';
import { isSameDay } from 'date-fns';
import { Activity, Clock, Hourglass, Repeat, ListTree } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDataStore } from '@/store/dataStore';
import { Behavior, DataCollectionMethod } from '@/types/behavior';
import { CompactFrequencyTally } from './CompactFrequencyTally';
import { CompactDurationTracker } from './CompactDurationTracker';
import { CompactIntervalTracker } from './CompactIntervalTracker';
import { MobileLatencyTracker } from '@/components/mobile/MobileLatencyTracker';

interface BehaviorCardProps {
  studentId: string;
  behavior: Behavior;
  studentColor?: string;
  /** Force a specific data-collection method; defaults to the behavior's first method */
  preferredMethod?: DataCollectionMethod;
}

const METHOD_ICON: Record<DataCollectionMethod, typeof Activity> = {
  frequency: Repeat,
  duration: Clock,
  latency: Hourglass,
  interval: ListTree,
  abc: Activity,
};

const METHOD_LABEL: Record<DataCollectionMethod, string> = {
  frequency: 'Freq',
  duration: 'Dur',
  latency: 'Lat',
  interval: 'Int',
  abc: 'ABC',
};

function abbreviate(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return parts.slice(0, 3).map((p) => p[0]?.toUpperCase() || '').join('');
}

export function BehaviorCard({
  studentId,
  behavior,
  studentColor = 'hsl(var(--primary))',
  preferredMethod,
}: BehaviorCardProps) {
  const method: DataCollectionMethod =
    preferredMethod && behavior.methods.includes(preferredMethod)
      ? preferredMethod
      : behavior.methods[0] || 'frequency';

  const Icon = METHOD_ICON[method] || Activity;
  const abbr = useMemo(() => abbreviate(behavior.name), [behavior.name]);

  return (
    <Card className="overflow-hidden flex flex-col gap-2 p-3 border-l-4" style={{ borderLeftColor: studentColor }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-9 h-9 rounded-md flex items-center justify-center font-bold text-xs text-primary-foreground shrink-0"
            style={{ backgroundColor: studentColor }}
            aria-hidden
          >
            {abbr}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{behavior.name}</div>
            {behavior.category && (
              <div className="text-[10px] text-muted-foreground truncate">{behavior.category}</div>
            )}
          </div>
        </div>
        <Badge variant="secondary" className="gap-1 shrink-0">
          <Icon className="w-3 h-3" />
          {METHOD_LABEL[method]}
        </Badge>
      </div>

      <div className="pt-1">
        {method === 'frequency' && (
          <CompactFrequencyTally studentId={studentId} behavior={behavior} studentColor={studentColor} />
        )}
        {method === 'duration' && (
          <CompactDurationTracker studentId={studentId} behavior={behavior} studentColor={studentColor} />
        )}
        {method === 'latency' && (
          <MobileLatencyTracker studentId={studentId} behavior={behavior} studentColor={studentColor} />
        )}
        {method === 'interval' && (
          <CompactIntervalTracker studentId={studentId} behavior={behavior} studentColor={studentColor} />
        )}
        {method === 'abc' && (
          <div className="text-xs text-muted-foreground py-2">
            Use the <span className="font-semibold">+ ABC</span> action to log an entry below.
          </div>
        )}
      </div>
    </Card>
  );
}

/** Convenience: use to count today's frequency for a behavior (used by stats header / quick-tally) */
export function useTodayFrequencyCount(studentId: string, behaviorId: string) {
  const frequencyEntries = useDataStore((s) => s.frequencyEntries);
  return useMemo(() => {
    const entry = frequencyEntries.find((e) => e.studentId === studentId && e.behaviorId === behaviorId);
    if (!entry) return 0;
    const today = new Date();
    const ts = (entry as any).timestamps as unknown[] | undefined;
    if (Array.isArray(ts) && ts.length > 0) {
      return ts.filter((t) => isSameDay(new Date(t as any), today)).length;
    }
    const entryDate = new Date((entry as any).timestamp);
    return isSameDay(entryDate, today) ? (entry as any).count ?? 0 : 0;
  }, [frequencyEntries, studentId, behaviorId]);
}
