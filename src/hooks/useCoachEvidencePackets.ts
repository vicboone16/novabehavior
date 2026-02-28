import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CoachEvidencePacket {
  id: string;
  agency_id?: string | null;
  student_id: string;
  coach_user_id: string;
  caregiver_name: string;
  caregiver_relationship?: string | null;
  program_id?: string | null;
  title: string;
  description?: string | null;
  status: 'pending' | 'approved' | 'follow_up' | 'rejected';
  submitted_at: string;
  reviewed_at?: string | null;
  reviewer_id?: string | null;
  reviewer_notes?: string | null;
  active_seconds?: number;
  completion_count?: number;
  integrity_score?: number | null;
  integrity_flags?: any[];
  evidence_summary?: string | null;
  soap_note_draft_id?: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  coach_name?: string;
  student_name?: string;
  items?: CoachEvidenceItem[];
}

export interface CoachEvidenceItem {
  id: string;
  packet_id: string;
  item_type: string;
  label?: string | null;
  payload: Record<string, any>;
  sort_order: number;
  created_at: string;
}

export function useCoachEvidencePackets() {
  const { user } = useAuth();
  const [packets, setPackets] = useState<CoachEvidencePacket[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPackets = useCallback(async (filters?: { studentId?: string; status?: string }) => {
    setLoading(true);
    try {
      let query = supabase
        .from('coach_evidence_packets')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (filters?.studentId) query = query.eq('student_id', filters.studentId);
      if (filters?.status) query = query.eq('status', filters.status);

      const { data, error } = await query;
      if (error) throw error;
      setPackets((data || []) as unknown as CoachEvidencePacket[]);
      return data;
    } catch (err: any) {
      toast.error('Failed to load evidence packets: ' + err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPendingForReview = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('coach_evidence_packets')
        .select('*')
        .in('status', ['pending', 'follow_up'])
        .order('submitted_at', { ascending: true });
      if (error) throw error;
      setPackets((data || []) as unknown as CoachEvidencePacket[]);
      return data;
    } catch (err: any) {
      toast.error('Failed to load packets for review: ' + err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchItems = useCallback(async (packetId: string): Promise<CoachEvidenceItem[]> => {
    const { data, error } = await supabase
      .from('coach_evidence_items')
      .select('*')
      .eq('packet_id', packetId)
      .order('sort_order');
    if (error) throw error;
    return (data || []) as unknown as CoachEvidenceItem[];
  }, []);

  const submitPacket = useCallback(async (packet: Partial<CoachEvidencePacket>, items: Partial<CoachEvidenceItem>[]) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('coach_evidence_packets')
      .insert({ ...packet, coach_user_id: user.id } as any)
      .select()
      .single();
    if (error) throw error;

    if (items.length > 0) {
      const itemsWithPacket = items.map((item, i) => ({
        ...item,
        packet_id: data.id,
        sort_order: i,
      }));
      const { error: itemErr } = await supabase
        .from('coach_evidence_items')
        .insert(itemsWithPacket as any);
      if (itemErr) throw itemErr;
    }

    toast.success('Evidence packet submitted for review');
    return data;
  }, [user]);

  const approvePacket = useCallback(async (packetId: string, notes?: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('coach_evidence_packets')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewer_id: user.id,
        reviewer_notes: notes || null,
      } as any)
      .eq('id', packetId);
    if (error) throw error;

    // Get packet details to write to caregiver training history
    const { data: packet } = await supabase
      .from('coach_evidence_packets')
      .select('*')
      .eq('id', packetId)
      .single();

    if (packet) {
      const p = packet as unknown as CoachEvidencePacket;
      // Log approved evidence as a caregiver training session
      await supabase.from('caregiver_training_sessions').insert({
        student_id: p.student_id,
        program_id: p.program_id || null,
        caregiver_name: p.caregiver_name,
        caregiver_relationship: p.caregiver_relationship || null,
        session_date: new Date().toISOString().split('T')[0],
        duration_minutes: Math.round((p.active_seconds || 0) / 60) || 15,
        bst_phase: 'combined',
        competency_rating: p.integrity_score ? Math.round(p.integrity_score) : null,
        skills_addressed: [],
        notes: `[Approved Coach Evidence] ${p.title}${notes ? ` — Reviewer: ${notes}` : ''}`,
        staff_user_id: user.id,
      } as any);
    }

    toast.success('Evidence packet approved and logged to Caregiver Training');
  }, [user]);

  const rejectPacket = useCallback(async (packetId: string, notes?: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('coach_evidence_packets')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewer_id: user.id,
        reviewer_notes: notes || null,
      } as any)
      .eq('id', packetId);
    if (error) throw error;
    toast.success('Evidence packet rejected');
  }, [user]);

  const requestFollowUp = useCallback(async (packetId: string, notes?: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('coach_evidence_packets')
      .update({
        status: 'follow_up',
        reviewed_at: new Date().toISOString(),
        reviewer_id: user.id,
        reviewer_notes: notes || null,
      } as any)
      .eq('id', packetId);
    if (error) throw error;
    toast.success('Follow-up requested from coach');
  }, [user]);

  return {
    packets, loading,
    fetchPackets, fetchPendingForReview, fetchItems,
    submitPacket, approvePacket, rejectPacket, requestFollowUp,
  };
}
