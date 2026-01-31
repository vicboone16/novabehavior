import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { TOIEvent, TOI_EVENT_LABELS, formatDuration, calculateLiveDuration } from '@/types/toi';
import { format } from 'date-fns';

interface EndTOIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: TOIEvent | null;
  onEnd: (eventId: string, endTime: string) => void;
  onEdit?: () => void;
}

export function EndTOIDialog({
  open,
  onOpenChange,
  event,
  onEnd,
  onEdit,
}: EndTOIDialogProps) {
  const [endTime, setEndTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));

  if (!event) return null;

  const handleEnd = () => {
    onEnd(event.id, new Date(endTime).toISOString());
    onOpenChange(false);
  };

  const proposedDuration = Math.round(
    (new Date(endTime).getTime() - new Date(event.start_time).getTime()) / 60000
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>End TOI?</DialogTitle>
          <DialogDescription>
            This will set an end time and calculate total duration.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Type</span>
              <span className="text-sm font-medium">
                {TOI_EVENT_LABELS[event.event_type]}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Start</span>
              <span className="text-sm font-medium">
                {format(new Date(event.start_time), 'MMM d, h:mm a')}
              </span>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="end">End time</Label>
            <Input
              id="end"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          <div className="rounded-lg bg-primary/5 p-4 text-center">
            <p className="text-sm text-muted-foreground">Duration</p>
            <p className="text-2xl font-bold">{formatDuration(proposedDuration)}</p>
            <p className="text-xs text-muted-foreground">({proposedDuration} minutes)</p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {onEdit && (
            <Button variant="link" size="sm" onClick={onEdit} className="mr-auto">
              Edit details
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Keep Running
          </Button>
          <Button onClick={handleEnd} disabled={proposedDuration <= 0}>
            End TOI
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
