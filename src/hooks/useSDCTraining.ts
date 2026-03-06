import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SDCModule {
  id: string;
  academy_module_id?: string | null;
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
  created_by?: string | null;
  created_at: string;
  updated_at: string;
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
  user_name?: string;
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

export function useSDCTraining() {
  const { user } = useAuth();
  const [modules, setModules] = useState<SDCModule[]>([]);
  const [certifications, setCertifications] = useState<SDCCertification[]>([]);
  const [requirements, setRequirements] = useState<SDCCertificationRequirement[]>([]);
  const [certProgress, setCertProgress] = useState<SDCCertificationProgress[]>([]);
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

  const fetchModules = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sdc_training_modules' as any)
        .select('*')
        .order('sort_order');
      if (error) throw error;
      setModules((data || []) as unknown as SDCModule[]);
    } catch (err: any) {
      console.error('Failed to load SDC modules:', err.message);
      setModules([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchResources = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sdc_training_resources' as any)
        .select('*, sdc_training_modules(title)')
        .order('sort_order');
      if (error) throw error;
      setResources((data || []).map((r: any) => ({
        ...r,
        module_title: r.sdc_training_modules?.title,
      })) as unknown as SDCResource[]);
    } catch {
      setResources([]);
    }
  }, []);

  const fetchCertifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sdc_certifications' as any)
        .select('*')
        .order('assigned_at', { ascending: false });
      if (error) throw error;
      setCertifications((data || []) as unknown as SDCCertification[]);
    } catch {
      setCertifications([]);
    }
  }, []);

  const fetchRequirements = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sdc_certification_requirements' as any)
        .select('*, sdc_training_modules(title)')
        .order('sort_order');
      if (error) throw error;
      setRequirements((data || []).map((r: any) => ({
        ...r,
        module_title: r.sdc_training_modules?.title,
      })) as unknown as SDCCertificationRequirement[]);
    } catch {
      setRequirements([]);
    }
  }, []);

  const fetchCertProgress = useCallback(async (certId: string) => {
    try {
      const { data, error } = await supabase
        .from('sdc_certification_progress' as any)
        .select('*')
        .eq('certification_id', certId);
      if (error) throw error;
      setCertProgress((data || []) as unknown as SDCCertificationProgress[]);
    } catch {
      setCertProgress([]);
    }
  }, []);

  const completeRequirement = useCallback(async (certId: string, reqId: string) => {
    try {
      const { error } = await supabase.from('sdc_certification_progress' as any).upsert({
        certification_id: certId,
        requirement_id: reqId,
        completed: true,
        completed_at: new Date().toISOString(),
      } as any, { onConflict: 'certification_id,requirement_id' });
      if (error) throw error;
      toast.success('Requirement marked complete');
      await fetchCertProgress(certId);
    } catch (err: any) {
      toast.error('Failed to update: ' + err.message);
    }
  }, [fetchCertProgress]);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      checkAdmin(),
      fetchModules(),
      fetchResources(),
      fetchCertifications(),
      fetchRequirements(),
    ]);
    setIsLoading(false);
  }, [checkAdmin, fetchModules, fetchResources, fetchCertifications, fetchRequirements]);

  return {
    modules, certifications, requirements, certProgress, resources,
    isLoading, isAdmin,
    fetchAll, fetchModules, fetchResources, fetchCertifications,
    fetchRequirements, fetchCertProgress, completeRequirement, checkAdmin,
  };
}
