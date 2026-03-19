import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;
const DEMO_ORG = 'a0000000-0000-0000-0000-000000000001';

export interface DemoCrossAppInput {
  id: string;
  learner_id: string;
  source_app: string;
  input_type: string;
  input_data: Record<string, any>;
  downstream_use: string | null;
  occurred_at: string;
}

export interface DemoSessionNote {
  id: string;
  learner_id: string;
  staff_id: string;
  note_type: string;
  session_date: string;
  duration_minutes: number | null;
  cpt_code: string | null;
  content: Record<string, any>;
  status: string;
  source_app: string | null;
}

export interface DemoAssessment {
  id: string;
  learner_id: string;
  staff_id: string;
  assessment_type: string;
  assessment_date: string;
  status: string;
  scores: Record<string, any>;
  summary: string | null;
}

export interface DemoBillingRecord {
  id: string;
  learner_id: string;
  record_type: string;
  payer_name: string;
  cpt_code: string | null;
  units_authorized: number | null;
  units_used: number | null;
  units_remaining: number | null;
  amount: number | null;
  status: string;
  effective_date: string | null;
  expiry_date: string | null;
  details: Record<string, any>;
}

export interface DemoFbaBip {
  id: string;
  learner_id: string;
  staff_id: string;
  document_type: string;
  document_date: string;
  status: string;
  target_behaviors: any[];
  functions_identified: any[];
  interventions: any[];
  summary: string | null;
  linked_inputs: string[] | null;
}

export interface DemoAlert {
  id: string;
  learner_id: string | null;
  staff_id: string | null;
  alert_type: string;
  severity: string;
  title: string;
  description: string | null;
  status: string;
  source_app: string | null;
  created_at: string;
}

export interface DemoDashboardMetric {
  id: string;
  metric_key: string;
  metric_value: number;
  metric_label: string;
  metric_category: string;
  trend_direction: string | null;
  trend_pct: number | null;
  details: Record<string, any>;
}

export function useDemoEcosystem() {
  const [crossAppInputs, setCrossAppInputs] = useState<DemoCrossAppInput[]>([]);
  const [sessionNotes, setSessionNotes] = useState<DemoSessionNote[]>([]);
  const [assessments, setAssessments] = useState<DemoAssessment[]>([]);
  const [billingRecords, setBillingRecords] = useState<DemoBillingRecord[]>([]);
  const [fbaBips, setFbaBips] = useState<DemoFbaBip[]>([]);
  const [alerts, setAlerts] = useState<DemoAlert[]>([]);
  const [metrics, setMetrics] = useState<DemoDashboardMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [cai, dsn, da, dbr, dfb, dal, ddm] = await Promise.all([
      db.from('demo_cross_app_inputs').select('*').eq('demo_org_id', DEMO_ORG).order('occurred_at', { ascending: false }),
      db.from('demo_session_notes').select('*').eq('demo_org_id', DEMO_ORG).order('session_date', { ascending: false }),
      db.from('demo_assessments').select('*').eq('demo_org_id', DEMO_ORG).order('assessment_date', { ascending: false }),
      db.from('demo_billing_records').select('*').eq('demo_org_id', DEMO_ORG).order('effective_date', { ascending: false }),
      db.from('demo_fba_bip').select('*').eq('demo_org_id', DEMO_ORG).order('document_date', { ascending: false }),
      db.from('demo_alerts').select('*').eq('demo_org_id', DEMO_ORG).order('created_at', { ascending: false }),
      db.from('demo_dashboard_metrics').select('*').eq('demo_org_id', DEMO_ORG),
    ]);
    setCrossAppInputs(cai.data || []);
    setSessionNotes(dsn.data || []);
    setAssessments(da.data || []);
    setBillingRecords(dbr.data || []);
    setFbaBips(dfb.data || []);
    setAlerts(dal.data || []);
    setMetrics(ddm.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { crossAppInputs, sessionNotes, assessments, billingRecords, fbaBips, alerts, metrics, loading, refresh: load };
}
