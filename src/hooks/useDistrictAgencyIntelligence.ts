import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAgencyOverview() {
  return useQuery({
    queryKey: ['agency-overview'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_agency_overview' as any)
        .select('*');
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useDistrictOverview() {
  return useQuery({
    queryKey: ['district-overview'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_district_overview' as any)
        .select('*');
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useSchoolComparison() {
  return useQuery({
    queryKey: ['school-comparison'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_school_comparison' as any)
        .select('*');
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useLocationComparison() {
  return useQuery({
    queryKey: ['location-comparison'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_location_comparison' as any)
        .select('*');
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useStaffingClinicianLoad(agencyId?: string) {
  return useQuery({
    queryKey: ['staffing-clinician-load', agencyId],
    queryFn: async () => {
      let query = supabase.from('v_staffing_clinician_load' as any).select('*');
      if (agencyId) query = query.eq('agency_id', agencyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useStaffingAgencySummary() {
  return useQuery({
    queryKey: ['staffing-agency-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_staffing_agency_summary' as any)
        .select('*');
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useUnstaffedStudents(agencyId?: string) {
  return useQuery({
    queryKey: ['unstaffed-students', agencyId],
    queryFn: async () => {
      let query = supabase.from('v_unstaffed_students' as any).select('*');
      if (agencyId) query = query.eq('agency_id', agencyId);
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useOrgProgramRecommendations() {
  return useQuery({
    queryKey: ['org-program-recommendations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_org_program_recommendations' as any)
        .select('*');
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useSupervisorCaseloadDashboard() {
  return useQuery({
    queryKey: ['supervisor-caseload-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_supervisor_caseload_dashboard' as any)
        .select('*');
      if (error) throw error;
      // Resolve supervisor names
      const userIds = [...new Set((data || []).map((d: any) => d.supervisor_user_id).filter(Boolean))];
      if (userIds.length === 0) return data as any[];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name')
        .in('user_id', userIds);
      const nameMap = new Map((profiles || []).map((p: any) => [
        p.user_id,
        p.display_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown'
      ]));
      return (data || []).map((d: any) => ({
        ...d,
        supervisor_name: nameMap.get(d.supervisor_user_id) || d.supervisor_user_id?.slice(0, 8) + '…',
      })) as any[];
    },
  });
}

export function useStaffingCapacityVsLoad() {
  return useQuery({
    queryKey: ['staffing-capacity-vs-load'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_staffing_capacity_vs_load' as any)
        .select('*');
      if (error) throw error;
      // Resolve staff names
      const userIds = [...new Set((data || []).map((d: any) => d.user_id).filter(Boolean))];
      if (userIds.length === 0) return data as any[];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name')
        .in('user_id', userIds);
      const nameMap = new Map((profiles || []).map((p: any) => [
        p.user_id,
        p.display_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown'
      ]));
      return (data || []).map((d: any) => ({
        ...d,
        staff_name: nameMap.get(d.user_id) || d.user_id?.slice(0, 8) + '…',
      })) as any[];
    },
  });
}

export function useEntityClientCounts() {
  return useQuery({
    queryKey: ['entity-client-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_entity_client_counts' as any)
        .select('*');
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useOrgEntities(entityType?: string) {
  return useQuery({
    queryKey: ['org-entities', entityType],
    queryFn: async () => {
      let query = supabase.from('org_entities' as any).select('*').eq('is_active', true);
      if (entityType) query = query.eq('entity_type', entityType);
      const { data, error } = await query.order('name');
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useStaffingRecommendations() {
  return useQuery({
    queryKey: ['staffing-recommendations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staffing_recommendations' as any)
        .select('*')
        .eq('status', 'open')
        .order('priority', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useProgramRecommendations() {
  return useQuery({
    queryKey: ['program-recommendations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('program_recommendations' as any)
        .select('*')
        .order('priority', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });
}
