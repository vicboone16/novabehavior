import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type {
  Domain,
  CurriculumSystem,
  CurriculumItem,
  OrgGoalTemplate,
  StudentTarget,
  StudentCurriculumPlan,
  StudentAssessment,
  MilestoneScore,
} from '@/types/curriculum';

export function useDomains() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDomains = async () => {
      const { data, error } = await supabase
        .from('domains')
        .select('*')
        .order('display_order');
      
      if (error) {
        console.error('Error fetching domains:', error);
      } else {
        setDomains((data || []) as Domain[]);
      }
      setLoading(false);
    };

    fetchDomains();
  }, []);

  return { domains, loading };
}

export function useCurriculumSystems() {
  const [systems, setSystems] = useState<CurriculumSystem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSystems = async () => {
      const { data, error } = await supabase
        .from('curriculum_systems')
        .select('*')
        .eq('active', true)
        .order('name');
      
      if (error) {
        console.error('Error fetching curriculum systems:', error);
      } else {
        setSystems((data || []) as CurriculumSystem[]);
      }
      setLoading(false);
    };

    fetchSystems();
  }, []);

  return { systems, loading };
}

export function useCurriculumItems(systemId?: string, domainId?: string, level?: string) {
  const [items, setItems] = useState<CurriculumItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      let query = supabase
        .from('curriculum_items')
        .select('*, domain:domains(*)')
        .eq('active', true)
        .order('level')
        .order('display_order');
      
      if (systemId) query = query.eq('curriculum_system_id', systemId);
      if (domainId) query = query.eq('domain_id', domainId);
      if (level) query = query.eq('level', level);

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching curriculum items:', error);
      } else {
        setItems((data || []) as CurriculumItem[]);
      }
      setLoading(false);
    };

    fetchItems();
  }, [systemId, domainId, level]);

  return { items, loading };
}

export function useStudentTargets(studentId: string) {
  const [targets, setTargets] = useState<StudentTarget[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTargets = useCallback(async () => {
    if (!studentId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('student_targets')
      .select('*, domain:domains(*)')
      .eq('student_id', studentId)
      .order('priority')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching student targets:', error);
    } else {
      setTargets((data || []) as StudentTarget[]);
    }
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    fetchTargets();
  }, [fetchTargets]);

  return { targets, loading, refetch: fetchTargets };
}

export function useStudentCurriculumPlans(studentId: string) {
  const [plans, setPlans] = useState<StudentCurriculumPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    if (!studentId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('student_curriculum_plans')
      .select('*, curriculum_system:curriculum_systems(*)')
      .eq('student_id', studentId)
      .order('date_started', { ascending: false });
    
    if (error) {
      console.error('Error fetching curriculum plans:', error);
    } else {
      setPlans((data || []) as StudentCurriculumPlan[]);
    }
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const addPlan = async (systemId: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('student_curriculum_plans')
      .insert({
        student_id: studentId,
        curriculum_system_id: systemId,
        created_by: userData?.user?.id,
      });
    
    if (error) {
      toast.error('Failed to add curriculum plan');
      console.error(error);
    } else {
      toast.success('Curriculum plan added');
      fetchPlans();
    }
  };

  return { plans, loading, refetch: fetchPlans, addPlan };
}

export function useStudentAssessments(studentId: string, systemId?: string) {
  const [assessments, setAssessments] = useState<StudentAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAssessments = useCallback(async () => {
    if (!studentId) return;
    
    setLoading(true);
    let query = supabase
      .from('student_assessments')
      .select('*, curriculum_system:curriculum_systems(*)')
      .eq('student_id', studentId)
      .order('date_administered', { ascending: false });
    
    if (systemId) query = query.eq('curriculum_system_id', systemId);

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching assessments:', error);
    } else {
      setAssessments((data || []) as unknown as StudentAssessment[]);
    }
    setLoading(false);
  }, [studentId, systemId]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const createAssessment = async (systemId: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('student_assessments')
      .insert({
        student_id: studentId,
        curriculum_system_id: systemId,
        administered_by: userData?.user?.id,
        status: 'draft',
        results_json: {},
        domain_scores: {},
      })
      .select()
      .single();
    
    if (error) {
      toast.error('Failed to create assessment');
      console.error(error);
      return null;
    }
    
    toast.success('Assessment created');
    fetchAssessments();
    return data as unknown as StudentAssessment;
  };

  const updateAssessment = async (
    assessmentId: string,
    updates: { 
      results_json?: Record<string, MilestoneScore>;
      domain_scores?: Record<string, number>;
      status?: 'draft' | 'final';
      notes?: string;
    }
  ) => {
    const updateData: Record<string, unknown> = {};
    if (updates.results_json !== undefined) updateData.results_json = updates.results_json;
    if (updates.domain_scores !== undefined) updateData.domain_scores = updates.domain_scores;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { error } = await supabase
      .from('student_assessments')
      .update(updateData)
      .eq('id', assessmentId);
    
    if (error) {
      toast.error('Failed to update assessment');
      console.error(error);
      return false;
    }
    
    fetchAssessments();
    return true;
  };

  const deleteAssessment = async (assessmentId: string) => {
    const { error } = await supabase
      .from('student_assessments')
      .delete()
      .eq('id', assessmentId);
    
    if (error) {
      toast.error('Failed to delete assessment');
      console.error(error);
      return false;
    }
    
    toast.success('Assessment deleted');
    fetchAssessments();
    return true;
  };

  return { assessments, loading, refetch: fetchAssessments, createAssessment, updateAssessment, deleteAssessment };
}

export function useTargetActions(studentId: string, onSuccess?: () => void) {
  const { user } = useAuth();

  const addTarget = async (target: Partial<StudentTarget>) => {
    const { error } = await supabase
      .from('student_targets')
      .insert({
        student_id: studentId,
        domain_id: target.domain_id,
        title: target.title,
        description: target.description,
        mastery_criteria: target.mastery_criteria,
        data_collection_type: target.data_collection_type || 'discrete_trial',
        priority: target.priority || 'medium',
        status: target.status || 'active',
        source_type: target.source_type || 'custom',
        source_id: target.source_id,
        customized: target.customized || false,
        linked_prerequisite_ids: target.linked_prerequisite_ids || [],
        notes_for_staff: target.notes_for_staff,
        added_by: user?.id,
      });
    
    if (error) {
      toast.error('Failed to add target');
      console.error(error);
      return false;
    }
    
    toast.success('Target added');
    onSuccess?.();
    return true;
  };

  const updateTarget = async (targetId: string, updates: Partial<StudentTarget>) => {
    const { error } = await supabase
      .from('student_targets')
      .update(updates)
      .eq('id', targetId);
    
    if (error) {
      toast.error('Failed to update target');
      console.error(error);
      return false;
    }
    
    toast.success('Target updated');
    onSuccess?.();
    return true;
  };

  const deleteTarget = async (targetId: string) => {
    const { error } = await supabase
      .from('student_targets')
      .delete()
      .eq('id', targetId);
    
    if (error) {
      toast.error('Failed to delete target');
      console.error(error);
      return false;
    }
    
    toast.success('Target deleted');
    onSuccess?.();
    return true;
  };

  const bulkAddTargets = async (targets: Partial<StudentTarget>[]) => {
    const insertData = targets.map(t => ({
      student_id: studentId,
      domain_id: t.domain_id,
      title: t.title,
      description: t.description,
      mastery_criteria: t.mastery_criteria,
      data_collection_type: t.data_collection_type || 'discrete_trial',
      priority: t.priority || 'medium',
      status: t.status || 'active',
      source_type: t.source_type || 'custom',
      source_id: t.source_id,
      customized: t.customized || false,
      linked_prerequisite_ids: t.linked_prerequisite_ids || [],
      notes_for_staff: t.notes_for_staff,
      added_by: user?.id,
    }));

    const { error } = await supabase
      .from('student_targets')
      .insert(insertData);
    
    if (error) {
      toast.error('Failed to add targets');
      console.error(error);
      return false;
    }
    
    toast.success(`Added ${targets.length} targets`);
    onSuccess?.();
    return true;
  };

  return { addTarget, updateTarget, deleteTarget, bulkAddTargets };
}
