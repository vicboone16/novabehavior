import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SkillTarget as LegacySkillTarget, DTTSession, DTTTrial, PromptLevel } from '@/types/behavior';
import type { SkillProgram, TargetTrial, PromptLevel as DBPromptLevel } from '@/types/skillPrograms';

/**
 * Unified hook that fetches new DB-backed skill program trial data
 * and converts it into the legacy TargetWithSessions format used by
 * charts, reports, exports, and dashboards.
 */

interface TargetWithSessions extends LegacySkillTarget {
  studentName: string;
  studentColor: string;
  sessions: DTTSession[];
}

// Map DB prompt abbreviation to legacy prompt level
const DB_PROMPT_MAP: Record<string, PromptLevel> = {
  FP: 'full_physical',
  PP: 'partial_physical',
  M: 'model',
  G: 'gestural',
  V: 'verbal',
  I: 'independent',
  P: 'gestural', // positional → gestural fallback
};

export function useUnifiedSkillData(studentId: string, studentName: string = '', studentColor: string = '#3b82f6') {
  const [dbTargets, setDbTargets] = useState<TargetWithSessions[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!studentId) { setLoading(false); return; }
    setLoading(true);

    // 1. Fetch programs with domain
    const { data: programs } = await supabase
      .from('skill_programs')
      .select('*, domain:domains(id, name)')
      .eq('student_id', studentId)
      .eq('active', true);

    if (!programs || programs.length === 0) {
      setDbTargets([]);
      setLoading(false);
      return;
    }

    const programIds = programs.map((p: any) => p.id);
    const programMap = new Map(programs.map((p: any) => [p.id, p]));

    // 2. Fetch targets
    const { data: targets } = await supabase
      .from('skill_targets')
      .select('*')
      .in('program_id', programIds)
      .eq('active', true);

    if (!targets || targets.length === 0) {
      setDbTargets([]);
      setLoading(false);
      return;
    }

    const targetIds = targets.map((t: any) => t.id);

    // 3. Fetch all trials for these targets
    const { data: trials } = await supabase
      .from('target_trials')
      .select('*')
      .in('target_id', targetIds)
      .order('recorded_at', { ascending: true });

    // 4. Fetch prompt levels for mapping
    const { data: promptLevels } = await supabase
      .from('prompt_levels')
      .select('*');

    const promptMap = new Map((promptLevels || []).map((pl: any) => [pl.id, pl]));

    // 5. Convert to legacy format
    const converted: TargetWithSessions[] = targets.map((target: any) => {
      const program = programMap.get(target.program_id) as any;
      const targetTrials = (trials || []).filter((t: any) => t.target_id === target.id);

      // Group trials by session_id (or by date if no session_id)
      const sessionGroups = new Map<string, any[]>();
      for (const trial of targetTrials) {
        const key = trial.session_id || `manual-${new Date(trial.recorded_at).toDateString()}`;
        if (!sessionGroups.has(key)) sessionGroups.set(key, []);
        sessionGroups.get(key)!.push(trial);
      }

      const sessions: DTTSession[] = Array.from(sessionGroups.entries()).map(([sessionKey, sessionTrials]) => {
        const legacyTrials: DTTTrial[] = sessionTrials.map((t: any, idx: number) => {
          const pl = t.prompt_level_id ? promptMap.get(t.prompt_level_id) : null;
          const abbreviation = pl?.abbreviation || 'I';
          return {
            id: t.id,
            timestamp: new Date(t.recorded_at),
            isCorrect: t.outcome === 'correct',
            promptLevel: (DB_PROMPT_MAP[abbreviation] || 'independent') as PromptLevel,
            errorType: t.outcome === 'incorrect' ? 'incorrect_response' as any : undefined,
            notes: t.notes || undefined,
          };
        });

        const correct = legacyTrials.filter(t => t.isCorrect).length;
        const independent = legacyTrials.filter(t => t.promptLevel === 'independent').length;
        const total = legacyTrials.length;

        return {
          id: sessionKey,
          skillTargetId: target.id,
          studentId,
          date: new Date(sessionTrials[0].recorded_at),
          trials: legacyTrials,
          percentCorrect: total > 0 ? Math.round((correct / total) * 100) : 0,
          percentIndependent: total > 0 ? Math.round((independent / total) * 100) : 0,
          notes: undefined,
        };
      });

      // Map method
      const methodMap: Record<string, any> = {
        discrete_trial: 'dtt',
        net: 'net',
        task_analysis: 'task_analysis',
        probe: 'probe',
        frequency: 'dtt',
        duration: 'dtt',
        latency: 'dtt',
        interval: 'dtt',
      };

      // Map status
      const statusMap: Record<string, any> = {
        baseline: 'baseline',
        acquisition: 'acquisition',
        fluency: 'acquisition',
        generalization: 'generalization',
        maintenance: 'maintenance',
        mastered: 'mastered',
        on_hold: 'baseline',
        discontinued: 'baseline',
      };

      return {
        id: target.id,
        studentId,
        name: target.name,
        operationalDefinition: target.operational_definition || undefined,
        domain: program?.domain?.name || undefined,
        program: program?.name || undefined,
        method: methodMap[program?.method] || 'dtt',
        status: statusMap[program?.status] || 'acquisition',
        masteryCriteria: target.mastery_percent ? {
          type: 'percent_correct' as const,
          percentCorrect: target.mastery_percent,
          consecutiveSessions: target.mastery_consecutive_sessions || 3,
          minTrials: 10,
        } : (program?.default_mastery_percent ? {
          type: 'percent_correct' as const,
          percentCorrect: program.default_mastery_percent,
          consecutiveSessions: program.default_mastery_consecutive_sessions || 3,
          minTrials: 10,
        } : undefined),
        masteredDate: program?.status === 'mastered' ? new Date(program.status_effective_date) : undefined,
        createdAt: new Date(target.created_at),
        updatedAt: new Date(target.updated_at),
        // TargetWithSessions fields
        studentName,
        studentColor,
        sessions,
      } as unknown as TargetWithSessions;
    });

    setDbTargets(converted);
    setLoading(false);
  }, [studentId, studentName, studentColor]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { dbTargets, loading, refetch: fetchData };
}

/**
 * Hook for multi-student aggregate view (dashboard).
 * Fetches all program trial data for multiple students.
 */
export function useUnifiedSkillDataMulti(
  students: { id: string; name: string; color: string }[]
) {
  const [allTargets, setAllTargets] = useState<TargetWithSessions[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      if (students.length === 0) { setAllTargets([]); setLoading(false); return; }
      setLoading(true);

      const studentIds = students.map(s => s.id);
      const studentMap = new Map(students.map(s => [s.id, s]));

      // Fetch all programs for these students
      const { data: programs } = await supabase
        .from('skill_programs')
        .select('*, domain:domains(id, name)')
        .in('student_id', studentIds)
        .eq('active', true);

      if (!programs || programs.length === 0) {
        setAllTargets([]);
        setLoading(false);
        return;
      }

      const programIds = programs.map((p: any) => p.id);
      const programMap = new Map(programs.map((p: any) => [p.id, p]));

      // Fetch targets
      const { data: targets } = await supabase
        .from('skill_targets')
        .select('*')
        .in('program_id', programIds)
        .eq('active', true);

      if (!targets || targets.length === 0) {
        setAllTargets([]);
        setLoading(false);
        return;
      }

      const targetIds = targets.map((t: any) => t.id);

      // Fetch trials (batched if needed)
      const { data: trials } = await supabase
        .from('target_trials')
        .select('*')
        .in('target_id', targetIds)
        .order('recorded_at', { ascending: true })
        .limit(5000);

      // Prompt levels
      const { data: promptLevels } = await supabase
        .from('prompt_levels')
        .select('*');

      const promptMapLocal = new Map((promptLevels || []).map((pl: any) => [pl.id, pl]));

      // Convert each target
      const converted: TargetWithSessions[] = (targets || []).map((target: any) => {
        const program = programMap.get(target.program_id) as any;
        const student = program ? studentMap.get(program.student_id) : undefined;
        const targetTrials = (trials || []).filter((t: any) => t.target_id === target.id);

        // Group by session
        const sessionGroups = new Map<string, any[]>();
        for (const trial of targetTrials) {
          const key = trial.session_id || `manual-${new Date(trial.recorded_at).toDateString()}`;
          if (!sessionGroups.has(key)) sessionGroups.set(key, []);
          sessionGroups.get(key)!.push(trial);
        }

        const sessions: DTTSession[] = Array.from(sessionGroups.entries()).map(([sessionKey, sessionTrials]) => {
          const legacyTrials: DTTTrial[] = sessionTrials.map((t: any) => {
            const pl = t.prompt_level_id ? promptMapLocal.get(t.prompt_level_id) : null;
            const abbreviation = pl?.abbreviation || 'I';
            return {
              id: t.id,
              timestamp: new Date(t.recorded_at),
              isCorrect: t.outcome === 'correct',
              promptLevel: (DB_PROMPT_MAP[abbreviation] || 'independent') as PromptLevel,
              notes: t.notes || undefined,
            };
          });

          const correct = legacyTrials.filter(t => t.isCorrect).length;
          const independent = legacyTrials.filter(t => t.promptLevel === 'independent').length;
          const total = legacyTrials.length;

          return {
            id: sessionKey,
            skillTargetId: target.id,
            studentId: program?.student_id || '',
            date: new Date(sessionTrials[0].recorded_at),
            trials: legacyTrials,
            percentCorrect: total > 0 ? Math.round((correct / total) * 100) : 0,
            percentIndependent: total > 0 ? Math.round((independent / total) * 100) : 0,
          };
        });

        const methodMap: Record<string, any> = {
          discrete_trial: 'dtt', net: 'net', task_analysis: 'task_analysis', probe: 'probe',
          frequency: 'dtt', duration: 'dtt', latency: 'dtt', interval: 'dtt',
        };
        const statusMap: Record<string, any> = {
          baseline: 'baseline', acquisition: 'acquisition', fluency: 'acquisition',
          generalization: 'generalization', maintenance: 'maintenance', mastered: 'mastered',
          on_hold: 'baseline', discontinued: 'baseline',
        };

        return {
          id: target.id,
          studentId: program?.student_id || '',
          name: target.name,
          operationalDefinition: target.operational_definition || undefined,
          domain: program?.domain?.name || undefined,
          program: program?.name || undefined,
          method: methodMap[program?.method] || 'dtt',
          status: statusMap[program?.status] || 'acquisition',
          masteryCriteria: target.mastery_percent ? {
            type: 'percent_correct' as const,
            percentCorrect: target.mastery_percent,
            consecutiveSessions: target.mastery_consecutive_sessions || 3,
            minTrials: 10,
          } : undefined,
          createdAt: new Date(target.created_at),
          updatedAt: new Date(target.updated_at),
          studentName: student?.name || 'Unknown',
          studentColor: student?.color || '#3b82f6',
          sessions,
        } as unknown as TargetWithSessions;
      });

      setAllTargets(converted);
      setLoading(false);
    };

    fetchAll();
  }, [students]);

  return { allTargets, loading };
}
