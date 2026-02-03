import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FundingMode, InsuranceTrackingState } from '@/components/funding/FundingModeToggle';
import { toast } from 'sonner';

interface UseFundingModeResult {
  fundingMode: FundingMode;
  insuranceTrackingState: InsuranceTrackingState;
  setFundingMode: (mode: FundingMode) => Promise<void>;
  hasActivePayer: boolean;
  hasActiveAuth: boolean;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useFundingMode(studentId: string | undefined): UseFundingModeResult {
  const [fundingMode, setFundingModeState] = useState<FundingMode>('school_based');
  const [insuranceTrackingState, setInsuranceTrackingState] = useState<InsuranceTrackingState>(null);
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
      // Fetch student funding mode and tracking state
      const { data: student } = await supabase
        .from('students')
        .select('funding_mode, insurance_tracking_state')
        .eq('id', studentId)
        .single();

      if (student) {
        setFundingModeState((student.funding_mode as FundingMode) || 'school_based');
        setInsuranceTrackingState((student.insurance_tracking_state as InsuranceTrackingState) || null);
      }

      // Check for active payers
      const { count: payerCount } = await supabase
        .from('client_payers')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('is_active', true);

      setHasActivePayer((payerCount ?? 0) > 0);

      // Check for active authorizations
      const today = new Date().toISOString().split('T')[0];
      const { count: authCount } = await supabase
        .from('authorizations')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('status', 'active')
        .gte('end_date', today);

      setHasActiveAuth((authCount ?? 0) > 0);

      // Update insurance_tracking_state based on actual data
      if (student?.funding_mode === 'insurance') {
        const isComplete = (payerCount ?? 0) > 0 && (authCount ?? 0) > 0;
        const newState: InsuranceTrackingState = isComplete ? 'active' : 'incomplete';
        
        if (newState !== student.insurance_tracking_state) {
          await supabase
            .from('students')
            .update({ insurance_tracking_state: newState })
            .eq('id', studentId);
          setInsuranceTrackingState(newState);
        }
      }
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
      
      // Refetch to update tracking state
      await fetchData();
    } catch (error) {
      console.error('Error updating funding mode:', error);
      toast.error('Failed to update funding mode');
    }
  };

  return {
    fundingMode,
    insuranceTrackingState,
    setFundingMode,
    hasActivePayer,
    hasActiveAuth,
    isLoading,
    refetch: fetchData,
  };
}
