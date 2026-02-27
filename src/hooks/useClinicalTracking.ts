import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AuthorizationSummary {
  id: string;
  student_id: string;
  student_name: string;
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
  status: 'on_track' | 'at_risk' | 'critical' | 'expired';
}

export interface ClinicalTrackingKPIs {
  hoursAtRisk: number;
  authExpiringSoon: number;
  parentTrainingDue: number;
  supervisionOffTrack: number;
}

export function useClinicalTracking(agencyId: string | null) {
  const [authorizations, setAuthorizations] = useState<AuthorizationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!agencyId) { setAuthorizations([]); setLoading(false); return; }
    try {
      setLoading(true);
      // Fetch authorizations with student info
      let query = supabase
        .from('authorizations')
        .select('id, auth_number, student_id, start_date, end_date, units_approved, units_used, units_remaining, service_codes, status');

      // Agency scoping: get student IDs belonging to the agency
      if (agencyId !== 'all') {
        const { data: students } = await supabase
          .from('students')
          .select('id')
          .eq('agency_id', agencyId);
        const studentIds = (students || []).map(s => s.id);
        if (studentIds.length === 0) {
          setAuthorizations([]);
          setLoading(false);
          return;
        }
        query = query.in('student_id', studentIds);
      }

      const { data: auths, error } = await query;
      if (error) throw error;

      // Fetch student names
      const studentIds = [...new Set((auths || []).map(a => a.student_id))];
      let nameMap = new Map<string, string>();
      if (studentIds.length > 0) {
        const { data: students } = await supabase
          .from('students')
          .select('id, name')
          .in('id', studentIds);
        nameMap = new Map((students || []).map(s => [s.id, s.name]));
      }

      const now = new Date();
      const summaries: AuthorizationSummary[] = (auths || []).map(a => {
        const start = new Date(a.start_date);
        const end = new Date(a.end_date);
        const totalDays = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const elapsed = Math.max(0, (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        const pctUsed = a.units_approved > 0 ? (a.units_used / a.units_approved) * 100 : 0;
        const pctTimeElapsed = (elapsed / totalDays) * 100;

        let status: AuthorizationSummary['status'] = 'on_track';
        if (daysRemaining <= 0) status = 'expired';
        else if (daysRemaining <= 30 && (a.units_remaining ?? 0) > (a.units_approved * 0.3)) status = 'critical';
        else if (pctUsed < pctTimeElapsed - 15) status = 'at_risk';

        return {
          id: a.id,
          student_id: a.student_id,
          student_name: nameMap.get(a.student_id) || 'Unknown',
          auth_number: a.auth_number,
          service_codes: (a.service_codes as string[]) || [],
          start_date: a.start_date,
          end_date: a.end_date,
          units_approved: a.units_approved,
          units_used: a.units_used,
          units_remaining: a.units_remaining ?? (a.units_approved - a.units_used),
          days_remaining: daysRemaining,
          pct_used: Math.round(pctUsed),
          pct_time_elapsed: Math.round(pctTimeElapsed),
          status,
        };
      });

      setAuthorizations(summaries.sort((a, b) => {
        const order = { critical: 0, at_risk: 1, on_track: 2, expired: 3 };
        return (order[a.status] ?? 4) - (order[b.status] ?? 4);
      }));
    } catch (err) {
      console.error('[ClinicalTracking] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const kpis = useMemo<ClinicalTrackingKPIs>(() => {
    const active = authorizations.filter(a => a.status !== 'expired');
    return {
      hoursAtRisk: active.filter(a => a.status === 'at_risk' || a.status === 'critical').length,
      authExpiringSoon: active.filter(a => a.days_remaining <= 30).length,
      parentTrainingDue: 0, // filled from CID alerts in the page
      supervisionOffTrack: 0, // filled from supervision data
    };
  }, [authorizations]);

  return { authorizations, loading, kpis, refresh: fetchData };
}
