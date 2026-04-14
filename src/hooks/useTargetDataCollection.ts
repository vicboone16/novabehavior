import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TrialEntry {
  id: string;
  outcome: 'correct' | 'incorrect' | 'no_response' | 'prompted';
  prompt_level_id: string | null;
  prompt_success: boolean;
  recorded_at: string;
  trial_index: number;
  notes: string | null;
}

export interface SessionStats {
  correct: number;
  incorrect: number;
  noResponse: number;
  prompted: number;
  total: number;
  percentCorrect: number;
  percentIndependent: number;
}

export function useTargetDataCollection(targetId: string, method: string) {
  const { user } = useAuth();
  const [trials, setTrials] = useState<TrialEntry[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const sessionIdRef = useRef<string | null>(null);

  const stats: SessionStats = {
    correct: trials.filter(t => t.outcome === 'correct').length,
    incorrect: trials.filter(t => t.outcome === 'incorrect').length,
    noResponse: trials.filter(t => t.outcome === 'no_response').length,
    prompted: trials.filter(t => t.outcome === 'prompted').length,
    total: trials.length,
    percentCorrect: trials.length > 0
      ? Math.round((trials.filter(t => t.outcome === 'correct').length / trials.length) * 100)
      : 0,
    percentIndependent: trials.length > 0
      ? Math.round((trials.filter(t => t.prompt_success).length / trials.length) * 100)
      : 0,
  };

  const startSession = useCallback(() => {
    setTrials([]);
    sessionIdRef.current = null;
    setIsRecording(true);
  }, []);

  const recordTrial = useCallback(async (
    outcome: 'correct' | 'incorrect' | 'no_response' | 'prompted',
    promptLevelId: string | null,
    isIndependent: boolean,
    notes?: string,
  ) => {
    if (!targetId) return;
    const trialIndex = trials.length;
    const now = new Date().toISOString();

    const insertRow: Record<string, any> = {
      target_id: targetId,
      trial_index: trialIndex,
      outcome,
      prompt_success: isIndependent,
      recorded_at: now,
      session_type: method || 'discrete_trial',
      data_state: 'final',
    };
    if (sessionIdRef.current) insertRow.session_id = sessionIdRef.current;
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

    if (data?.session_id && !sessionIdRef.current) {
      sessionIdRef.current = data.session_id;
    }

    const entry: TrialEntry = {
      id: data?.id || crypto.randomUUID(),
      outcome,
      prompt_level_id: promptLevelId,
      prompt_success: isIndependent,
      recorded_at: now,
      trial_index: trialIndex,
      notes: notes || null,
    };
    setTrials(prev => [...prev, entry]);
  }, [targetId, trials.length, method, user?.id]);

  const undoLastTrial = useCallback(async () => {
    if (trials.length === 0) return;
    const last = trials[trials.length - 1];
    const { error } = await (supabase as any).from('target_trials').delete().eq('id', last.id);
    if (error) {
      console.error('Error undoing trial:', error);
      toast.error('Failed to undo');
      return;
    }
    setTrials(prev => prev.slice(0, -1));
  }, [trials]);

  const endSession = useCallback(() => {
    if (trials.length > 0) {
      toast.success(`Session saved: ${stats.correct}/${stats.total} correct (${stats.percentCorrect}%)`);
    }
    setTrials([]);
    sessionIdRef.current = null;
    setIsRecording(false);
  }, [trials.length, stats]);

  const recordMeasurement = useCallback(async (
    value: number,
    measureType: 'frequency' | 'duration' | 'latency',
  ) => {
    if (!targetId) return;
    const now = new Date().toISOString();
    const insertRow: Record<string, any> = {
      target_id: targetId,
      trial_index: 0,
      outcome: 'correct',
      recorded_at: now,
      session_type: measureType,
      data_state: 'final',
      notes: JSON.stringify({ type: measureType, value }),
    };
    if (user?.id) insertRow.recorded_by = user.id;

    const { error } = await (supabase as any).from('target_trials').insert(insertRow);
    if (error) {
      console.error(`Error recording ${measureType}:`, error);
      toast.error(`Failed to save ${measureType} data`);
      return;
    }
    toast.success(`${measureType.charAt(0).toUpperCase() + measureType.slice(1)} recorded: ${value}`);
  }, [targetId, user?.id]);

  return { trials, stats, isRecording, saving, startSession, recordTrial, undoLastTrial, endSession, recordMeasurement };
}
