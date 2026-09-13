import { format, parseISO } from 'date-fns';
import { History, Archive, RotateCcw, Plus, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Behavior, BehaviorAuditAction } from '@/types/behavior';

interface BehaviorAuditHistoryProps {
  behavior: Behavior;
  studentName?: string;
}

const ACTION_CONFIG: Record<BehaviorAuditAction, {
  label: string;
  color: string;
  Icon: typeof Plus;
}> = {
  added:    { label: 'Added',    color: 'bg-green-100 text-green-800',  Icon: Plus },
  archived: { label: 'Archived', color: 'bg-yellow-100 text-yellow-800', Icon: Archive },
  restored: { label: 'Restored', color: 'bg-blue-100 text-blue-800',    Icon: RotateCcw },
  deleted:  { label: 'Deleted',  color: 'bg-red-100 text-red-800',      Icon: Trash2 },
  updated:  { label: 'Updated',  color: 'bg-gray-100 text-gray-700',    Icon: Pencil },
};

export function BehaviorAuditHistory({ behavior, studentName }: BehaviorAuditHistoryProps) {
  const log = behavior.auditLog ?? [];

  const statusBadge = behavior.isArchived
    ? <Badge className="bg-yellow-100 text-yellow-800 text-[10px]">Archived</Badge>
    : log.some(e => e.action === 'restored')
      ? <Badge className="bg-blue-100 text-blue-800 text-[10px]">Restored</Badge>
      : <Badge className="bg-green-100 text-green-800 text-[10px]">Active</Badge>;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-[10px] text-muted-foreground">
          <History className="w-3 h-3" />
          History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <History className="w-4 h-4" />
            Behavior Audit History
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{behavior.name}</span>
            {statusBadge}
          </div>
          {studentName && (
            <p className="text-xs text-muted-foreground">Student: {studentName}</p>
          )}

          {log.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No audit events recorded yet.
              <br />
              <span className="text-xs">Events are recorded from this point forward.</span>
            </p>
          ) : (
            <ScrollArea className="max-h-[320px]">
              <ol className="relative border-l border-border ml-2 space-y-4 py-2">
                {[...log].reverse().map((event, idx) => {
                  const cfg = ACTION_CONFIG[event.action] ?? ACTION_CONFIG.updated;
                  const EventIcon = cfg.Icon;
                  return (
                    <li key={idx} className="ml-4">
                      <span className="absolute -left-[7px] flex items-center justify-center w-3.5 h-3.5 rounded-full bg-background border border-border mt-0.5">
                        <EventIcon className="w-2 h-2 text-muted-foreground" />
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(parseISO(event.timestamp), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      {event.actor && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">by {event.actor}</p>
                      )}
                      {event.note && (
                        <p className="text-xs text-muted-foreground mt-0.5 italic">{event.note}</p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
