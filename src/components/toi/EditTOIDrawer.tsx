import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import {
  TOIEvent,
  TOIEventType,
  TOILocation,
  TOIContributor,
  TOI_EVENT_LABELS,
  TOI_LOCATION_LABELS,
  TOI_CONTRIBUTOR_LABELS,
  formatDuration,
} from '@/types/toi';
import { format } from 'date-fns';

interface EditTOIDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: TOIEvent | null;
  onSave: (eventId: string, updates: Partial<{
    event_type: TOIEventType;
    display_label: string;
    start_time: string;
    end_time: string;
    location: TOILocation | null;
    suspected_contributor: TOIContributor | null;
    notes: string | null;
  }>) => void;
  onDelete: (eventId: string) => void;
}

export function EditTOIDrawer({
  open,
  onOpenChange,
  event,
  onSave,
  onDelete,
}: EditTOIDrawerProps) {
  const [eventType, setEventType] = useState<TOIEventType | ''>('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState<TOILocation | ''>('');
  const [contributor, setContributor] = useState<TOIContributor | ''>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (event) {
      setEventType(event.event_type);
      setStartTime(format(new Date(event.start_time), "yyyy-MM-dd'T'HH:mm"));
      setEndTime(event.end_time ? format(new Date(event.end_time), "yyyy-MM-dd'T'HH:mm") : '');
      setLocation(event.location || '');
      setContributor(event.suspected_contributor || '');
      setNotes(event.notes || '');
    }
  }, [event]);

  if (!event) return null;

  const handleSave = () => {
    if (!eventType) return;

    onSave(event.id, {
      event_type: eventType,
      display_label: TOI_EVENT_LABELS[eventType],
      start_time: new Date(startTime).toISOString(),
      end_time: endTime ? new Date(endTime).toISOString() : undefined,
      location: location || null,
      suspected_contributor: contributor || null,
      notes: notes || null,
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    onDelete(event.id);
    onOpenChange(false);
  };

  const calculatedDuration = startTime && endTime
    ? Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000)
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[400px]">
        <SheetHeader>
          <SheetTitle>TOI Entry</SheetTitle>
          <SheetDescription>
            Edit or delete this TOI entry.
          </SheetDescription>
        </SheetHeader>

        {/* Always visible summary */}
        <div className="rounded-lg bg-muted p-4 my-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Start</span>
            <span className="text-sm font-medium">
              {format(new Date(event.start_time), 'MMM d, h:mm a')}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">End</span>
            <span className="text-sm font-medium">
              {event.end_time
                ? format(new Date(event.end_time), 'MMM d, h:mm a')
                : 'Running'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Duration</span>
            <span className="text-sm font-bold">
              {event.duration_minutes !== null
                ? `${formatDuration(event.duration_minutes)} (${event.duration_minutes} min)`
                : 'In progress'}
            </span>
          </div>
        </div>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Type</Label>
            <Select value={eventType} onValueChange={(v) => setEventType(v as TOIEventType)}>
              <SelectTrigger>
                <SelectValue />
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
              <Label>Start time</Label>
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>End time</Label>
              <Input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {calculatedDuration !== null && calculatedDuration > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              New duration: {formatDuration(calculatedDuration)}
            </p>
          )}

          <div className="grid gap-2">
            <Label>Location</Label>
            <Select value={location} onValueChange={(v) => setLocation(v as TOILocation)}>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {Object.entries(TOI_LOCATION_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Suspected Contributor</Label>
            <Select value={contributor} onValueChange={(v) => setContributor(v as TOIContributor)}>
              <SelectTrigger>
                <SelectValue placeholder="Select contributor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {Object.entries(TOI_CONTRIBUTOR_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes..."
              rows={3}
            />
          </div>
        </div>

        <SheetFooter className="flex-col sm:flex-row gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="mr-auto">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete entry
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete TOI Entry?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this TOI entry.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save changes
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
