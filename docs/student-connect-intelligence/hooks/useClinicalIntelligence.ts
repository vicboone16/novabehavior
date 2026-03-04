import { useState, useEffect, useCallback } from 'react';
import { novaCore } from '@/lib/supabase-untyped';

// === Types ===

export interface CaseloadFeedRow {
  client_id: string;
  agency_id: string;
  client_name: string;
  risk_score: number;
  trend_score: number;
  data_freshness: number;
  fidelity_score: number;
  goal_velocity_score: number;
  parent_impl_score: number;
  metrics_updated_at: string;
  open_alert_count: number;
}

export interface AlertFeedRow {
  alert_id: string;
  agency_id: string;
  client_id: string | null;
  client_name: string | null;
  category: string;
  severity: 'critical' | 'action' | 'watch' | 'high' | 'medium' | 'info';
  message: string;
  explanation_json: Record<string, any>;
  alert_key: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface CIInterventionRec {
  id: string;
  agency_id: string;
  client_id: string;
  score: number;
  reasons_json: Record<string, any>;
  status: string;
  created_at: string;
}

// === Hooks ===

export function useCICaseloadFeed(agencyId: string | null) {
  const [rows, setRows] = useState<CaseloadFeedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!agencyId) { setRows([]); setLoading(false); return; }
    try {
      setLoading(true);

      // Try the view first
      let query = novaCore.from('v_ci_caseload_feed').select('*');
      if (agencyId !== 'all') query = query.eq('agency_id', agencyId);
      const { data, error } = await query;

      if (!error && data) {
        setRows(data as CaseloadFeedRow[]);
      } else {
        // Fallback: query ci_client_metrics + students
        let mq = novaCore.from('ci_client_metrics').select('*');
        if (agencyId !== 'all') mq = mq.eq('agency_id', agencyId);
        const { data: metrics } = await mq;

        if (metrics && metrics.length > 0) {
          const clientIds = metrics.map((m: any) => m.client_id);
          const { data: students } = await novaCore
            .from('students')
            .select('id, first_name, last_name')
            .in('id', clientIds);

          const nameMap = new Map<string, string>();
          if (students) {
            for (const s of students as any[]) {
              nameMap.set(s.id, `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown');
            }
          }

          let aq = novaCore.from('ci_alerts').select('client_id').is('resolved_at', null);
          if (agencyId !== 'all') aq = aq.eq('agency_id', agencyId);
          const { data: alertsData } = await aq;
          const alertCounts = new Map<string, number>();
          if (alertsData) {
            for (const a of alertsData as any[]) {
              if (a.client_id) alertCounts.set(a.client_id, (alertCounts.get(a.client_id) || 0) + 1);
            }
          }

          setRows(metrics.map((m: any) => ({
            client_id: m.client_id,
            agency_id: m.agency_id,
            client_name: nameMap.get(m.client_id) || 'Unknown',
            risk_score: m.risk_score ?? 0,
            trend_score: m.trend_score ?? 0,
            data_freshness: m.data_freshness ?? 0,
            fidelity_score: m.fidelity_score ?? 0,
            goal_velocity_score: m.goal_velocity_score ?? 0,
            parent_impl_score: m.parent_impl_score ?? 0,
            metrics_updated_at: m.updated_at,
            open_alert_count: alertCounts.get(m.client_id) || 0,
          })));
        } else {
          setRows([]);
        }
      }
    } catch (err) {
      console.error('[CI] Error fetching caseload feed:', err);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { rows, loading, refresh: fetch };
}

export function useCIAlertFeed(agencyId: string | null) {
  const [alerts, setAlerts] = useState<AlertFeedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    if (!agencyId) { setAlerts([]); setLoading(false); return; }
    try {
      setLoading(true);

      let query = novaCore.from('v_ci_alert_feed').select('*').order('created_at', { ascending: false });
      if (agencyId !== 'all') query = query.eq('agency_id', agencyId);
      const { data, error } = await query;

      if (!error && data) {
        setAlerts(data as AlertFeedRow[]);
      } else {
        let aq = novaCore.from('ci_alerts').select('*').is('resolved_at', null).order('created_at', { ascending: false });
        if (agencyId !== 'all') aq = aq.eq('agency_id', agencyId);
        const { data: alertsData } = await aq;

        if (alertsData && alertsData.length > 0) {
          const clientIds = alertsData.filter((a: any) => a.client_id).map((a: any) => a.client_id);
          const nameMap = new Map<string, string>();
          if (clientIds.length > 0) {
            const { data: students } = await novaCore.from('students').select('id, first_name, last_name').in('id', clientIds);
            if (students) {
              for (const s of students as any[]) {
                nameMap.set(s.id, `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown');
              }
            }
          }
          setAlerts(alertsData.map((a: any) => ({
            alert_id: a.id,
            agency_id: a.agency_id,
            client_id: a.client_id,
            client_name: a.client_id ? (nameMap.get(a.client_id) || null) : null,
            category: a.category,
            severity: a.severity,
            message: a.message,
            explanation_json: a.explanation_json || {},
            alert_key: a.alert_key || '',
            created_at: a.created_at,
            resolved_at: a.resolved_at,
            resolved_by: a.resolved_by,
          })));
        } else {
          setAlerts([]);
        }
      }
    } catch (err) {
      console.error('[CI] Error fetching alert feed:', err);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const resolveAlert = async (alertId: string, userId: string) => {
    const { error } = await novaCore
      .from('ci_alerts')
      .update({ resolved_at: new Date().toISOString(), resolved_by: userId })
      .eq('id', alertId);
    if (!error) setAlerts(prev => prev.filter(a => a.alert_id !== alertId));
    return !error;
  };

  return { alerts, loading, refresh: fetchAlerts, resolveAlert };
}

export function useCIInterventionRecs(agencyId: string | null) {
  const [recs, setRecs] = useState<CIInterventionRec[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId) { setRecs([]); setLoading(false); return; }
    const fetchRecs = async () => {
      setLoading(true);
      let query = novaCore.from('ci_intervention_recs').select('*').order('score', { ascending: false });
      if (agencyId !== 'all') query = query.eq('agency_id', agencyId);
      const { data, error } = await query;
      if (!error && data) setRecs(data as CIInterventionRec[]);
      setLoading(false);
    };
    fetchRecs();
  }, [agencyId]);

  return { recs, loading };
}
