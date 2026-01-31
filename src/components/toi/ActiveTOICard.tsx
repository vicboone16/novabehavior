import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StopCircle, Pencil, Clock } from 'lucide-react';
import { TOIEvent, TOI_EVENT_LABELS, formatDuration, calculateLiveDuration } from '@/types/toi';
import { format } from 'date-fns';

interface ActiveTOICardProps {
  event: TOIEvent;
  studentName?: string;
  onEnd: () => void;
  onEdit: () => void;
}

export function ActiveTOICard({ event, studentName, onEnd, onEdit }: ActiveTOICardProps) {
  const [liveDuration, setLiveDuration] = useState(calculateLiveDuration(event.start_time));

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveDuration(calculateLiveDuration(event.start_time));
    }, 1000);
    return () => clearInterval(interval);
  }, [event.start_time]);

  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="default">TOI Running</Badge>
              {studentName && (
                <span className="text-sm text-muted-foreground">{studentName}</span>
              )}
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Type:</span>
                <span className="font-medium">{TOI_EVENT_LABELS[event.event_type]}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-lg font-bold">
                  {format(new Date(event.start_time), 'h:mm a')}
                </span>
                <span className="text-muted-foreground">started</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Duration: <span className="font-mono text-foreground animate-pulse">{formatDuration(liveDuration)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button variant="destructive" size="sm" onClick={onEnd}>
              <StopCircle className="mr-2 h-4 w-4" />
              End TOI
            </Button>
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
