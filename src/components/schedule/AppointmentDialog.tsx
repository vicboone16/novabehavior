import { useState, useEffect } from 'react';
import { format, addMinutes, setHours, setMinutes } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarIcon, Trash2, X, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
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

const DURATION_OPTIONS = [
  { value: 5, label: '5 min' },
  { value: 10, label: '10 min' },
  { value: 15, label: '15 min' },
  { value: 20, label: '20 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const hour = Math.floor(i / 4);
  const minute = (i % 4) * 15;
  const date = setMinutes(setHours(new Date(), hour), minute);
  return {
    value: format(date, 'HH:mm'),
    label: format(date, 'h:mm a')
  };
});

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
  const [duration, setDuration] = useState(30);
  const [studentId, setStudentId] = useState('');
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [showStaffSelector, setShowStaffSelector] = useState(false);

  useEffect(() => {
    if (appointment) {
      const start = new Date(appointment.start_time);
      setSelectedDate(start);
      setStartTime(format(start, 'HH:mm'));
      setDuration(appointment.duration_minutes);
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
    } else {
      // Reset to defaults
      setTitle('');
      setCategory('1on1_session');
      setCustomCategory('');
      setSelectedDate(new Date());
      setStartTime('09:00');
      setDuration(30);
      setStudentId(defaultStudentId || '');
      setSelectedStaffIds([]);
      setNotes('');
    }
  }, [appointment, open, defaultStudentId]);

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

    const [hours, minutes] = startTime.split(':').map(Number);
    const startDateTime = setMinutes(setHours(selectedDate, hours), minutes);
    const endDateTime = addMinutes(startDateTime, duration);

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
      appointment_type: appointmentType
    });
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

          {/* Time and duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start Time *</Label>
              <Select value={startTime} onValueChange={setStartTime}>
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
              <Label>Duration *</Label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map(d => (
                    <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Popover open={showStaffSelector} onOpenChange={setShowStaffSelector}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
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
            <p className="text-xs text-muted-foreground">
              Select one or more staff members. Leave empty for unassigned.
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
          <Button onClick={handleSave}>
            {appointment ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
