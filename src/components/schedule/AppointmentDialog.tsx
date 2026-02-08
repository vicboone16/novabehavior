import { useState, useEffect, useMemo } from 'react';
import { format, addMinutes, setHours, setMinutes } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, Trash2, X, Users, Sparkles, AlertTriangle, Link2Off } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SchedulingEngine } from '@/components/scheduling/SchedulingEngine';
import { checkMultipleStaffSupervision, type SupervisionStatus } from '@/hooks/useSupervisionChain';
import type { Appointment, CalendarStudent, CalendarStaff } from '@/types/schedule';

interface AppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  students: CalendarStudent[];
  staff: CalendarStaff[];
  onSave: (data: Partial<Appointment>) => void;
  onDelete?: () => void;
  defaultStudentId?: string;
}

const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const hour = Math.floor(i / 4);
  const minute = (i % 4) * 15;
  const date = setMinutes(setHours(new Date(), hour), minute);
  return {
    value: format(date, 'HH:mm'),
    label: format(date, 'h:mm a')
  };
});

// Helper to calculate duration in minutes between two time strings
const calculateDuration = (start: string, end: string): number => {
  const [startHours, startMinutes] = start.split(':').map(Number);
  const [endHours, endMinutes] = end.split(':').map(Number);
  
  let startTotalMinutes = startHours * 60 + startMinutes;
  let endTotalMinutes = endHours * 60 + endMinutes;
  
  // Handle overnight appointments (end time is next day)
  if (endTotalMinutes <= startTotalMinutes) {
    endTotalMinutes += 24 * 60;
  }
  
  return endTotalMinutes - startTotalMinutes;
};

// Helper to calculate end time from start time and duration
const calculateEndTime = (start: string, durationMinutes: number): string => {
  const [hours, minutes] = start.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
};

// Format duration for display
const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours} hr`;
  return `${hours} hr ${mins} min`;
};

export const APPOINTMENT_CATEGORIES = [
  { value: 'assessment', label: 'Assessment' },
  { value: 'supervision', label: 'Supervision' },
  { value: 'parent_training', label: 'Parent Training' },
  { value: 'admin', label: 'Admin' },
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'iep_meeting', label: 'IEP Meeting' },
  { value: '1on1_session', label: '1:1 Session' },
  { value: 'other', label: 'Other' },
];

export function AppointmentDialog({
  open,
  onOpenChange,
  appointment,
  students,
  staff,
  onSave,
  onDelete,
  defaultStudentId
}: AppointmentDialogProps) {
  const NO_STUDENT_VALUE = '__no_student__';

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('1on1_session');
  const [customCategory, setCustomCategory] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [studentId, setStudentId] = useState('');
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isTelehealth, setIsTelehealth] = useState(false);
  const [showStaffSelector, setShowStaffSelector] = useState(false);
  const [showFindStaffSheet, setShowFindStaffSheet] = useState(false);
  
  // Supervision chain enforcement
  const [supervisionStatuses, setSupervisionStatuses] = useState<Map<string, SupervisionStatus>>(new Map());
  const [checkingSupervision, setCheckingSupervision] = useState(false);

  // Check supervision status when selected staff changes
  useEffect(() => {
    const checkSupervision = async () => {
      if (selectedStaffIds.length === 0) {
        setSupervisionStatuses(new Map());
        return;
      }

      // Get RBT/BT staff from selected IDs
      const rbtStaff = selectedStaffIds.filter(id => {
        const staffMember = staff.find(s => s.id === id);
        return staffMember?.credential === 'RBT' || staffMember?.credential === 'BT';
      });

      if (rbtStaff.length === 0) {
        setSupervisionStatuses(new Map());
        return;
      }

      setCheckingSupervision(true);
      try {
        const statuses = await checkMultipleStaffSupervision(rbtStaff);
        setSupervisionStatuses(statuses);
      } finally {
        setCheckingSupervision(false);
      }
    };

    checkSupervision();
  }, [selectedStaffIds, staff]);

  // Calculate supervision blocking status
  const supervisionBlockers = useMemo(() => {
    const blockers: { staffId: string; name: string; reason: string }[] = [];
    
    for (const [staffId, status] of supervisionStatuses) {
      if (!status.hasActiveSupervisor) {
        const staffMember = staff.find(s => s.id === staffId);
        blockers.push({
          staffId,
          name: staffMember?.name || 'Unknown',
          reason: 'Missing supervisor chain',
        });
      }
    }
    
    return blockers;
  }, [supervisionStatuses, staff]);

  const hasSupervisionWarnings = useMemo(() => {
    for (const status of supervisionStatuses.values()) {
      if (status.linkExpiring) return true;
    }
    return false;
  }, [supervisionStatuses]);

  const isBlocked = supervisionBlockers.length > 0;
  useEffect(() => {
    if (appointment) {
      const start = new Date(appointment.start_time);
      const end = new Date(appointment.end_time);
      setSelectedDate(start);
      setStartTime(format(start, 'HH:mm'));
      setEndTime(format(end, 'HH:mm'));
      setStudentId(appointment.student_id || '');
      setTitle(appointment.title || '');
      
      // Parse category from appointment_type (if it's not 'scheduled' or 'retroactive')
      const aptType = appointment.appointment_type;
      if (aptType && aptType !== 'scheduled' && aptType !== 'retroactive') {
        if (APPOINTMENT_CATEGORIES.some(c => c.value === aptType)) {
          setCategory(aptType);
          setCustomCategory('');
        } else {
          setCategory('other');
          setCustomCategory(aptType);
        }
      } else {
        setCategory('1on1_session');
        setCustomCategory('');
      }
      
      // Load staff from array or single value
      if (appointment.staff_user_ids && appointment.staff_user_ids.length > 0) {
        setSelectedStaffIds(appointment.staff_user_ids);
      } else if (appointment.staff_user_id) {
        setSelectedStaffIds([appointment.staff_user_id]);
      } else {
        setSelectedStaffIds([]);
      }
      
      setNotes(appointment.notes || '');
      setIsTelehealth(!!(appointment as any).is_telehealth);
    } else {
      // Reset to defaults
      setTitle('');
      setCategory('1on1_session');
      setCustomCategory('');
      setSelectedDate(new Date());
      setStartTime('09:00');
      setEndTime('10:00');
      setStudentId(defaultStudentId || '');
      setSelectedStaffIds([]);
      setNotes('');
      setIsTelehealth(false);
    }
  }, [appointment, open, defaultStudentId]);

  // Auto-adjust end time when start time changes (keep same duration)
  const handleStartTimeChange = (newStartTime: string) => {
    const currentDuration = calculateDuration(startTime, endTime);
    setStartTime(newStartTime);
    setEndTime(calculateEndTime(newStartTime, currentDuration));
  };

  const handleStaffToggle = (staffId: string) => {
    setSelectedStaffIds(prev => 
      prev.includes(staffId) 
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    );
  };

  const removeStaff = (staffId: string) => {
    setSelectedStaffIds(prev => prev.filter(id => id !== staffId));
  };

  const getStaffName = (id: string) => staff.find(s => s.id === id)?.name || 'Unknown';

  const handleSave = () => {
    if (!selectedDate) return;

    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    const startDateTime = setMinutes(setHours(selectedDate, startHours), startMinutes);
    
    // Handle end time - if it's before start time, it's the next day
    let endDateTime = setMinutes(setHours(selectedDate, endHours), endMinutes);
    if (endDateTime <= startDateTime) {
      endDateTime = addMinutes(endDateTime, 24 * 60); // Add a day
    }
    
    const duration = calculateDuration(startTime, endTime);

    // Determine appointment type - use category or custom
    const appointmentType = category === 'other' && customCategory 
      ? customCategory 
      : category;

    onSave({
      title: title.trim() || null,
      student_id: studentId || null,
      staff_user_id: selectedStaffIds[0] || null,
      staff_user_ids: selectedStaffIds,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      duration_minutes: duration,
      notes: notes || null,
      status: 'scheduled',
      appointment_type: appointmentType,
      is_telehealth: isTelehealth,
    } as any);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {appointment ? 'Edit Appointment' : 'New Appointment'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Supervision Chain Warnings */}
          {isBlocked && (
            <Alert variant="destructive">
              <Link2Off className="h-4 w-4" />
              <AlertDescription>
                <strong>Scheduling blocked:</strong> The following staff require an active supervisor:
                <ul className="mt-1 ml-4 list-disc">
                  {supervisionBlockers.map(b => (
                    <li key={b.staffId}>{b.name} (RBT/BT)</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs">Assign a supervisor before scheduling.</p>
              </AlertDescription>
            </Alert>
          )}

          {hasSupervisionWarnings && !isBlocked && (
            <Alert className="border-warning/50 bg-warning/10">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <AlertDescription className="text-warning">
                Some staff have supervisor links expiring soon. Please review.
              </AlertDescription>
            </Alert>
          )}

          {/* Title field - at the top */}
          <div className="space-y-2">
            <Label>Appointment Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Morning Session, Weekly Check-in..."
            />
            <p className="text-xs text-muted-foreground">
              Optional. This will be displayed on the calendar.
            </p>
          </div>

          {/* Category dropdown */}
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPOINTMENT_CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {category === 'other' && (
              <Input
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Enter custom category..."
                className="mt-2"
              />
            )}
          </div>

          {/* Date picker */}
          <div className="space-y-2">
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
                  {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start Time *</Label>
              <Select value={startTime} onValueChange={handleStartTimeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {TIME_OPTIONS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>End Time *</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {TIME_OPTIONS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Duration display */}
          <p className="text-xs text-muted-foreground -mt-2">
            Duration: {formatDuration(calculateDuration(startTime, endTime))}
            {(() => {
              const [endH, endM] = endTime.split(':').map(Number);
              const [startH, startM] = startTime.split(':').map(Number);
              return (endH * 60 + endM) <= (startH * 60 + startM);
            })() && (
              <span className="ml-1 text-warning">(spans to next day)</span>
            )}
          </p>

          {/* Telehealth toggle */}
          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
            <Checkbox 
              id="is-telehealth"
              checked={isTelehealth}
              onCheckedChange={(checked) => setIsTelehealth(!!checked)}
            />
            <div className="space-y-0.5">
              <Label htmlFor="is-telehealth" className="text-sm font-medium cursor-pointer">
                Telehealth Session
              </Label>
              <p className="text-xs text-muted-foreground">
                Enable if this session will be conducted via video call
              </p>
            </div>
          </div>

          {/* Staff selection - Multiple */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Staff Members
            </Label>
            
            {/* Selected staff badges */}
            {selectedStaffIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedStaffIds.map(id => (
                  <Badge key={id} variant="secondary" className="gap-1">
                    {getStaffName(id)}
                    <button onClick={() => removeStaff(id)} className="ml-1 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Staff selector popover */}
            <div className="flex gap-2">
              <Popover open={showStaffSelector} onOpenChange={setShowStaffSelector}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex-1 justify-start">
                    {selectedStaffIds.length === 0 
                      ? 'Select staff members...' 
                      : `${selectedStaffIds.length} staff selected`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
                  <ScrollArea className="h-[200px]">
                    <div className="p-2 space-y-1">
                      {staff.map(s => (
                        <div 
                          key={s.id} 
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                          onClick={() => handleStaffToggle(s.id)}
                        >
                          <Checkbox 
                            checked={selectedStaffIds.includes(s.id)}
                            onCheckedChange={() => {}}
                            className="pointer-events-none"
                          />
                          <span className="text-sm">{s.name}</span>
                        </div>
                      ))}
                      {staff.length === 0 && (
                        <p className="text-sm text-muted-foreground p-2">No staff available</p>
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
              
              {/* Find Staff button - opens scheduling engine */}
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setShowFindStaffSheet(true)}
                className="gap-1"
              >
                <Sparkles className="w-4 h-4" />
                Find Staff
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Select manually or use "Find Staff" to get constraint-aware suggestions.
            </p>
          </div>

          {/* Student selection (optional) */}
          <div className="space-y-2">
            <Label>Student (optional)</Label>
            <Select
              value={studentId || NO_STUDENT_VALUE}
              onValueChange={(v) => setStudentId(v === NO_STUDENT_VALUE ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select student or leave empty..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_STUDENT_VALUE}>No student (staff-only meeting)</SelectItem>
                {students.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: s.color }} 
                      />
                      {s.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Leave empty for staff meetings without a student.
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {onDelete && (
            <Button variant="destructive" onClick={onDelete} className="sm:mr-auto">
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isBlocked}>
            {isBlocked ? 'Blocked' : appointment ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Find Staff Sheet - opens scheduling engine in a side panel */}
      <Sheet open={showFindStaffSheet} onOpenChange={setShowFindStaffSheet}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Find Available Staff
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <SchedulingEngine 
              clientId={studentId || undefined}
              onStaffSelected={(staffId) => {
                if (!selectedStaffIds.includes(staffId)) {
                  setSelectedStaffIds(prev => [...prev, staffId]);
                }
                setShowFindStaffSheet(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </Dialog>
  );
}
