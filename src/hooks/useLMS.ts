import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { TrainingModule, TrainingAssignment, CEURecord } from '@/types/lms';

export function useLMS() {
  const { user } = useAuth();
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [assignments, setAssignments] = useState<TrainingAssignment[]>([]);
  const [ceuRecords, setCeuRecords] = useState<CEURecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchModules = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('training_modules').select('*').order('title');
      if (error) throw error;
      setModules((data || []) as unknown as TrainingModule[]);
    } catch (err: any) {
      toast.error('Failed to load training modules: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAssignments = useCallback(async (staffId?: string) => {
    let query = supabase.from('training_assignments').select('*, training_modules(*)').order('due_date');
    if (staffId) query = query.eq('staff_user_id', staffId);
    const { data, error } = await query;
    if (error) throw error;
    const mapped = (data || []).map((d: any) => ({ ...d, module: d.training_modules }));
    setAssignments(mapped as unknown as TrainingAssignment[]);
  }, []);

  const createModule = useCallback(async (module: Partial<TrainingModule>) => {
    if (!user) return null;
    const { data, error } = await supabase.from('training_modules').insert({ ...module, created_by: user.id } as any).select().single();
    if (error) throw error;
    toast.success('Training module created');
    return data;
  }, [user]);

  const updateModule = useCallback(async (id: string, updates: Partial<TrainingModule>) => {
    const { error } = await supabase.from('training_modules').update(updates as any).eq('id', id);
    if (error) throw error;
    toast.success('Module updated');
  }, []);

  const assignTraining = useCallback(async (assignment: Partial<TrainingAssignment>) => {
    const { data, error } = await supabase.from('training_assignments').insert({ ...assignment, assigned_by: user?.id } as any).select().single();
    if (error) throw error;
    toast.success('Training assigned');
    return data;
  }, [user]);

  const updateAssignment = useCallback(async (id: string, updates: Partial<TrainingAssignment>) => {
    const { error } = await supabase.from('training_assignments').update(updates as any).eq('id', id);
    if (error) throw error;
  }, []);

  const fetchCEURecords = useCallback(async (staffId?: string) => {
    let query = supabase.from('ceu_records').select('*').order('date_completed', { ascending: false });
    if (staffId) query = query.eq('staff_user_id', staffId);
    const { data, error } = await query;
    if (error) throw error;
    setCeuRecords((data || []) as unknown as CEURecord[]);
  }, []);

  const addCEURecord = useCallback(async (record: Partial<CEURecord>) => {
    if (!user) return null;
    const { data, error } = await supabase.from('ceu_records').insert({ ...record, staff_user_id: record.staff_user_id || user.id } as any).select().single();
    if (error) throw error;
    toast.success('CEU record added');
    return data;
  }, [user]);

  const updateCEURecord = useCallback(async (id: string, updates: Partial<CEURecord>) => {
    const { error } = await supabase.from('ceu_records').update(updates as any).eq('id', id);
    if (error) throw error;
    toast.success('CEU record updated');
  }, []);

  return {
    modules, assignments, ceuRecords, isLoading,
    fetchModules, fetchAssignments, createModule, updateModule,
    assignTraining, updateAssignment,
    fetchCEURecords, addCEURecord, updateCEURecord,
  };
}
