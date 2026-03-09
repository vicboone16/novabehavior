import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
export interface PTIntelAlert {
  alert_type: string | null;
  caregiver_id: string | null;
  client_id: string | null;
  detected_at: string | null;
  goal_assignment_id: string | null;
  is_active: boolean | null;
  is_clinical_dashboard_visible: boolean | null;
  is_student_connect_visible: boolean | null;
  module_assignment_id: string | null;
  recommended_action: string | null;
  severity: string | null;
  summary: string | null;
  title: string | null;
}

export interface PTIntelAlertRollup {
  alert_type: string;
  severity: string;
  alert_count: number;
}

export interface PTAssignmentIntelSummary {
  module_assignment_id: string | null;
  module_id: string | null;
  module_title: string | null;
  module_key: string | null;
  client_id: string | null;
  caregiver_id: string | null;
  assignment_status: string | null;
  assigned_at: string | null;
  completed_at: string | null;
  due_date: string | null;
  total_goals: number | null;
  mastered_goals: number | null;
  in_progress_goals: number | null;
  not_started_goals: number | null;
  data_points: number | null;
  last_data_submission_at: string | null;
  last_homework_submission_at: string | null;
  homework_submission_count: number | null;
}

export interface PTGoalIntelSummary {
  goal_assignment_id: string | null;
  module_assignment_id: string | null;
  goal_title: string | null;
  client_id: string | null;
  caregiver_id: string | null;
  mastery_status: string | null;
  measurement_method: string | null;
  current_value: number | null;
  target_value: number | null;
  baseline_value: number | null;
  percent_to_goal: number | null;
  data_points: number | null;
  last_data_date: string | null;
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

/** Fetch parent training intelligence alerts */
export function useParentTrainingIntelAlerts(options?: {
  clientId?: string;
  activeOnly?: boolean;
  clinicalDashboardOnly?: boolean;
  studentConnectOnly?: boolean;
}) {
  const [alerts, setAlerts] = useState<PTIntelAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const clientId = options?.clientId;
  const activeOnly = options?.activeOnly ?? true;
  const clinicalDashboardOnly = options?.clinicalDashboardOnly;
  const studentConnectOnly = options?.studentConnectOnly;

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      let q = db.from('v_parent_training_intelligence_alerts').select('*');
      if (clientId) q = q.eq('client_id', clientId);
      if (activeOnly) q = q.eq('is_active', true);
      if (clinicalDashboardOnly) q = q.eq('is_clinical_dashboard_visible', true);
      if (studentConnectOnly) q = q.eq('is_student_connect_visible', true);
      const { data, error } = await q;
      if (!error) setAlerts((data || []) as PTIntelAlert[]);
    } catch (err) {
      console.error('[PTIntelAlerts] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId, activeOnly, clinicalDashboardOnly, studentConnectOnly]);

  useEffect(() => { fetch(); }, [fetch]);
  return { alerts, loading, refresh: fetch };
}

/** Fetch alert rollup counts */
export function useParentTrainingIntelRollup() {
  const [rollup, setRollup] = useState<PTIntelAlertRollup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data } = await db.from('v_parent_training_intelligence_alert_rollup').select('*');
        setRollup((data || []) as PTIntelAlertRollup[]);
      } catch (err) {
        console.error('[PTIntelRollup] Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { rollup, loading };
}

/** Fetch assignment intelligence summaries */
export function useParentTrainingAssignmentIntel(clientId?: string) {
  const [summaries, setSummaries] = useState<PTAssignmentIntelSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      let q = db.from('v_parent_training_assignment_intelligence_summary').select('*');
      if (clientId) q = q.eq('client_id', clientId);
      const { data } = await q;
      setSummaries((data || []) as PTAssignmentIntelSummary[]);
    } catch (err) {
      console.error('[PTAssignmentIntel] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { summaries, loading, refresh: fetch };
}

/** Fetch goal intelligence summaries */
export function useParentTrainingGoalIntel(clientId?: string) {
  const [goals, setGoals] = useState<PTGoalIntelSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      let q = db.from('v_parent_training_goal_intelligence_summary').select('*');
      if (clientId) q = q.eq('client_id', clientId);
      const { data } = await q;
      setGoals((data || []) as PTGoalIntelSummary[]);
    } catch (err) {
      console.error('[PTGoalIntel] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { goals, loading, refresh: fetch };
}

/** Derived KPI counts from rollup */
export function usePTIntelKPIs() {
  const { rollup, loading } = useParentTrainingIntelRollup();

  const count = (type: string) => rollup.filter(r => r.alert_type === type).reduce((sum, r) => sum + (r.alert_count || 0), 0);

  return {
    loading,
    goalsOffTrack: count('caregiver_goal_off_track'),
    noRecentData: count('no_recent_parent_data'),
    improving: count('caregiver_improving'),
    goalsMet: count('caregiver_goal_mastered'),
    modulesOverdue: count('overdue_caregiver_module'),
    lowEngagement: count('low_caregiver_engagement'),
    modulesCompleted: count('caregiver_module_completed'),
  };
}
