import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { BenchmarkCriterionStep } from '@/types/graphDataState';

export function useBenchmarkCriterion(targetId?: string) {
  const [steps, setSteps] = useState<BenchmarkCriterionStep[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSteps = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('v_benchmark_changing_criterion_design')
        .select('*')
        .eq('target_id', targetId)
        .order('benchmark_order', { ascending: true });
      if (error) throw error;
      setSteps((data || []) as BenchmarkCriterionStep[]);
    } catch (err) {
      console.error('[BenchmarkCriterion] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [targetId]);

  const syncBenchmarksToSteps = useCallback(async (
    benchmarks: { id: string; label: string; targetValue?: number; targetDate?: Date }[],
    studentTargetId?: string,
  ) => {
    if (!targetId || benchmarks.length === 0) return;
    try {
      // Upsert benchmark criterion steps from goal benchmarks
      for (let i = 0; i < benchmarks.length; i++) {
        const bm = benchmarks[i];
        await (supabase as any)
          .from('goal_benchmark_criterion_steps')
          .upsert({
            target_id: targetId,
            student_target_id: studentTargetId || targetId,
            benchmark_label: bm.label,
            benchmark_order: i + 1,
            criterion_value: bm.targetValue ?? null,
            phase_label: bm.label,
            phase_start_date: bm.targetDate ? bm.targetDate.toISOString().split('T')[0] : null,
          }, { onConflict: 'id' });
      }
      await loadSteps();
    } catch (err) {
      console.error('[BenchmarkCriterion] Sync error:', err);
    }
  }, [targetId, loadSteps]);

  const advanceToNextStep = useCallback(async () => {
    if (steps.length === 0) return;
    const activeIdx = steps.findIndex(s => s.is_active);
    const currentStep = activeIdx >= 0 ? steps[activeIdx] : null;
    const nextStep = activeIdx >= 0 ? steps[activeIdx + 1] : steps[0];

    if (!nextStep) return; // all steps complete

    try {
      // Mark current as met
      if (currentStep) {
        await (supabase as any)
          .from('goal_benchmark_criterion_steps')
          .update({ is_met: true, met_at: new Date().toISOString(), is_active: false })
          .eq('id', currentStep.benchmark_step_id);
      }
      // Activate next
      await (supabase as any)
        .from('goal_benchmark_criterion_steps')
        .update({ is_active: true, start_date: new Date().toISOString().split('T')[0] })
        .eq('id', nextStep.benchmark_step_id);

      await loadSteps();
    } catch (err) {
      console.error('[BenchmarkCriterion] Advance error:', err);
    }
  }, [steps, loadSteps]);

  const currentStep = steps.find(s => s.is_active) || null;
  const nextStep = (() => {
    const activeIdx = steps.findIndex(s => s.is_active);
    return activeIdx >= 0 && activeIdx < steps.length - 1 ? steps[activeIdx + 1] : null;
  })();
  const hasBenchmarkSteps = steps.length > 0;

  return {
    steps,
    loading,
    loadSteps,
    syncBenchmarksToSteps,
    advanceToNextStep,
    currentStep,
    nextStep,
    hasBenchmarkSteps,
  };
}
