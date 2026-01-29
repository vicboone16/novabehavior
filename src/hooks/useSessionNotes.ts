import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { 
  EnhancedSessionNote, 
  NoteTemplate, 
  NoteVersion,
  SupervisorReview,
  NoteStatus,
  PulledDataSnapshot,
  NoteTemplateField,
} from '@/types/sessionNotes';

function getDisplayName(profile?: { 
  display_name?: string | null; 
  first_name?: string | null; 
  last_name?: string | null 
}) {
  if (!profile) return 'Unknown';
  if (profile.display_name) return profile.display_name;
  if (profile.first_name && profile.last_name) return `${profile.first_name} ${profile.last_name[0]}.`;
  if (profile.first_name) return profile.first_name;
  return 'Unknown';
}

export function useSessionNotes(studentId?: string) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<EnhancedSessionNote[]>([]);
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('enhanced_session_notes')
        .select('*')
        .eq('student_id', studentId)
        .order('start_time', { ascending: false });

      if (error) throw error;

      const authorIds = [...new Set(data?.map(n => n.author_user_id) || [])];
      const { data: profiles } = authorIds.length > 0
        ? await supabase.from('profiles').select('user_id, display_name, first_name, last_name').in('user_id', authorIds)
        : { data: [] };

      const enrichedNotes = data?.map(note => ({
        ...note,
        author_name: getDisplayName(profiles?.find(p => p.user_id === note.author_user_id)),
        pulled_data_snapshot: note.pulled_data_snapshot as unknown as PulledDataSnapshot | null,
        note_content: (note.note_content || {}) as Record<string, unknown>,
      })) || [];

      setNotes(enrichedNotes as EnhancedSessionNote[]);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast({ title: 'Error', description: 'Failed to load session notes.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const fetchTemplates = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('note_templates').select('*').eq('is_active', true).order('note_type');
      if (error) throw error;
      setTemplates((data || []).map(t => ({ ...t, template_fields: (t.template_fields || []) as unknown as NoteTemplateField[] })) as NoteTemplate[]);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  }, []);

  useEffect(() => { fetchNotes(); fetchTemplates(); }, [fetchNotes, fetchTemplates]);

  const createNote = async (noteData: Partial<EnhancedSessionNote>) => {
    if (!user || !studentId) return null;
    try {
      const insertData = {
        student_id: studentId,
        author_user_id: user.id,
        note_type: noteData.note_type || 'therapist',
        subtype: noteData.subtype,
        author_role: noteData.author_role || 'RBT',
        session_id: noteData.session_id,
        start_time: noteData.start_time || new Date().toISOString(),
        end_time: noteData.end_time,
        duration_minutes: noteData.duration_minutes,
        service_setting: noteData.service_setting || 'school',
        location_detail: noteData.location_detail,
        auto_pull_enabled: noteData.auto_pull_enabled ?? true,
        pulled_data_snapshot: noteData.pulled_data_snapshot ? JSON.parse(JSON.stringify(noteData.pulled_data_snapshot)) : null,
        note_content: noteData.note_content ? JSON.parse(JSON.stringify(noteData.note_content)) : {},
        status: noteData.status || 'draft',
        billable: noteData.billable ?? true,
        clinician_signature_name: noteData.clinician_signature_name,
        credential: noteData.credential,
      };
      const { data, error } = await supabase.from('enhanced_session_notes').insert([insertData]).select().single();
      if (error) throw error;
      toast({ title: 'Note Created', description: 'Session note has been created.' });
      await fetchNotes();
      return data;
    } catch (error) {
      console.error('Error creating note:', error);
      toast({ title: 'Error', description: 'Failed to create note.', variant: 'destructive' });
      return null;
    }
  };

  const updateNote = async (noteId: string, updates: Partial<EnhancedSessionNote>, editReason?: string) => {
    if (!user) return false;
    try {
      const currentNote = notes.find(n => n.id === noteId);
      if (!currentNote) return false;

      if (editReason || currentNote.status !== 'draft') {
        await supabase.from('note_versions').insert([{
          note_id: noteId, version_number: 1, edited_by: user.id, edit_reason: editReason,
          changes_summary: 'Updated note content', 
          previous_content: JSON.parse(JSON.stringify(currentNote.note_content)),
          previous_status: currentNote.status,
        }]);
      }

      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (updates.note_content !== undefined) updateData.note_content = updates.note_content;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.submitted_at !== undefined) updateData.submitted_at = updates.submitted_at;
      if (updates.locked_at !== undefined) updateData.locked_at = updates.locked_at;
      if (updates.locked_by !== undefined) updateData.locked_by = updates.locked_by;

      const { error } = await supabase.from('enhanced_session_notes').update(updateData).eq('id', noteId);
      if (error) throw error;
      toast({ title: 'Note Updated', description: 'Session note has been updated.' });
      await fetchNotes();
      return true;
    } catch (error) {
      console.error('Error updating note:', error);
      toast({ title: 'Error', description: 'Failed to update note.', variant: 'destructive' });
      return false;
    }
  };

  const submitNote = async (noteId: string) => updateNote(noteId, { status: 'submitted' as NoteStatus, submitted_at: new Date().toISOString() });
  const lockNote = async (noteId: string) => { if (!user) return false; return updateNote(noteId, { status: 'locked' as NoteStatus, locked_at: new Date().toISOString(), locked_by: user.id }); };

  const deleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase.from('enhanced_session_notes').delete().eq('id', noteId);
      if (error) throw error;
      toast({ title: 'Note Deleted', description: 'Session note has been deleted.' });
      await fetchNotes();
      return true;
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({ title: 'Error', description: 'Failed to delete note.', variant: 'destructive' });
      return false;
    }
  };

  const getVersionHistory = async (noteId: string): Promise<NoteVersion[]> => {
    try {
      const { data, error } = await supabase.from('note_versions').select('*').eq('note_id', noteId).order('version_number', { ascending: false });
      if (error) throw error;
      return (data || []).map(version => ({ ...version, previous_content: (version.previous_content || {}) as Record<string, unknown> })) as NoteVersion[];
    } catch (error) {
      console.error('Error fetching version history:', error);
      return [];
    }
  };

  return { notes, templates, loading, createNote, updateNote, submitNote, lockNote, deleteNote, getVersionHistory, refreshNotes: fetchNotes };
}

export function useSupervisorReviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<SupervisorReview[]>([]);
  const [pendingNotes, setPendingNotes] = useState<EnhancedSessionNote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const { data: notesData, error: notesError } = await supabase.from('enhanced_session_notes').select('*').eq('status', 'submitted').order('submitted_at', { ascending: false });
      if (notesError) throw notesError;
      const { data: reviewsData, error: reviewsError } = await supabase.from('supervisor_reviews').select('*').order('review_date', { ascending: false });
      if (reviewsError) throw reviewsError;

      const studentIds = [...new Set(notesData?.map(n => n.student_id) || [])];
      const userIds = [...new Set([...(notesData?.map(n => n.author_user_id) || []), ...(reviewsData?.map(r => r.reviewer_user_id) || [])])];

      const { data: students } = studentIds.length > 0 ? await supabase.from('students').select('id, name').in('id', studentIds) : { data: [] };
      const { data: profiles } = userIds.length > 0 ? await supabase.from('profiles').select('user_id, display_name, first_name, last_name').in('user_id', userIds) : { data: [] };

      const enrichedNotes = notesData?.map(note => ({
        ...note, student_name: students?.find(s => s.id === note.student_id)?.name,
        author_name: getDisplayName(profiles?.find(p => p.user_id === note.author_user_id)),
        pulled_data_snapshot: note.pulled_data_snapshot as unknown as PulledDataSnapshot | null,
        note_content: (note.note_content || {}) as Record<string, unknown>,
      })) || [];

      const enrichedReviews = reviewsData?.map(review => ({
        ...review, student_name: students?.find(s => s.id === review.student_id)?.name,
        author_name: getDisplayName(profiles?.find(p => p.user_id === review.author_user_id)),
        reviewer_name: getDisplayName(profiles?.find(p => p.user_id === review.reviewer_user_id)),
      })) || [];

      setPendingNotes(enrichedNotes as EnhancedSessionNote[]);
      setReviews(enrichedReviews as SupervisorReview[]);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast({ title: 'Error', description: 'Failed to load reviews.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const createReview = async (reviewData: Partial<SupervisorReview>) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase.from('supervisor_reviews').insert([{
        note_id: reviewData.note_id, student_id: reviewData.student_id, author_user_id: reviewData.author_user_id,
        reviewer_user_id: user.id, review_outcome: reviewData.review_outcome || 'pending', comments: reviewData.comments,
        required_action: reviewData.required_action, action_notes: reviewData.action_notes,
      }]).select().single();
      if (error) throw error;
      toast({ title: 'Review Submitted', description: 'Your review has been recorded.' });
      await fetchReviews();
      return data;
    } catch (error) {
      console.error('Error creating review:', error);
      toast({ title: 'Error', description: 'Failed to submit review.', variant: 'destructive' });
      return null;
    }
  };

  const updateReview = async (reviewId: string, updates: Partial<SupervisorReview>) => {
    try {
      const { error } = await supabase.from('supervisor_reviews').update({
        review_outcome: updates.review_outcome, comments: updates.comments, required_action: updates.required_action,
        action_notes: updates.action_notes, action_completed: updates.action_completed, action_completed_at: updates.action_completed_at,
      }).eq('id', reviewId);
      if (error) throw error;
      toast({ title: 'Review Updated', description: 'Review has been updated.' });
      await fetchReviews();
      return true;
    } catch (error) {
      console.error('Error updating review:', error);
      toast({ title: 'Error', description: 'Failed to update review.', variant: 'destructive' });
      return false;
    }
  };

  return { reviews, pendingNotes, loading, createReview, updateReview, refreshReviews: fetchReviews };
}
