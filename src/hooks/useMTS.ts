import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MTSDefinition {
  id: string;
  student_id: string | null;
  client_id: string | null;
  target_id: string | null;
  behavior_name: string | null;
  definition_name: string;
  interval_seconds: number;
  observation_duration_minutes: number;
  audience: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface MTSSession {
  id: string;
  definition_id: string;
  student_id: string | null;
  client_id: string | null;
  session_date: string;
  started_at: string | null;
  ended_at: string | null;
  expected_intervals: number;
  completed_intervals: number;
  observed_percent: number | null;
  created_by: string | null;
  created_at: string;
}

export interface MTSIntervalRecord {
  id: string;
  mts_session_id: string;
  interval_number: number;
  interval_timestamp: string | null;
  observed_present: boolean | null;
  notes: string | null;
  created_at: string;
}

export interface MTSSessionSummary {
  session_id: string;
  definition_id: string;
  definition_name: string;
  behavior_name: string | null;
  session_date: string;
  expected_intervals: number;
  completed_intervals: number;
  present_count: number;
  absent_count: number;
  observed_percent: number;
}

export function useMTS(studentId?: string) {
  const [definitions, setDefinitions] = useState<MTSDefinition[]>([]);
  const [sessions, setSessions] = useState<MTSSessionSummary[]>([]);
  const [activeSession, setActiveSession] = useState<MTSSession | null>(null);
  const [intervals, setIntervals] = useState<MTSIntervalRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const db = supabase as any;

  const loadDefinitions = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const { data, error } = await db
        .from('mts_definitions')
        .select('*')
        .or(`student_id.eq.${studentId},client_id.eq.${studentId}`)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDefinitions(data || []);
    } catch (err) {
      console.error('[MTS] Load definitions error:', err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const createDefinition = useCallback(async (def: Partial<MTSDefinition>) => {
    try {
      const { data, error } = await db
        .from('mts_definitions')
        .insert({
          student_id: def.student_id || studentId,
          client_id: def.client_id || studentId,
          target_id: def.target_id,
          behavior_name: def.behavior_name,
          definition_name: def.definition_name,
          interval_seconds: def.interval_seconds || 60,
          observation_duration_minutes: def.observation_duration_minutes || 15,
          audience: def.audience || 'all',
          is_active: true,
          created_by: def.created_by,
        })
        .select()
        .single();
      if (error) throw error;
      await loadDefinitions();
      return data;
    } catch (err) {
      console.error('[MTS] Create definition error:', err);
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
        .from('mts_sessions')
        .insert({
          definition_id: definitionId,
          student_id: def.student_id,
          client_id: def.client_id,
          session_date: new Date().toISOString().split('T')[0],
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
      console.error('[MTS] Start session error:', err);
      return null;
    }
  }, [definitions]);

  const recordInterval = useCallback(async (present: boolean, notes?: string) => {
    if (!activeSession) return;
    const intervalNumber = intervals.length + 1;

    try {
      const { data, error } = await db
        .from('mts_interval_data')
        .insert({
          mts_session_id: activeSession.id,
          interval_number: intervalNumber,
          interval_timestamp: new Date().toISOString(),
          observed_present: present,
          notes: notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      
      const newIntervals = [...intervals, data];
      setIntervals(newIntervals);

      // Update session completed count
      const completed = newIntervals.length;
      const presentCount = newIntervals.filter(i => i.observed_present).length;
      const observedPercent = completed > 0 ? Math.round((presentCount / completed) * 100) : 0;

      await db
        .from('mts_sessions')
        .update({
          completed_intervals: completed,
          observed_percent: observedPercent,
        })
        .eq('id', activeSession.id);

      setActiveSession(prev => prev ? {
        ...prev,
        completed_intervals: completed,
        observed_percent: observedPercent,
      } : null);

      return data;
    } catch (err) {
      console.error('[MTS] Record interval error:', err);
      return null;
    }
  }, [activeSession, intervals]);

  const endSession = useCallback(async () => {
    if (!activeSession) return;
    try {
      const presentCount = intervals.filter(i => i.observed_present).length;
      const completed = intervals.length;
      const observedPercent = completed > 0 ? Math.round((presentCount / completed) * 100) : 0;

      await db
        .from('mts_sessions')
        .update({
          ended_at: new Date().toISOString(),
          completed_intervals: completed,
          observed_percent: observedPercent,
        })
        .eq('id', activeSession.id);

      setActiveSession(null);
      setIntervals([]);
    } catch (err) {
      console.error('[MTS] End session error:', err);
    }
  }, [activeSession, intervals]);

  const loadSessionHistory = useCallback(async () => {
    if (!studentId) return;
    try {
      const { data, error } = await db
        .from('v_mts_session_summary')
        .select('*')
        .or(`student_id.eq.${studentId},client_id.eq.${studentId}`)
        .order('session_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      setSessions((data || []) as MTSSessionSummary[]);
    } catch (err) {
      console.error('[MTS] Load sessions error:', err);
    }
  }, [studentId]);

  return {
    definitions,
    sessions,
    activeSession,
    intervals,
    loading,
    loadDefinitions,
    createDefinition,
    startSession,
    recordInterval,
    endSession,
    loadSessionHistory,
  };
}
