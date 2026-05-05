import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SkillProgramObjective, TargetBenchmark } from '@/types/skillPrograms';

export function useObjectiveActions(onSuccess?: () => void) {
  const addObjective = useCallback(async (programId: string, name: string, description?: string) => {
    const { data: existing } = await supabase
      .from('skill_program_objectives')
      .select('sort_order')
      .eq('program_id', programId)
      .order('sort_order', { ascending: false })
      .limit(1);
    const nextOrder = existing?.length ? (existing[0] as any).sort_order + 1 : 0;

    const { error } = await supabase.from('skill_program_objectives').insert({
      program_id: programId,
      name,
      description: description || null,
      sort_order: nextOrder,
    } as any);
    if (error) { toast.error('Failed to add objective'); return false; }
    toast.success('Objective added');
    onSuccess?.();
    return true;
  }, [onSuccess]);

  const updateObjective = useCallback(async (id: string, updates: { name?: string; description?: string }) => {
    const { error } = await supabase
      .from('skill_program_objectives')
      .update(updates as any)
      .eq('id', id);
    if (error) { toast.error('Failed to update objective'); return false; }
    onSuccess?.();
    return true;
  }, [onSuccess]);

  const deleteObjective = useCallback(async (id: string) => {
    // Unlink targets first
    await supabase.from('skill_targets').update({ objective_id: null } as any).eq('objective_id', id);
    const { error } = await supabase.from('skill_program_objectives').update({ is_active: false } as any).eq('id', id);
    if (error) { toast.error('Failed to delete objective'); return false; }
    toast.success('Objective archived');
    onSuccess?.();
    return true;
  }, [onSuccess]);

  const assignTargetToObjective = useCallback(async (targetId: string, objectiveId: string | null) => {
    const { error } = await supabase
      .from('skill_targets')
      .update({ objective_id: objectiveId } as any)
      .eq('id', targetId);
    if (error) { toast.error('Failed to assign target'); return false; }
    onSuccess?.();
    return true;
  }, [onSuccess]);

  return { addObjective, updateObjective, deleteObjective, assignTargetToObjective };
}

export function useBenchmarkActions(onSuccess?: () => void) {
  const addBenchmark = useCallback(async (targetId: string, name: string, opts?: {
    description?: string;
    mastery_percent?: number;
    mastery_consecutive_sessions?: number;
    prompt_level_expectations?: string;
    phase?: string;
  }) => {
    const { data: existing } = await supabase
      .from('benchmarks')
      .select('sort_order')
      .eq('target_id', targetId)
      .order('sort_order', { ascending: false })
      .limit(1);
    const nextOrder = existing?.length ? (existing[0] as any).sort_order + 1 : 0;

    const { error } = await supabase.from('benchmarks').insert({
      target_id: targetId,
      name,
      description: opts?.description || null,
      sort_order: nextOrder,
      mastery_percent: opts?.mastery_percent || null,
      mastery_consecutive_sessions: opts?.mastery_consecutive_sessions || null,
      prompt_level_expectations: opts?.prompt_level_expectations || null,
      phase: opts?.phase || 'baseline',
      is_current: nextOrder === 0,
    } as any);
    if (error) { toast.error('Failed to add benchmark'); return false; }
    toast.success('Benchmark added');
    onSuccess?.();
    return true;
  }, [onSuccess]);

  const updateBenchmark = useCallback(async (id: string, updates: Partial<TargetBenchmark>) => {
    const { error } = await supabase
      .from('benchmarks')
      .update(updates as any)
      .eq('id', id);
    if (error) { toast.error('Failed to update benchmark'); return false; }
    onSuccess?.();
    return true;
  }, [onSuccess]);

  const deleteBenchmark = useCallback(async (id: string) => {
    const { error } = await supabase.from('benchmarks').update({ is_active: false } as any).eq('id', id);
    if (error) { toast.error('Failed to delete benchmark'); return false; }
    toast.success('Benchmark archived');
    onSuccess?.();
    return true;
  }, [onSuccess]);

  const setCurrentBenchmark = useCallback(async (targetId: string, benchmarkId: string) => {
    // Unset all
    await supabase.from('benchmarks').update({ is_current: false } as any).eq('target_id', targetId);
    // Set current
    await supabase.from('benchmarks').update({ is_current: true } as any).eq('id', benchmarkId);
    onSuccess?.();
    return true;
  }, [onSuccess]);

  const toggleProgramObjectives = useCallback(async (programId: string, enabled: boolean) => {
    const { error } = await supabase
      .from('skill_programs')
      .update({ objectives_enabled: enabled } as any)
      .eq('id', programId);
    if (error) { toast.error('Failed to toggle objectives'); return false; }
    toast.success(enabled ? 'Objectives enabled' : 'Objectives disabled');
    onSuccess?.();
    return true;
  }, [onSuccess]);

  const toggleProgramBenchmarks = useCallback(async (programId: string, enabled: boolean) => {
    const { error } = await supabase
      .from('skill_programs')
      .update({ benchmark_enabled: enabled } as any)
      .eq('id', programId);
    if (error) { toast.error('Failed to toggle benchmarks'); return false; }
    toast.success(enabled ? 'Benchmarks enabled' : 'Benchmarks disabled');
    onSuccess?.();
    return true;
  }, [onSuccess]);

  return { addBenchmark, updateBenchmark, deleteBenchmark, setCurrentBenchmark, toggleProgramObjectives, toggleProgramBenchmarks };
}
