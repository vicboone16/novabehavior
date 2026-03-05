/**
 * useEvaluationEngine
 * 
 * Orchestrates criteria evaluation for a target:
 * 1. Fetches session-level trial data
 * 2. Resolves criteria templates per type
 * 3. Runs the evaluation engine
 * 4. Stores results in criteria_evaluations
 * 5. Creates review queue items when criteria flips to met
 * 6. Applies progression actions based on automation settings
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  evaluateCriteria,
  type SessionAggregate,
  type EvaluationResult,
} from '@/lib/criteriaEvaluationEngine';
import type {
  CriteriaType,
  CriteriaRuleJson,
  CriteriaEvaluation,
  TargetPhase,
} from '@/types/criteriaEngine';
import { getNextPhase, getCriteriaTypeForPhase } from '@/types/criteriaEngine';

interface TargetInfo {
  id: string;
  program_id: string;
  phase: TargetPhase;
  student_id?: string;
  sort_order?: number;
}

interface EvaluationEngineResult {
  evaluations: EvaluationResult[];
  loading: boolean;
  runEvaluation: (target: TargetInfo) => Promise<EvaluationResult[]>;
  runAndApplyWorkflow: (target: TargetInfo) => Promise<void>;
}

export function useEvaluationEngine(): EvaluationEngineResult {
  const [evaluations, setEvaluations] = useState<EvaluationResult[]>([]);
  const [loading, setLoading] = useState(false);

  /**
   * Fetch session aggregates for a target from task_analysis_step_data
   * grouped by session_id.
   */
  const fetchSessionAggregates = useCallback(async (targetId: string): Promise<SessionAggregate[]> => {
    // Get step IDs for this target
    const { data: steps } = await supabase
      .from('task_analysis_steps')
      .select('id')
      .eq('target_id', targetId);

    if (!steps || steps.length === 0) {
      // Try using fn_target_trial_metrics as fallback for non-TA targets
      const { data: metrics } = await supabase.rpc('fn_target_trial_metrics', {
        p_target_id: targetId,
        p_window_days: 90,
      });
      if (metrics && metrics.length > 0) {
        const m = metrics[0] as any;
        return [{
          session_id: 'aggregate',
          session_date: new Date().toISOString(),
          session_type: 'any',
          total_opportunities: m.total_opportunities || 0,
          independent_count: m.independent_count || 0,
          prompted_count: m.prompted_count || 0,
          incorrect_count: m.incorrect_count || 0,
          pct_correct: m.pct_correct || 0,
          pct_independent: m.pct_independent || 0,
        }];
      }
      return [];
    }

    const stepIds = steps.map(s => s.id);

    // Fetch all trial data for these steps
    const { data: trials } = await supabase
      .from('task_analysis_step_data')
      .select('session_id, outcome, prompt_level_id, recorded_at, session_type')
      .in('step_id', stepIds)
      .not('outcome', 'eq', 'no_opportunity')
      .order('recorded_at', { ascending: true });

    if (!trials || trials.length === 0) return [];

    // Group by session_id
    const sessionMap = new Map<string, {
      trials: typeof trials;
      dates: string[];
      session_type: string;
    }>();

    for (const t of trials) {
      const sid = t.session_id || 'no_session';
      if (!sessionMap.has(sid)) {
        sessionMap.set(sid, { trials: [], dates: [], session_type: t.session_type || 'teaching' });
      }
      const entry = sessionMap.get(sid)!;
      entry.trials.push(t);
      entry.dates.push(t.recorded_at);
    }

    const aggregates: SessionAggregate[] = [];
    for (const [sid, data] of sessionMap) {
      const total = data.trials.length;
      const independent = data.trials.filter(t => t.outcome === '+' && !t.prompt_level_id).length;
      const prompted = data.trials.filter(t => t.outcome === '+' && t.prompt_level_id).length;
      const incorrect = data.trials.filter(t => t.outcome === '-').length;

      aggregates.push({
        session_id: sid,
        session_date: data.dates.sort()[0],
        session_type: data.session_type as any,
        total_opportunities: total,
        independent_count: independent,
        prompted_count: prompted,
        incorrect_count: incorrect,
        pct_correct: total > 0 ? ((independent + prompted) / total) * 100 : 0,
        pct_independent: total > 0 ? (independent / total) * 100 : 0,
      });
    }

    return aggregates.sort((a, b) => a.session_date.localeCompare(b.session_date));
  }, []);

  /**
   * Resolve criteria template for a target + criteria_type
   */
  const resolveTemplate = useCallback(async (
    targetId: string,
    criteriaType: CriteriaType,
  ): Promise<CriteriaRuleJson | null> => {
    const { data: templateId } = await supabase.rpc('resolve_criteria', {
      _target_id: targetId,
      _criteria_type: criteriaType,
    });

    if (!templateId) return null;

    const { data: template } = await supabase
      .from('criteria_templates')
      .select('rule_json')
      .eq('id', templateId)
      .single();

    return template?.rule_json as unknown as CriteriaRuleJson | null;
  }, []);

  /**
   * Run evaluation for all criteria types on a target
   */
  const runEvaluation = useCallback(async (target: TargetInfo): Promise<EvaluationResult[]> => {
    setLoading(true);
    try {
      const sessions = await fetchSessionAggregates(target.id);
      const types: CriteriaType[] = ['mastery', 'probe', 'generalization', 'maintenance'];
      const results: EvaluationResult[] = [];

      for (const type of types) {
        const rule = await resolveTemplate(target.id, type);
        if (!rule) continue;

        const result = evaluateCriteria(rule, type, sessions);
        results.push(result);

        // Upsert into criteria_evaluations
        const evalRow = {
          target_id: target.id,
          criteria_type: type,
          met_status: result.met_status,
          met_at: result.met_at,
          metric_value: result.metric_value,
          window_used: result.window_used,
          filters_applied: result.filters_applied,
          evidence: result.evidence,
          recommended_action: result.recommended_action,
          evaluated_at: new Date().toISOString(),
        };

        // Check existing
        const { data: existing } = await supabase
          .from('criteria_evaluations')
          .select('id, met_status')
          .eq('target_id', target.id)
          .eq('criteria_type', type)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('criteria_evaluations')
            .update(evalRow as any)
            .eq('id', existing.id);
        } else {
          await supabase
            .from('criteria_evaluations')
            .insert(evalRow as any);
        }
      }

      setEvaluations(results);
      return results;
    } finally {
      setLoading(false);
    }
  }, [fetchSessionAggregates, resolveTemplate]);

  /**
   * Run evaluation AND apply workflow automation
   */
  const runAndApplyWorkflow = useCallback(async (target: TargetInfo): Promise<void> => {
    setLoading(true);
    try {
      // Get previous evaluations to detect flips
      const { data: prevEvals } = await supabase
        .from('criteria_evaluations')
        .select('criteria_type, met_status')
        .eq('target_id', target.id);

      const prevMap = new Map(
        (prevEvals || []).map(e => [e.criteria_type, e.met_status])
      );

      const results = await runEvaluation(target);

      // Check for criteria that just flipped to met
      const currentPhaseCriteriaType = getCriteriaTypeForPhase(target.phase);
      const newlyMet = results.filter(r =>
        r.met_status && !prevMap.get(r.criteria_type) && r.criteria_type === currentPhaseCriteriaType
      );

      if (newlyMet.length === 0) return;

      // Resolve automation settings (target → program → student → global)
      const automationSettings = await resolveAutomationSettings(target);

      for (const metResult of newlyMet) {
        const nextPhase = getNextPhase(target.phase);

        if (!automationSettings) {
          // No settings = alert only by default
          toast.info(metResult.recommended_action || `${metResult.criteria_type} criteria met`);
          continue;
        }

        if (!automationSettings.auto_advance_enabled) {
          toast.info(metResult.recommended_action || `${metResult.criteria_type} criteria met`);
          continue;
        }

        const mode = automationSettings.advance_mode;

        if (mode === 'alert_only') {
          toast.info(metResult.recommended_action || `${metResult.criteria_type} criteria met — review recommended`);
        } else if (mode === 'queue_for_review') {
          // Create review queue item
          await supabase.from('review_queue').insert({
            target_id: target.id,
            program_id: target.program_id,
            student_id: target.student_id || '',
            criteria_type: metResult.criteria_type,
            current_phase: target.phase,
            suggested_phase: nextPhase,
            evidence: metResult.evidence,
            status: 'pending',
          } as any);
          toast.info(`${metResult.criteria_type} criteria met — added to review queue`);
        } else if (mode === 'auto_advance') {
          if (automationSettings.require_confirmation) {
            // Create review queue item for one-click approval
            await supabase.from('review_queue').insert({
              target_id: target.id,
              program_id: target.program_id,
              student_id: target.student_id || '',
              criteria_type: metResult.criteria_type,
              current_phase: target.phase,
              suggested_phase: nextPhase,
              evidence: metResult.evidence,
              status: 'pending',
            } as any);
            toast.info(`${metResult.criteria_type} criteria met — confirm to advance`);
          } else if (nextPhase) {
            // Auto-advance phase
            await supabase
              .from('skill_targets')
              .update({
                phase: nextPhase,
                status_effective_date: new Date().toISOString().split('T')[0],
                updated_at: new Date().toISOString(),
              } as any)
              .eq('id', target.id);
            toast.success(`Phase auto-advanced to ${nextPhase}`);

            // Check if should auto-open next target
            if (automationSettings.auto_open_next_target && nextPhase === 'closed') {
              await openNextTarget(target, automationSettings);
            }
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, [runEvaluation]);

  return { evaluations, loading, runEvaluation, runAndApplyWorkflow };
}

// ── Helpers ──

async function resolveAutomationSettings(target: TargetInfo) {
  // Resolution order: target → program → student → global
  const scopes: Array<{ scope: string; scope_id: string | null }> = [
    { scope: 'target', scope_id: target.id },
    { scope: 'program', scope_id: target.program_id },
  ];
  if (target.student_id) {
    scopes.push({ scope: 'student', scope_id: target.student_id });
  }
  scopes.push({ scope: 'global', scope_id: null });

  for (const s of scopes) {
    let query = supabase.from('automation_settings').select('*').eq('scope', s.scope);
    if (s.scope_id) {
      query = query.eq('scope_id', s.scope_id);
    } else {
      query = query.is('scope_id', null);
    }
    const { data } = await query.maybeSingle();
    if (data) return data as any;
  }
  return null;
}

async function openNextTarget(target: TargetInfo, settings: any) {
  const { data: nextTarget } = await supabase
    .from('skill_targets')
    .select('id')
    .eq('program_id', target.program_id)
    .gt('sort_order', target.sort_order || 0)
    .eq('active', true)
    .neq('phase', 'closed')
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nextTarget) {
    const startPhase = settings.auto_start_phase || 'baseline';
    await supabase
      .from('skill_targets')
      .update({
        phase: startPhase,
        status: 'active',
        status_effective_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      } as any)
      .eq('id', nextTarget.id);
    toast.success('Next target opened automatically');
  } else {
    toast.info('All targets in program completed');
  }
}
