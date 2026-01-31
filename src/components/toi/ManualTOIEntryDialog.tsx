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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { format } from 'date-fns';

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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [startTimeStr, setStartTimeStr] = useState('09:00');
  const [endTimeStr, setEndTimeStr] = useState('09:30');
  const [location, setLocation] = useState<TOILocation | ''>('');
  const [contributor, setContributor] = useState<TOIContributor | ''>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const calculatedDuration = useMemo(() => {
    if (!selectedDate || !startTimeStr || !endTimeStr) return null;
    
    const [startHour, startMin] = startTimeStr.split(':').map(Number);
    const [endHour, endMin] = endTimeStr.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    return endMinutes - startMinutes;
  }, [selectedDate, startTimeStr, endTimeStr]);

  const handleSave = () => {
    if (!eventType) {
      setError('Please select a type.');
      return;
    }
    if (!selectedDate) {
      setError('Please select a date.');
      return;
    }
    if (!startTimeStr || !endTimeStr) {
      setError('Please enter start and end times.');
      return;
    }
    if (calculatedDuration !== null && calculatedDuration <= 0) {
      setError("End time can't be earlier than or equal to start time.");
      return;
    }

    // Build start and end Date objects from selectedDate and time strings
    const [startHour, startMin] = startTimeStr.split(':').map(Number);
    const [endHour, endMin] = endTimeStr.split(':').map(Number);
    
    const startDate = new Date(selectedDate);
    startDate.setHours(startHour, startMin, 0, 0);
    
    const endDate = new Date(selectedDate);
    endDate.setHours(endHour, endMin, 0, 0);

    onSave({
      event_type: eventType,
      display_label: TOI_EVENT_LABELS[eventType],
      start_time: toLocalISOString(startDate),
      end_time: toLocalISOString(endDate),
      location: location || undefined,
      suspected_contributor: contributor || undefined,
      notes: notes || undefined,
    });

    // Reset form
    setEventType('');
    setSelectedDate(undefined);
    setStartTimeStr('09:00');
    setEndTimeStr('09:30');
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

          {/* Date picker */}
          <div className="grid gap-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="start-time">Start time *</Label>
              <Input
                id="start-time"
                type="time"
                value={startTimeStr}
                onChange={(e) => setStartTimeStr(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="end-time">End time *</Label>
              <Input
                id="end-time"
                type="time"
                value={endTimeStr}
                onChange={(e) => setEndTimeStr(e.target.value)}
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
