import { useState, useEffect, useCallback, useMemo } from 'react';
import { novaCore } from '@/lib/supabase-untyped';

export interface AuthorizationSummary {
  authorization_id: string;
  client_id: string;
  agency_id: string;
  client_name: string;
  auth_number: string;
  service_codes: string[];
  start_date: string;
  end_date: string;
  units_approved: number;
  units_used: number;
  units_remaining: number;
  days_remaining: number;
  pct_used: number;
  pct_time_elapsed: number;
  computed_status: 'on_track' | 'at_risk' | 'critical' | 'expired';
}

export interface ClinicalTrackingKPIs {
  hoursAtRisk: number;
  authExpiringSoon: number;
  parentTrainingDue: number;
  supervisionOffTrack: number;
  offTrackForecasts: number;
}

export function useClinicalTracking(agencyId: string | null) {
  const [authorizations, setAuthorizations] = useState<AuthorizationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!agencyId) { setAuthorizations([]); setLoading(false); return; }
    try {
      setLoading(true);
      let q = novaCore.from('v_clinical_authorization_summary').select('*');
      if (agencyId !== 'all') q = q.eq('agency_id', agencyId);
      const { data } = await q;

      if (data) {
        const sorted = (data as AuthorizationSummary[]).sort((a, b) => {
          const order: Record<string, number> = { critical: 0, at_risk: 1, on_track: 2, expired: 3 };
          return (order[a.computed_status] ?? 4) - (order[b.computed_status] ?? 4);
        });
        setAuthorizations(sorted);
      }
    } catch (err) {
      console.error('[ClinicalTracking] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const kpis = useMemo<ClinicalTrackingKPIs>(() => {
    const active = authorizations.filter(a => a.computed_status !== 'expired');
    return {
      hoursAtRisk: active.filter(a => a.computed_status === 'at_risk' || a.computed_status === 'critical').length,
      authExpiringSoon: active.filter(a => a.days_remaining <= 30).length,
      parentTrainingDue: 0,
      supervisionOffTrack: 0,
      offTrackForecasts: 0,
    };
  }, [authorizations]);

  return { authorizations, loading, kpis, refresh: fetchData };
}
