import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Unified CI alert from v_clinical_intelligence_alerts
export interface CIIntelAlert {
  alert_id: string;
  agency_id: string;
  client_id: string | null;
  client_name: string | null;
  severity: string;
  alert_type: string;
  title: string;
  summary: string;
  domain: string;
  suggested_action: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  source: string;
}

export interface CIAlertRollup {
  agency_id: string;
  total_open: number;
  high_priority: number;
  behavior_alerts: number;
  skill_alerts: number;
  caregiver_alerts: number;
  supervision_alerts: number;
  programming_alerts: number;
}

export interface StudentIntelSummary {
  student_id: string;
  agency_id: string;
  student_name: string;
  total_targets: number;
  mastered_targets: number;
  in_progress_targets: number;
  stalled_targets: number;
  risk_score: number;
  trend_score: number;
  open_alert_count: number;
  weak_replacements: number;
  strong_replacements: number;
}

export interface StudentConnectAlert {
  alert_id: string;
  student_id: string;
  agency_id: string;
  friendly_title: string;
  tone: 'positive' | 'needs_attention' | 'neutral';
  created_at: string;
  resolved_at: string | null;
}

/**
 * Fetch unified CI alerts with optional domain + student filtering.
 */
export function useClinicalIntelligenceAlerts(
  agencyId: string | null,
  options?: { domain?: string; studentId?: string; unresolvedOnly?: boolean }
) {
  const [alerts, setAlerts] = useState<CIIntelAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const domain = options?.domain;
  const studentId = options?.studentId;
  const unresolvedOnly = options?.unresolvedOnly ?? true;

  const fetchAlerts = useCallback(async () => {
    if (!agencyId) { setAlerts([]); setLoading(false); return; }
    setLoading(true);
    try {
      let query = (supabase.from as any)('v_clinical_intelligence_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (agencyId !== 'all') query = query.eq('agency_id', agencyId);
      if (unresolvedOnly) query = query.is('resolved_at', null);
      if (domain) query = query.eq('domain', domain);
      if (studentId) query = query.eq('client_id', studentId);

      const { data, error } = await query;
      if (!error && data) {
        setAlerts(data as unknown as CIIntelAlert[]);
      } else {
        setAlerts([]);
      }
    } catch (err) {
      console.error('[CIIntelAlerts] Error:', err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [agencyId, domain, studentId, unresolvedOnly]);

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

/**
 * Fetch alert rollup (KPI counts) for an agency.
 */
export function useCIAlertRollup(agencyId: string | null) {
  const [rollup, setRollup] = useState<CIAlertRollup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId) { setRollup(null); setLoading(false); return; }
    const fetch = async () => {
      setLoading(true);
      try {
        let query = (supabase.from as any)('v_clinical_intelligence_alert_rollup').select('*');
        if (agencyId !== 'all') query = query.eq('agency_id', agencyId);
        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          // Aggregate if multiple agencies
          if (data.length === 1) {
            setRollup(data[0] as unknown as CIAlertRollup);
          } else {
            const agg: CIAlertRollup = {
              agency_id: agencyId,
              total_open: 0, high_priority: 0, behavior_alerts: 0,
              skill_alerts: 0, caregiver_alerts: 0, supervision_alerts: 0, programming_alerts: 0,
            };
            for (const r of data as any[]) {
              agg.total_open += Number(r.total_open) || 0;
              agg.high_priority += Number(r.high_priority) || 0;
              agg.behavior_alerts += Number(r.behavior_alerts) || 0;
              agg.skill_alerts += Number(r.skill_alerts) || 0;
              agg.caregiver_alerts += Number(r.caregiver_alerts) || 0;
              agg.supervision_alerts += Number(r.supervision_alerts) || 0;
              agg.programming_alerts += Number(r.programming_alerts) || 0;
            }
            setRollup(agg);
          }
        } else {
          setRollup(null);
        }
      } catch (err) {
        console.error('[CIRollup] Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [agencyId]);

  return { rollup, loading };
}

/**
 * Student intelligence summary from v_student_intelligence_summary.
 */
export function useStudentIntelSummary(studentId: string | null | undefined) {
  const [summary, setSummary] = useState<StudentIntelSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) { setSummary(null); setLoading(false); return; }
    const fetch = async () => {
      setLoading(true);
      try {
        const { data, error } = await (supabase.from as any)('v_student_intelligence_summary')
          .select('*')
          .eq('student_id', studentId)
          .maybeSingle();
        if (!error && data) {
          setSummary(data as unknown as StudentIntelSummary);
        }
      } catch (err) {
        console.error('[StudentIntelSummary] Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [studentId]);

  return { summary, loading };
}

/**
 * Student Connect safe alerts.
 */
export function useStudentConnectAlerts(studentId: string | null | undefined) {
  const [alerts, setAlerts] = useState<StudentConnectAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) { setAlerts([]); setLoading(false); return; }
    const fetch = async () => {
      setLoading(true);
      try {
        const { data, error } = await (supabase.from as any)('v_student_connect_intel_alerts')
          .select('*')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false });
        if (!error && data) {
          setAlerts(data as unknown as StudentConnectAlert[]);
        }
      } catch (err) {
        console.error('[StudentConnectAlerts] Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [studentId]);

  return { alerts, loading };
}
