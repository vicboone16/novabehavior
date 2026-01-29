import { useMemo } from 'react';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  addDays, isSameMonth, isSameDay, isToday 
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { APPOINTMENT_CATEGORIES } from './AppointmentDialog';
import type { Appointment, CalendarStudent, CalendarStaff } from '@/types/schedule';

interface ScheduleMonthViewProps {
  date: Date;
  appointments: Appointment[];
  students: CalendarStudent[];
  staff: CalendarStaff[];
  onAppointmentClick: (appointment: Appointment) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ScheduleMonthView({
  date,
  appointments,
  students,
  staff,
  onAppointmentClick
}: ScheduleMonthViewProps) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  // Generate all days in the calendar view
  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    let current = calendarStart;
    while (current <= calendarEnd) {
      days.push(current);
      current = addDays(current, 1);
    }
    return days;
  }, [calendarStart, calendarEnd]);

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

  // Split into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-7 border-b bg-muted/30">
        {WEEKDAYS.map(day => (
          <div key={day} className="text-center py-2 text-xs font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="divide-y">
        {weeks.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7 divide-x">
            {week.map(day => {
              const dayAppointments = getAppointmentsByDay(day);
              const isCurrentMonth = isSameMonth(day, date);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-[100px] p-1",
                    !isCurrentMonth && "bg-muted/20",
                    isCurrentDay && "bg-primary/5"
                  )}
                >
                  <div className={cn(
                    "text-xs font-medium mb-1",
                    !isCurrentMonth && "text-muted-foreground",
                    isCurrentDay && "text-primary"
                  )}>
                    <span className={cn(
                      "inline-flex items-center justify-center w-6 h-6 rounded-full",
                      isCurrentDay && "bg-primary text-primary-foreground"
                    )}>
                      {format(day, 'd')}
                    </span>
                  </div>

                  <div className="space-y-0.5 overflow-hidden">
                    {dayAppointments.slice(0, 3).map(appointment => {
                      const studentColor = getStudentColor(appointment.student_id);
                      const isRetroactive = appointment.appointment_type === 'retroactive';
                      const displayTitle = getDisplayTitle(appointment);
                      const staffNames = getStaffNames(appointment);
                      const studentName = getStudentName(appointment.student_id);

                      return (
                        <Tooltip key={appointment.id}>
                          <TooltipTrigger asChild>
                            <div
                              onClick={() => onAppointmentClick(appointment)}
                              className={cn(
                                "text-[10px] px-1 py-0.5 rounded truncate cursor-pointer",
                                "hover:opacity-80 transition-opacity",
                                isRetroactive && "border border-dashed"
                              )}
                              style={{
                                backgroundColor: `${studentColor}20`,
                                color: studentColor,
                                borderColor: isRetroactive ? studentColor : undefined
                              }}
                            >
                              {format(new Date(appointment.start_time), 'h:mma')} {displayTitle}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-1 text-sm">
                              <p className="font-medium">{displayTitle}</p>
                              {staffNames && <p>Staff: {staffNames}</p>}
                              {studentName && <p>Student: {studentName}</p>}
                              <p>{format(new Date(appointment.start_time), 'h:mm a')} - {format(new Date(appointment.end_time), 'h:mm a')}</p>
                              {appointment.notes && <p className="text-muted-foreground italic">{appointment.notes}</p>}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                    {dayAppointments.length > 3 && (
                      <div className="text-[10px] text-muted-foreground px-1">
                        +{dayAppointments.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
