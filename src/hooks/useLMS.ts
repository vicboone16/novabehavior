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
      // Try Nova Academy modules first (the active LMS system)
      const { data: academyData, error: academyError } = await supabase
        .from('academy_modules')
        .select('*')
        .order('title');

      if (!academyError && academyData && academyData.length > 0) {
        // Map academy_modules to TrainingModule shape
        const mapped = academyData.map((m: any) => ({
          id: m.module_id,
          title: m.title,
          description: m.short_description,
          content_type: m.suggested_tool || 'document',
          ceu_credits: 0,
          category: m.audience || 'general',
          required_roles: [],
          pass_criteria: {},
          content_data: {},
          status: m.status,
          created_by: m.created_by,
          created_at: m.created_at,
          updated_at: m.updated_at,
        }));
        setModules(mapped as unknown as TrainingModule[]);
      } else {
        // Fallback to legacy training_modules table
        const { data, error } = await supabase.from('training_modules' as any).select('*').order('title');
        if (error) throw error;
        setModules((data || []) as unknown as TrainingModule[]);
      }
    } catch (err: any) {
      console.error('Failed to load training modules:', err.message);
      setModules([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAssignments = useCallback(async (staffId?: string) => {
    try {
      // Try Nova Academy assignments first
      let query = supabase
        .from('academy_module_assignments')
        .select('*, academy_modules(*)')
        .order('created_at', { ascending: false });
      if (staffId) query = query.eq('coach_user_id', staffId);
      else if (user) query = query.eq('coach_user_id', user.id);

      const { data, error } = await query;
      if (!error && data) {
        const mapped = (data || []).map((d: any) => ({
          id: d.assignment_id,
          module_id: d.module_id,
          staff_user_id: d.coach_user_id,
          assigned_by: d.created_by,
          due_date: d.due_date,
          status: d.status,
          created_at: d.created_at,
          module: d.academy_modules ? {
            id: d.academy_modules.module_id,
            title: d.academy_modules.title,
            description: d.academy_modules.short_description,
          } : null,
        }));
        setAssignments(mapped as unknown as TrainingAssignment[]);
        return;
      }
    } catch { /* fall through */ }

    // Fallback to legacy
    try {
      let query = supabase.from('training_assignments' as any).select('*, training_modules(*)').order('due_date');
      if (staffId) query = query.eq('staff_user_id', staffId);
      const { data, error } = await query;
      if (error) throw error;
      const mapped = (data || []).map((d: any) => ({ ...d, module: d.training_modules }));
      setAssignments(mapped as unknown as TrainingAssignment[]);
    } catch {
      setAssignments([]);
    }
  }, [user]);

  const createModule = useCallback(async (module: Partial<TrainingModule>) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase.from('academy_modules').insert({
        title: module.title || 'Untitled',
        short_description: module.description || null,
        scope: 'agency',
        audience: module.category || 'staff',
        est_minutes: 15,
        skill_tags: [],
        suggested_tool: module.content_type || 'document',
        created_by: user.id,
      } as any).select().single();
      if (error) throw error;
      toast.success('Training module created');
      return data;
    } catch (err: any) {
      toast.error('Failed to create module: ' + err.message);
      return null;
    }
  }, [user]);

  const updateModule = useCallback(async (id: string, updates: Partial<TrainingModule>) => {
    const { error } = await supabase.from('academy_modules').update({
      title: updates.title,
      short_description: updates.description,
      status: updates.status,
    } as any).eq('module_id', id);
    if (error) throw error;
    toast.success('Module updated');
  }, []);

  const assignTraining = useCallback(async (assignment: Partial<TrainingAssignment>) => {
    const { data, error } = await supabase.from('academy_module_assignments').insert({
      module_id: assignment.module_id,
      coach_user_id: assignment.staff_user_id,
      created_by: user?.id,
      due_date: assignment.due_date,
      status: 'assigned',
    } as any).select().single();
    if (error) throw error;
    toast.success('Training assigned');
    return data;
  }, [user]);

  const updateAssignment = useCallback(async (id: string, updates: Partial<TrainingAssignment>) => {
    const { error } = await supabase.from('academy_module_assignments').update({
      status: updates.status,
    } as any).eq('assignment_id', id);
    if (error) throw error;
  }, []);

  const fetchCEURecords = useCallback(async (staffId?: string) => {
    let query = supabase.from('ceu_records' as any).select('*').order('date_completed', { ascending: false });
    if (staffId) query = query.eq('staff_user_id', staffId);
    const { data, error } = await query;
    if (error) {
      console.error('Failed to load CEU records:', error.message);
      setCeuRecords([]);
      return;
    }
    setCeuRecords((data || []) as unknown as CEURecord[]);
  }, []);

  const addCEURecord = useCallback(async (record: Partial<CEURecord>) => {
    if (!user) return null;
    const { data, error } = await supabase.from('ceu_records' as any).insert({ ...record, staff_user_id: record.staff_user_id || user.id } as any).select().single();
    if (error) throw error;
    toast.success('CEU record added');
    return data;
  }, [user]);

  const updateCEURecord = useCallback(async (id: string, updates: Partial<CEURecord>) => {
    const { error } = await supabase.from('ceu_records' as any).update(updates as any).eq('id', id);
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
