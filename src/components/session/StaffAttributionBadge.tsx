/**
 * StaffAttributionBadge
 * 
 * Small badge that shows which staff member collected a data entry.
 * Used in session history and report views to provide attribution.
 */
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { User } from 'lucide-react';

interface StaffAttributionBadgeProps {
  collectedByUserId?: string | null;
  collectedByDisplayName?: string | null;
  collectedAt?: string | Date | null;
  /** If true, always show the full name; otherwise show abbreviated */
  expanded?: boolean;
  className?: string;
}

export function StaffAttributionBadge({
  collectedByDisplayName,
  collectedAt,
  expanded = false,
  className = '',
}: StaffAttributionBadgeProps) {
  if (!collectedByDisplayName) return null;

  const parts = collectedByDisplayName.trim().split(' ');
  const abbreviated =
    parts.length >= 2
      ? `${parts[0]} ${parts[parts.length - 1][0]}.`
      : parts[0];

  const label = expanded ? collectedByDisplayName : abbreviated;

  const timeLabel = collectedAt
    ? new Date(collectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={`gap-1 text-[10px] h-4 px-1.5 py-0 cursor-default font-normal border-border text-muted-foreground ${className}`}
        >
          <User className="w-2.5 h-2.5" />
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-0.5">
          <p className="font-medium">{collectedByDisplayName}</p>
          {timeLabel && <p className="text-muted-foreground">Collected at {timeLabel}</p>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * SessionStaffSummary
 * 
 * Shows all unique staff who contributed data to a session with their entry counts.
 * Used in session history and report headers.
 */
interface StaffSummaryItem {
  userId: string;
  displayName: string;
  entryCount: number;
  joinedAt?: string;
  leftAt?: string | null;
}

interface SessionStaffSummaryProps {
  participants: StaffSummaryItem[];
  compact?: boolean;
}

export function SessionStaffSummary({ participants, compact = false }: SessionStaffSummaryProps) {
  if (!participants || participants.length === 0) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {participants.map(p => (
          <StaffAttributionBadge
            key={p.userId}
            collectedByDisplayName={p.displayName}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {participants.map(p => {
        const joinTime = p.joinedAt
          ? new Date(p.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : null;
        const leftTime = p.leftAt
          ? new Date(p.leftAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : null;

        return (
          <div
            key={p.userId}
            className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2 text-sm"
          >
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="font-medium">{p.displayName}</span>
              {joinTime && (
                <span className="text-xs text-muted-foreground">
                  {joinTime}{leftTime ? ` → ${leftTime}` : ' → session end'}
                </span>
              )}
            </div>
            <Badge variant="secondary" className="text-xs">
              {p.entryCount} {p.entryCount === 1 ? 'entry' : 'entries'}
            </Badge>
          </div>
        );
      })}
    </div>
  );
}
