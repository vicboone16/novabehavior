import { useMemo, useState } from 'react';
import { 
  format, isSameDay, setHours, setMinutes, 
  differenceInMinutes, startOfDay 
} from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import type { Appointment, CalendarStudent, CalendarStaff, FilterMode } from '@/types/schedule';

interface ScheduleTimelineProps {
  date: Date;
  appointments: Appointment[];
  students: CalendarStudent[];
  staff: CalendarStaff[];
  filterMode: FilterMode;
  onAppointmentClick: (appointment: Appointment) => void;
  onDragAppointment: (id: string, newStart: Date, newEnd: Date) => void;
}

const HOUR_WIDTH = 80;
const ROW_HEIGHT = 50;
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => i);

export function ScheduleTimeline({
  date,
  appointments,
  students,
  staff,
  filterMode,
  onAppointmentClick,
  onDragAppointment
}: ScheduleTimelineProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const dayAppointments = useMemo(() => 
    appointments.filter(a => isSameDay(new Date(a.start_time), date)),
    [appointments, date]
  );

  // Determine rows based on filter mode
  const rows = useMemo(() => {
    if (filterMode === 'all' || filterMode === 'my') {
      // Show staff rows
      const staffWithAppointments = new Set(dayAppointments.map(a => a.staff_user_id).filter(Boolean));
      return staff
        .filter(s => staffWithAppointments.has(s.id) || filterMode === 'all')
        .map(s => ({ id: s.id, name: s.name, type: 'staff' as const }));
    } else if (filterMode === 'student') {
      // Show student rows
      return students.map(s => ({ id: s.id, name: s.name, type: 'student' as const, color: s.color }));
    } else {
      // Staff filter - show selected staff's students
      return students.map(s => ({ id: s.id, name: s.name, type: 'student' as const, color: s.color }));
    }
  }, [filterMode, staff, students, dayAppointments]);

  const getStudentColor = (id: string) => students.find(s => s.id === id)?.color || '#3B82F6';
  const getStudentName = (id: string) => students.find(s => s.id === id)?.name || 'Unknown';

  const getAppointmentsForRow = (rowId: string, rowType: 'staff' | 'student') => {
    if (rowType === 'staff') {
      return dayAppointments.filter(a => a.staff_user_id === rowId);
    }
    return dayAppointments.filter(a => a.student_id === rowId);
  };

  const getAppointmentStyle = (appointment: Appointment) => {
    const start = new Date(appointment.start_time);
    const end = new Date(appointment.end_time);
    const dayStart = startOfDay(date);
    
    const leftMinutes = differenceInMinutes(start, dayStart);
    const durationMinutes = differenceInMinutes(end, start);
    
    const left = (leftMinutes / 60) * HOUR_WIDTH;
    const width = Math.max((durationMinutes / 60) * HOUR_WIDTH, 40);
    
    return { left, width };
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
    if (!appointmentId) return;

    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) return;

    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    const totalMinutes = Math.round((x / HOUR_WIDTH) * 60 / 5) * 5;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    
    const newStart = setMinutes(setHours(date, hour), minute);
    const duration = appointment.duration_minutes;
    const newEnd = new Date(newStart.getTime() + duration * 60000);

    onDragAppointment(appointmentId, newStart, newEnd);
    setDraggedId(null);
  };

  const currentTimePosition = useMemo(() => {
    if (!isSameDay(date, new Date())) return null;
    const now = new Date();
    const dayStart = startOfDay(now);
    const minutes = differenceInMinutes(now, dayStart);
    return (minutes / 60) * HOUR_WIDTH;
  }, [date]);

  return (
    <div className="border rounded-lg overflow-hidden">
      <ScrollArea className="w-full">
        <div className="min-w-max">
          {/* Header - Time slots */}
          <div className="flex border-b bg-muted/30 sticky top-0 z-10">
            <div className="w-32 flex-shrink-0 border-r p-2 text-xs font-medium text-muted-foreground">
              {filterMode === 'student' ? 'Student' : 'Staff'}
            </div>
            {TIME_SLOTS.map(hour => (
              <div 
                key={hour} 
                className="text-center py-2 text-xs text-muted-foreground border-l"
                style={{ width: HOUR_WIDTH }}
              >
                {format(setHours(new Date(), hour), 'ha')}
              </div>
            ))}
          </div>

          {/* Rows */}
          {rows.map(row => (
            <div 
              key={row.id} 
              className="flex border-b relative"
              style={{ height: ROW_HEIGHT }}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {/* Row label */}
              <div className="w-32 flex-shrink-0 border-r p-2 flex items-center gap-2 bg-muted/10">
                {row.type === 'student' && 'color' in row && (
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: row.color }} 
                  />
                )}
                <span className="text-sm truncate">{row.name}</span>
              </div>

              {/* Time grid */}
              <div 
                className="relative flex-1"
                style={{ width: 24 * HOUR_WIDTH }}
              >
                {/* Hour lines */}
                {TIME_SLOTS.map(hour => (
                  <div
                    key={hour}
                    className="absolute top-0 bottom-0 border-l border-border/30"
                    style={{ left: hour * HOUR_WIDTH }}
                  />
                ))}

                {/* Appointments */}
                {getAppointmentsForRow(row.id, row.type).map(appointment => {
                  const { left, width } = getAppointmentStyle(appointment);
                  const studentColor = getStudentColor(appointment.student_id);
                  const isRetroactive = appointment.appointment_type === 'retroactive';

                  return (
                    <div
                      key={appointment.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, appointment)}
                      onClick={() => onAppointmentClick(appointment)}
                      className={cn(
                        "absolute top-1 bottom-1 rounded-md px-2 cursor-pointer",
                        "flex items-center gap-1 overflow-hidden",
                        "hover:shadow-md hover:z-10 transition-shadow",
                        draggedId === appointment.id && "opacity-50"
                      )}
                      style={{
                        left,
                        width,
                        backgroundColor: `${studentColor}25`,
                        borderLeft: `3px solid ${studentColor}`,
                        borderStyle: isRetroactive ? 'dashed' : 'solid'
                      }}
                    >
                      <span className="text-xs font-medium truncate" style={{ color: studentColor }}>
                        {row.type === 'staff' ? getStudentName(appointment.student_id) : null}
                        {format(new Date(appointment.start_time), 'h:mma')}
                      </span>
                    </div>
                  );
                })}

                {/* Current time indicator */}
                {currentTimePosition !== null && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-destructive z-10 pointer-events-none"
                    style={{ left: currentTimePosition }}
                  />
                )}
              </div>
            </div>
          ))}

          {rows.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No {filterMode === 'student' ? 'students' : 'staff members'} to display
            </div>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
