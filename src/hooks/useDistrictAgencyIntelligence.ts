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
