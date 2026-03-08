import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const db = supabase as any;

export interface ParentAssignment {
  assignment_id: string;
  module_id: string;
  module_version_id: string | null;
  status: string;
  due_at: string | null;
  created_at: string;
  agency_id: string | null;
  client_id: string;
  module_title: string | null;
  module_description: string | null;
  est_minutes: number;
  goal_count: number;
}

export interface ParentGoal {
  goal_assignment_id: string;
  assignment_id: string;
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
  module_title?: string;
}

export interface ParentHomeworkItem {
  homework_id: string;
  assignment_id: string;
  title: string;
  response_text: string | null;
  file_url: string | null;
  notes: string | null;
  review_status: string;
  reviewer_notes: string | null;
  submitted_at: string;
}

export function useParentTrainingParent() {
  const { user } = useAuth();
  const [isAgencyLinked, setIsAgencyLinked] = useState(false);
  const [agencyName, setAgencyName] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<ParentAssignment[]>([]);
  const [goals, setGoals] = useState<ParentGoal[]>([]);
  const [homework, setHomework] = useState<ParentHomeworkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Detect agency linkage by checking if this parent has any agency-linked assignments
  const detectMode = useCallback(async () => {
    if (!user) return false;
    try {
      const { data, error } = await db
        .from('parent_training_assignments')
        .select('assignment_id, agency_id')
        .eq('parent_user_id', user.id)
        .not('agency_id', 'is', null)
        .limit(1);
      if (error) throw error;
      const linked = data && data.length > 0;
      setIsAgencyLinked(linked);
      if (linked && data[0].agency_id) {
        const { data: ag } = await db.from('agencies').select('name').eq('id', data[0].agency_id).single();
        setAgencyName(ag?.name || null);
      }
      return linked;
    } catch {
      setIsAgencyLinked(false);
      return false;
    }
  }, [user]);

  const fetchAssignments = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await db
        .from('parent_training_assignments')
        .select('*, parent_training_modules(title, short_description, est_minutes)')
        .eq('parent_user_id', user.id)
        .not('agency_id', 'is', null)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Get goal counts per assignment
      const ids = (data || []).map((d: any) => d.assignment_id);
      let goalCounts: Record<string, number> = {};
      if (ids.length > 0) {
        const { data: gc } = await db
          .from('parent_training_goal_assignments')
          .select('assignment_id')
          .in('assignment_id', ids);
        (gc || []).forEach((g: any) => {
          goalCounts[g.assignment_id] = (goalCounts[g.assignment_id] || 0) + 1;
        });
      }

      setAssignments((data || []).map((d: any) => ({
        assignment_id: d.assignment_id,
        module_id: d.module_id,
        module_version_id: d.module_version_id,
        status: d.status,
        due_at: d.due_at,
        created_at: d.created_at,
        agency_id: d.agency_id,
        client_id: d.client_id,
        module_title: d.parent_training_modules?.title || null,
        module_description: d.parent_training_modules?.short_description || null,
        est_minutes: d.parent_training_modules?.est_minutes || 0,
        goal_count: goalCounts[d.assignment_id] || 0,
      })));
    } catch {
      setAssignments([]);
    }
  }, [user]);

  const fetchGoals = useCallback(async () => {
    if (!user) return;
    try {
      // Get all goal assignments for this parent's agency-linked assignments
      const { data: assigns } = await db
        .from('parent_training_assignments')
        .select('assignment_id, parent_training_modules(title)')
        .eq('parent_user_id', user.id)
        .not('agency_id', 'is', null);

      if (!assigns || assigns.length === 0) { setGoals([]); return; }

      const ids = assigns.map((a: any) => a.assignment_id);
      const titleMap: Record<string, string> = {};
      assigns.forEach((a: any) => { titleMap[a.assignment_id] = a.parent_training_modules?.title || ''; });

      const { data, error } = await db
        .from('parent_training_goal_assignments')
        .select('*')
        .in('assignment_id', ids)
        .order('created_at');
      if (error) throw error;

      setGoals((data || []).map((g: any) => ({
        ...g,
        module_title: titleMap[g.assignment_id] || undefined,
      })));
    } catch {
      setGoals([]);
    }
  }, [user]);

  const fetchHomework = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await db
        .from('parent_training_homework')
        .select('*')
        .eq('parent_user_id', user.id)
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      setHomework(data || []);
    } catch {
      setHomework([]);
    }
  }, [user]);

  const submitHomework = useCallback(async (assignmentId: string, clientId: string, title: string, responseText?: string, fileUrl?: string, notes?: string) => {
    if (!user) throw new Error('Not authenticated');
    const { data, error } = await db.from('parent_training_homework').insert({
      assignment_id: assignmentId,
      parent_user_id: user.id,
      client_id: clientId,
      title,
      response_text: responseText || null,
      file_url: fileUrl || null,
      notes: notes || null,
      review_status: 'submitted',
      submitted_at: new Date().toISOString(),
    }).select().single();
    if (error) throw error;
    return data;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    (async () => {
      const linked = await detectMode();
      if (linked) {
        await Promise.all([fetchAssignments(), fetchGoals(), fetchHomework()]);
      }
      setIsLoading(false);
    })();
  }, [user, detectMode, fetchAssignments, fetchGoals, fetchHomework]);

  const completedModules = useMemo(() => assignments.filter(a => a.status === 'completed').length, [assignments]);
  const activeModules = useMemo(() => assignments.filter(a => a.status !== 'completed').length, [assignments]);
  const totalGoals = goals.length;
  const pendingHomework = useMemo(() => homework.filter(h => h.review_status === 'submitted').length, [homework]);

  return {
    isAgencyLinked,
    agencyName,
    isLoading,
    assignments,
    goals,
    homework,
    completedModules,
    activeModules,
    totalGoals,
    pendingHomework,
    submitHomework,
    refetch: () => Promise.all([fetchAssignments(), fetchGoals(), fetchHomework()]),
  };
}
