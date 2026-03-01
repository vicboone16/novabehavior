import { useState } from 'react';
import { Clock, Play, Calendar, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNextUpEvents, NextUpEvent } from '@/hooks/useNextUpEvents';
import { useToast } from '@/hooks/use-toast';

export function NextUpWidget() {
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
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Today — Next Up
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Today — Next Up
          {events.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {events.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No upcoming scheduled events today.
          </p>
        ) : (
          events.slice(0, 5).map((event) => (
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
          ))
        )}
      </CardContent>
    </Card>
  );
}
