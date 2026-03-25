import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export interface ParentInsight {
  id: string;
  student_id: string;
  insight_date: string;
  insight_type: string;
  headline: string | null;
  behavior_summary: any[];
  what_this_means: string | null;
  what_you_can_do: string[];
  rewards_summary: any;
  teacher_note: string | null;
  points_earned: number;
  points_redeemed: number;
  trend_data: any;
  status: string;
  created_at: string;
}

export function useParentInsights(studentId: string | null, days = 7) {
  const [insights, setInsights] = useState<ParentInsight[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!studentId) { setLoading(false); return; }
    try {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data } = await db
        .from('parent_insights')
        .select('*')
        .eq('student_id', studentId)
        .gte('insight_date', since.toISOString().split('T')[0])
        .order('insight_date', { ascending: false })
        .limit(30);

      setInsights((data || []) as ParentInsight[]);
    } catch (err) {
      console.error('useParentInsights error:', err);
    } finally {
      setLoading(false);
    }
  }, [studentId, days]);

  useEffect(() => { fetch(); }, [fetch]);

  return { insights, loading, refresh: fetch };
}

export function useLatestParentInsight(studentId: string | null) {
  const [insight, setInsight] = useState<ParentInsight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) { setLoading(false); return; }
    db.from('parent_insights')
      .select('*')
      .eq('student_id', studentId)
      .order('insight_date', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }: any) => {
        setInsight(data || null);
        setLoading(false);
      });
  }, [studentId]);

  return { insight, loading };
}
