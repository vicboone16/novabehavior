import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar, MapPin, Clock, Video } from 'lucide-react';
import { format, startOfDay, endOfDay, parseISO } from 'date-fns';

export function ScheduleOverviewWidget() {
  const { user } = useAuth();
  const today = new Date();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['dashboard-schedule', user?.id, format(today, 'yyyy-MM-dd')],
    enabled: !!user,
    refetchInterval: 60_000, // Refresh every minute to clear ended appointments
    queryFn: async () => {
      const { data } = await supabase
        .from('appointments')
        .select('id, title, start_time, end_time, status, is_telehealth, location_detail, student_id, students(first_name, last_name)')
        .or(`staff_user_id.eq.${user!.id},created_by.eq.${user!.id}`)
        .gte('start_time', startOfDay(today).toISOString())
        .lte('start_time', endOfDay(today).toISOString())
        .not('status', 'in', '(cancelled,completed)')
        .order('start_time', { ascending: true })
        .limit(10);
      
      // Filter out past appointments (ended more than 15 min ago)
      const cutoff = new Date(Date.now() - 15 * 60 * 1000);
      return (data || []).filter((apt: any) => new Date(apt.end_time) > cutoff);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 rounded-md bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
        <Calendar className="w-8 h-8" />
        <p className="text-xs">No appointments today</p>
      </div>
    );
  }

  const now = new Date();

  return (
    <div className="space-y-1.5">
      {appointments.map((apt: any) => {
        const startTime = parseISO(apt.start_time);
        const endTime = parseISO(apt.end_time);
        const isPast = endTime < now;
        const isCurrent = startTime <= now && endTime >= now;
        const student = apt.students;
        const clientName = student ? `${student.first_name} ${student.last_name?.[0] || ''}.` : apt.title || 'Appointment';

        return (
          <div key={apt.id} className={`flex items-center gap-2 p-2 rounded-md transition-colors ${isCurrent ? 'bg-primary/10 border border-primary/30' : isPast ? 'bg-muted/20 opacity-60' : 'bg-muted/30 hover:bg-muted/50'}`}>
            <div className="text-center shrink-0 w-10">
              <p className="text-xs font-bold text-foreground">{format(startTime, 'h:mm')}</p>
              <p className="text-[10px] text-muted-foreground">{format(startTime, 'a')}</p>
            </div>
            <div className="w-px h-8 bg-border shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{clientName}</p>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                {apt.is_telehealth ? (
                  <span className="flex items-center gap-0.5"><Video className="w-2.5 h-2.5" /> Telehealth</span>
                ) : apt.location_detail ? (
                  <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" /> {apt.location_detail}</span>
                ) : null}
                <span className="flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  {format(startTime, 'h:mm a')} – {format(endTime, 'h:mm a')}
                </span>
              </div>
            </div>
            {isCurrent && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-medium">Now</span>}
            {apt.status === 'cancelled' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">Cancelled</span>}
          </div>
        );
      })}
    </div>
  );
}
