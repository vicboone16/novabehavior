import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProgressionGroup {
  id: string;
  student_id: string | null;
  client_id: string | null;
  student_target_id: string | null;
  target_id: string | null;
  progression_type: string; // 'target_sequence' | 'task_analysis' | 'benchmark' | 'changing_criterion'
  group_name: string;
  total_steps: number;
  current_step: number;
  current_step_label: string | null;
  next_step_label: string | null;
  progression_status: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ProgressionStep {
  id: string;
  group_id: string;
  step_order: number;
  step_label: string | null;
  step_type: string | null;
  linked_target_id: string | null;
  linked_student_target_id: string | null;
  linked_task_step_id: string | null;
  criterion_value: number | null;
  criterion_unit: string | null;
  is_mastered: boolean;
  mastered_at: string | null;
  created_at: string;
}

export interface ProgressionSummary {
  group_id: string;
  group_name: string;
  progression_type: string;
  total_steps: number;
  mastered_steps: number;
  current_step: number;
  current_step_label: string | null;
  next_step_label: string | null;
  percent_complete: number;
  progression_status: string | null;
}

export function useProgressionGroups(studentId?: string) {
  const [groups, setGroups] = useState<ProgressionGroup[]>([]);
  const [steps, setSteps] = useState<ProgressionStep[]>([]);
  const [summaries, setSummaries] = useState<ProgressionSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const db = supabase as any;

  const loadGroups = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const { data, error } = await db
        .from('progression_groups')
        .select('*')
        .or(`student_id.eq.${studentId},client_id.eq.${studentId}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setGroups(data || []);
    } catch (err) {
      console.error('[Progression] Load groups error:', err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const loadSteps = useCallback(async (groupId: string) => {
    try {
      const { data, error } = await db
        .from('progression_steps')
        .select('*')
        .eq('group_id', groupId)
        .order('step_order', { ascending: true });
      if (error) throw error;
      setSteps(data || []);
    } catch (err) {
      console.error('[Progression] Load steps error:', err);
    }
  }, []);

  const loadSummaries = useCallback(async () => {
    if (!studentId) return;
    try {
      const { data, error } = await db
        .from('v_progression_group_summary')
        .select('*')
        .or(`student_id.eq.${studentId},client_id.eq.${studentId}`);
      if (error) throw error;
      setSummaries((data || []) as ProgressionSummary[]);
    } catch (err) {
      console.error('[Progression] Load summaries error:', err);
    }
  }, [studentId]);

  const createGroup = useCallback(async (group: Partial<ProgressionGroup>) => {
    try {
      const { data, error } = await db
        .from('progression_groups')
        .insert({
          student_id: group.student_id || studentId,
          client_id: group.client_id || studentId,
          student_target_id: group.student_target_id,
          target_id: group.target_id,
          progression_type: group.progression_type || 'target_sequence',
          group_name: group.group_name || 'New Progression',
          total_steps: group.total_steps || 0,
          current_step: 1,
          progression_status: 'active',
          created_by: group.created_by,
        })
        .select()
        .single();
      if (error) throw error;
      await loadGroups();
      return data;
    } catch (err) {
      console.error('[Progression] Create group error:', err);
      return null;
    }
  }, [studentId, loadGroups]);

  const addStep = useCallback(async (step: Partial<ProgressionStep>) => {
    try {
      const { data, error } = await db
        .from('progression_steps')
        .insert({
          group_id: step.group_id,
          step_order: step.step_order || 1,
          step_label: step.step_label,
          step_type: step.step_type,
          linked_target_id: step.linked_target_id,
          linked_student_target_id: step.linked_student_target_id,
          linked_task_step_id: step.linked_task_step_id,
          criterion_value: step.criterion_value,
          criterion_unit: step.criterion_unit,
          is_mastered: false,
        })
        .select()
        .single();
      if (error) throw error;

      // Update total steps on group
      if (step.group_id) {
        const currentGroup = groups.find(g => g.id === step.group_id);
        if (currentGroup) {
          await db
            .from('progression_groups')
            .update({ total_steps: (currentGroup.total_steps || 0) + 1 })
            .eq('id', step.group_id);
        }
      }
      return data;
    } catch (err) {
      console.error('[Progression] Add step error:', err);
      return null;
    }
  }, [groups]);

  const markStepMastered = useCallback(async (stepId: string, groupId: string) => {
    try {
      await db
        .from('progression_steps')
        .update({ is_mastered: true, mastered_at: new Date().toISOString() })
        .eq('id', stepId);

      // Find next step and update group
      const groupSteps = steps.filter(s => s.group_id === groupId);
      const masteredIdx = groupSteps.findIndex(s => s.id === stepId);
      const nextStep = masteredIdx >= 0 ? groupSteps[masteredIdx + 1] : null;

      const masteredCount = groupSteps.filter(s => s.is_mastered || s.id === stepId).length;
      const allMastered = masteredCount >= groupSteps.length;

      await db
        .from('progression_groups')
        .update({
          current_step: nextStep ? (masteredIdx + 2) : masteredCount,
          current_step_label: nextStep?.step_label || 'Complete',
          next_step_label: nextStep 
            ? (groupSteps[masteredIdx + 2]?.step_label || null)
            : null,
          progression_status: allMastered ? 'complete' : 'active',
        })
        .eq('id', groupId);

      await loadSteps(groupId);
      await loadGroups();
    } catch (err) {
      console.error('[Progression] Mark mastered error:', err);
    }
  }, [steps, loadSteps, loadGroups]);

  return {
    groups,
    steps,
    summaries,
    loading,
    loadGroups,
    loadSteps,
    loadSummaries,
    createGroup,
    addStep,
    markStepMastered,
  };
}
