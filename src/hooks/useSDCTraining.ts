import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TrainingModuleContent {
  module_key: string;
  title: string;
  audience: string;
  overview?: string | null;
  estimated_minutes: number;
  status: string;
  learning_objectives?: any;
  talking_points?: any;
  discussion_prompts?: any;
  demonstration_steps?: any;
  practice_activities?: any;
  scenario_prompts?: any;
  misconceptions?: any;
  key_takeaways?: any;
  created_at: string;
  updated_at: string;
  workbook_item_count?: number;
  download_count?: number;
}

export interface TrainingWorkbookItem {
  id: string;
  module_key: string;
  item_type: string;
  title: string;
  instructions?: string | null;
  content?: any;
  sort_order: number;
  is_active: boolean;
}

export interface TrainingDownload {
  id: string;
  module_key: string;
  title: string;
  description?: string | null;
  file_url?: string | null;
  file_type?: string | null;
  audience?: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface TrainingCertReq {
  id: string;
  certification_key: string;
  module_key?: string | null;
  requirement_type: string;
  title: string;
  description?: string | null;
  is_required: boolean;
  sort_order: number;
}

export interface TrainingCertProgress {
  id: string;
  user_id: string;
  certification_key: string;
  module_key?: string | null;
  requirement_type: string;
  status: string;
  completed_at?: string | null;
  approved_by?: string | null;
  notes?: string | null;
}

export interface TrainingAssignmentV2 {
  id: string;
  user_id: string;
  assigned_by?: string | null;
  module_key?: string | null;
  certification_key?: string | null;
  due_date?: string | null;
  status: string;
  notes?: string | null;
  created_at: string;
}

export function useSDCTraining() {
  const { user } = useAuth();

  const [trainingModules, setTrainingModules] = useState<TrainingModuleContent[]>([]);
  const [workbookItems, setWorkbookItems] = useState<TrainingWorkbookItem[]>([]);
  const [downloads, setDownloads] = useState<TrainingDownload[]>([]);
  const [certRequirements, setCertRequirements] = useState<TrainingCertReq[]>([]);
  const [certProgress, setCertProgress] = useState<TrainingCertProgress[]>([]);
  const [assignments, setAssignments] = useState<TrainingAssignmentV2[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdmin = useCallback(async () => {
    if (!user) return false;
    const [rolesRes, memberRes] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', user.id),
      supabase.from('agency_memberships').select('role').eq('user_id', user.id).eq('status', 'active'),
    ]);
    const adminRoles = ['admin', 'super_admin'];
    const agencyAdminRoles = ['admin', 'owner', 'bcba'];
    const hasGlobal = (rolesRes.data || []).some((r: any) => adminRoles.includes(r.role));
    const hasAgency = (memberRes.data || []).some((r: any) => agencyAdminRoles.includes(r.role));
    const result = hasGlobal || hasAgency;
    setIsAdmin(result);
    return result;
  }, [user]);

  const fetchTrainingModules = useCallback(async () => {
    try {
      // Try full table with JSONB columns first
      const { data, error } = await (supabase.from as any)('training_module_content').select('*').order('module_key');
      if (error) throw error;
      setTrainingModules((data || []) as TrainingModuleContent[]);
    } catch {
      setTrainingModules([]);
    }
  }, []);

  const fetchWorkbookItems = useCallback(async () => {
    try {
      const { data, error } = await (supabase.from as any)('training_workbook_items').select('*').eq('is_active', true).order('module_key').order('sort_order');
      if (error) throw error;
      setWorkbookItems((data || []) as TrainingWorkbookItem[]);
    } catch { setWorkbookItems([]); }
  }, []);

  const fetchDownloads = useCallback(async () => {
    try {
      const { data, error } = await (supabase.from as any)('training_downloads').select('*').eq('is_active', true).order('module_key').order('sort_order');
      if (error) throw error;
      setDownloads((data || []) as TrainingDownload[]);
    } catch { setDownloads([]); }
  }, []);

  const fetchCertRequirements = useCallback(async (certKey = 'sdc_behavior_cert') => {
    try {
      const { data, error } = await (supabase.from as any)('training_certification_requirements')
        .select('*').eq('certification_key', certKey).order('sort_order');
      if (error) throw error;
      setCertRequirements((data || []) as TrainingCertReq[]);
    } catch { setCertRequirements([]); }
  }, []);

  const fetchCertProgress = useCallback(async (userId?: string, certKey = 'sdc_behavior_cert') => {
    try {
      let query = (supabase.from as any)('training_certification_progress')
        .select('*').eq('certification_key', certKey);
      if (userId) query = query.eq('user_id', userId);
      else if (user) query = query.eq('user_id', user.id);
      const { data, error } = await query;
      if (error) throw error;
      setCertProgress((data || []) as TrainingCertProgress[]);
    } catch { setCertProgress([]); }
  }, [user]);

  const fetchAssignments = useCallback(async (userId?: string) => {
    try {
      let query = (supabase.from as any)('training_assignments_v2').select('*').order('created_at', { ascending: false });
      if (userId) query = query.eq('user_id', userId);
      else if (user) query = query.eq('user_id', user.id);
      const { data, error } = await query;
      if (error) throw error;
      setAssignments((data || []) as TrainingAssignmentV2[]);
    } catch { setAssignments([]); }
  }, [user]);

  const completeTrainingRequirement = useCallback(async (moduleKey: string, reqType: string, certKey = 'sdc_behavior_cert') => {
    if (!user) return;
    try {
      const { error } = await (supabase.from as any)('training_certification_progress').upsert({
        user_id: user.id,
        certification_key: certKey,
        module_key: moduleKey,
        requirement_type: reqType,
        status: 'completed',
        completed_at: new Date().toISOString(),
      } as any);
      if (error) throw error;
      toast.success('Requirement marked complete');
      await fetchCertProgress();
    } catch (err: any) {
      toast.error('Failed to update: ' + err.message);
    }
  }, [user, fetchCertProgress]);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      checkAdmin(),
      fetchTrainingModules(),
      fetchWorkbookItems(),
      fetchDownloads(),
      fetchCertRequirements(),
      fetchCertProgress(),
      fetchAssignments(),
    ]);
    setIsLoading(false);
  }, [checkAdmin, fetchTrainingModules, fetchWorkbookItems, fetchDownloads, fetchCertRequirements, fetchCertProgress, fetchAssignments]);

  return {
    trainingModules, workbookItems, downloads, certRequirements, certProgress, assignments,
    fetchTrainingModules, fetchWorkbookItems, fetchDownloads, fetchCertRequirements,
    fetchCertProgress, fetchAssignments, completeTrainingRequirement,
    isLoading, isAdmin, fetchAll, checkAdmin,
  };
}
