import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Types aligned to the new normalized training tables

export interface TrainingModuleContent {
  module_key: string;
  title: string;
  audience: string;
  overview?: string | null;
  estimated_minutes: number;
  status: string;
  created_at: string;
  updated_at: string;
  // joined from dashboard view
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

// Also keep legacy SDCModule for the sdc_training_modules table
export interface SDCModule {
  id: string;
  title: string;
  sort_order: number;
  estimated_minutes: number;
  training_objective?: string | null;
  instructor_talking_points: any[];
  discussion_prompts: any[];
  scenario_practice_prompts: any[];
  key_definitions: any[];
  examples: any[];
  staff_misconceptions: any[];
  fidelity_check_items: any[];
  coaching_recommendations: any[];
  instructor_script?: string | null;
  demonstration_notes?: string | null;
  common_staff_errors: any[];
  key_takeaways: any[];
  workbook_reading_content?: string | null;
  reflection_prompts: any[];
  guided_practice: any[];
  scenario_questions: any[];
  matching_activities: any[];
  abc_worksheets: any[];
  data_collection_practice: any[];
  intervention_planning_prompts: any[];
  reinforcement_planning: any[];
  knowledge_check: any[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SDCResource {
  id: string;
  module_id?: string | null;
  title: string;
  description?: string | null;
  resource_type: string;
  file_url?: string | null;
  is_instructor_only: boolean;
  sort_order: number;
  module_title?: string;
}

export interface SDCCertification {
  id: string;
  user_id: string;
  status: string;
  assigned_at: string;
  assigned_by?: string | null;
  certified_at?: string | null;
  renewal_date?: string | null;
  notes?: string | null;
  agency_id?: string | null;
}

export interface SDCCertificationRequirement {
  id: string;
  module_id: string;
  requirement_type: string;
  description?: string | null;
  sort_order: number;
  module_title?: string;
}

export interface SDCCertificationProgress {
  id: string;
  certification_id: string;
  requirement_id: string;
  completed: boolean;
  completed_at?: string | null;
  score?: number | null;
  notes?: string | null;
}

export function useSDCTraining() {
  const { user } = useAuth();

  // New normalized tables
  const [trainingModules, setTrainingModules] = useState<TrainingModuleContent[]>([]);
  const [workbookItems, setWorkbookItems] = useState<TrainingWorkbookItem[]>([]);
  const [downloads, setDownloads] = useState<TrainingDownload[]>([]);
  const [certRequirements, setCertRequirements] = useState<TrainingCertReq[]>([]);
  const [certProgress, setCertProgress] = useState<TrainingCertProgress[]>([]);
  const [assignments, setAssignments] = useState<TrainingAssignmentV2[]>([]);

  // Legacy SDC tables
  const [modules, setModules] = useState<SDCModule[]>([]);
  const [certifications, setCertifications] = useState<SDCCertification[]>([]);
  const [requirements, setRequirements] = useState<SDCCertificationRequirement[]>([]);
  const [legacyCertProgress, setLegacyCertProgress] = useState<SDCCertificationProgress[]>([]);
  const [resources, setResources] = useState<SDCResource[]>([]);

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

  // Fetch from new normalized tables
  const fetchTrainingModules = useCallback(async () => {
    try {
      const { data, error } = await (supabase.from as any)('v_training_modules_dashboard').select('*').order('module_key');
      if (error) throw error;
      setTrainingModules((data || []) as TrainingModuleContent[]);
    } catch (err: any) {
      console.error('Failed to load training modules dashboard:', err.message);
      // Fallback to raw table
      try {
        const { data } = await (supabase.from as any)('training_module_content').select('*').order('module_key');
        setTrainingModules((data || []) as TrainingModuleContent[]);
      } catch { setTrainingModules([]); }
    }
  }, []);

  const fetchWorkbookItems = useCallback(async (moduleKey?: string) => {
    try {
      let query = (supabase.from as any)('training_workbook_items').select('*').eq('is_active', true).order('sort_order');
      if (moduleKey) query = query.eq('module_key', moduleKey);
      const { data, error } = await query;
      if (error) throw error;
      setWorkbookItems((data || []) as TrainingWorkbookItem[]);
    } catch { setWorkbookItems([]); }
  }, []);

  const fetchDownloads = useCallback(async (moduleKey?: string) => {
    try {
      let query = (supabase.from as any)('training_downloads').select('*').eq('is_active', true).order('sort_order');
      if (moduleKey) query = query.eq('module_key', moduleKey);
      const { data, error } = await query;
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

  // Legacy SDC table fetches (kept for backward compatibility with rich content)
  const fetchModules = useCallback(async () => {
    try {
      const { data, error } = await (supabase.from as any)('sdc_training_modules').select('*').order('sort_order');
      if (error) throw error;
      setModules((data || []) as unknown as SDCModule[]);
    } catch {
      setModules([]);
    }
  }, []);

  const fetchResources = useCallback(async () => {
    try {
      const { data, error } = await (supabase.from as any)('sdc_training_resources')
        .select('*, sdc_training_modules(title)').order('sort_order');
      if (error) throw error;
      setResources((data || []).map((r: any) => ({
        ...r, module_title: r.sdc_training_modules?.title,
      })) as unknown as SDCResource[]);
    } catch { setResources([]); }
  }, []);

  const fetchCertifications = useCallback(async () => {
    try {
      const { data, error } = await (supabase.from as any)('sdc_certifications')
        .select('*').order('assigned_at', { ascending: false });
      if (error) throw error;
      setCertifications((data || []) as unknown as SDCCertification[]);
    } catch { setCertifications([]); }
  }, []);

  const fetchRequirements = useCallback(async () => {
    try {
      const { data, error } = await (supabase.from as any)('sdc_certification_requirements')
        .select('*, sdc_training_modules(title)').order('sort_order');
      if (error) throw error;
      setRequirements((data || []).map((r: any) => ({
        ...r, module_title: r.sdc_training_modules?.title,
      })) as unknown as SDCCertificationRequirement[]);
    } catch { setRequirements([]); }
  }, []);

  const fetchLegacyCertProgress = useCallback(async (certId: string) => {
    try {
      const { data, error } = await (supabase.from as any)('sdc_certification_progress')
        .select('*').eq('certification_id', certId);
      if (error) throw error;
      setLegacyCertProgress((data || []) as unknown as SDCCertificationProgress[]);
    } catch { setLegacyCertProgress([]); }
  }, []);

  const completeRequirement = useCallback(async (certId: string, reqId: string) => {
    try {
      const { error } = await (supabase.from as any)('sdc_certification_progress').upsert({
        certification_id: certId, requirement_id: reqId,
        completed: true, completed_at: new Date().toISOString(),
      } as any, { onConflict: 'certification_id,requirement_id' });
      if (error) throw error;
      toast.success('Requirement marked complete');
      await fetchLegacyCertProgress(certId);
    } catch (err: any) {
      toast.error('Failed to update: ' + err.message);
    }
  }, [fetchLegacyCertProgress]);

  // Complete a requirement in the new system
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
      // New tables
      fetchTrainingModules(),
      fetchWorkbookItems(),
      fetchDownloads(),
      fetchCertRequirements(),
      fetchCertProgress(),
      fetchAssignments(),
      // Legacy tables
      fetchModules(),
      fetchResources(),
      fetchCertifications(),
      fetchRequirements(),
    ]);
    setIsLoading(false);
  }, [checkAdmin, fetchTrainingModules, fetchWorkbookItems, fetchDownloads, fetchCertRequirements, fetchCertProgress, fetchAssignments, fetchModules, fetchResources, fetchCertifications, fetchRequirements]);

  return {
    // New normalized data
    trainingModules, workbookItems, downloads, certRequirements, certProgress, assignments,
    fetchTrainingModules, fetchWorkbookItems, fetchDownloads, fetchCertRequirements,
    fetchCertProgress, fetchAssignments, completeTrainingRequirement,
    // Legacy data
    modules, certifications, requirements, legacyCertProgress, resources,
    fetchModules, fetchResources, fetchCertifications, fetchRequirements,
    fetchLegacyCertProgress, completeRequirement,
    // Common
    isLoading, isAdmin, fetchAll, checkAdmin,
  };
}
