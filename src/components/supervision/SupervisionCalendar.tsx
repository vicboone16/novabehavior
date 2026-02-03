import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SupervisionEvent {
  id: string;
  supervision_date: string;
  supervisee_name: string;
  supervision_type: string;
  duration_minutes: number;
  status: string;
}

export function SupervisionCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [events, setEvents] = useState<SupervisionEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, [currentMonth]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('supervision_logs')
        .select(`
          id,
          supervision_date,
          supervision_type,
          duration_minutes,
          status,
          supervisee_user_id
        `)
        .gte('supervision_date', startDate)
        .lte('supervision_date', endDate);

      if (error) throw error;

      // Fetch supervisee names
      const superviseeIds = [...new Set(data?.map(d => d.supervisee_user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name')
        .in('user_id', superviseeIds);

      const profileMap = new Map(
        profiles?.map(p => [
          p.user_id,
          p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim()
        ])
      );

      setEvents(
        data?.map(d => ({
          id: d.id,
          supervision_date: d.supervision_date,
          supervisee_name: profileMap.get(d.supervisee_user_id) || 'Unknown',
          supervision_type: d.supervision_type,
          duration_minutes: d.duration_minutes,
          status: d.status,
        })) || []
      );
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  };

  const eventsForSelectedDate = events.filter(e => 
    selectedDate && isSameDay(new Date(e.supervision_date), selectedDate)
  );

  const datesWithEvents = events.map(e => new Date(e.supervision_date));

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Supervision Calendar</CardTitle>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            modifiers={{
              hasEvents: datesWithEvents,
            }}
            modifiersClassNames={{
              hasEvents: 'bg-primary/20 font-bold',
            }}
            className="rounded-md border"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : eventsForSelectedDate.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No supervision sessions scheduled for this date.
            </div>
          ) : (
            <div className="space-y-3">
              {eventsForSelectedDate.map((event) => (
                <div
                  key={event.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{event.supervisee_name}</span>
                    <Badge 
                      variant={event.status === 'approved' ? 'default' : 'secondary'}
                    >
                      {event.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <span className="capitalize">{event.supervision_type}</span>
                    <span>•</span>
                    <span>{event.duration_minutes} min</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
