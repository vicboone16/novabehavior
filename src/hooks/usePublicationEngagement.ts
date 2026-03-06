import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function usePublicationEngagement(publicationId?: string) {
  const queryClient = useQueryClient();

  // Acknowledge a publication
  const acknowledge = useMutation({
    mutationFn: async ({ reaction }: { reaction?: string } = {}) => {
      if (!publicationId) throw new Error('Publication ID required');
      const { data, error } = await supabase.rpc('acknowledge_publication', {
        p_publication_id: publicationId,
        p_reaction: reaction ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publication-engagement', publicationId] });
      toast.success('Acknowledged');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Add comment
  const addComment = useMutation({
    mutationFn: async ({ body, parentCommentId }: { body: string; parentCommentId?: string }) => {
      if (!publicationId) throw new Error('Publication ID required');
      const { data, error } = await supabase.rpc('add_publication_comment', {
        p_publication_id: publicationId,
        p_body: body,
        p_parent_comment_id: parentCommentId ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publication-comments', publicationId] });
      toast.success('Comment added');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Revoke data collection (BCBA)
  const revokeDataCollection = useMutation({
    mutationFn: async ({ publishId, recipientUserId }: { publishId: string; recipientUserId: string }) => {
      const { error } = await supabase.rpc('revoke_data_collection', {
        p_publish_id: publishId,
        p_recipient_user_id: recipientUserId,
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success('Data collection revoked'),
    onError: (err: Error) => toast.error(err.message),
  });

  // Fetch comments for a publication
  const comments = useQuery({
    queryKey: ['publication-comments', publicationId],
    enabled: !!publicationId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('publication_comments')
        .select('*')
        .eq('publication_id', publicationId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch acknowledgements
  const acknowledgements = useQuery({
    queryKey: ['publication-acks', publicationId],
    enabled: !!publicationId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('publication_acknowledgements')
        .select('*')
        .eq('publication_id', publicationId!);
      if (error) throw error;
      return data;
    },
  });

  return {
    acknowledge,
    addComment,
    revokeDataCollection,
    comments,
    acknowledgements,
  };
}
