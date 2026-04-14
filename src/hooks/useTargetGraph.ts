import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';

export interface SessionDataPoint {
  date: string;
  dateLabel: string;
  percentCorrect: number;
  percentIndependent: number;
  totalTrials: number;
  correct: number;
  independent: number;
  sessionId: string;
  notes: string | null;
}

export interface PhaseChange {
  date: string;
  fromPhase: string | null;
  toPhase: string;
  label: string;
}

export type DateRange = '7' | '30' | '90' | 'all';

export function useTargetGraph(targetId: string, dateRange: DateRange = '30') {
  const [sessions, setSessions] = useState<SessionDataPoint[]>([]);
  const [phaseChanges, setPhaseChanges] = useState<PhaseChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [promptLevels, setPromptLevels] = useState<Map<string, any>>(new Map());

  const fetchData = useCallback(async () => {
    if (!targetId) { setLoading(false); return; }
    setLoading(true);

    const { data: plData } = await (supabase as any).from('prompt_levels').select('*');
    const plMap = new Map((plData || []).map((pl: any) => [pl.id, pl]));
    setPromptLevels(plMap);

    let query = (supabase as any)
      .from('target_trials')
      .select('*')
      .eq('target_id', targetId)
      .order('recorded_at', { ascending: true });

    if (dateRange !== 'all') {
      const days = parseInt(dateRange);
      const since = subDays(new Date(), days).toISOString();
      query = query.gte('recorded_at', since);
    }

    const { data: trials, error } = await query;
    if (error) { console.error('Error fetching target trials:', error); setLoading(false); return; }
    if (!trials || trials.length === 0) { setSessions([]); setLoading(false); return; }

    // Group by session_id or date
    const groups = new Map<string, typeof trials>();
    for (const trial of trials) {
      const key = trial.session_id || `date-${new Date(trial.recorded_at).toDateString()}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(trial);
    }

    const dataPoints: SessionDataPoint[] = Array.from(groups.entries()).map(([sessionId, sessionTrials]) => {
      const correct = sessionTrials.filter((t: any) => t.outcome === 'correct').length;
      const independent = sessionTrials.filter((t: any) => {
        if (!t.prompt_level_id) return t.outcome === 'correct';
        const pl = plMap.get(t.prompt_level_id);
        return pl?.abbreviation === 'I';
      }).length;
      const total = sessionTrials.length;
      const date = new Date(sessionTrials[0].recorded_at);
      return {
        date: date.toISOString(),
        dateLabel: `${date.getMonth() + 1}/${date.getDate()}`,
        percentCorrect: total > 0 ? Math.round((correct / total) * 100) : 0,
        percentIndependent: total > 0 ? Math.round((independent / total) * 100) : 0,
        totalTrials: total, correct, independent, sessionId,
        notes: sessionTrials.find((t: any) => t.notes)?.notes || null,
      };
    });

    dataPoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setSessions(dataPoints);

    // Fetch phase changes
    try {
      const { data: statusHistory } = await (supabase as any)
        .from('target_status_history').select('*').eq('target_id', targetId)
        .order('effective_date', { ascending: true });
      if (statusHistory && statusHistory.length > 0) {
        setPhaseChanges(statusHistory.map((h: any) => ({
          date: h.effective_date, fromPhase: h.status_from, toPhase: h.status_to,
          label: h.note || `→ ${h.status_to}`,
        })));
      } else {
        setPhaseChanges([]);
      }
    } catch { setPhaseChanges([]); }

    setLoading(false);
  }, [targetId, dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sparklineData = useMemo(() => {
    return sessions.slice(-10).map(s => ({ value: s.percentCorrect, label: s.dateLabel }));
  }, [sessions]);

  return { sessions, sparklineData, phaseChanges, loading, refetch: fetchData };
}
