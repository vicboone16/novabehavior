import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useInterventionEffectiveness(clientId?: string, agencyId?: string) {
  const queryClient = useQueryClient();

  // Client-level effectiveness for all runs
  const clientEffectiveness = useQuery({
    queryKey: ['intervention-effectiveness', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_client_intervention_effectiveness' as any)
        .select('*')
        .eq('client_id', clientId!);
      if (error) throw error;
      return data;
    },
  });

  // Enriched recommendations with effectiveness data
  const enrichedRecs = useQuery({
    queryKey: ['enriched-intervention-recs', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('enrich_intervention_recs_with_effectiveness', {
        p_client_id: clientId!,
      });
      if (error) throw error;
      return data;
    },
  });

  // Compute outcomes for a specific run
  const computeOutcomes = useMutation({
    mutationFn: async ({ runId }: { runId: string }) => {
      const { data, error } = await supabase.rpc('compute_intervention_outcomes', {
        p_run_id: runId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['intervention-effectiveness', clientId] });
      toast.success(`Computed ${count} outcome metrics`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Batch compute all outcomes for agency
  const computeAllOutcomes = useMutation({
    mutationFn: async () => {
      if (!agencyId) throw new Error('Agency ID required');
      const { data, error } = await supabase.rpc('compute_all_intervention_outcomes', {
        p_agency_id: agencyId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['intervention-effectiveness'] });
      toast.success(`Computed ${count} outcome metrics across all active runs`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Intervention-level summary
  const interventionSummary = useQuery({
    queryKey: ['intervention-effectiveness-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_intervention_effectiveness_summary' as any)
        .select('*')
        .order('effectiveness_rate_percent', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Pattern-level summary
  const patternSummary = useQuery({
    queryKey: ['intervention-profile-patterns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_intervention_profile_patterns' as any)
        .select('*')
        .gte('total_runs', 2)
        .order('effectiveness_rate_percent', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return {
    clientEffectiveness,
    enrichedRecs,
    computeOutcomes,
    computeAllOutcomes,
    interventionSummary,
    patternSummary,
  };
}
