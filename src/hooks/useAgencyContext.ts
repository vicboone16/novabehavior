import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface Agency {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  logo_url: string | null;
  coverage_mode: string;
}

export interface AgencyMembership {
  id: string;
  agency_id: string;
  role: string;
  is_primary: boolean;
  status: string;
  agency: Agency;
}

export interface AgencyContext {
  currentAgency: Agency | null;
  agencies: AgencyMembership[];
  loading: boolean;
  switchAgency: (agencyId: string) => Promise<boolean>;
  refreshAgencies: () => Promise<void>;
  isAgencyAdmin: boolean;
  isAgencyOwner: boolean;
}

export function useAgencyContext(): AgencyContext {
  const { user } = useAuth();
  const [currentAgency, setCurrentAgency] = useState<Agency | null>(null);
  const [agencies, setAgencies] = useState<AgencyMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAgencyAdmin, setIsAgencyAdmin] = useState(false);
  const [isAgencyOwner, setIsAgencyOwner] = useState(false);

  const fetchAgencies = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch user's agency memberships
      const { data: memberships, error: membershipError } = await supabase
        .from('agency_memberships')
        .select(`
          id,
          agency_id,
          role,
          is_primary,
          status,
          agency:agencies(id, name, slug, status, logo_url, coverage_mode)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (membershipError) throw membershipError;

      const typedMemberships = (memberships || []).map(m => ({
        ...m,
        agency: m.agency as unknown as Agency
      })) as AgencyMembership[];

      setAgencies(typedMemberships);

      // Get current agency context
      const { data: context } = await supabase
        .from('user_agency_context')
        .select('current_agency_id')
        .eq('user_id', user.id)
        .maybeSingle();

      // Determine current agency
      let activeAgency: Agency | null = null;
      let activeMembership: AgencyMembership | null = null;

      if (context?.current_agency_id) {
        activeMembership = typedMemberships.find(m => m.agency_id === context.current_agency_id) || null;
      }
      
      if (!activeMembership) {
        // Fall back to primary agency
        activeMembership = typedMemberships.find(m => m.is_primary) || typedMemberships[0] || null;
      }

      if (activeMembership) {
        activeAgency = activeMembership.agency;
        setIsAgencyAdmin(activeMembership.role === 'admin' || activeMembership.role === 'owner');
        setIsAgencyOwner(activeMembership.role === 'owner');
      }

      setCurrentAgency(activeAgency);
    } catch (error) {
      console.error('Error fetching agency context:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAgencies();
  }, [fetchAgencies]);

  const switchAgency = async (agencyId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase.rpc('switch_agency', {
        _user_id: user.id,
        _agency_id: agencyId
      });

      if (error) throw error;

      // Refresh to get new context
      await fetchAgencies();
      return true;
    } catch (error) {
      console.error('Error switching agency:', error);
      return false;
    }
  };

  return {
    currentAgency,
    agencies,
    loading,
    switchAgency,
    refreshAgencies: fetchAgencies,
    isAgencyAdmin,
    isAgencyOwner,
  };
}
