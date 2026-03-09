import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReplacementBehaviorSummary {
  student_id: string;
  plan_link_id: string;
  problem_behavior_name: string | null;
  problem_behavior_count: number;
  replacement_behavior_count: number;
  replacement_to_problem_ratio: number | null;
  replacement_strength_score: number | null;
  replacement_status: string;
  last_replacement_analysis_date: string | null;
}

export type ReplacementStatus = 'not_started' | 'weak' | 'emerging' | 'strong';

export function getReplacementStatusColor(status: string): string {
  switch (status) {
    case 'strong': return 'bg-emerald-500 text-white';
    case 'emerging': return 'bg-yellow-500 text-white';
    case 'weak': return 'bg-destructive text-destructive-foreground';
    default: return 'bg-muted text-muted-foreground';
  }
}

export function useReplacementBehaviorIntelligence(studentId: string | null | undefined) {
  const [summaries, setSummaries] = useState<ReplacementBehaviorSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!studentId) { setSummaries([]); setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await (supabase.from as any)('v_replacement_behavior_strength_summary')
        .select('*')
        .eq('student_id', studentId);
      
      if (!error && data) {
        setSummaries(data as unknown as ReplacementBehaviorSummary[]);
      }
    } catch (err) {
      console.error('[ReplacementBx] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { fetch(); }, [fetch]);

  const stats = useMemo(() => {
    const weak = summaries.filter(s => s.replacement_status === 'weak').length;
    const emerging = summaries.filter(s => s.replacement_status === 'emerging').length;
    const strong = summaries.filter(s => s.replacement_status === 'strong').length;
    const notStarted = summaries.filter(s => s.replacement_status === 'not_started').length;
    return { weak, emerging, strong, notStarted, total: summaries.length };
  }, [summaries]);

  return { summaries, stats, loading, refresh: fetch };
}

export function useCaseloadReplacementIntelligence(agencyId: string | null) {
  const [summaries, setSummaries] = useState<ReplacementBehaviorSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!agencyId) { setSummaries([]); setLoading(false); return; }
    setLoading(true);
    try {
      let studentQuery = supabase.from('students').select('id');
      if (agencyId !== 'all') {
        studentQuery = studentQuery.eq('agency_id', agencyId);
      }
      const { data: studentsData } = await studentQuery;
      
      if (studentsData && studentsData.length > 0) {
        const studentIds = studentsData.map((s: any) => s.id);
        const { data, error } = await (supabase.from as any)('v_replacement_behavior_strength_summary')
          .select('*')
          .in('student_id', studentIds);
        
        if (!error && data) {
          setSummaries(data as unknown as ReplacementBehaviorSummary[]);
        }
      } else {
        setSummaries([]);
      }
    } catch (err) {
      console.error('[CaseloadReplacement] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => { fetch(); }, [fetch]);

  const stats = useMemo(() => {
    const weak = summaries.filter(s => s.replacement_status === 'weak').length;
    const emerging = summaries.filter(s => s.replacement_status === 'emerging').length;
    const strong = summaries.filter(s => s.replacement_status === 'strong').length;
    return { weak, emerging, strong, total: summaries.length };
  }, [summaries]);

  return { summaries, stats, loading, refresh: fetch };
}
