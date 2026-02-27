import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

export interface HoursForecast {
  authorization_id: string;
  client_id: string;
  agency_id: string;
  client_name: string;
  auth_number: string;
  units_approved: number;
  units_used: number;
  units_remaining: number;
  days_remaining: number;
  scheduled_remaining_units: number;
  forecast_status: 'on_track' | 'at_risk' | 'off_track' | 'expired';
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
  const [forecasts, setForecasts] = useState<HoursForecast[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!agencyId) { setAuthorizations([]); setForecasts([]); setLoading(false); return; }
    try {
      setLoading(true);

      // Fetch from SQL views in parallel
      const [authRes, forecastRes] = await Promise.all([
        (() => {
          let q = (supabase.from as any)('v_clinical_authorization_summary').select('*');
          if (agencyId !== 'all') q = q.eq('agency_id', agencyId);
          return q;
        })(),
        (() => {
          let q = (supabase.from as any)('v_clinical_hours_forecast').select('*');
          if (agencyId !== 'all') q = q.eq('agency_id', agencyId);
          return q;
        })(),
      ]);

      if (authRes.data) {
        const sorted = (authRes.data as unknown as AuthorizationSummary[]).sort((a, b) => {
          const order: Record<string, number> = { critical: 0, at_risk: 1, on_track: 2, expired: 3 };
          return (order[a.computed_status] ?? 4) - (order[b.computed_status] ?? 4);
        });
        setAuthorizations(sorted);
      }

      if (forecastRes.data) {
        setForecasts(forecastRes.data as unknown as HoursForecast[]);
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
      offTrackForecasts: forecasts.filter(f => f.forecast_status === 'off_track').length,
    };
  }, [authorizations, forecasts]);

  return { authorizations, forecasts, loading, kpis, refresh: fetchData };
}
