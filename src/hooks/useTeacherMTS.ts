import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface IntervalDefinition {
  id: string;
  student_id: string | null;
  client_id: string | null;
  behavior_name: string | null;
  definition_name: string;
  interval_type: string; // 'whole' | 'partial' | 'momentary'
  interval_seconds: number;
  observation_duration_minutes: number;
  mts_enabled: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface TeacherIntervalSession {
  id: string;
  definition_id: string | null;
  student_id: string | null;
  client_id: string | null;
  interval_type: string | null;
  started_at: string | null;
  ended_at: string | null;
  expected_intervals: number | null;
  completed_intervals: number;
  created_by: string | null;
  created_at: string;
}

export interface TeacherIntervalRecord {
  id: string;
  session_id: string | null;
  interval_number: number;
  interval_timestamp: string | null;
  observed_present: boolean | null;
  created_at: string;
}

export interface TeacherMTSSummary {
  session_id: string;
  student_id: string | null;
  client_id: string | null;
  definition_id: string | null;
  interval_type: string | null;
  started_at: string | null;
  ended_at: string | null;
  expected_intervals: number | null;
  intervals_completed: number;
  observed_present: number;
  observed_percent: number;
}

export function useTeacherMTS(studentId?: string) {
  const [definitions, setDefinitions] = useState<IntervalDefinition[]>([]);
  const [activeSession, setActiveSession] = useState<TeacherIntervalSession | null>(null);
  const [intervals, setIntervals] = useState<TeacherIntervalRecord[]>([]);
  const [sessionHistory, setSessionHistory] = useState<TeacherMTSSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const db = supabase as any;

  const loadDefinitions = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const { data, error } = await db
        .from('interval_definitions')
        .select('*')
        .or(`student_id.eq.${studentId},client_id.eq.${studentId}`)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDefinitions(data || []);
    } catch (err) {
      console.error('[TeacherMTS] Load definitions error:', err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const createDefinition = useCallback(async (def: Partial<IntervalDefinition>) => {
    try {
      const { data, error } = await db
        .from('interval_definitions')
        .insert({
          student_id: def.student_id || studentId,
          client_id: def.client_id || studentId,
          behavior_name: def.behavior_name,
          definition_name: def.definition_name,
          interval_type: def.interval_type || 'momentary',
          interval_seconds: def.interval_seconds || 60,
          observation_duration_minutes: def.observation_duration_minutes || 15,
          mts_enabled: def.interval_type === 'momentary',
          is_active: true,
          created_by: def.created_by,
        })
        .select()
        .single();
      if (error) throw error;
      await loadDefinitions();
      return data;
    } catch (err) {
      console.error('[TeacherMTS] Create definition error:', err);
      return null;
    }
  }, [studentId, loadDefinitions]);

  const startSession = useCallback(async (definitionId: string) => {
    const def = definitions.find(d => d.id === definitionId);
    if (!def) return null;

    const expectedIntervals = Math.floor(
      (def.observation_duration_minutes * 60) / def.interval_seconds
    );

    try {
      const { data, error } = await db
        .from('teacher_interval_sessions')
        .insert({
          definition_id: definitionId,
          student_id: def.student_id,
          client_id: def.client_id,
          interval_type: def.interval_type,
          started_at: new Date().toISOString(),
          expected_intervals: expectedIntervals,
          completed_intervals: 0,
          created_by: def.created_by,
        })
        .select()
        .single();
      if (error) throw error;
      setActiveSession(data);
      setIntervals([]);
      return data;
    } catch (err) {
      console.error('[TeacherMTS] Start session error:', err);
      return null;
    }
  }, [definitions]);

  const recordInterval = useCallback(async (present: boolean) => {
    if (!activeSession) return null;
    const intervalNumber = intervals.length + 1;

    try {
      const { data, error } = await db
        .from('teacher_interval_data')
        .insert({
          session_id: activeSession.id,
          interval_number: intervalNumber,
          interval_timestamp: new Date().toISOString(),
          observed_present: present,
        })
        .select()
        .single();
      if (error) throw error;

      const newIntervals = [...intervals, data];
      setIntervals(newIntervals);

      // Update session
      await db
        .from('teacher_interval_sessions')
        .update({ completed_intervals: newIntervals.length })
        .eq('id', activeSession.id);

      setActiveSession(prev => prev ? { ...prev, completed_intervals: newIntervals.length } : null);
      return data;
    } catch (err) {
      console.error('[TeacherMTS] Record interval error:', err);
      return null;
    }
  }, [activeSession, intervals]);

  const endSession = useCallback(async () => {
    if (!activeSession) return;
    try {
      await db
        .from('teacher_interval_sessions')
        .update({
          ended_at: new Date().toISOString(),
          completed_intervals: intervals.length,
        })
        .eq('id', activeSession.id);

      setActiveSession(null);
      setIntervals([]);
    } catch (err) {
      console.error('[TeacherMTS] End session error:', err);
    }
  }, [activeSession, intervals]);

  const loadSessionHistory = useCallback(async () => {
    if (!studentId) return;
    try {
      const { data, error } = await db
        .from('v_teacher_mts_summary')
        .select('*')
        .or(`student_id.eq.${studentId},client_id.eq.${studentId}`)
        .order('started_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setSessionHistory((data || []) as TeacherMTSSummary[]);
    } catch (err) {
      console.error('[TeacherMTS] Load history error:', err);
    }
  }, [studentId]);

  const presentCount = intervals.filter(i => i.observed_present).length;
  const observedPercent = intervals.length > 0 ? Math.round((presentCount / intervals.length) * 100) : 0;

  return {
    definitions,
    activeSession,
    intervals,
    sessionHistory,
    loading,
    presentCount,
    observedPercent,
    loadDefinitions,
    createDefinition,
    startSession,
    recordInterval,
    endSession,
    loadSessionHistory,
  };
}
