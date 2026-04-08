import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export interface IEPGlanceData {
  student: {
    id: string;
    first_name: string;
    last_name: string;
    display_name: string;
    dob: string | null;
    date_of_birth: string | null;
    grade: string | null;
    school_name: string | null;
    primary_setting: string | null;
    diagnoses: any;
    communication_level: string | null;
    diagnosis_cluster: string | null;
    iep_date: string | null;
    iep_end_date: string | null;
    next_iep_review_date: string | null;
    fba_date: string | null;
    bip_date: string | null;
    bip_data: any;
    background_info: any;
  } | null;
  goals: IEPGlanceGoal[];
  supports: IEPGlanceSupport[];
  services: IEPGlanceService[];
  evals: any[];
  loading: boolean;
}

export interface IEPGlanceGoal {
  id: string;
  goal_area: string;
  goal_text: string;
  short_description: string | null;
  baseline_summary: string | null;
  target_criteria: string | null;
  measurement_type: string;
  responsible_provider_role: string | null;
  status: string;
  last_progress_update: string | null;
  narrative_summary: string | null;
}

export interface IEPGlanceSupport {
  id: string;
  item_type: string;
  custom_title: string | null;
  custom_description: string | null;
  student_status: string;
  source: string | null;
  domains_override: string[] | null;
}

export interface IEPGlanceService {
  id: string;
  service_line: string;
  mandated_minutes_per_period: number;
  period_type: string;
  source: string;
}

export function useIEPAtAGlance(studentId?: string): IEPGlanceData {
  const [student, setStudent] = useState<IEPGlanceData['student']>(null);
  const [goals, setGoals] = useState<IEPGlanceGoal[]>([]);
  const [supports, setSupports] = useState<IEPGlanceSupport[]>([]);
  const [services, setServices] = useState<IEPGlanceService[]>([]);
  const [evals, setEvals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!studentId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [studentRes, goalsRes, supportsRes, servicesRes, evalsRes] = await Promise.all([
        db.from('students').select('id, first_name, last_name, display_name, dob, date_of_birth, grade, school_name, primary_setting, diagnoses, communication_level, diagnosis_cluster, iep_date, iep_end_date, next_iep_review_date, fba_date, bip_date, bip_data, background_info').eq('id', studentId).maybeSingle(),
        db.from('iep_goals').select('id, goal_area, goal_text, short_description, baseline_summary, target_criteria, measurement_type, responsible_provider_role, status, last_progress_update, narrative_summary').eq('client_id', studentId).order('created_at', { ascending: true }),
        db.from('student_iep_supports').select('id, item_type, custom_title, custom_description, student_status, source, domains_override').eq('student_id', studentId).eq('student_status', 'active'),
        db.from('service_plan_minutes').select('id, service_line, mandated_minutes_per_period, period_type, source').eq('client_id', studentId),
        db.from('iep_evaluation_tracker').select('id, eval_type, status, eval_due_date, created_at').eq('student_id', studentId).order('created_at', { ascending: false }).limit(5),
      ]);

      setStudent(studentRes.data || null);
      setGoals(goalsRes.data || []);
      setSupports(supportsRes.data || []);
      setServices(servicesRes.data || []);
      setEvals(evalsRes.data || []);
    } catch (e) {
      console.error('IEP At-a-Glance data error:', e);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { student, goals, supports, services, evals, loading };
}
