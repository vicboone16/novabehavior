import { useMemo } from 'react';
import { Activity, Clock, Hourglass, Repeat, ListTree } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Behavior, DataCollectionMethod } from '@/types/behavior';
import { MobileFrequencyTally } from '@/components/mobile/MobileFrequencyTally';
import { MobileDurationTracker } from '@/components/mobile/MobileDurationTracker';
import { MobileLatencyTracker } from '@/components/mobile/MobileLatencyTracker';
import { MobileIntervalTracker } from '@/components/mobile/MobileIntervalTracker';

interface ListLayoutProps {
  studentId: string;
  studentColor?: string;
  behaviors: Behavior[];
  showBehaviors?: boolean;
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

function ListRow({
  studentId,
  behavior,
  studentColor,
}: {
  studentId: string;
  behavior: Behavior;
  studentColor: string;
}) {
  const method: DataCollectionMethod = behavior.methods[0] || 'frequency';
  const Icon = METHOD_ICON[method];
  const abbr = useMemo(() => abbreviate(behavior.name), [behavior.name]);

  return (
    <div className="flex items-center gap-3 p-2 border rounded-md bg-card">
      <div
        className="w-10 h-10 rounded-md flex items-center justify-center font-bold text-xs text-primary-foreground shrink-0"
        style={{ backgroundColor: studentColor }}
        aria-hidden
      >
        {abbr}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold truncate">{behavior.name}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Badge variant="secondary" className="gap-1 text-[10px] py-0 px-1.5">
            <Icon className="w-3 h-3" />
            {METHOD_LABEL[method]}
          </Badge>
          {behavior.category && (
            <span className="text-[10px] text-muted-foreground truncate">{behavior.category}</span>
          )}
        </div>
      </div>
      <div className="shrink-0 min-w-[140px] sm:min-w-[200px]">
        {method === 'frequency' && (
          <MobileFrequencyTally studentId={studentId} behavior={behavior} studentColor={studentColor} />
        )}
        {method === 'duration' && (
          <MobileDurationTracker studentId={studentId} behavior={behavior} studentColor={studentColor} />
        )}
        {method === 'latency' && (
          <MobileLatencyTracker studentId={studentId} behavior={behavior} studentColor={studentColor} />
        )}
        {method === 'interval' && (
          <MobileIntervalTracker studentId={studentId} behavior={behavior} studentColor={studentColor} />
        )}
        {method === 'abc' && (
          <span className="text-xs text-muted-foreground">Use + ABC action</span>
        )}
      </div>
    </div>
  );
}

export function ListLayout({
  studentId,
  studentColor = 'hsl(var(--primary))',
  behaviors,
  showBehaviors = true,
}: ListLayoutProps) {
  if (!showBehaviors || behaviors.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        No active behaviors to display.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {behaviors.map((b) => (
        <ListRow key={b.id} studentId={studentId} behavior={b} studentColor={studentColor} />
      ))}
    </div>
  );
}
