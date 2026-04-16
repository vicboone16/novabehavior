import { Pin, PinOff } from 'lucide-react';
import { Student } from '@/types/behavior';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ClientSwitcherProps {
  students: Student[];
  /** Either a student id, or the literal string "all" */
  activeId: string;
  onChange: (next: string) => void;
  colorFor: (studentId: string) => string;
  /** ids currently pinned for split-screen (max 2). Empty when split is off. */
  pinnedIds?: string[];
  onTogglePin?: (studentId: string) => void;
  /** Whether the device is wide enough to support pinning (>= md). */
  allowPinning?: boolean;
}

export function ClientSwitcher({
  students,
  activeId,
  onChange,
  colorFor,
  pinnedIds = [],
  onTogglePin,
  allowPinning = false,
}: ClientSwitcherProps) {
  if (students.length === 0) return null;

  return (
    <TooltipProvider>
      <div className="flex gap-1.5 px-3 py-2 border-b overflow-x-auto">
        {students.map((s) => {
          const color = colorFor(s.id);
          const active = activeId === s.id;
          const isPinned = pinnedIds.includes(s.id);
          return (
            <div key={s.id} className="flex items-center shrink-0">
              <button
                onClick={() => onChange(s.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-sm border transition-colors shrink-0 ${
                  allowPinning ? 'rounded-l-full' : 'rounded-full'
                } ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted border-border'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
                <span className="font-medium truncate max-w-[10rem]">{s.name}</span>
              </button>
              {allowPinning && onTogglePin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onTogglePin(s.id)}
                      disabled={!isPinned && pinnedIds.length >= 2}
                      className={`px-2 py-1.5 text-sm border border-l-0 rounded-r-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        isPinned
                          ? 'bg-accent text-accent-foreground border-accent'
                          : 'bg-background hover:bg-muted border-border'
                      }`}
                      aria-label={isPinned ? 'Unpin from split view' : 'Pin to split view'}
                      aria-pressed={isPinned}
                    >
                      {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isPinned
                      ? 'Unpin from split view'
                      : pinnedIds.length >= 2
                      ? 'Split view holds 2 clients'
                      : 'Pin for side-by-side'}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          );
        })}

        {students.length > 1 && (
          <button
            onClick={() => onChange('all')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors shrink-0 ${
              activeId === 'all'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-muted border-border'
            }`}
          >
            <span className="font-semibold">All</span>
            <span className="text-[10px] opacity-70">({students.length})</span>
          </button>
        )}
      </div>
    </TooltipProvider>
  );
}
