import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const db = supabase as any;

export interface ResearchGraphGroup {
  id: string;
  student_id: string | null;
  client_id: string | null;
  group_name: string;
  design_type: string; // 'multiple_baseline' | 'changing_criterion'
  baseline_unit: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string | null;
}

export interface ResearchGraphSeries {
  id: string;
  group_id: string;
  series_label: string;
  series_order: number | null;
  target_id: string | null;
  student_target_id: string | null;
  behavior_id: string | null;
  phase_start_date: string | null;
}

export interface MultipleBaselineSeries {
  group_id: string;
  group_name: string;
  design_type: string;
  baseline_unit: string | null;
  series_id: string;
  series_label: string;
  series_order: number | null;
  target_id: string | null;
  student_target_id: string | null;
  behavior_id: string | null;
  phase_start_date: string | null;
}

export interface ChangingCriterionStep {
  step_id: string;
  group_id: string;
  group_name: string;
  step_order: number | null;
  phase_label: string | null;
  criterion_value: number;
  phase_start_date: string | null;
  target_id: string | null;
  student_target_id: string | null;
}

export function useResearchGraphing(studentId?: string | null) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<ResearchGraphGroup[]>([]);
  const [multipleBaselineSeries, setMultipleBaselineSeries] = useState<MultipleBaselineSeries[]>([]);
  const [changingCriterionSteps, setChangingCriterionSteps] = useState<ChangingCriterionStep[]>([]);
  const [loading, setLoading] = useState(false);

  const loadGroups = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const { data, error } = await db
        .from('research_graph_groups')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setGroups((data || []) as ResearchGraphGroup[]);
    } catch (err: any) {
      console.error('[ResearchGroups] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const loadMultipleBaseline = useCallback(async (groupId?: string) => {
    if (!studentId) return;
    try {
      let query = db.from('v_multiple_baseline_graph_series').select('*');
      if (groupId) query = query.eq('group_id', groupId);
      const { data, error } = await query.order('series_order', { ascending: true });
      if (error) throw error;
      setMultipleBaselineSeries((data || []) as MultipleBaselineSeries[]);
    } catch (err: any) {
      console.error('[MultipleBaseline] Error:', err);
    }
  }, [studentId]);

  const loadChangingCriterion = useCallback(async (groupId?: string) => {
    if (!studentId) return;
    try {
      let query = db.from('v_changing_criterion_design').select('*');
      if (groupId) query = query.eq('group_id', groupId);
      const { data, error } = await query.order('step_order', { ascending: true });
      if (error) throw error;
      setChangingCriterionSteps((data || []) as ChangingCriterionStep[]);
    } catch (err: any) {
      console.error('[ChangingCriterion] Error:', err);
    }
  }, [studentId]);

  const createGroup = useCallback(async (group: {
    group_name: string;
    design_type: string;
    baseline_unit?: string;
    notes?: string;
  }) => {
    if (!studentId || !user) return null;
    try {
      const { data, error } = await db.from('research_graph_groups').insert([{
        student_id: studentId,
        client_id: studentId,
        created_by: user.id,
        ...group,
      }]).select().single();
      if (error) throw error;
      const inserted = data as ResearchGraphGroup;
      setGroups(prev => [inserted, ...prev]);
      toast.success('Research graph group created');
      return inserted;
    } catch (err: any) {
      toast.error('Failed to create group');
      return null;
    }
  }, [studentId, user]);

  const addSeries = useCallback(async (series: {
    group_id: string;
    series_label: string;
    series_order?: number;
    target_id?: string;
    student_target_id?: string;
    behavior_id?: string;
    phase_start_date?: string;
  }) => {
    try {
      const { data, error } = await db.from('research_graph_series').insert([series]).select().single();
      if (error) throw error;
      toast.success('Series added');
      return data as ResearchGraphSeries;
    } catch (err: any) {
      toast.error('Failed to add series');
      return null;
    }
  }, []);

  const addCriterionStep = useCallback(async (step: {
    group_id: string;
    criterion_value: number;
    step_order?: number;
    phase_label?: string;
    phase_start_date?: string;
    target_id?: string;
    student_target_id?: string;
  }) => {
    if (!studentId) return null;
    try {
      const { data, error } = await db.from('changing_criterion_steps').insert([{
        student_id: studentId,
        client_id: studentId,
        created_by: user?.id,
        ...step,
      }]).select().single();
      if (error) throw error;
      toast.success('Criterion step added');
      return data;
    } catch (err: any) {
      toast.error('Failed to add criterion step');
      return null;
    }
  }, [studentId, user]);

  const deleteGroup = useCallback(async (groupId: string) => {
    try {
      const { error } = await db.from('research_graph_groups').delete().eq('id', groupId);
      if (error) throw error;
      setGroups(prev => prev.filter(g => g.id !== groupId));
      toast.success('Group deleted');
    } catch (err: any) {
      toast.error('Failed to delete group');
    }
  }, []);

  return {
    groups,
    multipleBaselineSeries,
    changingCriterionSteps,
    loading,
    loadGroups,
    loadMultipleBaseline,
    loadChangingCriterion,
    createGroup,
    addSeries,
    addCriterionStep,
    deleteGroup,
  };
}
