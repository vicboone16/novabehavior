import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Users, MessageSquare, HandHelping, MapPin, ArrowRightLeft, Shield } from 'lucide-react';
import { MyPresenceControl } from './MyPresenceControl';
import type { StaffPresenceRecord, StaffAvailability } from '@/hooks/useStaffPresence';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface WhosHerePanelProps {
  staff: StaffPresenceRecord[];
  myPresence: StaffPresenceRecord | null;
  loading: boolean;
  onCheckIn: (opts?: { availability?: StaffAvailability; statusNote?: string; classroomId?: string; roomName?: string }) => Promise<any>;
  onCheckOut: () => Promise<any>;
  onSetAvailability: (availability: StaffAvailability, note?: string) => Promise<any>;
  onMoveStaff?: (userId: string, toClassroomId?: string, toRoomName?: string, reason?: string) => Promise<any>;
  /** If provided, shows coverage summary for this specific classroom */
  currentClassroomId?: string;
  /** For Mayday mode: allow selecting staff as recipients */
  selectable?: boolean;
  selectedUserIds?: string[];
  onToggleSelect?: (userId: string) => void;
  compact?: boolean;
}

const AVAILABILITY_COLORS: Record<string, string> = {
  available: 'bg-emerald-500',
  nearby: 'bg-blue-500',
  assigned: 'bg-amber-500',
  busy: 'bg-red-500',
  offline: 'bg-muted-foreground',
};

const AVAILABILITY_LABELS: Record<string, string> = {
  available: 'Available',
  nearby: 'Nearby',
  assigned: 'Assigned',
  busy: 'Busy',
  offline: 'Offline',
};

function getInitials(name: string | null) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export function WhosHerePanel({
  staff, myPresence, loading, onCheckIn, onCheckOut, onSetAvailability, onMoveStaff,
  currentClassroomId, selectable, selectedUserIds, onToggleSelect, compact,
}: WhosHerePanelProps) {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  // Coverage summary
  const inRoom = currentClassroomId
    ? staff.filter(s => s.current_classroom_id === currentClassroomId).length
    : staff.length;
  const availableCount = staff.filter(s => s.availability === 'available').length;
  const nearbyCount = staff.filter(s => s.availability === 'nearby').length;

  if (loading) return null;

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Who's Here
            <Badge variant="secondary" className="text-xs ml-1">
              {staff.length} present
            </Badge>
          </CardTitle>
          {!compact && (
            <MyPresenceControl
              myPresence={myPresence}
              onCheckIn={onCheckIn}
              onCheckOut={onCheckOut}
              onSetAvailability={onSetAvailability}
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="py-0 pb-3 px-4 space-y-2">
        {/* Coverage Summary */}
        {!compact && (
          <div className="flex gap-3 text-[10px] text-muted-foreground">
            <span>{inRoom} in room</span>
            <span className="text-emerald-600 dark:text-emerald-400">{availableCount} available</span>
            {nearbyCount > 0 && <span className="text-blue-600 dark:text-blue-400">{nearbyCount} nearby</span>}
            {staff.length > 0 && availableCount === 0 && (
              <span className="text-destructive font-medium">⚠ No available staff</span>
            )}
          </div>
        )}

        {/* Staff List */}
        {staff.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">No staff checked in</p>
        ) : (
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {staff.map(s => (
              <StaffChip
                key={s.user_id}
                record={s}
                isAdmin={isAdmin}
                selectable={selectable}
                selected={selectedUserIds?.includes(s.user_id)}
                onToggleSelect={onToggleSelect}
                onMoveStaff={onMoveStaff}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StaffChip({
  record, isAdmin, selectable, selected, onToggleSelect, onMoveStaff,
}: {
  record: StaffPresenceRecord;
  isAdmin: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (userId: string) => void;
  onMoveStaff?: (userId: string, toClassroomId?: string, toRoomName?: string, reason?: string) => Promise<any>;
}) {
  const [open, setOpen] = useState(false);
  const dotColor = AVAILABILITY_COLORS[record.availability] || AVAILABILITY_COLORS.offline;

  const handleClick = () => {
    if (selectable && onToggleSelect) {
      onToggleSelect(record.user_id);
    }
  };

  const chip = (
    <div
      className={`flex items-center gap-2.5 py-1.5 px-1 rounded-md transition-colors cursor-pointer hover:bg-muted/40 ${
        selected ? 'bg-primary/10 ring-1 ring-primary/30' : ''
      }`}
      onClick={selectable ? handleClick : undefined}
    >
      <div className="relative">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-[10px] font-medium bg-muted">
            {getInitials(record.staff_name)}
          </AvatarFallback>
        </Avatar>
        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${dotColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium truncate">{record.staff_name || 'Unknown'}</span>
          {record.role && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0">
              {record.role}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>{AVAILABILITY_LABELS[record.availability] || record.availability}</span>
          {record.current_room_name && (
            <>
              <span>·</span>
              <span className="truncate">{record.current_room_name}</span>
            </>
          )}
          {record.status_note && (
            <>
              <span>·</span>
              <span className="italic truncate">{record.status_note}</span>
            </>
          )}
        </div>
      </div>
      {record.last_activity_at && (
        <span className="text-[9px] text-muted-foreground shrink-0">
          {formatDistanceToNow(new Date(record.last_activity_at), { addSuffix: true })}
        </span>
      )}
    </div>
  );

  if (selectable) return chip;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{chip}</PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="space-y-1">
          <p className="text-xs font-semibold px-2 py-1">{record.staff_name}</p>
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-2" onClick={() => setOpen(false)}>
            <MessageSquare className="w-3 h-3" /> Message
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-2" onClick={() => setOpen(false)}>
            <HandHelping className="w-3 h-3" /> Request Help
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-2" onClick={() => setOpen(false)}>
            <MapPin className="w-3 h-3" /> View Location
          </Button>
          {isAdmin && onMoveStaff && (
            <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-2" onClick={() => setOpen(false)}>
              <ArrowRightLeft className="w-3 h-3" /> Move to Room
            </Button>
          )}
          <Button variant="ghost" size="sm" className="w-full justify-start text-xs h-7 gap-2" onClick={() => setOpen(false)}>
            <Shield className="w-3 h-3" /> Mark Helping Here
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
