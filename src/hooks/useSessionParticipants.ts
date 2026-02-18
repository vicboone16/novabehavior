import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ParticipantRole = 'data_collector' | 'lead' | 'observer';
export type NoteDelegateMethod = 'starter' | 'claimed' | 'bcba_assigned';

export interface SessionParticipant {
  id: string;
  session_id: string;
  user_id: string;
  student_ids: string[];
  joined_at: string;
  left_at: string | null;
  role: ParticipantRole;
  note_delegate: boolean;
  note_delegate_assigned_by: string | null;
  note_delegate_assigned_at: string | null;
  // joined from profiles
  display_name?: string;
  first_name?: string;
  last_name?: string;
}

export interface ActiveSharedSession {
  session_id: string;
  student_ids: string[];
  started_by_user_id: string;
  started_by_name: string;
  started_at: string;
  participant_count: number;
  appointment_ids: string[];
}

export function useSessionParticipants(sessionId: string | null) {
  const { user } = useAuth();
  const [participants, setParticipants] = useState<SessionParticipant[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchParticipants = useCallback(async () => {
    if (!sessionId) { setParticipants([]); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('session_participants')
        .select('*')
        .eq('session_id', sessionId)
        .is('left_at', null);

      if (error) throw error;

      // Enrich with profile names
      if (data && data.length > 0) {
        const userIds = data.map(p => p.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, display_name, first_name, last_name')
          .in('user_id', userIds);

        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
        setParticipants(data.map(p => ({
          ...p,
          role: p.role as ParticipantRole,
          ...profileMap.get(p.user_id),
        })));
      } else {
        setParticipants([]);
      }
    } catch (e) {
      console.error('[SessionParticipants] fetch error', e);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchParticipants();

    if (!sessionId) return;
    const channel = supabase
      .channel(`session_participants:${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_participants',
        filter: `session_id=eq.${sessionId}`,
      }, () => fetchParticipants())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, fetchParticipants]);

  /** Register the current user as a participant in this session */
  const joinSession = useCallback(async (studentIds: string[], role: ParticipantRole = 'data_collector') => {
    if (!user || !sessionId) return;
    const { error } = await supabase
      .from('session_participants')
      .upsert({
        session_id: sessionId,
        user_id: user.id,
        student_ids: studentIds,
        role,
        left_at: null,
      }, { onConflict: 'session_id,user_id' });

    if (error) {
      console.error('[SessionParticipants] join error', error);
      toast.error('Could not join session');
    } else {
      await fetchParticipants();
    }
  }, [user, sessionId, fetchParticipants]);

  /** Mark the current user as having left */
  const leaveSession = useCallback(async () => {
    if (!user || !sessionId) return;
    const { error } = await supabase
      .from('session_participants')
      .update({ left_at: new Date().toISOString() })
      .eq('session_id', sessionId)
      .eq('user_id', user.id);

    if (error) console.error('[SessionParticipants] leave error', error);
    else await fetchParticipants();
  }, [user, sessionId, fetchParticipants]);

  /** Assign a specific user as the note delegate */
  const assignNoteDelegate = useCallback(async (
    targetUserId: string,
    method: NoteDelegateMethod = 'bcba_assigned'
  ) => {
    if (!user || !sessionId) return;
    // Clear existing delegate first
    await supabase
      .from('session_participants')
      .update({ note_delegate: false, note_delegate_assigned_by: null, note_delegate_assigned_at: null })
      .eq('session_id', sessionId);

    const { error } = await supabase
      .from('session_participants')
      .update({
        note_delegate: true,
        note_delegate_assigned_by: user.id,
        note_delegate_assigned_at: new Date().toISOString(),
      })
      .eq('session_id', sessionId)
      .eq('user_id', targetUserId);

    if (error) {
      toast.error('Could not assign note writer');
    } else {
      toast.success('Note writer assigned');
      await fetchParticipants();
    }
  }, [user, sessionId, fetchParticipants]);

  /** Current user claims note-writing responsibility */
  const claimNoteDelegate = useCallback(async () => {
    if (!user || !sessionId) return;
    await assignNoteDelegate(user.id, 'claimed');
  }, [user, sessionId, assignNoteDelegate]);

  const currentUserParticipant = participants.find(p => p.user_id === user?.id);
  const noteDelegate = participants.find(p => p.note_delegate);

  return {
    participants,
    loading,
    currentUserParticipant,
    noteDelegate,
    joinSession,
    leaveSession,
    assignNoteDelegate,
    claimNoteDelegate,
    refetch: fetchParticipants,
  };
}

/** 
 * Find active sessions (started by OTHER staff) for students this user is assigned to.
 * Used to surface "Join Active Session" prompts on the dashboard.
 */
export function useJoinableActiveSessions(assignedStudentIds: string[]) {
  const { user } = useAuth();
  const [joinableSessions, setJoinableSessions] = useState<ActiveSharedSession[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!user || assignedStudentIds.length === 0) { setJoinableSessions([]); return; }
    setLoading(true);
    try {
      // Find DB sessions that are 'active', have student_ids overlapping with this user's students,
      // and where this user is NOT already a participant
      const { data: sessions, error } = await supabase
        .from('sessions')
        .select('id, student_ids, user_id, start_time, status')
        .eq('status', 'active')
        .neq('user_id', user.id)
        .overlaps('student_ids', assignedStudentIds);

      if (error || !sessions?.length) { setJoinableSessions([]); return; }

      // Filter out sessions the user has already joined
      const sessionIds = sessions.map(s => s.id);
      const { data: alreadyIn } = await supabase
        .from('session_participants')
        .select('session_id')
        .in('session_id', sessionIds)
        .eq('user_id', user.id)
        .is('left_at', null);

      const alreadyInIds = new Set((alreadyIn || []).map(r => r.session_id));
      const joinable = sessions.filter(s => !alreadyInIds.has(s.id));
      if (!joinable.length) { setJoinableSessions([]); return; }

      // Get starter names
      const starterIds = [...new Set(joinable.map(s => s.user_id).filter(Boolean))] as string[];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name')
        .in('user_id', starterIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      // Get participant counts
      const { data: participantCounts } = await supabase
        .from('session_participants')
        .select('session_id')
        .in('session_id', joinable.map(s => s.id))
        .is('left_at', null);

      const countMap = new Map<string, number>();
      (participantCounts || []).forEach(r => {
        countMap.set(r.session_id, (countMap.get(r.session_id) || 0) + 1);
      });

      setJoinableSessions(joinable.map(s => {
        const p = profileMap.get(s.user_id || '');
        const name = p?.display_name || `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || 'Staff';
        return {
          session_id: s.id,
          student_ids: (s.student_ids as string[]) || [],
          started_by_user_id: s.user_id || '',
          started_by_name: name,
          started_at: s.start_time as string,
          participant_count: countMap.get(s.id) || 0,
          appointment_ids: [],
        };
      }));
    } catch (e) {
      console.error('[JoinableSessions] error', e);
    } finally {
      setLoading(false);
    }
  }, [user, assignedStudentIds]);

  useEffect(() => { fetch(); }, [fetch]);

  return { joinableSessions, loading, refetch: fetch };
}
