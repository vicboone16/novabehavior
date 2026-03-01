import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

export interface NextUpEvent {
  schedule_event_id: string;
  client_id: string;
  client_name: string;
  staff_user_id: string | null;
  authorization_id: string | null;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  scheduled_hours: number;
  duration_minutes: number;
  status: string;
  bucket: string | null;
}

export function useNextUpEvents() {
  const { currentAgency } = useAgencyContext();
  const { user } = useAuth();
  const [events, setEvents] = useState<NextUpEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!user || !currentAgency) {
      setEvents([]);
      setLoading(false);
      return;
    }

    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      // Query the normalized view filtered by agency + today + scheduled status
      const { data: scheduleRows, error: schedError } = await supabase
        .from('v_clinical_schedule_events_norm' as any)
        .select('*')
        .eq('agency_id', currentAgency.id)
        .eq('scheduled_date', today)
        .eq('status', 'scheduled')
        .order('start_time', { ascending: true });

      if (schedError) throw schedError;

      if (!scheduleRows || scheduleRows.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }

      // Collect unique client IDs to fetch names
      const clientIds = [...new Set((scheduleRows as any[]).map((r: any) => r.client_id).filter(Boolean))];

      let clientMap: Record<string, string> = {};
      if (clientIds.length > 0) {
        const { data: students } = await supabase
          .from('students')
          .select('id, name')
          .in('id', clientIds);

        if (students) {
          clientMap = Object.fromEntries(students.map((s: any) => [s.id, s.name]));
        }
      }

      const mapped: NextUpEvent[] = (scheduleRows as any[]).map((row: any) => {
        const hours = Number(row.scheduled_hours) || 0;
        return {
          schedule_event_id: row.schedule_event_id,
          client_id: row.client_id,
          client_name: clientMap[row.client_id] || 'Unknown Client',
          staff_user_id: row.staff_user_id,
          authorization_id: row.authorization_id,
          scheduled_date: row.scheduled_date,
          start_time: row.start_time,
          end_time: row.end_time,
          scheduled_hours: hours,
          duration_minutes: Math.round(hours * 60),
          status: row.status,
          bucket: row.bucket,
        };
      });

      setEvents(mapped);
    } catch (err) {
      console.error('Error fetching next-up events:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [user, currentAgency]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const clockIn = useCallback(async (event: NextUpEvent) => {
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: user.id,
        start_time: new Date().toISOString(),
        status: 'active',
        student_ids: event.client_id ? [event.client_id] : [],
        scheduled_item_id: event.schedule_event_id,
        scheduled_item_source: 'clinical_schedule_events',
        authorization_id: event.authorization_id,
        name: `Session – ${event.client_name}`,
      })
      .select()
      .single();

    if (error) throw error;

    // Refresh the list after clocking in
    await fetchEvents();
    return data;
  }, [user, fetchEvents]);

  return { events, loading, clockIn, refresh: fetchEvents };
}
