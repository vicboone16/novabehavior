import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Pencil, Trash2, StopCircle } from 'lucide-react';
import {
  TOIEvent,
  TOI_EVENT_LABELS,
  TOI_LOCATION_LABELS,
  TOI_CONTRIBUTOR_LABELS,
  formatDuration,
  calculateLiveDuration,
} from '@/types/toi';
import { format } from 'date-fns';

interface TOIEventsTableProps {
  events: TOIEvent[];
  onEndEvent: (event: TOIEvent) => void;
  onEditEvent: (event: TOIEvent) => void;
  onDeleteEvent: (event: TOIEvent) => void;
}

export function TOIEventsTable({
  events,
  onEndEvent,
  onEditEvent,
  onDeleteEvent,
}: TOIEventsTableProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No TOI events found for the selected filters.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>End</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Contributor</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TOIEventRow
              key={event.id}
              event={event}
              onEnd={() => onEndEvent(event)}
              onEdit={() => onEditEvent(event)}
              onDelete={() => onDeleteEvent(event)}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function TOIEventRow({
  event,
  onEnd,
  onEdit,
  onDelete,
}: {
  event: TOIEvent;
  onEnd: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [liveDuration, setLiveDuration] = useState(
    event.is_active ? calculateLiveDuration(event.start_time) : 0
  );

  // Update live duration every minute for active events
  useState(() => {
    if (!event.is_active) return;
    const interval = setInterval(() => {
      setLiveDuration(calculateLiveDuration(event.start_time));
    }, 60000);
    return () => clearInterval(interval);
  });

  return (
    <TableRow className={event.is_active ? 'bg-primary/5' : undefined}>
      <TableCell className="font-medium">
        {TOI_EVENT_LABELS[event.event_type]}
      </TableCell>
      <TableCell>
        <div className="text-sm">
          {format(new Date(event.start_time), 'MMM d')}
        </div>
        <div className="text-xs text-muted-foreground">
          {format(new Date(event.start_time), 'h:mm a')}
        </div>
      </TableCell>
      <TableCell>
        {event.end_time ? (
          <>
            <div className="text-sm">
              {format(new Date(event.end_time), 'MMM d')}
            </div>
            <div className="text-xs text-muted-foreground">
              {format(new Date(event.end_time), 'h:mm a')}
            </div>
          </>
        ) : (
          <span className="text-muted-foreground">--</span>
        )}
      </TableCell>
      <TableCell>
        {event.is_active ? (
          <span className="font-mono text-primary animate-pulse">
            {formatDuration(liveDuration)}
          </span>
        ) : (
          <span className="font-mono">
            {formatDuration(event.duration_minutes)}
          </span>
        )}
      </TableCell>
      <TableCell>
        {event.location ? TOI_LOCATION_LABELS[event.location] : '--'}
      </TableCell>
      <TableCell>
        {event.suspected_contributor
          ? TOI_CONTRIBUTOR_LABELS[event.suspected_contributor]
          : '--'}
      </TableCell>
      <TableCell className="max-w-[150px] truncate" title={event.notes || undefined}>
        {event.notes || '--'}
      </TableCell>
      <TableCell>
        {event.is_active ? (
          <Badge variant="default">
            Running
          </Badge>
        ) : (
          <Badge variant="secondary">Ended</Badge>
        )}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {event.is_active && (
              <DropdownMenuItem onClick={onEnd}>
                <StopCircle className="mr-2 h-4 w-4" />
                End TOI
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
