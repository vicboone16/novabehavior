import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const db = supabase as any;

export interface SessionNoteDraft {
  id: string;
  session_id: string;
  student_id: string;
  client_id: string;
  note_type: string;
  subjective_text: string | null;
  objective_text: string | null;
  assessment_text: string | null;
  plan_text: string | null;
  auto_summary_json: any;
  include_auto_data: boolean;
}

export interface SessionAutoData {
  session_id: string;
  student_id: string;
  skill_trial_count: number;
  behavior_data_count: number;
  abc_event_count: number;
  context_event_count: number;
  session_summary_json: any;
}

export function useSessionNoteDraft() {
  const { user } = useAuth();
  const [draft, setDraft] = useState<SessionNoteDraft | null>(null);
  const [autoData, setAutoData] = useState<SessionAutoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadAutoData = useCallback(async (sessionId: string) => {
    try {
      const { data, error } = await db
        .from('v_session_note_auto_data')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();
      if (error) throw error;
      setAutoData(data as SessionAutoData | null);
      return data as SessionAutoData | null;
    } catch (err: any) {
      console.error('[SessionAutoData] Error:', err);
      return null;
    }
  }, []);

  const seedDraft = useCallback(async (sessionId: string, noteType: string = 'soap') => {
    setLoading(true);
    try {
      const { data, error } = await db.rpc('seed_session_note_draft', {
        p_session_id: sessionId,
        p_note_type: noteType,
        p_created_by: user?.id || null,
      });
      if (error) throw error;
      // Load the created draft
      const draftId = data as string;
      if (draftId) {
        const { data: draftData } = await db
          .from('session_note_drafts')
          .select('*')
          .eq('id', draftId)
          .single();
        if (draftData) setDraft(draftData as SessionNoteDraft);
      }
      return draftId;
    } catch (err: any) {
      console.error('[SeedDraft] Error:', err);
      toast.error('Failed to create note draft');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadDraft = useCallback(async (sessionId: string) => {
    setLoading(true);
    try {
      const { data, error } = await db
        .from('session_note_drafts')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      setDraft(data as SessionNoteDraft | null);
      return data as SessionNoteDraft | null;
    } catch (err: any) {
      console.error('[LoadDraft] Error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveDraft = useCallback(async (updates: Partial<SessionNoteDraft>) => {
    if (!draft) return;
    setSaving(true);
    try {
      const { error } = await db
        .from('session_note_drafts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', draft.id);
      if (error) throw error;
      setDraft(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Draft saved');
    } catch (err: any) {
      toast.error('Failed to save draft');
    } finally {
      setSaving(false);
    }
  }, [draft]);

  return {
    draft,
    autoData,
    loading,
    saving,
    loadAutoData,
    seedDraft,
    loadDraft,
    saveDraft,
  };
}
