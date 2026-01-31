import { useState, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TOIEventType,
  TOILocation,
  TOIContributor,
  TOI_EVENT_LABELS,
  TOI_LOCATION_LABELS,
  TOI_CONTRIBUTOR_LABELS,
  formatDuration,
  toLocalISOString,
} from '@/types/toi';

interface ManualTOIEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    event_type: TOIEventType;
    display_label: string;
    start_time: string;
    end_time: string;
    location?: TOILocation;
    suspected_contributor?: TOIContributor;
    notes?: string;
  }) => void;
}

export function ManualTOIEntryDialog({
  open,
  onOpenChange,
  onSave,
}: ManualTOIEntryDialogProps) {
  const [eventType, setEventType] = useState<TOIEventType | ''>('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState<TOILocation | ''>('');
  const [contributor, setContributor] = useState<TOIContributor | ''>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const calculatedDuration = useMemo(() => {
    if (!startTime || !endTime) return null;
    const start = new Date(startTime);
    const end = new Date(endTime);
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
    return minutes;
  }, [startTime, endTime]);

  const handleSave = () => {
    if (!eventType) {
      setError('Please select a type.');
      return;
    }
    if (!startTime || !endTime) {
      setError('Please select a type and start time.');
      return;
    }
    if (calculatedDuration !== null && calculatedDuration <= 0) {
      setError("End time can't be earlier than start time.");
      return;
    }

    onSave({
      event_type: eventType,
      display_label: TOI_EVENT_LABELS[eventType],
      start_time: toLocalISOString(new Date(startTime)),
      end_time: toLocalISOString(new Date(endTime)),
      location: location || undefined,
      suspected_contributor: contributor || undefined,
      notes: notes || undefined,
    });

    // Reset form
    setEventType('');
    setStartTime('');
    setEndTime('');
    setLocation('');
    setContributor('');
    setNotes('');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Add TOI Entry</DialogTitle>
          <DialogDescription>
            Use this for backfilling historical data.
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

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="start">Start time *</Label>
              <Input
                id="start"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end">End time *</Label>
              <Input
                id="end"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Live duration calculation */}
          {calculatedDuration !== null && (
            <div className="rounded-lg bg-primary/5 p-3 text-center">
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="text-xl font-bold">
                {calculatedDuration > 0 ? (
                  <>
                    {formatDuration(calculatedDuration)}{' '}
                    <span className="text-sm font-normal text-muted-foreground">
                      ({calculatedDuration} min)
                    </span>
                  </>
                ) : (
                  <span className="text-destructive">Invalid range</span>
                )}
              </p>
            </div>
          )}

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

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
