import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SupervisorLeaderboardRow {
  staff_user_id: string;
  staff_name: string;
  agency_id: string;
  total_clients: number;
  avg_compliance_percent: number;
  off_track_count: number;
  at_risk_count: number;
  on_track_count: number;
}

export interface AgencySupervisionSummary {
  agency_id: string;
  agency_name: string;
  total_clients: number;
  off_track: number;
  at_risk: number;
  on_track: number;
  avg_compliance_percent: number;
}

export interface ClientSupervisionRow {
  client_id: string;
  client_name: string;
  agency_id: string;
  compliance_percent: number;
  supervision_status: string;
  required_hours: number;
  delivered_hours: number;
  week_start?: string;
}

export function useSupervisionPerformance(agencyId: string | null) {
  const [supervisorLeaderboard, setSupervisorLeaderboard] = useState<SupervisorLeaderboardRow[]>([]);
  const [agencySummary, setAgencySummary] = useState<AgencySupervisionSummary[]>([]);
  const [clientLeaderboard, setClientLeaderboard] = useState<ClientSupervisionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!agencyId) { setLoading(false); return; }
    setLoading(true);
    try {
      // Fetch supervisor leaderboard (30d)
      let supQ = (supabase.from as any)('v_supervision_supervisor_leaderboard_30d').select('*');
      if (agencyId !== 'all') supQ = supQ.eq('agency_id', agencyId);
      const { data: supData } = await supQ;
      if (supData) setSupervisorLeaderboard(supData as unknown as SupervisorLeaderboardRow[]);

      // Fetch agency summary
      let agQ = (supabase.from as any)('v_supervision_agency_summary_30d').select('*');
      if (agencyId !== 'all') agQ = agQ.eq('agency_id', agencyId);
      const { data: agData } = await agQ;
      if (agData) setAgencySummary(agData as unknown as AgencySupervisionSummary[]);

      // Fetch client leaderboard (worst compliance first)
      let clQ = (supabase.from as any)('v_supervision_client_leaderboard_30d').select('*').order('compliance_percent', { ascending: true }).limit(50);
      if (agencyId !== 'all') clQ = clQ.eq('agency_id', agencyId);
      const { data: clData } = await clQ;
      if (clData) setClientLeaderboard(clData as unknown as ClientSupervisionRow[]);
    } catch (err) {
      console.error('[Supervision] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => { fetch(); }, [fetch]);

  const kpis = {
    offTrack: clientLeaderboard.filter(c => c.supervision_status === 'off_track').length,
    atRisk: clientLeaderboard.filter(c => c.supervision_status === 'at_risk').length,
    avgCompliance: agencySummary.length > 0
      ? Math.round(agencySummary.reduce((s, a) => s + (a.avg_compliance_percent || 0), 0) / agencySummary.length)
      : 0,
    totalClients: clientLeaderboard.length,
  };

  return { supervisorLeaderboard, agencySummary, clientLeaderboard, loading, kpis, refresh: fetch };
}
