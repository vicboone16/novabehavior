import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const db = supabase as any;

export interface PTGoal {
  goal_id: string;
  module_id: string | null;
  goal_key: string;
  title: string;
  description: string | null;
  measurement_method: string;
  unit: string;
  default_baseline: string | null;
  default_target: string | null;
  mastery_criteria: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface PTGoalAssignment {
  goal_assignment_id: string;
  assignment_id: string;
  goal_id: string | null;
  custom_goal_id: string | null;
  title: string;
  description: string | null;
  measurement_method: string;
  unit: string;
  baseline_value: number | null;
  target_value: number | null;
  current_value: number | null;
  baseline_text: string | null;
  target_text: string | null;
  mastery_criteria: string | null;
  target_date: string | null;
  status: string;
  goal_source: string;
  save_as_library_candidate: boolean;
  notes: string | null;
  module_id?: string;
  module_title?: string;
  parent_user_id?: string;
  client_id?: string;
  agency_id?: string | null;
}

export interface PTHomework {
  homework_id: string;
  assignment_id: string;
  parent_user_id: string;
  client_id: string;
  title: string;
  response_text: string | null;
  file_url: string | null;
  notes: string | null;
  review_status: string;
  reviewer_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  submitted_at: string;
}

export interface PTSessionLog {
  session_log_id: string;
  agency_id: string | null;
  assignment_id: string | null;
  parent_user_id: string;
  client_id: string;
  provider_id: string;
  session_date: string;
  service_code: string;
  duration_minutes: number;
  module_id: string | null;
  caregiver_response: string | null;
  session_summary: string | null;
  homework_assigned: string | null;
  next_steps: string | null;
  module_title?: string;
}

export interface PTCustomGoal {
  custom_goal_id: string;
  agency_id: string | null;
  module_id: string | null;
  title: string;
  description: string | null;
  measurement_method: string;
  unit: string;
  default_baseline: string | null;
  default_target: string | null;
  mastery_criteria: string | null;
  is_library_candidate: boolean;
  promoted_to_goal_id: string | null;
  module_title?: string;
  created_at: string;
}

export interface PTAssignmentDashboard {
  assignment_id: string;
  module_id: string;
  parent_user_id: string;
  client_id: string;
  agency_id: string | null;
  status: string;
  due_at: string | null;
  created_at: string;
  module_title: string | null;
  module_description: string | null;
  est_minutes: number;
  goal_count: number;
  homework_count: number;
  session_log_count: number;
}

export function useParentTrainingAdmin(agencyId?: string | null) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<PTGoal[]>([]);
  const [goalAssignments, setGoalAssignments] = useState<PTGoalAssignment[]>([]);
  const [homework, setHomework] = useState<PTHomework[]>([]);
  const [sessionLogs, setSessionLogs] = useState<PTSessionLog[]>([]);
  const [customGoals, setCustomGoals] = useState<PTCustomGoal[]>([]);
  const [assignmentsDashboard, setAssignmentsDashboard] = useState<PTAssignmentDashboard[]>([]);
  const [goalData, setGoalData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Goals (library)
  const fetchGoals = useCallback(async (moduleId?: string) => {
    setIsLoading(true);
    try {
      let q = db.from('parent_training_goals').select('*').order('display_order');
      if (moduleId) q = q.eq('module_id', moduleId);
      const { data, error } = await q;
      if (error) throw error;
      setGoals(data || []);
    } catch (e: any) { toast.error('Failed to load goals: ' + e.message); }
    finally { setIsLoading(false); }
  }, []);

  const createGoal = useCallback(async (goal: Partial<PTGoal>) => {
    const { data, error } = await db.from('parent_training_goals').insert({ ...goal, created_by: user?.id }).select().single();
    if (error) throw error;
    toast.success('Goal created');
    return data;
  }, [user]);

  const updateGoal = useCallback(async (id: string, updates: Partial<PTGoal>) => {
    const { error } = await db.from('parent_training_goals').update({ ...updates, updated_at: new Date().toISOString() }).eq('goal_id', id);
    if (error) throw error;
    toast.success('Goal updated');
  }, []);

  // Goal assignments (case-specific)
  const fetchGoalAssignments = useCallback(async (assignmentId?: string) => {
    setIsLoading(true);
    try {
      let q = db.from('v_parent_training_effective_goals').select('*');
      if (assignmentId) q = q.eq('assignment_id', assignmentId);
      if (agencyId) q = q.eq('agency_id', agencyId);
      const { data, error } = await q;
      if (error) throw error;
      setGoalAssignments(data || []);
    } catch (e: any) { toast.error('Failed to load goal assignments: ' + e.message); }
    finally { setIsLoading(false); }
  }, [agencyId]);

  const updateGoalAssignment = useCallback(async (id: string, updates: Partial<PTGoalAssignment>) => {
    const { error } = await db.from('parent_training_goal_assignments').update({ ...updates, updated_at: new Date().toISOString() }).eq('goal_assignment_id', id);
    if (error) throw error;
    toast.success('Goal assignment updated');
  }, []);

  const addCustomGoalToAssignment = useCallback(async (params: {
    assignment_id: string; module_id?: string; title: string; description?: string;
    measurement_method?: string; unit?: string; baseline_text?: string; target_text?: string;
    baseline_value?: number; target_value?: number; mastery_criteria?: string;
    save_as_library_candidate?: boolean;
  }) => {
    let customGoalId: string | null = null;
    if (params.save_as_library_candidate) {
      const { data: cg, error: cgErr } = await db.from('parent_training_custom_goals').insert({
        agency_id: agencyId,
        module_id: params.module_id || null,
        title: params.title,
        description: params.description || null,
        measurement_method: params.measurement_method || 'frequency',
        unit: params.unit || 'occurrences',
        default_baseline: params.baseline_text || null,
        default_target: params.target_text || null,
        mastery_criteria: params.mastery_criteria || null,
        is_library_candidate: true,
        created_by: user?.id,
      }).select().single();
      if (cgErr) throw cgErr;
      customGoalId = cg.custom_goal_id;
    }

    const { data, error } = await db.from('parent_training_goal_assignments').insert({
      assignment_id: params.assignment_id,
      custom_goal_id: customGoalId,
      title: params.title,
      description: params.description || null,
      measurement_method: params.measurement_method || 'frequency',
      unit: params.unit || 'occurrences',
      baseline_value: params.baseline_value ?? null,
      target_value: params.target_value ?? null,
      baseline_text: params.baseline_text || null,
      target_text: params.target_text || null,
      mastery_criteria: params.mastery_criteria || null,
      goal_source: 'custom',
      save_as_library_candidate: params.save_as_library_candidate || false,
    }).select().single();
    if (error) throw error;
    toast.success('Custom goal added');
    return data;
  }, [user, agencyId]);

  // Assignments dashboard
  const fetchAssignmentsDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      let q = db.from('v_parent_training_assignments_dashboard').select('*').order('created_at', { ascending: false });
      if (agencyId) q = q.eq('agency_id', agencyId);
      const { data, error } = await q;
      if (error) throw error;
      setAssignmentsDashboard(data || []);
    } catch (e: any) { toast.error('Failed to load assignments: ' + e.message); }
    finally { setIsLoading(false); }
  }, [agencyId]);

  const assignModule = useCallback(async (moduleId: string, parentUserId: string, clientId: string, dueAt?: string) => {
    const { data, error } = await db.rpc('assign_parent_training_module', {
      p_module_id: moduleId,
      p_parent_user_id: parentUserId,
      p_client_id: clientId,
      p_agency_id: agencyId || null,
      p_due_at: dueAt || null,
      p_created_by: user?.id || null,
    });
    if (error) throw error;
    toast.success('Module assigned with goals');
    return data;
  }, [user, agencyId]);

  const updateAssignment = useCallback(async (id: string, updates: Record<string, any>) => {
    const { error } = await db.from('parent_training_assignments').update(updates).eq('assignment_id', id);
    if (error) throw error;
    toast.success('Assignment updated');
  }, []);

  // Homework
  const fetchHomework = useCallback(async (assignmentId?: string) => {
    setIsLoading(true);
    try {
      let q = db.from('parent_training_homework').select('*').order('submitted_at', { ascending: false });
      if (assignmentId) q = q.eq('assignment_id', assignmentId);
      const { data, error } = await q;
      if (error) throw error;
      setHomework(data || []);
    } catch (e: any) { toast.error('Failed to load homework: ' + e.message); }
    finally { setIsLoading(false); }
  }, []);

  const reviewHomework = useCallback(async (id: string, reviewerNotes: string, status: string) => {
    const { error } = await db.from('parent_training_homework').update({
      review_status: status,
      reviewer_notes: reviewerNotes,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
    }).eq('homework_id', id);
    if (error) throw error;
    toast.success('Homework reviewed');
  }, [user]);

  // Session logs
  const fetchSessionLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      let q = db.from('parent_training_session_logs').select('*, parent_training_modules(title)').order('session_date', { ascending: false });
      if (agencyId) q = q.eq('agency_id', agencyId);
      const { data, error } = await q;
      if (error) throw error;
      setSessionLogs((data || []).map((d: any) => ({ ...d, module_title: d.parent_training_modules?.title })));
    } catch (e: any) { toast.error('Failed to load session logs: ' + e.message); }
    finally { setIsLoading(false); }
  }, [agencyId]);

  const createSessionLog = useCallback(async (log: Partial<PTSessionLog>) => {
    const { data, error } = await db.from('parent_training_session_logs').insert({
      ...log,
      agency_id: agencyId || log.agency_id,
      provider_id: user?.id,
    }).select().single();
    if (error) throw error;
    toast.success('Session log saved');
    return data;
  }, [user, agencyId]);

  // Custom goals / candidates
  const fetchCustomGoals = useCallback(async () => {
    setIsLoading(true);
    try {
      let q = db.from('v_parent_training_custom_goals').select('*').order('created_at', { ascending: false });
      if (agencyId) q = q.eq('agency_id', agencyId);
      const { data, error } = await q;
      if (error) throw error;
      setCustomGoals(data || []);
    } catch (e: any) { toast.error('Failed to load custom goals: ' + e.message); }
    finally { setIsLoading(false); }
  }, [agencyId]);

  const promoteGoalToLibrary = useCallback(async (customGoalId: string, moduleId: string, goalKey: string) => {
    const cg = customGoals.find(c => c.custom_goal_id === customGoalId);
    if (!cg) throw new Error('Custom goal not found');
    const { data, error } = await db.from('parent_training_goals').insert({
      module_id: moduleId,
      goal_key: goalKey,
      title: cg.title,
      description: cg.description,
      measurement_method: cg.measurement_method,
      unit: cg.unit,
      default_baseline: cg.default_baseline,
      default_target: cg.default_target,
      mastery_criteria: cg.mastery_criteria,
      created_by: user?.id,
    }).select().single();
    if (error) throw error;
    await db.from('parent_training_custom_goals').update({
      promoted_to_goal_id: data.goal_id,
      is_library_candidate: false,
    }).eq('custom_goal_id', customGoalId);
    toast.success('Goal promoted to library');
    return data;
  }, [customGoals, user]);

  // Goal data logging
  const logGoalData = useCallback(async (goalAssignmentId: string, value?: number, textValue?: string, notes?: string) => {
    const { data, error } = await db.rpc('log_parent_training_goal_data', {
      p_goal_assignment_id: goalAssignmentId,
      p_value: value ?? null,
      p_text_value: textValue || null,
      p_logged_by: user?.id || null,
      p_notes: notes || null,
    });
    if (error) throw error;
    toast.success('Progress logged');
    return data;
  }, [user]);

  const fetchGoalData = useCallback(async (goalAssignmentId: string) => {
    const { data, error } = await db.from('parent_training_data').select('*').eq('goal_assignment_id', goalAssignmentId).order('logged_at', { ascending: false });
    if (error) throw error;
    setGoalData(data || []);
  }, []);

  // Insurance summary
  const buildInsuranceSummary = useCallback(async (clientId: string, caregiverId?: string) => {
    const { data, error } = await db.rpc('build_parent_training_insurance_summary', {
      p_client_id: clientId,
      p_caregiver_id: caregiverId || clientId,
    });
    if (error) throw error;
    return data;
  }, []);

  // Report RPCs
  const buildGoalSheet = useCallback(async (clientId: string, caregiverId: string) => {
    const { data, error } = await db.rpc('build_parent_training_goal_sheet', {
      p_client_id: clientId,
      p_caregiver_id: caregiverId,
    });
    if (error) throw error;
    return data;
  }, []);

  const buildProgressReport = useCallback(async (clientId: string, caregiverId: string) => {
    const { data, error } = await db.rpc('build_parent_training_progress_report', {
      p_client_id: clientId,
      p_caregiver_id: caregiverId,
    });
    if (error) throw error;
    return data;
  }, []);

  const buildHomeworkSummary = useCallback(async (clientId: string, caregiverId: string) => {
    const { data, error } = await db.rpc('build_parent_training_homework_summary', {
      p_client_id: clientId,
      p_caregiver_id: caregiverId,
    });
    if (error) throw error;
    return data;
  }, []);

  const saveReportSnapshot = useCallback(async (
    clientId: string, caregiverId: string, reportType: string, title: string, payload: any
  ) => {
    const { data, error } = await db.rpc('save_parent_training_report_snapshot', {
      p_client_id: clientId,
      p_caregiver_id: caregiverId,
      p_report_type: reportType,
      p_title: title,
      p_report_payload: payload,
      p_created_by: user?.id || null,
    });
    if (error) throw error;
    toast.success('Report snapshot saved');
    return data;
  }, [user]);

  const fetchModuleCompletionSummary = useCallback(async (clientId?: string, caregiverId?: string) => {
    let q = db.from('v_parent_training_module_completion_summary').select('*');
    if (clientId) q = q.eq('client_id', clientId);
    if (caregiverId) q = q.eq('caregiver_id', caregiverId);
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  }, []);

  return {
    goals, goalAssignments, homework, sessionLogs, customGoals, assignmentsDashboard, goalData, isLoading,
    fetchGoals, createGoal, updateGoal,
    fetchGoalAssignments, updateGoalAssignment, addCustomGoalToAssignment,
    fetchAssignmentsDashboard, assignModule, updateAssignment,
    fetchHomework, reviewHomework,
    fetchSessionLogs, createSessionLog,
    fetchCustomGoals, promoteGoalToLibrary,
    logGoalData, fetchGoalData,
    buildInsuranceSummary,
    buildGoalSheet, buildProgressReport, buildHomeworkSummary,
    saveReportSnapshot, fetchModuleCompletionSummary,
  };
}
