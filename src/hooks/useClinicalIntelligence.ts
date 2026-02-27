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

// Metrics types
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
 * agencyId: string = filter to that agency
 * agencyId: 'all' = fetch all agencies (cross-agency mode)
 * agencyId: null = return empty (no scope selected)
 */
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
