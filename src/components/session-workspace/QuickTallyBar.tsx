import { useMemo } from 'react';
import { isSameDay } from 'date-fns';
import { Pin, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDataStore } from '@/store/dataStore';
import { Behavior } from '@/types/behavior';

interface QuickTallyBarProps {
  studentId: string;
  /** Behaviors available to this student (already filtered for active/non-archived). */
  behaviors: Behavior[];
  /** User-pinned behavior ids (max 5). When empty, top-3 by recent frequency are shown. */
  pinnedIds: string[];
  studentColor?: string;
  onOpenPinManager?: () => void;
}

function abbreviate(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return parts.slice(0, 3).map((p) => p[0]?.toUpperCase() || '').join('');
}

export function QuickTallyBar({
  studentId,
  behaviors,
  pinnedIds,
  studentColor = 'hsl(var(--primary))',
  onOpenPinManager,
}: QuickTallyBarProps) {
  const frequencyEntries = useDataStore((s) => s.frequencyEntries);
  const incrementFrequency = useDataStore((s) => s.incrementFrequency);

  // Behaviors that support frequency tally
  const tallyable = useMemo(
    () => behaviors.filter((b) => b.methods.includes('frequency')),
    [behaviors],
  );

  // Auto-suggest: top 3 by today's count when nothing is pinned
  const displayBehaviors = useMemo(() => {
    if (pinnedIds.length > 0) {
      return tallyable.filter((b) => pinnedIds.includes(b.id)).slice(0, 5);
    }
    const today = new Date();
    const counted = tallyable.map((b) => {
      const entry = frequencyEntries.find(
        (e) => e.studentId === studentId && e.behaviorId === b.id,
      );
      let count = 0;
      if (entry) {
        const ts = (entry as any).timestamps as unknown[] | undefined;
        if (Array.isArray(ts) && ts.length > 0) {
          count = ts.filter((t) => isSameDay(new Date(t as any), today)).length;
        } else {
          const d = new Date((entry as any).timestamp);
          count = isSameDay(d, today) ? (entry as any).count ?? 0 : 0;
        }
      }
      return { b, count };
    });
    return counted.sort((a, b) => b.count - a.count).slice(0, 3).map((x) => x.b);
  }, [tallyable, pinnedIds, frequencyEntries, studentId]);

  const todayCount = (behaviorId: string) => {
    const entry = frequencyEntries.find(
      (e) => e.studentId === studentId && e.behaviorId === behaviorId,
    );
    if (!entry) return 0;
    const today = new Date();
    const ts = (entry as any).timestamps as unknown[] | undefined;
    if (Array.isArray(ts) && ts.length > 0) {
      return ts.filter((t) => isSameDay(new Date(t as any), today)).length;
    }
    const d = new Date((entry as any).timestamp);
    return isSameDay(d, today) ? (entry as any).count ?? 0 : 0;
  };

  if (displayBehaviors.length === 0) return null;

  const isAutoSuggested = pinnedIds.length === 0;

  return (
    <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur border-t">
      <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0 pr-1">
          <Pin className="w-3 h-3" />
          {isAutoSuggested ? 'Top 3' : 'Pinned'}
        </div>
        {displayBehaviors.map((b) => {
          const count = todayCount(b.id);
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                if ('vibrate' in navigator) navigator.vibrate(40);
                incrementFrequency(studentId, b.id);
              }}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border bg-card hover:bg-muted transition-colors shrink-0"
              title={`+1 ${b.name}`}
            >
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-primary-foreground"
                style={{ backgroundColor: studentColor }}
                aria-hidden
              >
                {abbreviate(b.name)}
              </span>
              <span className="text-xs font-medium truncate max-w-[8rem]">{b.name}</span>
              <span className="text-sm font-bold tabular-nums">{count}</span>
              <Plus className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          );
        })}
        {onOpenPinManager && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenPinManager}
            className="shrink-0 h-8 text-xs"
          >
            <Pin className="w-3.5 h-3.5" />
            Manage
          </Button>
        )}
      </div>
    </div>
  );
}
