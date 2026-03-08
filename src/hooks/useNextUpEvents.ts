import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfDay, endOfDay, parseISO, differenceInMinutes } from 'date-fns';

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
  source: 'clinical_schedule_events' | 'appointments';
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
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');

      // ── Source 1: clinical_schedule_events (normalized view) ──
      const schedPromise = supabase
        .from('v_clinical_schedule_events_norm' as any)
        .select('*')
        .eq('agency_id', currentAgency.id)
        .eq('scheduled_date', today)
        .eq('status', 'scheduled')
        .order('start_time', { ascending: true });

      // ── Source 2: appointments table ──
      const apptPromise = supabase
        .from('appointments')
        .select('id, title, student_id, staff_user_id, start_time, end_time, status, linked_session_id, students(first_name, last_name)')
        .or(`staff_user_id.eq.${user.id},created_by.eq.${user.id}`)
        .gte('start_time', startOfDay(now).toISOString())
        .lte('start_time', endOfDay(now).toISOString())
        .in('status', ['scheduled', 'confirmed'])
        .order('start_time', { ascending: true });

      const [schedResult, apptResult] = await Promise.all([schedPromise, apptPromise]);

      // ── Process clinical schedule events ──
      const scheduleRows = (schedResult.data || []) as any[];
      const clinicalClientIds = [...new Set(scheduleRows.map((r: any) => r.client_id).filter(Boolean))];

      let clientMap: Record<string, string> = {};
      if (clinicalClientIds.length > 0) {
        const { data: students } = await supabase
          .from('students')
          .select('id, name')
          .in('id', clinicalClientIds);
        if (students) {
          clientMap = Object.fromEntries(students.map((s: any) => [s.id, s.name]));
        }
      }

      const clinicalEvents: NextUpEvent[] = scheduleRows.map((row: any) => {
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
          source: 'clinical_schedule_events' as const,
        };
      });

      // ── Process appointments ──
      const appointments = (apptResult.data || []) as any[];
      const appointmentEvents: NextUpEvent[] = appointments
        .filter((apt: any) => !apt.linked_session_id) // exclude already-clocked-in
        .map((apt: any) => {
          const start = parseISO(apt.start_time);
          const end = parseISO(apt.end_time);
          const mins = differenceInMinutes(end, start);
          const student = apt.students;
          const clientName = student
            ? `${student.first_name} ${student.last_name || ''}`.trim()
            : apt.title || 'Appointment';

          return {
            schedule_event_id: apt.id,
            client_id: apt.student_id || '',
            client_name: clientName,
            staff_user_id: apt.staff_user_id,
            authorization_id: null,
            scheduled_date: today,
            start_time: apt.start_time,
            end_time: apt.end_time,
            scheduled_hours: mins / 60,
            duration_minutes: mins,
            status: 'scheduled',
            bucket: null,
            source: 'appointments' as const,
          };
        });

      // ── Merge & deduplicate (prefer clinical if same client+time) ──
      const seen = new Set<string>();
      const merged: NextUpEvent[] = [];

      // Clinical events first (higher priority)
      for (const ev of clinicalEvents) {
        const key = `${ev.client_id}|${ev.start_time}`;
        seen.add(key);
        merged.push(ev);
      }
      for (const ev of appointmentEvents) {
        const key = `${ev.client_id}|${ev.start_time}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(ev);
        }
      }

      // Sort by start_time, filter out past events
      merged.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      const upcoming = merged.filter(ev => new Date(ev.end_time) >= now);

      setEvents(upcoming);
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

    const insertPayload: Record<string, any> = {
      user_id: user.id,
      start_time: new Date().toISOString(),
      status: 'active',
      student_ids: event.client_id ? [event.client_id] : [],
      scheduled_item_id: event.schedule_event_id,
      scheduled_item_source: event.source || 'clinical_schedule_events',
      name: `Session – ${event.client_name}`,
    };

    if (event.authorization_id) {
      insertPayload.authorization_id = event.authorization_id;
    }

    const { data, error } = await supabase
      .from('sessions')
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw error;

    // If source is appointments, mark appointment as in-progress
    if (event.source === 'appointments') {
      await supabase
        .from('appointments')
        .update({ linked_session_id: data.id, status: 'in_progress' })
        .eq('id', event.schedule_event_id);
    }

    await fetchEvents();
    return data;
  }, [user, fetchEvents]);

  return { events, loading, clockIn, refresh: fetchEvents };
}
