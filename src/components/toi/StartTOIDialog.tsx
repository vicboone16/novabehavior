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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  TOIEventType,
  TOILocation,
  TOIContributor,
  TOI_EVENT_LABELS,
  TOI_LOCATION_LABELS,
  TOI_CONTRIBUTOR_LABELS,
} from '@/types/toi';
import { format } from 'date-fns';

interface StartTOIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (data: {
    event_type: TOIEventType;
    display_label: string;
    start_time: string;
    location?: TOILocation;
    suspected_contributor?: TOIContributor;
    notes?: string;
  }) => void;
  preselectedType?: TOIEventType;
}

export function StartTOIDialog({
  open,
  onOpenChange,
  onStart,
  preselectedType,
}: StartTOIDialogProps) {
  const [eventType, setEventType] = useState<TOIEventType | ''>(preselectedType || '');
  const [startTime, setStartTime] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [location, setLocation] = useState<TOILocation | ''>('');
  const [contributor, setContributor] = useState<TOIContributor | ''>('');
  const [notes, setNotes] = useState('');

  const handleStart = () => {
    if (!eventType) return;

    onStart({
      event_type: eventType,
      display_label: TOI_EVENT_LABELS[eventType],
      start_time: new Date(startTime).toISOString(),
      location: location || undefined,
      suspected_contributor: contributor || undefined,
      notes: notes || undefined,
    });

    // Reset form
    setEventType('');
    setStartTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setLocation('');
    setContributor('');
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start TOI</DialogTitle>
          <DialogDescription>
            Track time out of instruction with a start and end time.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="type">Type *</Label>
            <Select value={eventType} onValueChange={(v) => setEventType(v as TOIEventType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TOI_EVENT_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="start">Start time</Label>
            <Input
              id="start"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Duration will calculate automatically when you end TOI.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="location">Location (optional)</Label>
            <Select value={location} onValueChange={(v) => setLocation(v as TOILocation)}>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TOI_LOCATION_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contributor">Suspected Contributor (optional)</Label>
            <Select value={contributor} onValueChange={(v) => setContributor(v as TOIContributor)}>
              <SelectTrigger>
                <SelectValue placeholder="Select contributor" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TOI_CONTRIBUTOR_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleStart} disabled={!eventType}>
            Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
