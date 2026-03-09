import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useAdvancedDesignAccess() {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    const check = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('v_advanced_design_analysis_access')
          .select('has_access')
          .eq('user_id', user.id)
          .eq('feature_key', 'advanced_design_analysis')
          .maybeSingle();

        if (error) throw error;
        setHasAccess(data?.has_access === true);
      } catch (err) {
        console.error('[AdvancedDesignAccess] Check error:', err);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, [user]);

  return { hasAccess, loading };
}
