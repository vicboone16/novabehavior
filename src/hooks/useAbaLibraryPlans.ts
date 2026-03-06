import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useAbaLibraryPlans(clientId?: string, agencyId?: string) {
  const queryClient = useQueryClient();

  // Fetch client intervention plans
  const plans = useQuery({
    queryKey: ['client-intervention-plans', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_intervention_plans')
        .select('*, client_intervention_plan_items(*)')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Clone a plan template to client
  const cloneTemplate = useMutation({
    mutationFn: async ({ templateId }: { templateId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase.rpc('aba_apply_template_to_client_plan', {
        p_template_id: templateId,
        p_client_id: clientId!,
        p_agency_id: agencyId!,
        p_created_by: user.id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-intervention-plans', clientId] });
      toast.success('Plan template applied to client');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Publish a plan item
  const publishItem = useMutation({
    mutationFn: async ({
      planItemId,
      targetPortal = 'both',
      dataCollectionMode = 'fyi',
    }: {
      planItemId: string;
      targetPortal?: string;
      dataCollectionMode?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase.rpc('publish_plan_item', {
        p_plan_item_id: planItemId,
        p_published_by: user.id,
        p_target_portal: targetPortal,
        p_data_collection_mode: dataCollectionMode,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Plan item published to recipients');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Request data collection (recipient action)
  const requestDataCollection = useMutation({
    mutationFn: async ({ publishId }: { publishId: string }) => {
      const { error } = await supabase.rpc('request_data_collection', {
        p_publish_id: publishId,
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success('Data collection request sent'),
    onError: (err: Error) => toast.error(err.message),
  });

  // Approve/deny data collection (BCBA action)
  const approveDataCollection = useMutation({
    mutationFn: async ({
      publishId,
      recipientUserId,
      approved = true,
    }: {
      publishId: string;
      recipientUserId: string;
      approved?: boolean;
    }) => {
      const { error } = await supabase.rpc('approve_data_collection', {
        p_publish_id: publishId,
        p_recipient_user_id: recipientUserId,
        p_approved: approved,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => toast.success(vars.approved ? 'Data collection approved' : 'Data collection declined'),
    onError: (err: Error) => toast.error(err.message),
  });

  // Refresh intervention recommendations (enhanced with detailed reasons_json)
  const refreshRecommendations = useMutation({
    mutationFn: async () => {
      if (!agencyId) throw new Error('Agency ID required');
      const { data, error } = await supabase.rpc('refresh_ci_intervention_recs', {
        p_agency_id: agencyId,
        p_client_id: clientId || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['aba-top-matches', clientId] });
      toast.success(`Refreshed ${count} intervention recommendations`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Top matches for a client
  const topMatches = useQuery({
    queryKey: ['aba-top-matches', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('aba_library_top_matches_v2', {
        p_client_id: clientId!,
      });
      if (error) throw error;
      return data;
    },
  });

  return {
    plans,
    cloneTemplate,
    publishItem,
    requestDataCollection,
    approveDataCollection,
    refreshRecommendations,
    topMatches,
  };
}
