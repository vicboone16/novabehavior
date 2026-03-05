import { useState } from 'react';
import { Clock, Play, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNextUpEvents, NextUpEvent } from '@/hooks/useNextUpEvents';
import { useToast } from '@/hooks/use-toast';

/** Renders the NextUp widget content inside the dashboard grid shell */
export function NextUpWidgetContent() {
  const { events, loading, clockIn } = useNextUpEvents();
  const { toast } = useToast();
  const [clockingId, setClockingId] = useState<string | null>(null);

  const handleClockIn = async (event: NextUpEvent) => {
    try {
      setClockingId(event.schedule_event_id);
      await clockIn(event);
      toast({
        title: 'Clocked In',
        description: `Session started for ${event.client_name}`,
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to clock in',
        variant: 'destructive',
      });
    } finally {
      setClockingId(null);
    }
  };

  const formatTimeRange = (event: NextUpEvent) => {
    try {
      const start = format(parseISO(event.start_time), 'h:mm a');
      const end = format(parseISO(event.end_time), 'h:mm a');
      return `${start} – ${end}`;
    } catch {
      return 'Time TBD';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <p className="text-xs text-muted-foreground text-center py-4">
        No upcoming scheduled events today.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {events.slice(0, 5).map((event) => (
        <div
          key={event.schedule_event_id}
          className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              {event.client_name}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3 shrink-0" />
              <span>{formatTimeRange(event)}</span>
              <span className="text-muted-foreground/60">
                ({event.duration_minutes} min)
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="default"
            className="gap-1.5 shrink-0"
            disabled={clockingId === event.schedule_event_id}
            onClick={() => handleClockIn(event)}
          >
            {clockingId === event.schedule_event_id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            Clock In
          </Button>
        </div>
      ))}
      {events.length > 0 && (
        <div className="flex justify-end">
          <Badge variant="secondary" className="text-xs">
            {events.length} event{events.length > 1 ? 's' : ''}
          </Badge>
        </div>
      )}
    </div>
  );
}
