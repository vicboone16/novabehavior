import { useMemo, useRef, useState } from 'react';
import { format, isSameDay, setHours, setMinutes, differenceInMinutes, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { APPOINTMENT_CATEGORIES } from './AppointmentDialog';
import { calculateOverlapPositions, getOverlapStyle } from '@/lib/scheduleOverlapUtils';
import type { Appointment, CalendarStudent, CalendarStaff } from '@/types/schedule';

interface ScheduleDayViewProps {
  date: Date;
  appointments: Appointment[];
  students: CalendarStudent[];
  staff: CalendarStaff[];
  onAppointmentClick: (appointment: Appointment) => void;
  onDragAppointment: (id: string, newStart: Date, newEnd: Date) => void;
}

const HOUR_HEIGHT = 60; // pixels per hour
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => i);

export function ScheduleDayView({
  date,
  appointments,
  students,
  staff,
  onAppointmentClick,
  onDragAppointment
}: ScheduleDayViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const dayAppointments = useMemo(() => 
    appointments.filter(a => isSameDay(new Date(a.start_time), date)),
    [appointments, date]
  );

  // Calculate overlap positions for side-by-side rendering
  const overlapPositions = useMemo(() => 
    calculateOverlapPositions(dayAppointments),
    [dayAppointments]
  );

  const getStudentName = (id?: string | null) => id ? students.find(s => s.id === id)?.name || 'Unknown' : null;
  const getStudentColor = (id?: string | null) => id ? students.find(s => s.id === id)?.color || '#3B82F6' : '#6B7280';
  
  const getStaffNames = (appointment: Appointment) => {
    const staffIds = appointment.staff_user_ids?.length 
      ? appointment.staff_user_ids 
      : appointment.staff_user_id ? [appointment.staff_user_id] : [];
    
    if (staffIds.length === 0) return undefined;
    return staffIds.map(id => staff.find(s => s.id === id)?.name || 'Unknown').join(', ');
  };

  const getCategoryLabel = (type: string) => {
    if (type === 'scheduled' || type === 'retroactive') return null;
    const cat = APPOINTMENT_CATEGORIES.find(c => c.value === type);
    return cat?.label || type;
  };

  const getDisplayTitle = (appointment: Appointment) => {
    if (appointment.title) return appointment.title;
    const catLabel = getCategoryLabel(appointment.appointment_type);
    if (catLabel) return catLabel;
    return 'Appointment';
  };

  const getAppointmentStyle = (appointment: Appointment) => {
    const start = new Date(appointment.start_time);
    const end = new Date(appointment.end_time);
    const dayStart = startOfDay(date);
    
    const topMinutes = differenceInMinutes(start, dayStart);
    const durationMinutes = differenceInMinutes(end, start);
    
    const top = (topMinutes / 60) * HOUR_HEIGHT;
    const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 20);
    
    return { top, height };
  };

  const handleDragStart = (e: React.DragEvent, appointment: Appointment) => {
    setDraggedId(appointment.id);
    e.dataTransfer.setData('appointmentId', appointment.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const appointmentId = e.dataTransfer.getData('appointmentId');
    if (!appointmentId || !containerRef.current) return;

    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) return;

    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top + containerRef.current.scrollTop;
    
    // Round to nearest 5-minute increment
    const totalMinutes = Math.round((y / HOUR_HEIGHT) * 60 / 5) * 5;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    
    const newStart = setMinutes(setHours(date, hour), minute);
    const duration = appointment.duration_minutes;
    const newEnd = new Date(newStart.getTime() + duration * 60000);

    onDragAppointment(appointmentId, newStart, newEnd);
    setDraggedId(null);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div 
        ref={containerRef}
        className="relative h-[600px] overflow-y-auto"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Time grid */}
        <div className="absolute inset-0">
          {TIME_SLOTS.map(hour => (
            <div 
              key={hour} 
              className="flex border-b border-border/50"
              style={{ height: HOUR_HEIGHT }}
            >
              <div className="w-16 flex-shrink-0 text-xs text-muted-foreground p-1 text-right pr-2 border-r bg-muted/30">
                {format(setHours(new Date(), hour), 'h a')}
              </div>
              <div className="flex-1 relative">
                {/* 30-minute marker */}
                <div 
                  className="absolute left-0 right-0 border-b border-dashed border-border/30"
                  style={{ top: HOUR_HEIGHT / 2 }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Appointments */}
        <div className="absolute left-16 right-0 top-0" style={{ height: 24 * HOUR_HEIGHT }}>
          {dayAppointments.map(appointment => {
            const { top, height } = getAppointmentStyle(appointment);
            const studentColor = getStudentColor(appointment.student_id);
            const isRetroactive = appointment.appointment_type === 'retroactive';
            const displayTitle = getDisplayTitle(appointment);
            const staffNames = getStaffNames(appointment);
            const studentName = getStudentName(appointment.student_id);
            const overlapStyle = getOverlapStyle(appointment.id, overlapPositions, 4);

            return (
              <Tooltip key={appointment.id}>
                <TooltipTrigger asChild>
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, appointment)}
                    onClick={() => onAppointmentClick(appointment)}
                    className={cn(
                      "absolute rounded-md px-2 py-1 cursor-pointer transition-all",
                      "hover:shadow-md hover:z-10",
                      draggedId === appointment.id && "opacity-50",
                      isRetroactive && "border-2 border-dashed"
                    )}
                    style={{
                      top,
                      height,
                      left: overlapStyle.left,
                      width: overlapStyle.width,
                      backgroundColor: `${studentColor}20`,
                      borderColor: studentColor,
                      borderWidth: isRetroactive ? 2 : 1,
                      borderStyle: isRetroactive ? 'dashed' : 'solid'
                    }}
                  >
                    <div className="flex flex-col h-full overflow-hidden">
                      <p className="text-xs font-medium truncate" style={{ color: studentColor }}>
                        {displayTitle}
                        {isRetroactive && ' (Retroactive)'}
                      </p>
                      {staffNames && height > 35 && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          {staffNames}
                        </p>
                      )}
                      {studentName && height > 50 && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          {studentName}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground truncate mt-auto">
                        {format(new Date(appointment.start_time), 'h:mm a')} - {format(new Date(appointment.end_time), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">{displayTitle}</p>
                    {staffNames && <p>Staff: {staffNames}</p>}
                    {studentName && <p>Student: {studentName}</p>}
                    <p>{format(new Date(appointment.start_time), 'h:mm a')} - {format(new Date(appointment.end_time), 'h:mm a')}</p>
                    {getCategoryLabel(appointment.appointment_type) && (
                      <p className="text-muted-foreground">Type: {getCategoryLabel(appointment.appointment_type)}</p>
                    )}
                    {appointment.notes && <p className="text-muted-foreground italic">{appointment.notes}</p>}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* Current time indicator */}
        {isSameDay(date, new Date()) && (
          <div
            className="absolute left-16 right-0 h-0.5 bg-destructive z-20 pointer-events-none"
            style={{
              top: (differenceInMinutes(new Date(), startOfDay(new Date())) / 60) * HOUR_HEIGHT
            }}
          >
            <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-destructive" />
          </div>
        )}
      </div>
    </div>
  );
}
