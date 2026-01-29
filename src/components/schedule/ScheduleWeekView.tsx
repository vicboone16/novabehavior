import { useMemo, useRef, useState } from 'react';
import { 
  format, startOfWeek, addDays, isSameDay, setHours, setMinutes, 
  differenceInMinutes, startOfDay, isToday 
} from 'date-fns';
import { cn } from '@/lib/utils';
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

  const getStudentName = (id?: string | null) => id ? students.find(s => s.id === id)?.name || 'Unknown' : 'Staff Only';
  const getStudentColor = (id?: string | null) => id ? students.find(s => s.id === id)?.color || '#3B82F6' : '#6B7280';

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
            {getAppointmentsByDay(day).map(appointment => {
              const { top, height } = getAppointmentStyle(appointment, day);
              const studentColor = getStudentColor(appointment.student_id);
              const isRetroactive = appointment.appointment_type === 'retroactive';

              return (
                <div
                  key={appointment.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, appointment)}
                  onClick={() => onAppointmentClick(appointment)}
                  className={cn(
                    "absolute left-0.5 right-0.5 rounded px-1 py-0.5 cursor-pointer",
                    "text-[10px] overflow-hidden hover:z-10 hover:shadow-md transition-shadow",
                    draggedId === appointment.id && "opacity-50"
                  )}
                  style={{
                    top,
                    height,
                    backgroundColor: `${studentColor}25`,
                    borderLeft: `3px solid ${studentColor}`,
                    borderStyle: isRetroactive ? 'dashed' : 'solid'
                  }}
                >
                  <p className="font-medium truncate" style={{ color: studentColor }}>
                    {getStudentName(appointment.student_id)}
                  </p>
                  {height > 24 && (
                    <p className="text-muted-foreground truncate">
                      {format(new Date(appointment.start_time), 'h:mma')}
                    </p>
                  )}
                </div>
              );
            })}

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
