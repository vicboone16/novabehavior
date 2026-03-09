import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Raw row from v_behavior_event_intelligence (abc-only, 90-day window).
 * Falls back gracefully if this view doesn't exist yet.
 */
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

/**
 * Row from v_behavior_event_intelligence_summary (multi-source, all-time).
 */
export interface BehaviorEventSummary {
  student_id: string;
  behavior_name: string | null;
  top_time_of_day: string | null;
  top_antecedent_pattern: string | null;
  top_consequence_pattern: string | null;
  transition_risk_flag: boolean;
  unstructured_time_risk_flag: boolean;
  lunch_time_risk_flag: boolean;
  escape_pattern_flag: boolean;
  attention_pattern_flag: boolean;
  total_behavior_events: number;
  first_event_date: string | null;
  last_event_date: string | null;
}

export interface BehaviorContextAlert {
  type: string;
  label: string;
  detail: string;
  severity: 'high' | 'moderate' | 'info';
}

function deriveContextAlerts(intel: BehaviorEventIntelligence | null, summary: BehaviorEventSummary | null): BehaviorContextAlert[] {
  const alerts: BehaviorContextAlert[] = [];

  // Prefer the richer abc-based intel if available, fall back to summary
  const transitionFlag = intel?.transition_risk_flag || summary?.transition_risk_flag || false;
  const unstructuredFlag = intel?.unstructured_risk_flag || summary?.unstructured_time_risk_flag || false;
  const lunchFlag = intel?.lunch_recess_risk_flag || summary?.lunch_time_risk_flag || false;
  const escapeFlag = intel?.escape_pattern_flag || summary?.escape_pattern_flag || false;
  const attentionFlag = intel?.attention_pattern_flag || summary?.attention_pattern_flag || false;

  if (transitionFlag) {
    const detail = intel
      ? `${intel.transition_events} of ${intel.total_abc_events} events linked to transitions`
      : 'Events linked to transition contexts detected';
    alerts.push({ type: 'transition_escalation', label: 'Transition-Triggered Escalation', detail, severity: 'high' });
  }
  if (unstructuredFlag) {
    const detail = intel
      ? `${intel.unstructured_events} events during unstructured/free time`
      : 'Events during unstructured time detected';
    alerts.push({ type: 'unstructured_risk', label: 'Unstructured Time Risk', detail, severity: 'high' });
  }
  if (lunchFlag) {
    const detail = intel
      ? `${intel.lunch_recess_events} events during lunch/recess periods`
      : 'Events during lunch periods detected';
    alerts.push({ type: 'lunch_recess_escalation', label: 'Lunch / Recess Escalation', detail, severity: 'moderate' });
  }
  if (escapeFlag) {
    const detail = intel
      ? `${intel.escape_function_count} events with escape-maintained consequences`
      : 'Escape pattern detected in event data';
    alerts.push({ type: 'escape_pattern', label: 'Escape Pattern Signal', detail, severity: 'high' });
  }
  if (attentionFlag) {
    const detail = intel
      ? `${intel.attention_function_count} events with attention-maintained consequences`
      : 'Attention pattern detected in event data';
    alerts.push({ type: 'attention_pattern', label: 'Attention Pattern Signal', detail, severity: 'moderate' });
  }

  // Time-of-day risk from either source
  const peakTime = intel?.peak_risk_time_block || summary?.top_time_of_day;
  if (peakTime) {
    alerts.push({
      type: 'high_risk_time',
      label: `High-Risk Time: ${formatTimeBlock(peakTime)}`,
      detail: intel?.peak_risk_time_block_count
        ? `${intel.peak_risk_time_block_count} events concentrated in this period`
        : 'Most events concentrated in this period',
      severity: 'info',
    });
  }

  // Trigger context (abc-only)
  if (intel?.top_trigger_context && intel.top_trigger_context !== 'other') {
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
    arrival_morning: 'Arrival/Morning (6–9am)',
    mid_morning: 'Mid-Morning (10–11am)',
    lunch_window: 'Lunch Window (12–1pm)',
    other: 'Other',
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
 * Queries both v_behavior_event_intelligence (abc-only) and
 * v_behavior_event_intelligence_summary (multi-source) in parallel,
 * merging results for maximum coverage.
 */
export function useBehaviorEventIntelligence(studentId: string | null | undefined) {
  const [intel, setIntel] = useState<BehaviorEventIntelligence | null>(null);
  const [summary, setSummary] = useState<BehaviorEventSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchIntel = useCallback(async () => {
    if (!studentId) { setIntel(null); setSummary(null); setLoading(false); return; }
    setLoading(true);
    try {
      // Fetch both sources in parallel
      const [intelRes, summaryRes] = await Promise.all([
        (supabase.from as any)('v_behavior_event_intelligence')
          .select('*').eq('student_id', studentId).maybeSingle(),
        (supabase.from as any)('v_behavior_event_intelligence_summary')
          .select('*').eq('student_id', studentId).maybeSingle(),
      ]);
      setIntel(intelRes.data ? (intelRes.data as unknown as BehaviorEventIntelligence) : null);
      setSummary(summaryRes.data ? (summaryRes.data as unknown as BehaviorEventSummary) : null);
    } catch (err) {
      console.error('[BehaviorEventIntel] Error:', err);
      setIntel(null);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { fetchIntel(); }, [fetchIntel]);

  const contextAlerts = useMemo(() => deriveContextAlerts(intel, summary), [intel, summary]);

  const topAntecedents = useMemo(() => {
    const items: Array<{ label: string; count: number }> = [];
    // From abc-based intel
    if (intel) {
      if (intel.top_antecedent_1) items.push({ label: intel.top_antecedent_1, count: intel.top_antecedent_1_count || 0 });
      if (intel.top_antecedent_2) items.push({ label: intel.top_antecedent_2, count: intel.top_antecedent_2_count || 0 });
      if (intel.top_antecedent_3) items.push({ label: intel.top_antecedent_3, count: intel.top_antecedent_3_count || 0 });
    } else if (summary?.top_antecedent_pattern) {
      items.push({ label: summary.top_antecedent_pattern, count: 0 });
    }
    return items;
  }, [intel, summary]);

  const topConsequences = useMemo(() => {
    const items: Array<{ label: string; count: number }> = [];
    if (intel) {
      if (intel.top_consequence_1) items.push({ label: intel.top_consequence_1, count: intel.top_consequence_1_count || 0 });
      if (intel.top_consequence_2) items.push({ label: intel.top_consequence_2, count: intel.top_consequence_2_count || 0 });
    } else if (summary?.top_consequence_pattern) {
      items.push({ label: summary.top_consequence_pattern, count: 0 });
    }
    return items;
  }, [intel, summary]);

  const connectHighlights = useMemo(() => {
    const items: Array<{ label: string; tone: 'positive' | 'neutral' | 'needs_attention' }> = [];
    const peakTime = intel?.peak_risk_time_block || summary?.top_time_of_day;
    const hasTransitionRisk = intel?.transition_risk_flag || summary?.transition_risk_flag;
    const hasUnstructuredRisk = intel?.unstructured_risk_flag || summary?.unstructured_time_risk_flag;
    const hasEscapePattern = intel?.escape_pattern_flag || summary?.escape_pattern_flag;
    const hasAttentionPattern = intel?.attention_pattern_flag || summary?.attention_pattern_flag;
    const totalEvents = intel?.total_abc_events || summary?.total_behavior_events || 0;

    if (peakTime) {
      const allBlocks = ['arrival_morning', 'mid_morning', 'lunch_window', 'afternoon', 'other'];
      const safest = allBlocks.find(b => b !== peakTime);
      if (safest) items.push({ label: `Strongest support time: ${formatTimeBlock(safest)}`, tone: 'positive' });
    }
    if (!hasTransitionRisk && !hasUnstructuredRisk) {
      items.push({ label: 'Transitions and free time are going well', tone: 'positive' });
    }
    if (totalEvents > 0 && !hasEscapePattern && !hasAttentionPattern) {
      items.push({ label: 'Behavior patterns are stable', tone: 'neutral' });
    }
    return items;
  }, [intel, summary]);

  // Merged total events count
  const totalEvents = intel?.total_abc_events || summary?.total_behavior_events || 0;

  return {
    intel,
    summary,
    contextAlerts,
    topAntecedents,
    topConsequences,
    connectHighlights,
    totalEvents,
    loading,
    refresh: fetchIntel,
  };
}
