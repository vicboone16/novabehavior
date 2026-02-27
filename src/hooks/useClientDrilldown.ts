import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ClientMetrics, CIAlert, CIInterventionRec } from './useClinicalIntelligence';

export interface ClientSnapshot {
  metrics: ClientMetrics | null;
  alerts: CIAlert[];
  clientName: string;
  loading: boolean;
}

export interface GoalDataPoint {
  target_id: string;
  target_name: string;
  goal_name: string;
  total_trials: number;
  correct_trials: number;
  accuracy: number;
}

export function useClientDrilldown(clientId: string | undefined) {
  const [metrics, setMetrics] = useState<ClientMetrics | null>(null);
  const [alerts, setAlerts] = useState<CIAlert[]>([]);
  const [recs, setRecs] = useState<CIInterventionRec[]>([]);
  const [clientName, setClientName] = useState('');
  const [goalData, setGoalData] = useState<GoalDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);

    try {
      // Fetch metrics, alerts, recs, and client name in parallel
      const [metricsRes, alertsRes, recsRes, clientRes, goalsRes] = await Promise.all([
        (supabase as any).from('ci_client_metrics').select('*').eq('client_id', clientId).maybeSingle(),
        (supabase as any).from('ci_alerts').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
        (supabase as any).from('ci_intervention_recs').select('*').eq('client_id', clientId).order('score', { ascending: false }),
        (supabase as any).from('clients').select('full_name').eq('client_id', clientId).maybeSingle(),
        // Goal data from goal_data view
        (supabase as any).from('goal_data').select('goal_id, correct, created_at').limit(500),
      ]);

      if (metricsRes.data) setMetrics(metricsRes.data);
      if (alertsRes.data) setAlerts(alertsRes.data);
      if (recsRes.data) setRecs(recsRes.data);
      if (clientRes.data) setClientName(clientRes.data.full_name || 'Unknown');

      // Process goal velocity by target
      if (goalsRes.data) {
        // Get goals for this client
        const { data: clientGoals } = await (supabase as any)
          .from('goals')
          .select('goal_id, goal_name')
          .eq('client_id', clientId);

        if (clientGoals && clientGoals.length > 0) {
          const goalIds = clientGoals.map((g: any) => g.goal_id);
          const relevantData = (goalsRes.data || []).filter((d: any) => goalIds.includes(d.goal_id));
          
          const byGoal: Record<string, { total: number; correct: number; name: string }> = {};
          for (const d of relevantData) {
            const goal = clientGoals.find((g: any) => g.goal_id === d.goal_id);
            if (!byGoal[d.goal_id]) byGoal[d.goal_id] = { total: 0, correct: 0, name: goal?.goal_name || 'Unknown' };
            byGoal[d.goal_id].total++;
            if (d.correct) byGoal[d.goal_id].correct++;
          }

          setGoalData(Object.entries(byGoal).map(([id, v]) => ({
            target_id: id,
            target_name: v.name,
            goal_name: v.name,
            total_trials: v.total,
            correct_trials: v.correct,
            accuracy: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
          })));
        }
      }
    } catch (err) {
      console.error('[CID] Drilldown error:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { metrics, alerts, recs, clientName, goalData, loading, refresh: fetchAll };
}
