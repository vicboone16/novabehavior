import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TargetMetrics {
  target_id: string;
  total_opportunities: number;
  independent_count: number;
  prompted_count: number;
  incorrect_count: number;
  pct_independent: number | null;
  pct_prompted: number | null;
  pct_incorrect: number | null;
  pct_correct: number | null;
  pdi: number | null;
}

export interface StepMetrics {
  step_id: string;
  total_opportunities: number;
  independent_count: number;
  prompted_count: number;
  incorrect_count: number;
  pct_independent: number | null;
  pdi: number | null;
}

/**
 * Hook to fetch analytics metrics for a skill target.
 * Uses DB functions: fn_target_trial_metrics, fn_step_trial_metrics, fn_check_step_mastery
 */
export function useSkillMetrics(targetId?: string, windowDays: number = 14) {
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<TargetMetrics | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('fn_target_trial_metrics', {
        p_target_id: targetId,
        p_window_days: windowDays,
      });
      if (error) throw error;
      if (data && data.length > 0) {
        setMetrics(data[0] as unknown as TargetMetrics);
      } else {
        setMetrics(null);
      }
    } catch (err) {
      console.error('Error fetching target metrics:', err);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, [targetId, windowDays]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { loading, metrics, refetch: fetchMetrics };
}

/**
 * Hook to fetch step-level metrics for a TA step.
 */
export function useStepMetrics(stepId?: string, windowDays: number = 14) {
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<StepMetrics | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!stepId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('fn_step_trial_metrics', {
        p_step_id: stepId,
        p_window_days: windowDays,
      });
      if (error) throw error;
      if (data && data.length > 0) {
        setMetrics(data[0] as unknown as StepMetrics);
      } else {
        setMetrics(null);
      }
    } catch (err) {
      console.error('Error fetching step metrics:', err);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, [stepId, windowDays]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { loading, metrics, refetch: fetchMetrics };
}

/**
 * Check if a step meets mastery criteria.
 */
export async function checkStepMastery(
  stepId: string,
  consecutiveSessions: number = 3,
  threshold: number = 80
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('fn_check_step_mastery', {
      p_step_id: stepId,
      p_consecutive_sessions: consecutiveSessions,
      p_threshold: threshold,
    });
    if (error) throw error;
    return !!data;
  } catch (err) {
    console.error('Error checking step mastery:', err);
    return false;
  }
}

/**
 * Utility: Format PDI as a human-readable label
 */
export function formatPDI(pdi: number | null): { label: string; color: string } {
  if (pdi === null) return { label: 'N/A', color: 'text-muted-foreground' };
  if (pdi <= 0.1) return { label: `${(pdi * 100).toFixed(0)}% — Independent`, color: 'text-green-600' };
  if (pdi <= 0.3) return { label: `${(pdi * 100).toFixed(0)}% — Low dependency`, color: 'text-green-500' };
  if (pdi <= 0.5) return { label: `${(pdi * 100).toFixed(0)}% — Moderate`, color: 'text-yellow-600' };
  if (pdi <= 0.7) return { label: `${(pdi * 100).toFixed(0)}% — High dependency`, color: 'text-orange-600' };
  return { label: `${(pdi * 100).toFixed(0)}% — Very high dependency`, color: 'text-red-600' };
}
