import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/* ── Types ── */

export interface ClientLibraryAssignment {
  id: string;
  client_id: string;
  library_key: string;
  status: string;
  assigned_by: string | null;
  assigned_at: string | null;
  notes: string | null;
}

export interface ClientGoalDraft {
  id: string;
  client_id: string;
  source_library_key: string | null;
  source_goal_id: string | null;
  source_assessment_id: string | null;
  domain_key: string | null;
  subdomain_key: string | null;
  draft_goal_title: string;
  draft_goal_text: string | null;
  draft_objectives: any;
  draft_notes: string | null;
  recommendation_source: string | null;
  status: string | null;
  created_by: string | null;
  created_at: string | null;
}

/* ── Client Library Assignments ── */

export function useClientLibraryAssignments(clientId?: string) {
  return useQuery({
    queryKey: ['client-library-assignments', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_library_assignments')
        .select('*')
        .eq('client_id', clientId!)
        .order('assigned_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClientLibraryAssignment[];
    },
  });
}

export function useAssignLibrary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { clientId: string; libraryKey: string; notes?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('client_library_assignments')
        .insert({
          client_id: params.clientId,
          library_key: params.libraryKey,
          status: 'active',
          assigned_by: user.user?.id ?? null,
          notes: params.notes ?? null,
        });
      if (error) throw error;
    },
    onSuccess: (_, params) => {
      qc.invalidateQueries({ queryKey: ['client-library-assignments', params.clientId] });
      toast.success('Library assigned to client');
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useRemoveLibraryAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; clientId: string }) => {
      const { error } = await supabase
        .from('client_library_assignments')
        .delete()
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: (_, params) => {
      qc.invalidateQueries({ queryKey: ['client-library-assignments', params.clientId] });
      toast.success('Library assignment removed');
    },
    onError: (err: any) => toast.error(err.message),
  });
}

/* ── Client Goal Drafts ── */

export function useClientGoalDrafts(clientId?: string) {
  return useQuery({
    queryKey: ['client-goal-drafts', clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_goal_drafts')
        .select('*')
        .eq('client_id', clientId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClientGoalDraft[];
    },
  });
}

export function useCreateGoalDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      clientId: string;
      sourceLibraryKey: string;
      sourceGoalId: string;
      domainKey?: string;
      subdomainKey?: string;
      draftGoalTitle: string;
      draftGoalText?: string;
      draftObjectives?: any;
      recommendationSource?: string;
      draftNotes?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('client_goal_drafts')
        .insert({
          client_id: params.clientId,
          source_library_key: params.sourceLibraryKey,
          source_goal_id: params.sourceGoalId,
          domain_key: params.domainKey ?? null,
          subdomain_key: params.subdomainKey ?? null,
          draft_goal_title: params.draftGoalTitle,
          draft_goal_text: params.draftGoalText ?? null,
          draft_objectives: params.draftObjectives ?? null,
          recommendation_source: params.recommendationSource ?? 'library_browser',
          draft_notes: params.draftNotes ?? null,
          status: 'draft',
          created_by: user.user?.id ?? null,
        });
      if (error) throw error;
    },
    onSuccess: (_, params) => {
      qc.invalidateQueries({ queryKey: ['client-goal-drafts', params.clientId] });
      toast.success('Goal draft created');
    },
    onError: (err: any) => toast.error(err.message),
  });
}

export function useUpdateGoalDraftStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; clientId: string; status: string }) => {
      const { error } = await supabase
        .from('client_goal_drafts')
        .update({ status: params.status, updated_at: new Date().toISOString() })
        .eq('id', params.id);
      if (error) throw error;
    },
    onSuccess: (_, params) => {
      qc.invalidateQueries({ queryKey: ['client-goal-drafts', params.clientId] });
      toast.success(`Draft ${params.status}`);
    },
    onError: (err: any) => toast.error(err.message),
  });
}
