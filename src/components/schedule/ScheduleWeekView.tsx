import { useMemo, useRef, useState } from 'react';
import { 
  format, startOfWeek, addDays, isSameDay, setHours, setMinutes, 
  differenceInMinutes, startOfDay, isToday 
} from 'date-fns';
import { CheckCircle2, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { APPOINTMENT_CATEGORIES } from './AppointmentDialog';
import { calculateOverlapPositions, getOverlapStyle } from '@/lib/scheduleOverlapUtils';
import type { Appointment, CalendarStudent, CalendarStaff } from '@/types/schedule';

interface ScheduleWeekViewProps {
  date: Date;
  appointments: Appointment[];
  students: CalendarStudent[];
  staff: CalendarStaff[];
  onAppointmentClick: (appointment: Appointment) => void;
  onDragAppointment: (id: string, newStart: Date, newEnd: Date) => void;
}

const HOUR_HEIGHT = 48;
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => i);

// Status-based colors for calendar display
const getStatusColors = (status: string) => {
  switch (status) {
    case 'completed':
      return { bg: 'hsl(var(--primary) / 0.15)', border: 'hsl(var(--primary))', text: 'hsl(var(--primary))' };
    case 'canceled':
      return { bg: 'hsl(var(--muted))', border: 'hsl(var(--muted-foreground) / 0.5)', text: 'hsl(var(--muted-foreground))' };
    case 'rescheduled':
      return { bg: 'hsl(280, 70%, 50%, 0.15)', border: 'hsl(280, 70%, 50%)', text: 'hsl(280, 70%, 50%)' };
    case 'no_show':
    case 'did_not_occur':
      return { bg: 'hsl(var(--destructive) / 0.15)', border: 'hsl(var(--destructive))', text: 'hsl(var(--destructive))' };
    case 'pending_verification':
      return { bg: 'hsl(var(--warning) / 0.15)', border: 'hsl(var(--warning))', text: 'hsl(var(--warning))' };
    default: // scheduled
      return null; // Use student color
  }
};

export function ScheduleWeekView({
  date,
  appointments,
  students,
  staff,
  onAppointmentClick,
  onDragAppointment
}: ScheduleWeekViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  
  const weekStart = startOfWeek(date);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

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

  const getAppointmentsByDay = (day: Date) =>
    appointments.filter(a => isSameDay(new Date(a.start_time), day));

  const getAppointmentStyle = (appointment: Appointment, day: Date) => {
    const start = new Date(appointment.start_time);
    const end = new Date(appointment.end_time);
    const dayStart = startOfDay(day);
    
    const topMinutes = differenceInMinutes(start, dayStart);
    const durationMinutes = differenceInMinutes(end, start);
    
    const top = (topMinutes / 60) * HOUR_HEIGHT;
    const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 16);
    
    return { top, height };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-3 h-3" />;
      case 'canceled': return <XCircle className="w-3 h-3" />;
      case 'no_show': return <AlertTriangle className="w-3 h-3" />;
      case 'pending_verification': return <Clock className="w-3 h-3" />;
      default: return null;
    }
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

  const handleDrop = (e: React.DragEvent, targetDay: Date) => {
    e.preventDefault();
    const appointmentId = e.dataTransfer.getData('appointmentId');
    if (!appointmentId) return;

    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) return;

    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const y = e.clientY - rect.top;
    
    const totalMinutes = Math.round((y / HOUR_HEIGHT) * 60 / 5) * 5;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    
    const newStart = setMinutes(setHours(targetDay, hour), minute);
    const duration = appointment.duration_minutes;
    const newEnd = new Date(newStart.getTime() + duration * 60000);

    onDragAppointment(appointmentId, newStart, newEnd);
    setDraggedId(null);
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex border-b bg-muted/30">
        <div className="w-14 flex-shrink-0" />
        {weekDays.map(day => (
          <div 
            key={day.toISOString()} 
            className={cn(
              "flex-1 text-center py-2 border-l",
              isToday(day) && "bg-primary/10"
            )}
          >
            <p className="text-xs text-muted-foreground">{format(day, 'EEE')}</p>
            <p className={cn(
              "text-sm font-medium",
              isToday(day) && "text-primary"
            )}>
              {format(day, 'd')}
            </p>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div ref={containerRef} className="relative h-[500px] overflow-y-auto flex">
        {/* Time column */}
        <div className="w-14 flex-shrink-0 border-r bg-muted/20">
          {TIME_SLOTS.map(hour => (
            <div 
              key={hour} 
              className="text-[10px] text-muted-foreground text-right pr-2 pt-0.5"
              style={{ height: HOUR_HEIGHT }}
            >
              {format(setHours(new Date(), hour), 'ha')}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDays.map(day => (
          <div 
            key={day.toISOString()} 
            className={cn(
              "flex-1 relative border-l",
              isToday(day) && "bg-primary/5"
            )}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, day)}
          >
            {/* Hour lines */}
            {TIME_SLOTS.map(hour => (
              <div 
                key={hour} 
                className="border-b border-border/30"
                style={{ height: HOUR_HEIGHT }}
              />
            ))}

            {/* Appointments */}
            {(() => {
              const dayAppts = getAppointmentsByDay(day);
              const dayOverlapPositions = calculateOverlapPositions(dayAppts);
              
              return dayAppts.map(appointment => {
                const { top, height } = getAppointmentStyle(appointment, day);
                const studentColor = getStudentColor(appointment.student_id);
                const statusColors = getStatusColors(appointment.status);
                const isRetroactive = appointment.appointment_type === 'retroactive';
                const displayTitle = getDisplayTitle(appointment);
                const staffNames = getStaffNames(appointment);
                const studentName = getStudentName(appointment.student_id);
                const statusIcon = getStatusIcon(appointment.status);
                const overlapStyle = getOverlapStyle(appointment.id, dayOverlapPositions, 2);

                // Use status colors if available, otherwise student color
                const bgColor = statusColors?.bg || `${studentColor}25`;
                const borderColor = statusColors?.border || studentColor;
                const textColor = statusColors?.text || studentColor;

                return (
                  <Tooltip key={appointment.id}>
                    <TooltipTrigger asChild>
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, appointment)}
                        onClick={() => onAppointmentClick(appointment)}
                        className={cn(
                          "absolute rounded px-1 py-0.5 cursor-pointer",
                          "text-[10px] overflow-hidden hover:z-10 hover:shadow-md transition-shadow",
                          draggedId === appointment.id && "opacity-50",
                          appointment.status === 'canceled' && "line-through opacity-60"
                        )}
                        style={{
                          top,
                          height,
                          left: overlapStyle.left,
                          width: overlapStyle.width,
                          backgroundColor: bgColor,
                          borderLeft: `3px solid ${borderColor}`,
                          borderStyle: isRetroactive ? 'dashed' : 'solid'
                        }}
                      >
                      <p className="font-medium truncate flex items-center gap-1" style={{ color: textColor }}>
                        {statusIcon}
                        {displayTitle}
                      </p>
                      {height > 24 && staffNames && (
                        <p className="text-muted-foreground truncate">
                          {staffNames}
                        </p>
                      )}
                      {height > 36 && (
                        <p className="text-muted-foreground truncate">
                          {format(new Date(appointment.start_time), 'h:mma')}
                        </p>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <div className="space-y-1 text-sm">
                      <p className="font-medium flex items-center gap-1">
                        {statusIcon}
                        {displayTitle}
                      </p>
                      <Badge variant="outline" className="text-xs capitalize">
                        {appointment.status.replace(/_/g, ' ')}
                      </Badge>
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
              });
            })()}

            {/* Current time indicator */}
            {isToday(day) && (
              <div
                className="absolute left-0 right-0 h-0.5 bg-destructive z-10 pointer-events-none"
                style={{
                  top: (differenceInMinutes(new Date(), startOfDay(new Date())) / 60) * HOUR_HEIGHT
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
