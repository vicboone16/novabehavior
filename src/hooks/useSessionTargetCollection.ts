import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { SkillProgram, SkillTarget } from '@/types/skillPrograms';

export interface TargetTrialEntry {
  id: string;
  targetId: string;
  outcome: 'correct' | 'incorrect' | 'no_response' | 'prompted';
  promptLevelId: string | null;
  promptSuccess: boolean;
  recordedAt: string;
  trialIndex: number;
  notes: string | null;
}

export interface TargetSessionState {
  target: SkillTarget;
  program: SkillProgram;
  trials: TargetTrialEntry[];
  frequencyCount: number;
  timerSeconds: number;
  timerRunning: boolean;
  taStepResults: Record<string, { outcome: string; promptLevelId: string | null }>;
}

export interface TargetSessionStats {
  correct: number;
  incorrect: number;
  noResponse: number;
  prompted: number;
  total: number;
  percentCorrect: number;
  percentIndependent: number;
}

export function getTargetStats(state: TargetSessionState): TargetSessionStats {
  const trials = state.trials;
  const correct = trials.filter(t => t.outcome === 'correct').length;
  const independent = trials.filter(t => t.promptSuccess).length;
  return {
    correct,
    incorrect: trials.filter(t => t.outcome === 'incorrect').length,
    noResponse: trials.filter(t => t.outcome === 'no_response').length,
    prompted: trials.filter(t => t.outcome === 'prompted').length,
    total: trials.length,
    percentCorrect: trials.length > 0 ? Math.round((correct / trials.length) * 100) : 0,
    percentIndependent: trials.length > 0 ? Math.round((independent / trials.length) * 100) : 0,
  };
}

export function useSessionTargetCollection(studentId: string) {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [targetStates, setTargetStates] = useState<Map<string, TargetSessionState>>(new Map());
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);

  const startSession = useCallback(async (
    selectedTargets: { target: SkillTarget; program: SkillProgram }[],
    linkedSessionId?: string,
  ) => {
    if (!user) return;
    let sId = linkedSessionId || null;

    if (!sId) {
      const { data, error } = await (supabase as any)
        .from('sessions')
        .insert({
          name: `Skill Acquisition - ${new Date().toLocaleDateString()}`,
          user_id: user.id,
          student_id: studentId,
          start_time: new Date().toISOString(),
          started_at: new Date().toISOString(),
          status: 'in_progress',
          session_length_minutes: 60,
          interval_length_seconds: 120,
          has_data: true,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to create session:', error);
        toast.error('Failed to start session');
        return;
      }
      sId = data.id;
    }

    const states = new Map<string, TargetSessionState>();
    for (const { target, program } of selectedTargets) {
      states.set(target.id, {
        target, program, trials: [],
        frequencyCount: 0, timerSeconds: 0, timerRunning: false, taStepResults: {},
      });
    }

    setSessionId(sId);
    setTargetStates(states);
    setIsSessionActive(true);
    setSessionStartTime(new Date());
    if (selectedTargets.length > 0) setActiveTargetId(selectedTargets[0].target.id);
  }, [user, studentId]);

  const recordTrial = useCallback(async (
    targetId: string,
    outcome: 'correct' | 'incorrect' | 'no_response' | 'prompted',
    promptLevelId: string | null,
    isIndependent: boolean,
    notes?: string,
  ) => {
    const state = targetStates.get(targetId);
    if (!state || !sessionId) return;

    const trialIndex = state.trials.length;
    const now = new Date().toISOString();

    const insertRow: Record<string, any> = {
      target_id: targetId,
      session_id: sessionId,
      trial_index: trialIndex,
      outcome,
      prompt_success: isIndependent,
      recorded_at: now,
      session_type: state.program.method || 'discrete_trial',
      data_state: 'final',
    };
    if (promptLevelId) insertRow.prompt_level_id = promptLevelId;
    if (user?.id) insertRow.recorded_by = user.id;
    if (notes) insertRow.notes = notes;

    const { data, error } = await (supabase as any)
      .from('target_trials')
      .insert(insertRow)
      .select()
      .single();

    if (error) {
      console.error('Error recording trial:', error);
      toast.error('Failed to save trial');
      return;
    }

    const entry: TargetTrialEntry = {
      id: data?.id || crypto.randomUUID(),
      targetId, outcome, promptLevelId, promptSuccess: isIndependent,
      recordedAt: now, trialIndex, notes: notes || null,
    };

    setTargetStates(prev => {
      const next = new Map(prev);
      const s = { ...next.get(targetId)! };
      s.trials = [...s.trials, entry];
      next.set(targetId, s);
      return next;
    });
  }, [targetStates, sessionId, user?.id]);

  const undoLastTrial = useCallback(async (targetId: string) => {
    const state = targetStates.get(targetId);
    if (!state || state.trials.length === 0) return;

    const last = state.trials[state.trials.length - 1];
    const { error } = await (supabase as any).from('target_trials').delete().eq('id', last.id);
    if (error) { toast.error('Failed to undo'); return; }

    setTargetStates(prev => {
      const next = new Map(prev);
      const s = { ...next.get(targetId)! };
      s.trials = s.trials.slice(0, -1);
      next.set(targetId, s);
      return next;
    });
  }, [targetStates]);

  const saveFrequency = useCallback(async (targetId: string, count: number) => {
    if (!sessionId) return;
    const { error } = await (supabase as any).from('target_trials').insert({
      target_id: targetId, session_id: sessionId, trial_index: 0,
      outcome: 'correct', recorded_at: new Date().toISOString(),
      recorded_by: user?.id, session_type: 'frequency', data_state: 'final',
      notes: JSON.stringify({ type: 'frequency', value: count }),
    });
    if (error) { toast.error('Failed to save frequency'); return; }
    toast.success(`Frequency recorded: ${count}`);
  }, [sessionId, user?.id]);

  const saveDuration = useCallback(async (targetId: string, seconds: number, measureType: 'duration' | 'latency') => {
    if (!sessionId) return;
    const { error } = await (supabase as any).from('target_trials').insert({
      target_id: targetId, session_id: sessionId, trial_index: 0,
      outcome: 'correct', recorded_at: new Date().toISOString(),
      recorded_by: user?.id, session_type: measureType, data_state: 'final',
      notes: JSON.stringify({ type: measureType, value: seconds }),
    });
    if (error) { toast.error(`Failed to save ${measureType}`); return; }
    toast.success(`${measureType === 'duration' ? 'Duration' : 'Latency'} recorded: ${Math.floor(seconds / 60)}m ${seconds % 60}s`);
  }, [sessionId, user?.id]);

  const recordTAStep = useCallback(async (
    targetId: string, stepId: string, outcome: string, promptLevelId: string | null,
  ) => {
    if (!sessionId) return;
    const insertRow: Record<string, any> = {
      step_id: stepId, session_id: sessionId, outcome,
      recorded_at: new Date().toISOString(), session_type: 'task_analysis', data_state: 'final',
    };
    if (promptLevelId) insertRow.prompt_level_id = promptLevelId;
    if (user?.id) insertRow.recorded_by = user.id;

    const { error } = await (supabase as any).from('task_analysis_step_data').insert(insertRow);
    if (error) { console.error('Error recording TA step:', error); toast.error('Failed to save step data'); return; }

    setTargetStates(prev => {
      const next = new Map(prev);
      const s = { ...next.get(targetId)! };
      s.taStepResults = { ...s.taStepResults, [stepId]: { outcome, promptLevelId } };
      next.set(targetId, s);
      return next;
    });
  }, [sessionId, user?.id]);

  const finalizeTATarget = useCallback(async (targetId: string) => {
    const state = targetStates.get(targetId);
    if (!state || !sessionId) return;
    const results = Object.values(state.taStepResults);
    if (results.length === 0) return;

    const correct = results.filter(r => r.outcome === 'correct' || r.outcome === 'independent').length;
    const total = results.length;
    const pct = Math.round((correct / total) * 100);

    await (supabase as any).from('target_trials').insert({
      target_id: targetId, session_id: sessionId, trial_index: 0,
      outcome: pct >= 80 ? 'correct' : 'incorrect', prompt_success: pct >= 80,
      recorded_at: new Date().toISOString(), recorded_by: user?.id,
      session_type: 'task_analysis', data_state: 'final',
      notes: JSON.stringify({ type: 'task_analysis', stepsCorrect: correct, stepsTotal: total, percentCorrect: pct }),
    });
  }, [targetStates, sessionId, user?.id]);

  const setFrequencyCount = useCallback((targetId: string, count: number) => {
    setTargetStates(prev => {
      const next = new Map(prev);
      const s = { ...next.get(targetId)! };
      s.frequencyCount = count;
      next.set(targetId, s);
      return next;
    });
  }, []);

  const setTimerState = useCallback((targetId: string, running: boolean, seconds?: number) => {
    setTargetStates(prev => {
      const next = new Map(prev);
      const s = { ...next.get(targetId)! };
      s.timerRunning = running;
      if (seconds !== undefined) s.timerSeconds = seconds;
      next.set(targetId, s);
      return next;
    });
  }, []);

  const nextTarget = useCallback(() => {
    const keys = Array.from(targetStates.keys());
    const idx = activeTargetId ? keys.indexOf(activeTargetId) : -1;
    if (idx < keys.length - 1) setActiveTargetId(keys[idx + 1]);
  }, [targetStates, activeTargetId]);

  const prevTarget = useCallback(() => {
    const keys = Array.from(targetStates.keys());
    const idx = activeTargetId ? keys.indexOf(activeTargetId) : -1;
    if (idx > 0) setActiveTargetId(keys[idx - 1]);
  }, [targetStates, activeTargetId]);

  const endSession = useCallback(async () => {
    if (!sessionId) return;

    for (const [tid, state] of targetStates) {
      if (state.program.method === 'task_analysis' && Object.keys(state.taStepResults).length > 0) {
        await finalizeTATarget(tid);
      }
    }

    await (supabase as any).from('sessions').update({
      status: 'completed', ended_at: new Date().toISOString(), end_time: new Date().toISOString(),
    }).eq('id', sessionId);

    let totalTrials = 0;
    for (const state of targetStates.values()) totalTrials += state.trials.length;
    toast.success(`Session complete: ${targetStates.size} targets, ${totalTrials} total trials`);

    setSessionId(null);
    setTargetStates(new Map());
    setActiveTargetId(null);
    setIsSessionActive(false);
    setSessionStartTime(null);
  }, [sessionId, targetStates, finalizeTATarget]);

  const activeState = activeTargetId ? targetStates.get(activeTargetId) : null;
  const targetList = useMemo(() => Array.from(targetStates.values()), [targetStates]);
  const targetIds = useMemo(() => Array.from(targetStates.keys()), [targetStates]);
  const activeIndex = activeTargetId ? targetIds.indexOf(activeTargetId) : -1;

  return {
    sessionId, isSessionActive, sessionStartTime,
    targetStates, targetList, activeTargetId, activeState, activeIndex,
    targetCount: targetStates.size,
    startSession, endSession, recordTrial, undoLastTrial,
    saveFrequency, saveDuration, recordTAStep, finalizeTATarget,
    setFrequencyCount, setTimerState,
    setActiveTargetId, nextTarget, prevTarget,
  };
}
