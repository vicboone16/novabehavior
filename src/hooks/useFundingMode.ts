import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FundingMode } from '@/components/funding';
import { toast } from 'sonner';

interface UseFundingModeResult {
  fundingMode: FundingMode;
  setFundingMode: (mode: FundingMode) => Promise<void>;
  hasActivePayer: boolean;
  hasActiveAuth: boolean;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useFundingMode(studentId: string | undefined): UseFundingModeResult {
  const [fundingMode, setFundingModeState] = useState<FundingMode>('school_based');
  const [hasActivePayer, setHasActivePayer] = useState(false);
  const [hasActiveAuth, setHasActiveAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!studentId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch student funding mode
      const { data: student } = await supabase
        .from('students')
        .select('funding_mode')
        .eq('id', studentId)
        .single();

      if (student) {
        setFundingModeState((student.funding_mode as FundingMode) || 'school_based');
      }

      // Check for active payers
      const { data: payers, count: payerCount } = await supabase
        .from('client_payers')
        .select('id', { count: 'exact' })
        .eq('student_id', studentId)
        .eq('is_active', true)
        .limit(1);

      setHasActivePayer((payerCount ?? 0) > 0);

      // Check for active authorizations
      const today = new Date().toISOString().split('T')[0];
      const { data: auths, count: authCount } = await supabase
        .from('authorizations')
        .select('id', { count: 'exact' })
        .eq('student_id', studentId)
        .eq('status', 'active')
        .gte('end_date', today)
        .limit(1);

      setHasActiveAuth((authCount ?? 0) > 0);
    } catch (error) {
      console.error('Error fetching funding mode:', error);
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setFundingMode = async (mode: FundingMode) => {
    if (!studentId) return;

    try {
      const { error } = await supabase
        .from('students')
        .update({ funding_mode: mode })
        .eq('id', studentId);

      if (error) throw error;

      setFundingModeState(mode);
      toast.success(`Funding mode set to ${mode === 'school_based' ? 'School-Based' : 'Insurance'}`);
    } catch (error) {
      console.error('Error updating funding mode:', error);
      toast.error('Failed to update funding mode');
    }
  };

  return {
    fundingMode,
    setFundingMode,
    hasActivePayer,
    hasActiveAuth,
    isLoading,
    refetch: fetchData,
  };
}
