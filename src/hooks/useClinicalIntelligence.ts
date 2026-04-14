import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface CIAccess {
  hasCIDAccess: boolean;
  hasCrossAgency: boolean;
  loading: boolean;
}

export function useClinicalIntelligenceAccess(): CIAccess {
  const { user, userRole } = useAuth();
  const [hasCIDAccess, setHasCIDAccess] = useState(false);
  const [hasCrossAgency, setHasCrossAgency] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const check = async () => {
      try {
        if (userRole === 'super_admin') {
          setHasCIDAccess(true);
          setHasCrossAgency(true);
          setLoading(false);
          return;
        }

        const { data: userFlags } = await supabase
          .from('user_feature_flags')
          .select('cid_enabled, cross_agency_analytics')
          .eq('user_id', user.id)
          .maybeSingle();

        if (userFlags?.cid_enabled === true) {
          setHasCIDAccess(true);
          setHasCrossAgency(userFlags.cross_agency_analytics ?? false);
          setLoading(false);
          return;
        }

        if (userFlags?.cid_enabled === false) {
          setHasCIDAccess(false);
          setHasCrossAgency(false);
          setLoading(false);
          return;
        }

        const { data: memberships } = await supabase
          .from('agency_memberships')
          .select('agency_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .limit(1);

        if (memberships && memberships.length > 0) {
          const { data: agencyFlags } = await supabase
            .from('agency_feature_flags')
            .select('cid_enabled_default')
            .eq('agency_id', memberships[0].agency_id)
            .maybeSingle();

          setHasCIDAccess(agencyFlags?.cid_enabled_default ?? false);
        }

        setHasCrossAgency(false);
      } catch (err) {
        console.error('[CI] Error checking access:', err);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [user, userRole]);

  return { hasCIDAccess, hasCrossAgency, loading };
}

// Caseload feed row from v_ci_caseload_feed view
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

// Alert feed row from v_ci_alert_feed view
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

// Legacy types kept for backward compat
export interface ClientMetrics {
  id: string;
  client_id: string;
  agency_id: string;
  risk_score: number;
  trend_score: number;
  data_freshness: number;
  parent_impl_score: number;
  goal_velocity_score: number;
  fidelity_score: number;
  updated_at: string;
}

export interface CIAlert {
  id: string;
  agency_id: string;
  client_id: string | null;
  severity: 'critical' | 'action' | 'watch' | 'high' | 'medium' | 'info';
  category: string;
  message: string;
  explanation_json: Record<string, any>;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface CIInterventionRec {
  id: string;
  agency_id: string;
  client_id: string;
  behavior_id: string | null;
  hypothesis_id: string | null;
  intervention_id: string | null;
  score: number;
  reasons_json: Record<string, any>;
  status: string;
  created_at: string;
}

/**
 * Fetch caseload from ci_client_metrics + students join (fallback since v_ci_caseload_feed view may not exist).
 */
export function useCICaseloadFeed(agencyId: string | null) {
  const [rows, setRows] = useState<CaseloadFeedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!agencyId) { setRows([]); setLoading(false); return; }
    try {
      setLoading(true);
      
      // Try the view first
      let query = (supabase.from as any)('v_ci_caseload_feed').select('*');
      if (agencyId !== 'all') {
        query = query.eq('agency_id', agencyId);
      }
      const { data, error } = await query;
      
      if (!error && data) {
        setRows(data as unknown as CaseloadFeedRow[]);
      } else {
        // Fallback: query ci_client_metrics directly and join student names
        let metricsQuery = supabase.from('ci_client_metrics').select('*');
        if (agencyId !== 'all') {
          metricsQuery = metricsQuery.eq('agency_id', agencyId);
        }
        const { data: metricsData } = await metricsQuery;
        
        if (metricsData && metricsData.length > 0) {
          // Fetch student names for each client
          const clientIds = (metricsData as any[]).map((m: any) => m.client_id);
          const { data: studentsData } = await supabase
            .from('students')
            .select('id, first_name, last_name')
            .in('id', clientIds);
          
          const nameMap = new Map<string, string>();
          if (studentsData) {
            for (const s of studentsData as any[]) {
              nameMap.set(s.id, `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown');
            }
          }

          // Count open alerts per client
          let alertsQuery = supabase.from('ci_alerts').select('client_id').is('resolved_at', null);
          if (agencyId !== 'all') {
            alertsQuery = alertsQuery.eq('agency_id', agencyId);
          }
          const { data: alertsData } = await alertsQuery;
          const alertCounts = new Map<string, number>();
          if (alertsData) {
            for (const a of alertsData as any[]) {
              if (a.client_id) {
                alertCounts.set(a.client_id, (alertCounts.get(a.client_id) || 0) + 1);
              }
            }
          }
          
          const mapped: CaseloadFeedRow[] = (metricsData as any[]).map((m: any) => ({
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
          }));
          setRows(mapped);
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

/**
 * Fetch alerts from ci_alerts + students join (fallback since v_ci_alert_feed view may not exist).
 */
export function useCIAlertFeed(agencyId: string | null) {
  const [alerts, setAlerts] = useState<AlertFeedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    if (!agencyId) { setAlerts([]); setLoading(false); return; }
    try {
      setLoading(true);
      
      // Try view first
      let query = (supabase.from as any)('v_ci_alert_feed').select('*').order('created_at', { ascending: false });
      if (agencyId !== 'all') {
        query = query.eq('agency_id', agencyId);
      }
      const { data, error } = await query;
      
      if (!error && data) {
        setAlerts(data as unknown as AlertFeedRow[]);
      } else {
        // Fallback: query ci_alerts directly
        let alertsQuery = supabase.from('ci_alerts').select('*').is('resolved_at', null).order('created_at', { ascending: false });
        if (agencyId !== 'all') {
          alertsQuery = alertsQuery.eq('agency_id', agencyId);
        }
        const { data: alertsData } = await alertsQuery;
        
        if (alertsData && alertsData.length > 0) {
          // Get client names
          const clientIds = (alertsData as any[]).filter((a: any) => a.client_id).map((a: any) => a.client_id);
          const nameMap = new Map<string, string>();
          if (clientIds.length > 0) {
            const { data: studentsData } = await supabase.from('students').select('id, first_name, last_name, display_name').in('id', clientIds);
            if (studentsData) {
              for (const s of studentsData as any[]) {
                nameMap.set(s.id, s.display_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown');
              }
            }
          }
          
          const mapped: AlertFeedRow[] = (alertsData as any[]).map((a: any) => ({
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
          }));
          setAlerts(mapped);
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
    const { error } = await supabase
      .from('ci_alerts')
      .update({ resolved_at: new Date().toISOString(), resolved_by: userId } as any)
      .eq('id', alertId);
    if (!error) {
      setAlerts(prev => prev.filter(a => a.alert_id !== alertId));
    }
    return !error;
  };

  return { alerts, loading, refresh: fetchAlerts, resolveAlert };
}

// Keep legacy hooks for backward compatibility (ClientDrilldown, etc.)
export function useCICaseloadMetrics(agencyId: string | null) {
  const [metrics, setMetrics] = useState<ClientMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    if (!agencyId) { setMetrics([]); setLoading(false); return; }
    try {
      setLoading(true);
      let query = supabase.from('ci_client_metrics').select('*');
      if (agencyId !== 'all') {
        query = query.eq('agency_id', agencyId);
      }
      const { data, error } = await query;
      if (!error && data) setMetrics(data as unknown as ClientMetrics[]);
    } catch (err) {
      console.error('[CI] Error fetching metrics:', err);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  return { metrics, loading, refresh: fetchMetrics };
}

export function useCIAlerts(agencyId: string | null) {
  const [alerts, setAlerts] = useState<CIAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    if (!agencyId) { setAlerts([]); setLoading(false); return; }
    try {
      setLoading(true);
      let query = supabase.from('ci_alerts').select('*').order('created_at', { ascending: false });
      if (agencyId !== 'all') {
        query = query.eq('agency_id', agencyId);
      }
      const { data, error } = await query;
      if (!error && data) setAlerts(data as unknown as CIAlert[]);
    } catch (err) {
      console.error('[CI] Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const resolveAlert = async (alertId: string, userId: string) => {
    const { error } = await supabase
      .from('ci_alerts')
      .update({ resolved_at: new Date().toISOString(), resolved_by: userId } as any)
      .eq('id', alertId);
    if (!error) {
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolved_at: new Date().toISOString(), resolved_by: userId } : a));
    }
    return !error;
  };

  return { alerts, loading, refresh: fetchAlerts, resolveAlert };
}

export function useCIInterventionRecs(agencyId: string | null, clientId?: string) {
  const [recs, setRecs] = useState<CIInterventionRec[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId) { setRecs([]); setLoading(false); return; }
    const fetchRecs = async () => {
      setLoading(true);
      let query = supabase
        .from('ci_intervention_recs')
        .select('*')
        .order('score', { ascending: false });
      
      if (agencyId !== 'all') {
        query = query.eq('agency_id', agencyId);
      }
      if (clientId) query = query.eq('client_id', clientId);
      
      const { data, error } = await query;
      if (!error && data) setRecs(data as unknown as CIInterventionRec[]);
      setLoading(false);
    };
    fetchRecs();
  }, [agencyId, clientId]);

  return { recs, loading };
}
