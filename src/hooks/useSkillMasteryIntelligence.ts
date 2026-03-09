import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MasteryTargetSummary {
  student_target_id: string;
  student_id: string;
  target_title: string;
  mastery_rule_type: string | null;
  mastery_threshold: number | null;
  required_consecutive_sessions: number | null;
  required_prompt_level: string | null;
  generalization_required: boolean | null;
  generalization_context_count: number | null;
  current_accuracy: number | null;
  current_prompt_independence: number | null;
  current_latency: number | null;
  current_duration: number | null;
  percent_to_mastery: number | null;
  mastery_status: string | null;
  consecutive_sessions_at_criterion: number | null;
  last_mastery_check_date: string | null;
  target_status: string | null;
  date_added: string | null;
  date_mastered: string | null;
}

export interface MasteryFlag {
  type: 'stalled' | 'prompt_dependent' | 'ready_to_advance' | 'mastery_mismatch' | 'review_needed';
  targetId: string;
  targetTitle: string;
  message: string;
}

export function computeMasteryFlags(targets: MasteryTargetSummary[]): MasteryFlag[] {
  const flags: MasteryFlag[] = [];
  
  for (const t of targets) {
    if (!t.mastery_status || t.mastery_status === 'mastered' || t.target_status === 'closed') continue;

    // Prompt dependency: high accuracy but low independence
    if (
      (t.current_accuracy ?? 0) >= 70 &&
      (t.current_prompt_independence ?? 100) < 50
    ) {
      flags.push({
        type: 'prompt_dependent',
        targetId: t.student_target_id,
        targetTitle: t.target_title,
        message: `${t.target_title}: ${Math.round(t.current_accuracy ?? 0)}% accuracy but only ${Math.round(t.current_prompt_independence ?? 0)}% independent. Review prompt fading strategy.`,
      });
    }

    // Stalled: in progress but consecutive sessions at criterion stuck at 0 and has been checked
    if (
      t.mastery_status === 'in_progress' &&
      t.last_mastery_check_date &&
      (t.consecutive_sessions_at_criterion ?? 0) === 0 &&
      (t.percent_to_mastery ?? 0) < 50
    ) {
      flags.push({
        type: 'stalled',
        targetId: t.student_target_id,
        targetTitle: t.target_title,
        message: `${t.target_title}: No meaningful progress. Consider reviewing teaching procedure or target difficulty.`,
      });
    }

    // Ready to advance: met criterion
    if (
      t.mastery_status === 'in_progress' &&
      (t.consecutive_sessions_at_criterion ?? 0) >= (t.required_consecutive_sessions ?? 2) &&
      (t.percent_to_mastery ?? 0) >= (t.mastery_threshold ?? 80)
    ) {
      flags.push({
        type: 'ready_to_advance',
        targetId: t.student_target_id,
        targetTitle: t.target_title,
        message: `${t.target_title}: Criterion met across ${t.consecutive_sessions_at_criterion} sessions. Consider advancing.`,
      });
    }

    // Mastery mismatch: e.g. generalization required but not met
    if (
      t.generalization_required &&
      (t.generalization_context_count ?? 0) < 2 &&
      (t.current_accuracy ?? 0) >= 80
    ) {
      flags.push({
        type: 'mastery_mismatch',
        targetId: t.student_target_id,
        targetTitle: t.target_title,
        message: `${t.target_title}: High accuracy but limited generalization contexts. Increase generalization training.`,
      });
    }
  }

  return flags;
}

export function useSkillMasteryIntelligence(studentId: string | null | undefined) {
  const [targets, setTargets] = useState<MasteryTargetSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!studentId) { setTargets([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await (supabase.from as any)('v_student_target_mastery_engine_summary')
        .select('*')
        .eq('student_id', studentId);
      
      if (!error && data) {
        setTargets(data as unknown as MasteryTargetSummary[]);
      }
    } catch (err) {
      console.error('[SkillMastery] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { fetch(); }, [fetch]);

  const flags = useMemo(() => computeMasteryFlags(targets), [targets]);

  const stats = useMemo(() => {
    const mastered = targets.filter(t => t.mastery_status === 'mastered').length;
    const inProgress = targets.filter(t => t.mastery_status === 'in_progress').length;
    const notStarted = targets.filter(t => !t.mastery_status || t.mastery_status === 'not_started').length;
    const stalled = flags.filter(f => f.type === 'stalled').length;
    const promptDependent = flags.filter(f => f.type === 'prompt_dependent').length;
    const readyToAdvance = flags.filter(f => f.type === 'ready_to_advance').length;
    return { mastered, inProgress, notStarted, stalled, promptDependent, readyToAdvance, total: targets.length };
  }, [targets, flags]);

  return { targets, flags, stats, loading, refresh: fetch };
}

/**
 * Aggregate skill mastery intelligence across all students for an agency caseload.
 */
export function useCaseloadSkillIntelligence(agencyId: string | null) {
  const [targets, setTargets] = useState<MasteryTargetSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!agencyId) { setTargets([]); setLoading(false); return; }
    setLoading(true);
    try {
      // Get all student_ids for the agency, then get their targets
      let studentQuery = supabase.from('students').select('id');
      if (agencyId !== 'all') {
        studentQuery = studentQuery.eq('agency_id', agencyId);
      }
      const { data: studentsData } = await studentQuery;
      
      if (studentsData && studentsData.length > 0) {
        const studentIds = studentsData.map((s: any) => s.id);
        const { data, error } = await (supabase.from as any)('v_student_target_mastery_engine_summary')
          .select('*')
          .in('student_id', studentIds);
        
        if (!error && data) {
          setTargets(data as unknown as MasteryTargetSummary[]);
        }
      } else {
        setTargets([]);
      }
    } catch (err) {
      console.error('[CaseloadSkill] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => { fetch(); }, [fetch]);

  const allFlags = useMemo(() => computeMasteryFlags(targets), [targets]);

  const stats = useMemo(() => {
    const stalled = allFlags.filter(f => f.type === 'stalled').length;
    const promptDependent = allFlags.filter(f => f.type === 'prompt_dependent').length;
    const readyToAdvance = allFlags.filter(f => f.type === 'ready_to_advance').length;
    const reviewNeeded = allFlags.filter(f => f.type === 'review_needed' || f.type === 'mastery_mismatch').length;
    return { stalled, promptDependent, readyToAdvance, reviewNeeded, totalTargets: targets.length };
  }, [allFlags, targets]);

  return { targets, flags: allFlags, stats, loading, refresh: fetch };
}
