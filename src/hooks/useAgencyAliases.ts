import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AgencyAlias {
  id: string;
  agency_id: string;
  user_id: string;
  agency_username: string;
  created_at: string;
  updated_at: string;
}

export function useAgencyAliases() {
  const { user } = useAuth();
  const [aliases, setAliases] = useState<AgencyAlias[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMyAliases = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('agency_user_aliases')
        .select('*')
        .eq('user_id', user.id);
      if (error) throw error;
      setAliases((data || []) as unknown as AgencyAlias[]);
    } catch (err: any) {
      console.error('Error fetching aliases:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const setAlias = useCallback(async (agencyId: string, suffix: string) => {
    try {
      const { data, error } = await supabase.rpc('set_agency_alias', {
        _agency_id: agencyId,
        _suffix: suffix,
      });
      if (error) throw error;
      const result = data as any;
      if (!result.success) {
        toast.error(result.error);
        return null;
      }
      toast.success(`Alias set: ${result.agency_username}`);
      await fetchMyAliases();
      return result.agency_username as string;
    } catch (err: any) {
      toast.error('Failed to set alias: ' + err.message);
      return null;
    }
  }, [fetchMyAliases]);

  const getAliasForAgency = useCallback((agencyId: string) => {
    return aliases.find(a => a.agency_id === agencyId)?.agency_username || null;
  }, [aliases]);

  return { aliases, loading, fetchMyAliases, setAlias, getAliasForAgency };
}
