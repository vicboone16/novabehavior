import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { TOIEvent, TOIEventInput, TOIEventType, TOILocation, TOIContributor } from '@/types/toi';

interface UseTOIEventsOptions {
  studentId?: string;
  dateRange?: { start: Date; end: Date };
  eventType?: TOIEventType;
  location?: TOILocation;
  statusFilter?: 'all' | 'running' | 'ended';
}

interface TOISummary {
  totalMinutes: number;
  episodes: number;
  avgDuration: number;
  longestEpisode: number;
}

export function useTOIEvents(options: UseTOIEventsOptions = {}) {
  const { user } = useAuth();
  const [events, setEvents] = useState<TOIEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEvent, setActiveEvent] = useState<TOIEvent | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!options.studentId) {
      setEvents([]);
      setActiveEvent(null);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('context_barriers_events')
        .select('*')
        .eq('student_id', options.studentId)
        .order('start_time', { ascending: false });

      if (options.dateRange) {
        query = query
          .gte('start_time', options.dateRange.start.toISOString())
          .lte('start_time', options.dateRange.end.toISOString());
      }

      if (options.eventType) {
        query = query.eq('event_type', options.eventType);
      }

      if (options.location) {
        query = query.eq('location', options.location);
      }

      if (options.statusFilter === 'running') {
        query = query.eq('is_active', true);
      } else if (options.statusFilter === 'ended') {
        query = query.eq('is_active', false);
      }

      const { data, error } = await query;

      if (error) throw error;

      const typedData = (data || []).map((row: any) => ({
        id: row.id,
        student_id: row.student_id,
        event_group: row.event_group,
        event_type: row.event_type as TOIEventType,
        display_label: row.display_label,
        start_time: row.start_time,
        end_time: row.end_time,
        duration_minutes: row.duration_minutes,
        is_active: row.is_active,
        location: row.location as TOILocation | null,
        suspected_contributor: row.suspected_contributor as TOIContributor | null,
        notes: row.notes,
        created_by_user_id: row.created_by_user_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
      })) as TOIEvent[];
      
      setEvents(typedData);
      setActiveEvent(typedData.find(e => e.is_active) || null);
    } catch (error: any) {
      console.error('Error fetching TOI events:', error);
      toast({
        title: 'Error loading TOI events',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [options.studentId, options.dateRange?.start?.toISOString(), options.dateRange?.end?.toISOString(), options.eventType, options.location, options.statusFilter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!options.studentId) return;

    const channel = supabase
      .channel(`toi_events_${options.studentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'context_barriers_events',
          filter: `student_id=eq.${options.studentId}`,
        },
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [options.studentId, fetchEvents]);

  const startTOI = useCallback(async (input: TOIEventInput) => {
    if (!user?.id) {
      toast({ title: 'Not authenticated', variant: 'destructive' });
      return null;
    }

    try {
      const insertData = {
        student_id: input.student_id,
        event_type: input.event_type,
        display_label: input.display_label,
        start_time: input.start_time,
        end_time: input.end_time || null,
        location: input.location || null,
        suspected_contributor: input.suspected_contributor || null,
        notes: input.notes || null,
        created_by_user_id: user.id,
        is_active: true,
      };

      const { data, error } = await supabase
        .from('context_barriers_events')
        .insert(insertData as any)
        .select()
        .single();

      if (error) {
        if (error.message.includes('already has a TOI block running')) {
          toast({
            title: 'TOI Already Running',
            description: 'This student already has a TOI block running. End it before starting a new one.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return null;
      }

      toast({
        title: 'TOI Started',
        description: `Started tracking ${input.display_label}`,
      });

      return data as unknown as TOIEvent;
    } catch (error: any) {
      console.error('Error starting TOI:', error);
      toast({
        title: 'Error starting TOI',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [user?.id]);

  const endTOI = useCallback(async (eventId: string, endTime?: string) => {
    try {
      const { data, error } = await supabase
        .from('context_barriers_events')
        .update({
          end_time: endTime || new Date().toISOString(),
          is_active: false,
        } as any)
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'TOI Ended',
        description: `Duration: ${(data as any).duration_minutes} minutes`,
      });

      return data as unknown as TOIEvent;
    } catch (error: any) {
      console.error('Error ending TOI:', error);
      toast({
        title: 'Error ending TOI',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, []);

  const updateTOI = useCallback(async (eventId: string, updates: Partial<TOIEventInput>) => {
    try {
      const { data, error } = await supabase
        .from('context_barriers_events')
        .update(updates as any)
        .eq('id', eventId)
        .select()
        .single();

      if (error) {
        if (error.message.includes('overlaps')) {
          toast({
            title: 'Overlap Detected',
            description: 'This TOI block overlaps an existing entry for this student. Please adjust the start/end time.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return null;
      }

      toast({ title: 'TOI Updated' });
      return data as unknown as TOIEvent;
    } catch (error: any) {
      console.error('Error updating TOI:', error);
      toast({
        title: 'Error updating TOI',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, []);

  const deleteTOI = useCallback(async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('context_barriers_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast({ title: 'TOI Entry Deleted' });
      return true;
    } catch (error: any) {
      console.error('Error deleting TOI:', error);
      toast({
        title: 'Error deleting TOI',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  }, []);

  const addManualEntry = useCallback(async (input: TOIEventInput & { end_time: string }) => {
    if (!user?.id) {
      toast({ title: 'Not authenticated', variant: 'destructive' });
      return null;
    }

    try {
      const insertData = {
        student_id: input.student_id,
        event_type: input.event_type,
        display_label: input.display_label,
        start_time: input.start_time,
        end_time: input.end_time,
        location: input.location || null,
        suspected_contributor: input.suspected_contributor || null,
        notes: input.notes || null,
        created_by_user_id: user.id,
        is_active: false,
      };

      const { data, error } = await supabase
        .from('context_barriers_events')
        .insert(insertData as any)
        .select()
        .single();

      if (error) {
        if (error.message.includes('overlaps')) {
          toast({
            title: 'Overlap Detected',
            description: 'This TOI block overlaps an existing entry for this student. Please adjust the start/end time.',
            variant: 'destructive',
          });
        } else {
          throw error;
        }
        return null;
      }

      toast({
        title: 'TOI Entry Added',
        description: `Added ${input.display_label} (${(data as any).duration_minutes} min)`,
      });

      return data as unknown as TOIEvent;
    } catch (error: any) {
      console.error('Error adding TOI entry:', error);
      toast({
        title: 'Error adding TOI entry',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  }, [user?.id]);

  // Calculate summaries
  const calculateSummary = useCallback((eventsToSum: TOIEvent[]): TOISummary => {
    const endedEvents = eventsToSum.filter(e => !e.is_active && e.duration_minutes !== null);
    const totalMinutes = endedEvents.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);
    const episodes = endedEvents.length;
    const avgDuration = episodes > 0 ? Math.round(totalMinutes / episodes) : 0;
    const longestEpisode = endedEvents.length > 0 
      ? Math.max(...endedEvents.map(e => e.duration_minutes || 0))
      : 0;

    return { totalMinutes, episodes, avgDuration, longestEpisode };
  }, []);

  const getTodaySummary = useCallback((): TOISummary => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEvents = events.filter(e => new Date(e.start_time) >= today);
    return calculateSummary(todayEvents);
  }, [events, calculateSummary]);

  const getWeekSummary = useCallback((): TOISummary => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    const weekEvents = events.filter(e => new Date(e.start_time) >= weekAgo);
    return calculateSummary(weekEvents);
  }, [events, calculateSummary]);

  const getRangeSummary = useCallback((start: Date, end: Date): TOISummary => {
    const rangeEvents = events.filter(e => {
      const eventDate = new Date(e.start_time);
      return eventDate >= start && eventDate <= end;
    });
    return calculateSummary(rangeEvents);
  }, [events, calculateSummary]);

  return {
    events,
    loading,
    activeEvent,
    startTOI,
    endTOI,
    updateTOI,
    deleteTOI,
    addManualEntry,
    refetch: fetchEvents,
    getTodaySummary,
    getWeekSummary,
    getRangeSummary,
  };
}

// Hook for fetching active TOI across all students (for Teacher Mode)
export function useAllActiveTOI() {
  const [activeEvents, setActiveEvents] = useState<(TOIEvent & { student_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActiveEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('context_barriers_events')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      // Fetch student names separately
      const studentIds = [...new Set((data || []).map((e: any) => e.student_id))];
      let studentNames: Record<string, string> = {};
      
      if (studentIds.length > 0) {
        const { data: students } = await supabase
          .from('students')
          .select('id, name')
          .in('id', studentIds);
        
        studentNames = (students || []).reduce((acc: Record<string, string>, s: any) => {
          acc[s.id] = s.name;
          return acc;
        }, {});
      }

      const mapped = (data || []).map((e: any) => ({
        ...e,
        student_name: studentNames[e.student_id],
      }));

      setActiveEvents(mapped);
    } catch (error) {
      console.error('Error fetching active TOI events:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveEvents();

    // Subscribe to realtime
    const channel = supabase
      .channel('all_active_toi')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'context_barriers_events',
        },
        () => {
          fetchActiveEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActiveEvents]);

  return { activeEvents, loading, refetch: fetchActiveEvents };
}
