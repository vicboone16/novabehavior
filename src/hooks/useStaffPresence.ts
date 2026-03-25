import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type StaffAvailability = 'available' | 'nearby' | 'assigned' | 'busy' | 'offline';

export interface StaffPresenceRecord {
  id: string;
  agency_id: string;
  user_id: string;
  staff_name: string | null;
  role: string | null;
  is_present: boolean;
  availability: StaffAvailability;
  status_note: string | null;
  current_classroom_id: string | null;
  current_room_name: string | null;
  last_activity_at: string | null;
  last_check_in_at: string | null;
  last_check_out_at: string | null;
  updated_at: string;
}

export function useStaffPresence(agencyId: string | null, classroomId?: string | null) {
  const { user, profile, userRole } = useAuth();
  const [staff, setStaff] = useState<StaffPresenceRecord[]>([]);
  const [myPresence, setMyPresence] = useState<StaffPresenceRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPresence = useCallback(async () => {
    if (!agencyId) return;
    try {
      let query = supabase
        .from('staff_presence' as any)
        .select('id, agency_id, user_id, staff_name, role, is_present, availability, status_note, current_classroom_id, current_room_name, last_activity_at, last_check_in_at, last_check_out_at, updated_at')
        .eq('agency_id', agencyId)
        .eq('is_present', true);

      if (classroomId) {
        query = query.eq('current_classroom_id', classroomId);
      }

      const { data, error } = await query;
      if (error) {
        console.error('[StaffPresence] fetch error:', error);
      } else {
        const records = (data || []) as unknown as StaffPresenceRecord[];
        // Sort by availability priority
        const priorityOrder: Record<string, number> = { available: 1, nearby: 2, assigned: 3, busy: 4, offline: 5 };
        records.sort((a, b) => (priorityOrder[a.availability] || 5) - (priorityOrder[b.availability] || 5));
        setStaff(records);
      }
    } catch (e) {
      console.error('[StaffPresence] error:', e);
    } finally {
      setLoading(false);
    }
  }, [agencyId, classroomId]);

  // Fetch my own presence
  const fetchMyPresence = useCallback(async () => {
    if (!agencyId || !user?.id) return;
    const { data } = await supabase
      .from('staff_presence' as any)
      .select('*')
      .eq('agency_id', agencyId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) setMyPresence(data as unknown as StaffPresenceRecord);
  }, [agencyId, user?.id]);

  useEffect(() => {
    fetchPresence();
    fetchMyPresence();
  }, [fetchPresence, fetchMyPresence]);

  // Realtime subscription
  useEffect(() => {
    if (!agencyId) return;
    const channel = supabase
      .channel(`staff-presence-${agencyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_presence' }, () => {
        fetchPresence();
        fetchMyPresence();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [agencyId, fetchPresence, fetchMyPresence]);

  const checkIn = useCallback(async (opts?: {
    availability?: StaffAvailability;
    statusNote?: string;
    classroomId?: string;
    roomName?: string;
  }) => {
    if (!agencyId || !user?.id) return;
    const displayName = profile?.display_name || profile?.first_name || user.email || 'Staff';
    const { data, error } = await supabase.rpc('upsert_staff_presence', {
      p_agency_id: agencyId,
      p_user_id: user.id,
      p_staff_name: displayName,
      p_role: userRole || 'staff',
      p_is_present: true,
      p_availability: opts?.availability || 'available',
      p_status_note: opts?.statusNote || null,
      p_current_classroom_id: opts?.classroomId || null,
      p_current_room_name: opts?.roomName || null,
      p_updated_by: user.id,
    } as any);
    if (error) console.error('[StaffPresence] checkIn error:', error);
    return data;
  }, [agencyId, user?.id, profile, userRole]);

  const checkOut = useCallback(async () => {
    if (!agencyId || !user?.id) return;
    const { data, error } = await supabase.rpc('check_out_staff_presence', {
      p_agency_id: agencyId,
      p_user_id: user.id,
      p_updated_by: user.id,
    } as any);
    if (error) console.error('[StaffPresence] checkOut error:', error);
    return data;
  }, [agencyId, user?.id]);

  const setAvailability = useCallback(async (availability: StaffAvailability, statusNote?: string) => {
    if (!agencyId || !user?.id) return;
    const { data, error } = await supabase.rpc('set_staff_availability', {
      p_agency_id: agencyId,
      p_user_id: user.id,
      p_availability: availability,
      p_status_note: statusNote || null,
      p_updated_by: user.id,
    } as any);
    if (error) console.error('[StaffPresence] setAvailability error:', error);
    return data;
  }, [agencyId, user?.id]);

  const moveStaff = useCallback(async (targetUserId: string, toClassroomId?: string, toRoomName?: string, reason?: string) => {
    if (!agencyId || !user?.id) return;
    const { data, error } = await supabase.rpc('move_staff_to_classroom', {
      p_agency_id: agencyId,
      p_user_id: targetUserId,
      p_to_classroom_id: toClassroomId || null,
      p_to_room_name: toRoomName || null,
      p_moved_by: user.id,
      p_move_reason: reason || null,
    } as any);
    if (error) console.error('[StaffPresence] moveStaff error:', error);
    return data;
  }, [agencyId, user?.id]);

  return {
    staff,
    myPresence,
    loading,
    checkIn,
    checkOut,
    setAvailability,
    moveStaff,
    refresh: fetchPresence,
  };
}
