import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserCheck, UserX } from 'lucide-react';
import type { StaffAvailability, StaffPresenceRecord } from '@/hooks/useStaffPresence';

interface MyPresenceControlProps {
  myPresence: StaffPresenceRecord | null;
  onCheckIn: (opts?: { availability?: StaffAvailability; statusNote?: string; classroomId?: string; roomName?: string }) => Promise<any>;
  onCheckOut: () => Promise<any>;
  onSetAvailability: (availability: StaffAvailability, note?: string) => Promise<any>;
  classrooms?: { id: string; name: string }[];
}

const AVAILABILITY_OPTIONS: { value: StaffAvailability; label: string; color: string }[] = [
  { value: 'available', label: 'Available', color: 'bg-emerald-500' },
  { value: 'nearby', label: 'Nearby', color: 'bg-blue-500' },
  { value: 'assigned', label: 'Assigned', color: 'bg-amber-500' },
  { value: 'busy', label: 'Busy', color: 'bg-red-500' },
];

export function MyPresenceControl({ myPresence, onCheckIn, onCheckOut, onSetAvailability, classrooms }: MyPresenceControlProps) {
  const isPresent = myPresence?.is_present ?? false;
  const [availability, setAvailability] = useState<StaffAvailability>(myPresence?.availability || 'available');
  const [note, setNote] = useState(myPresence?.status_note || '');

  useEffect(() => {
    if (myPresence) {
      setAvailability(myPresence.availability);
      setNote(myPresence.status_note || '');
    }
  }, [myPresence]);

  const handleToggle = async (checked: boolean) => {
    if (checked) {
      await onCheckIn({ availability, statusNote: note || undefined });
    } else {
      await onCheckOut();
    }
  };

  const handleAvailabilityChange = async (val: string) => {
    const newAvail = val as StaffAvailability;
    setAvailability(newAvail);
    if (isPresent) {
      await onSetAvailability(newAvail, note || undefined);
    }
  };

  const handleNoteBlur = async () => {
    if (isPresent) {
      await onSetAvailability(availability, note || undefined);
    }
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* I'm Here toggle */}
      <div className="flex items-center gap-2">
        {isPresent ? (
          <UserCheck className="w-4 h-4 text-emerald-500" />
        ) : (
          <UserX className="w-4 h-4 text-muted-foreground" />
        )}
        <span className="text-xs font-medium">I'm Here</span>
        <Switch checked={isPresent} onCheckedChange={handleToggle} />
      </div>

      {isPresent && (
        <>
          {/* Availability selector */}
          <Select value={availability} onValueChange={handleAvailabilityChange}>
            <SelectTrigger className="h-7 text-xs w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVAILABILITY_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${opt.color}`} />
                    {opt.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Optional note */}
          <Input
            value={note}
            onChange={e => setNote(e.target.value)}
            onBlur={handleNoteBlur}
            placeholder="Status note..."
            className="h-7 text-xs w-[140px]"
          />

          {myPresence?.current_room_name && (
            <Badge variant="outline" className="text-[10px]">
              {myPresence.current_room_name}
            </Badge>
          )}
        </>
      )}
    </div>
  );
}
