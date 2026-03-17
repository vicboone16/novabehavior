import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Types matching sdc_training_modules table
export interface SDCModule {
  id: string;
  title: string;
  training_objective?: string | null;
  instructor_script?: string | null;
  instructor_talking_points?: any;
  discussion_prompts?: any;
  demonstration_notes?: string | null;
  key_definitions?: any;
  key_takeaways?: any;
  knowledge_check?: any;
  examples?: any;
  staff_misconceptions?: any;
  common_staff_errors?: any;
  coaching_recommendations?: any;
  scenario_questions?: any;
  scenario_practice_prompts?: any;
  reflection_prompts?: any;
  guided_practice?: any;
  matching_activities?: any;
  abc_worksheets?: any;
  data_collection_practice?: any;
  reinforcement_planning?: any;
  intervention_planning_prompts?: any;
  fidelity_check_items?: any;
  workbook_reading_content?: string | null;
  estimated_minutes?: number | null;
  sort_order: number;
  status: string;
  academy_module_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SDCResource {
  id: string;
  module_id?: string | null;
  title: string;
  description?: string | null;
  file_url?: string | null;
  resource_type: string;
  is_instructor_only: boolean;
  sort_order?: number | null;
  created_at: string;
}

export interface SDCCertRequirement {
  id: string;
  module_id: string;
  requirement_type: string;
  description?: string | null;
  sort_order?: number | null;
  created_at: string;
}

export interface SDCCertProgress {
  id: string;
  user_id: string;
  requirement_id: string;
  status: string;
  completed_at?: string | null;
  approved_by?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SDCStaffProgress {
  id: string;
  user_id: string;
  module_id?: string | null;
  status: string;
  started_at?: string | null;
  completed_at?: string | null;
  last_activity_at?: string | null;
  time_spent_seconds: number;
  current_section?: string | null;
  score?: number | null;
  attempts: number;
  notes?: string | null;
  assigned_by?: string | null;
  assigned_at?: string | null;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
  // joined
  user_email?: string;
  user_name?: string;
  module_title?: string;
}

// Legacy compatibility types (mapped from new tables)
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

function moduleToLegacy(mod: SDCModule, resources: SDCResource[]): TrainingModuleContent {
  const modResources = resources.filter(r => r.module_id === mod.id);
  return {
    module_key: mod.id,
    title: mod.title,
    audience: 'all',
    overview: mod.training_objective,
    estimated_minutes: mod.estimated_minutes || 30,
    status: mod.status,
    learning_objectives: mod.key_definitions,
    talking_points: mod.instructor_talking_points,
    discussion_prompts: mod.discussion_prompts,
    demonstration_steps: mod.demonstration_notes ? [mod.demonstration_notes] : [],
    practice_activities: mod.guided_practice,
    scenario_prompts: mod.scenario_practice_prompts,
    misconceptions: mod.staff_misconceptions,
    key_takeaways: mod.key_takeaways,
    created_at: mod.created_at,
    updated_at: mod.updated_at,
    workbook_item_count: 0,
    download_count: modResources.length,
  };
}

function resourceToDownload(res: SDCResource): TrainingDownload {
  return {
    id: res.id,
    module_key: res.module_id || '',
    title: res.title,
    description: res.description,
    file_url: res.file_url,
    file_type: res.resource_type,
    audience: res.is_instructor_only ? 'instructor' : 'all',
    sort_order: res.sort_order || 0,
    is_active: true,
  };
}

function certReqToLegacy(req: SDCCertRequirement, mod: SDCModule | undefined): TrainingCertReq {
  return {
    id: req.id,
    certification_key: 'sdc_behavior_cert',
    module_key: req.module_id,
    requirement_type: req.requirement_type,
    title: req.description || `${req.requirement_type} for ${mod?.title || 'module'}`,
    description: req.description,
    is_required: true,
    sort_order: req.sort_order || 0,
  };
}

function staffProgressToAssignment(sp: SDCStaffProgress): TrainingAssignmentV2 {
  return {
    id: sp.id,
    user_id: sp.user_id,
    assigned_by: sp.assigned_by,
    module_key: sp.module_id,
    certification_key: null,
    due_date: sp.due_date,
    status: sp.status,
    notes: sp.notes,
    created_at: sp.created_at,
  };
}

export function useSDCTraining() {
  const { user } = useAuth();

  // Real data
  const [sdcModules, setSdcModules] = useState<SDCModule[]>([]);
  const [sdcResources, setSdcResources] = useState<SDCResource[]>([]);
  const [sdcCertReqs, setSdcCertReqs] = useState<SDCCertRequirement[]>([]);
  const [sdcCertProgress, setSdcCertProgress] = useState<SDCCertProgress[]>([]);
  const [staffProgress, setStaffProgress] = useState<SDCStaffProgress[]>([]);
  const [allStaffProgress, setAllStaffProgress] = useState<SDCStaffProgress[]>([]);

  // Legacy-compatible
  const [trainingModules, setTrainingModules] = useState<TrainingModuleContent[]>([]);
  const [workbookItems] = useState<TrainingWorkbookItem[]>([]);
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

  const fetchModules = useCallback(async () => {
    const { data, error } = await supabase
      .from('sdc_training_modules')
      .select('*')
      .order('sort_order');
    if (!error && data) {
      setSdcModules(data as SDCModule[]);
      return data as SDCModule[];
    }
    return [];
  }, []);

  const fetchResources = useCallback(async () => {
    const { data, error } = await supabase
      .from('sdc_training_resources')
      .select('*')
      .order('sort_order');
    if (!error && data) {
      setSdcResources(data as SDCResource[]);
      return data as SDCResource[];
    }
    return [];
  }, []);

  const fetchCertReqs = useCallback(async () => {
    const { data, error } = await supabase
      .from('sdc_certification_requirements')
      .select('*')
      .order('sort_order');
    if (!error && data) {
      setSdcCertReqs(data as SDCCertRequirement[]);
      return data as SDCCertRequirement[];
    }
    return [];
  }, []);

  const fetchCertProgressData = useCallback(async () => {
    if (!user) return [];
    const { data, error } = await supabase
      .from('sdc_certification_progress')
      .select('*')
      .eq('user_id', user.id);
    if (!error && data) {
      setSdcCertProgress(data as SDCCertProgress[]);
      return data as SDCCertProgress[];
    }
    return [];
  }, [user]);

  const fetchStaffProgress = useCallback(async () => {
    if (!user) return;
    // Own progress
    const { data } = await (supabase.from as any)('sdc_training_staff_progress')
      .select('*')
      .eq('user_id', user.id);
    setStaffProgress((data || []) as SDCStaffProgress[]);
  }, [user]);

  const fetchAllStaffProgress = useCallback(async () => {
    // Admin: all staff progress
    const { data } = await (supabase.from as any)('sdc_training_staff_progress')
      .select('*')
      .order('last_activity_at', { ascending: false });
    setAllStaffProgress((data || []) as SDCStaffProgress[]);
  }, []);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    const [admin, modules, resources, certReqs] = await Promise.all([
      checkAdmin(),
      fetchModules(),
      fetchResources(),
      fetchCertReqs(),
      fetchCertProgressData(),
      fetchStaffProgress(),
    ]);

    // Build legacy-compatible data
    setTrainingModules(modules.map(m => moduleToLegacy(m, resources)));
    setDownloads(resources.map(resourceToDownload));
    setCertRequirements(certReqs.map(r => certReqToLegacy(r, modules.find(m => m.id === r.module_id))));

    if (admin) {
      await fetchAllStaffProgress();
    }

    setIsLoading(false);
  }, [checkAdmin, fetchModules, fetchResources, fetchCertReqs, fetchCertProgressData, fetchStaffProgress, fetchAllStaffProgress]);

  // Admin operations
  const createModule = useCallback(async (moduleData: Partial<SDCModule>) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('sdc_training_modules')
      .insert({
        title: moduleData.title || 'New Module',
        training_objective: moduleData.training_objective,
        estimated_minutes: moduleData.estimated_minutes || 30,
        sort_order: moduleData.sort_order || sdcModules.length + 1,
        status: 'draft',
        created_by: user.id,
        instructor_script: moduleData.instructor_script,
        instructor_talking_points: moduleData.instructor_talking_points as any,
        key_definitions: moduleData.key_definitions as any,
        key_takeaways: moduleData.key_takeaways as any,
        discussion_prompts: moduleData.discussion_prompts as any,
        knowledge_check: moduleData.knowledge_check as any,
      } as any)
      .select()
      .single();
    if (error) {
      toast.error('Failed to create module: ' + error.message);
      return null;
    }
    toast.success('Module created');
    await fetchModules();
    return data;
  }, [user, sdcModules.length, fetchModules]);

  const updateModule = useCallback(async (id: string, updates: Partial<SDCModule>) => {
    const { error } = await supabase
      .from('sdc_training_modules')
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq('id', id);
    if (error) {
      toast.error('Failed to update: ' + error.message);
      return false;
    }
    toast.success('Module updated');
    await fetchModules();
    return true;
  }, [fetchModules]);

  const deleteModule = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('sdc_training_modules')
      .delete()
      .eq('id', id);
    if (error) {
      toast.error('Failed to delete: ' + error.message);
      return false;
    }
    toast.success('Module deleted');
    await fetchModules();
    return true;
  }, [fetchModules]);

  const assignModuleToStaff = useCallback(async (moduleId: string, staffUserId: string, dueDate?: string) => {
    if (!user) return false;
    const { error } = await (supabase.from as any)('sdc_training_staff_progress')
      .upsert({
        user_id: staffUserId,
        module_id: moduleId,
        status: 'assigned',
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
        due_date: dueDate || null,
      }, { onConflict: 'user_id,module_id' });
    if (error) {
      toast.error('Failed to assign: ' + error.message);
      return false;
    }
    toast.success('Training assigned');
    await fetchAllStaffProgress();
    return true;
  }, [user, fetchAllStaffProgress]);

  const updateStaffProgressTime = useCallback(async (moduleId: string, additionalSeconds: number) => {
    if (!user) return;
    const existing = staffProgress.find(p => p.module_id === moduleId);
    const newTime = (existing?.time_spent_seconds || 0) + additionalSeconds;
    await (supabase.from as any)('sdc_training_staff_progress')
      .upsert({
        user_id: user.id,
        module_id: moduleId,
        time_spent_seconds: newTime,
        last_activity_at: new Date().toISOString(),
        status: existing?.status === 'not_started' ? 'in_progress' : (existing?.status || 'in_progress'),
      }, { onConflict: 'user_id,module_id' });
  }, [user, staffProgress]);

  const createResource = useCallback(async (resourceData: Partial<SDCResource>) => {
    const { error } = await supabase
      .from('sdc_training_resources')
      .insert({
        title: resourceData.title || 'New Resource',
        description: resourceData.description,
        file_url: resourceData.file_url,
        resource_type: resourceData.resource_type || 'document',
        module_id: resourceData.module_id,
        is_instructor_only: resourceData.is_instructor_only || false,
      } as any);
    if (error) {
      toast.error('Failed to create resource: ' + error.message);
      return false;
    }
    toast.success('Resource added');
    await fetchResources();
    return true;
  }, [fetchResources]);

  // Keep legacy compatibility
  const completeTrainingRequirement = useCallback(async (moduleKey: string, reqType: string) => {
    // no-op for now — uses old tables
  }, []);

  const fetchTrainingModules = fetchModules;
  const fetchWorkbookItems = useCallback(async () => {}, []);
  const fetchDownloads = fetchResources;
  const fetchCertRequirements = fetchCertReqs;
  const fetchCertProgress = fetchCertProgressData;
  const fetchAssignments = fetchStaffProgress;

  return {
    // Real data
    sdcModules, sdcResources, sdcCertReqs, sdcCertProgress,
    staffProgress, allStaffProgress,
    // Admin ops
    createModule, updateModule, deleteModule,
    assignModuleToStaff, updateStaffProgressTime, createResource,
    fetchAllStaffProgress,
    // Legacy-compatible
    trainingModules, workbookItems, downloads, certRequirements, certProgress, assignments,
    fetchTrainingModules, fetchWorkbookItems, fetchDownloads, fetchCertRequirements,
    fetchCertProgress, fetchAssignments, completeTrainingRequirement,
    isLoading, isAdmin, fetchAll, checkAdmin,
  };
}
