import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const db = supabase as any;

export interface GraphPhaseMarker {
  id: string;
  student_id: string | null;
  client_id: string | null;
  target_id: string | null;
  student_target_id: string | null;
  marker_date: string | null;
  marker_session_id: string | null;
  phase_label: string;
  phase_type: string | null;
  graph_scope: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string | null;
}

export const PHASE_LABEL_PRESETS = [
  'Baseline',
  'Intervention Introduced',
  'Prompt Fading',
  'Reinforcement Change',
  'Generalization',
  'Maintenance',
  'Modified Procedure',
  'Schedule Change',
] as const;

export function useGraphPhaseMarkers(studentId?: string | null, targetId?: string | null) {
  const { user } = useAuth();
  const [markers, setMarkers] = useState<GraphPhaseMarker[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMarkers = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      let query = db.from('v_graph_phase_markers').select('*').eq('student_id', studentId);
      if (targetId) {
        query = query.or(`target_id.eq.${targetId},target_id.is.null`);
      }
      const { data, error } = await query.order('marker_date', { ascending: true });
      if (error) throw error;
      setMarkers((data || []) as GraphPhaseMarker[]);
    } catch (err: any) {
      console.error('[PhaseMarkers] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [studentId, targetId]);

  const addMarker = useCallback(async (marker: {
    marker_date: string;
    phase_label: string;
    phase_type?: string;
    graph_scope?: string;
    notes?: string;
    target_id?: string;
    student_target_id?: string;
  }) => {
    if (!studentId || !user) return null;
    try {
      const { data, error } = await db.from('graph_phase_markers').insert([{
        student_id: studentId,
        client_id: studentId,
        created_by: user.id,
        ...marker,
      }]).select().single();
      if (error) throw error;
      const inserted = data as GraphPhaseMarker;
      setMarkers(prev => [...prev, inserted].sort((a, b) =>
        (a.marker_date || '').localeCompare(b.marker_date || '')
      ));
      toast.success('Phase line added');
      return inserted;
    } catch (err: any) {
      toast.error('Failed to add phase line');
      return null;
    }
  }, [studentId, user]);

  const deleteMarker = useCallback(async (markerId: string) => {
    try {
      const { error } = await db.from('graph_phase_markers').delete().eq('id', markerId);
      if (error) throw error;
      setMarkers(prev => prev.filter(m => m.id !== markerId));
      toast.success('Phase line removed');
    } catch (err: any) {
      toast.error('Failed to remove phase line');
    }
  }, []);

  const updateMarker = useCallback(async (markerId: string, updates: Partial<GraphPhaseMarker>) => {
    try {
      const { error } = await db.from('graph_phase_markers').update(updates).eq('id', markerId);
      if (error) throw error;
      setMarkers(prev => prev.map(m => m.id === markerId ? { ...m, ...updates } : m));
    } catch (err: any) {
      toast.error('Failed to update phase line');
    }
  }, []);

  return { markers, loading, loadMarkers, addMarker, deleteMarker, updateMarker };
}
