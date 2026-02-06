import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { ClearinghouseSubmission, ClaimSubmissionHistory } from '@/types/clearinghouse';

export function useClearinghouse() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<ClearinghouseSubmission[]>([]);
  const [claimHistory, setClaimHistory] = useState<ClaimSubmissionHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('clearinghouse_submissions').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setSubmissions((data || []) as unknown as ClearinghouseSubmission[]);
    } catch (err: any) {
      toast.error('Failed to load submissions: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchClaimHistory = useCallback(async (claimId?: string) => {
    let query = supabase.from('claim_submission_history').select('*').order('created_at', { ascending: false });
    if (claimId) query = query.eq('claim_id', claimId);
    const { data, error } = await query;
    if (error) throw error;
    setClaimHistory((data || []) as unknown as ClaimSubmissionHistory[]);
    return data as unknown as ClaimSubmissionHistory[];
  }, []);

  const createSubmission = useCallback(async (submission: Partial<ClearinghouseSubmission>) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('clearinghouse_submissions')
      .insert({ ...submission, submitted_by: user.id } as any)
      .select()
      .single();
    if (error) throw error;
    toast.success('Submission batch created');
    return data as unknown as ClearinghouseSubmission;
  }, [user]);

  const updateSubmission = useCallback(async (id: string, updates: Partial<ClearinghouseSubmission>) => {
    const { error } = await supabase.from('clearinghouse_submissions').update(updates as any).eq('id', id);
    if (error) throw error;
  }, []);

  const addClaimToHistory = useCallback(async (entry: Partial<ClaimSubmissionHistory>) => {
    const { data, error } = await supabase.from('claim_submission_history').insert(entry as any).select().single();
    if (error) throw error;
    return data as unknown as ClaimSubmissionHistory;
  }, []);

  return {
    submissions, claimHistory, isLoading,
    fetchSubmissions, fetchClaimHistory, createSubmission, updateSubmission, addClaimToHistory,
  };
}
