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
  direct_hours_per_week: number;
  parent_training_hours_per_week: number;
  supervision_hours_per_week: number;
  group_hours_per_week: number;
}

export interface HoursForecast {
  authorization_id: string;
  client_id: string;
  agency_id: string;
  full_name: string;
  start_date: string;
  end_date: string;
  weeks_remaining: number;
  weekly_total_required: number;
  delivered_total_7d: number;
  scheduled_total_remaining: number;
  required_remaining_hours: number;
  projected_coverage_hours: number;
  forecast_status: 'on_track' | 'at_risk' | 'off_track';
  cancels_7d: number;
  no_shows_7d: number;
  weekly_burn_rate_percent: number;
}

export interface AgencyForecastSummary {
  agency_id: string;
  total_authorizations: number;
  off_track: number;
  at_risk: number;
  on_track: number;
  avg_burn_rate: number;
}

export interface ClinicalTrackingKPIs {
  hoursAtRisk: number;
  authExpiringSoon: number;
  parentTrainingDue: number;
  supervisionOffTrack: number;
  offTrackForecasts: number;
  atRiskForecasts: number;
  avgBurnRate: number;
}

export function useClinicalTracking(agencyId: string | null) {
  const [authorizations, setAuthorizations] = useState<AuthorizationSummary[]>([]);
  const [forecasts, setForecasts] = useState<HoursForecast[]>([]);
  const [agencySummary, setAgencySummary] = useState<AgencyForecastSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!agencyId) { setAuthorizations([]); setForecasts([]); setAgencySummary([]); setLoading(false); return; }
    try {
      setLoading(true);

      const buildQuery = (view: string) => {
        let q = (supabase.from as any)(view).select('*');
        if (agencyId !== 'all') q = q.eq('agency_id', agencyId);
        return q;
      };

      const [authRes, forecastRes, summaryRes] = await Promise.all([
        buildQuery('v_clinical_authorization_summary'),
        buildQuery('v_clinical_hours_forecast'),
        buildQuery('v_agency_forecast_summary'),
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

      if (summaryRes.data) {
        setAgencySummary(summaryRes.data as unknown as AgencyForecastSummary[]);
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
    const offTrack = forecasts.filter(f => f.forecast_status === 'off_track').length;
    const atRisk = forecasts.filter(f => f.forecast_status === 'at_risk').length;
    const burnRates = forecasts.map(f => f.weekly_burn_rate_percent).filter(b => b > 0);
    const avgBurn = burnRates.length > 0 ? burnRates.reduce((a, b) => a + b, 0) / burnRates.length : 0;

    return {
      hoursAtRisk: active.filter(a => a.computed_status === 'at_risk' || a.computed_status === 'critical').length,
      authExpiringSoon: active.filter(a => a.days_remaining <= 30).length,
      parentTrainingDue: 0,
      supervisionOffTrack: 0,
      offTrackForecasts: offTrack,
      atRiskForecasts: atRisk,
      avgBurnRate: Math.round(avgBurn),
    };
  }, [authorizations, forecasts]);

  return { authorizations, forecasts, agencySummary, loading, kpis, refresh: fetchData };
}
