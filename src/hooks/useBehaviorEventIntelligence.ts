import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BehaviorEventIntelligence {
  student_id: string;
  total_abc_events: number;
  top_antecedent_1: string | null;
  top_antecedent_1_count: number | null;
  top_antecedent_2: string | null;
  top_antecedent_2_count: number | null;
  top_antecedent_3: string | null;
  top_antecedent_3_count: number | null;
  top_consequence_1: string | null;
  top_consequence_1_count: number | null;
  top_consequence_2: string | null;
  top_consequence_2_count: number | null;
  peak_risk_time_block: string | null;
  peak_risk_time_block_count: number | null;
  top_trigger_context: string | null;
  top_trigger_context_count: number | null;
  primary_function_hypothesis: string | null;
  primary_function_count: number | null;
  transition_events: number;
  unstructured_events: number;
  lunch_recess_events: number;
  demand_events: number;
  denial_events: number;
  low_attention_events: number;
  escape_function_count: number;
  attention_function_count: number;
  tangible_function_count: number;
  automatic_function_count: number;
  avg_intensity: number | null;
  avg_duration_seconds: number | null;
  transition_risk_flag: boolean;
  unstructured_risk_flag: boolean;
  lunch_recess_risk_flag: boolean;
  escape_pattern_flag: boolean;
  attention_pattern_flag: boolean;
}

export interface BehaviorContextAlert {
  type: string;
  label: string;
  detail: string;
  severity: 'high' | 'moderate' | 'info';
}

function deriveContextAlerts(intel: BehaviorEventIntelligence): BehaviorContextAlert[] {
  const alerts: BehaviorContextAlert[] = [];
  if (intel.transition_risk_flag) {
    alerts.push({
      type: 'transition_escalation',
      label: 'Transition-Triggered Escalation',
      detail: `${intel.transition_events} of ${intel.total_abc_events} events linked to transitions`,
      severity: 'high',
    });
  }
  if (intel.unstructured_risk_flag) {
    alerts.push({
      type: 'unstructured_risk',
      label: 'Unstructured Time Risk',
      detail: `${intel.unstructured_events} events during unstructured/free time`,
      severity: 'high',
    });
  }
  if (intel.lunch_recess_risk_flag) {
    alerts.push({
      type: 'lunch_recess_escalation',
      label: 'Lunch / Recess Escalation',
      detail: `${intel.lunch_recess_events} events during lunch/recess periods`,
      severity: 'moderate',
    });
  }
  if (intel.escape_pattern_flag) {
    alerts.push({
      type: 'escape_pattern',
      label: 'Escape Pattern Signal',
      detail: `${intel.escape_function_count} events with escape-maintained consequences`,
      severity: 'high',
    });
  }
  if (intel.attention_pattern_flag) {
    alerts.push({
      type: 'attention_pattern',
      label: 'Attention Pattern Signal',
      detail: `${intel.attention_function_count} events with attention-maintained consequences`,
      severity: 'moderate',
    });
  }
  if (intel.peak_risk_time_block) {
    alerts.push({
      type: 'high_risk_time',
      label: `High-Risk Time: ${formatTimeBlock(intel.peak_risk_time_block)}`,
      detail: `${intel.peak_risk_time_block_count} events concentrated in this period`,
      severity: 'info',
    });
  }
  if (intel.top_trigger_context && intel.top_trigger_context !== 'other') {
    alerts.push({
      type: 'high_risk_context',
      label: `High-Risk Context: ${formatTrigger(intel.top_trigger_context)}`,
      detail: `${intel.top_trigger_context_count} events in ${formatTrigger(intel.top_trigger_context)} contexts`,
      severity: 'info',
    });
  }
  return alerts;
}

export function formatTimeBlock(block: string): string {
  const map: Record<string, string> = {
    morning: 'Morning (before 10am)',
    midday: 'Midday (10am–12pm)',
    lunch_recess: 'Lunch/Recess (12–2pm)',
    afternoon: 'Afternoon (2–3pm)',
    late_afternoon: 'Late Afternoon (after 3pm)',
  };
  return map[block] || block;
}

export function formatTrigger(ctx: string): string {
  const map: Record<string, string> = {
    transition: 'Transition',
    unstructured: 'Unstructured Time',
    demand: 'Task Demand',
    denial: 'Denial/Restriction',
    low_attention: 'Low Attention',
    other: 'Other',
  };
  return map[ctx] || ctx;
}

export function formatFunction(fn: string): string {
  const map: Record<string, string> = {
    escape: 'Escape/Avoidance',
    attention: 'Attention',
    tangible: 'Tangible Access',
    automatic: 'Automatic/Sensory',
    undetermined: 'Undetermined',
  };
  return map[fn] || fn;
}

/**
 * Shared hook for behavior event intelligence per student.
 */
export function useBehaviorEventIntelligence(studentId: string | null | undefined) {
  const [intel, setIntel] = useState<BehaviorEventIntelligence | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchIntel = useCallback(async () => {
    if (!studentId) { setIntel(null); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await (supabase.from as any)('v_behavior_event_intelligence')
        .select('*')
        .eq('student_id', studentId)
        .maybeSingle();
      if (!error && data) {
        setIntel(data as unknown as BehaviorEventIntelligence);
      } else {
        setIntel(null);
      }
    } catch (err) {
      console.error('[BehaviorEventIntel] Error:', err);
      setIntel(null);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { fetchIntel(); }, [fetchIntel]);

  const contextAlerts = useMemo(() => {
    if (!intel) return [];
    return deriveContextAlerts(intel);
  }, [intel]);

  // Top antecedent patterns as array
  const topAntecedents = useMemo(() => {
    if (!intel) return [];
    const items: Array<{ label: string; count: number }> = [];
    if (intel.top_antecedent_1) items.push({ label: intel.top_antecedent_1, count: intel.top_antecedent_1_count || 0 });
    if (intel.top_antecedent_2) items.push({ label: intel.top_antecedent_2, count: intel.top_antecedent_2_count || 0 });
    if (intel.top_antecedent_3) items.push({ label: intel.top_antecedent_3, count: intel.top_antecedent_3_count || 0 });
    return items;
  }, [intel]);

  // Top consequence patterns as array
  const topConsequences = useMemo(() => {
    if (!intel) return [];
    const items: Array<{ label: string; count: number }> = [];
    if (intel.top_consequence_1) items.push({ label: intel.top_consequence_1, count: intel.top_consequence_1_count || 0 });
    if (intel.top_consequence_2) items.push({ label: intel.top_consequence_2, count: intel.top_consequence_2_count || 0 });
    return items;
  }, [intel]);

  // Simplified connect-safe highlights
  const connectHighlights = useMemo(() => {
    if (!intel) return [];
    const items: Array<{ label: string; tone: 'positive' | 'neutral' | 'needs_attention' }> = [];
    if (intel.peak_risk_time_block) {
      // Invert: show the safest time blocks
      const allBlocks = ['morning', 'midday', 'lunch_recess', 'afternoon', 'late_afternoon'];
      const safest = allBlocks.find(b => b !== intel.peak_risk_time_block);
      if (safest) items.push({ label: `Strongest support time: ${formatTimeBlock(safest)}`, tone: 'positive' });
    }
    if (!intel.transition_risk_flag && !intel.unstructured_risk_flag) {
      items.push({ label: 'Transitions and free time are going well', tone: 'positive' });
    }
    if (intel.total_abc_events > 0 && !intel.escape_pattern_flag && !intel.attention_pattern_flag) {
      items.push({ label: 'Behavior patterns are stable', tone: 'neutral' });
    }
    return items;
  }, [intel]);

  return { intel, contextAlerts, topAntecedents, topConsequences, connectHighlights, loading, refresh: fetchIntel };
}
