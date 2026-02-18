import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export type NoteFormat = 'regular' | 'soap';
export type StaffNoteStatus = 'draft' | 'approved';

export interface SessionStaffNote {
  id: string;
  session_id: string;
  student_id: string;
  author_user_id: string;
  author_name?: string;
  note_format: NoteFormat;
  // Regular
  note_text?: string;
  // SOAP
  soap_subjective?: string;
  soap_objective?: string;
  soap_assessment?: string;
  soap_plan?: string;
  // Status
  status: StaffNoteStatus;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export function useSessionStaffNotes(sessionId?: string | null, studentId?: string | null) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<SessionStaffNote[]>([]);
  const [myNote, setMyNote] = useState<SessionStaffNote | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchNotes = useCallback(async () => {
    if (!sessionId || !studentId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('session_staff_notes')
        .select('*')
        .eq('session_id', sessionId)
        .eq('student_id', studentId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const mapped = (data || []) as SessionStaffNote[];
      setNotes(mapped);
      const mine = mapped.find(n => n.author_user_id === user?.id) || null;
      setMyNote(mine);
    } catch (err) {
      console.error('Error fetching session staff notes:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId, studentId, user?.id]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Upsert the current user's note for this session+student
  const saveNote = useCallback(async (payload: {
    note_format: NoteFormat;
    note_text?: string;
    soap_subjective?: string;
    soap_objective?: string;
    soap_assessment?: string;
    soap_plan?: string;
  }) => {
    if (!user || !sessionId || !studentId) return null;
    setSaving(true);
    try {
      // Get display name from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('display_name, first_name, last_name')
        .eq('user_id', user.id)
        .maybeSingle();

      const authorName = profileData?.display_name ||
        (profileData?.first_name && profileData?.last_name
          ? `${profileData.first_name} ${profileData.last_name[0]}.`
          : profileData?.first_name) ||
        user.email?.split('@')[0] || 'Unknown';

      if (myNote) {
        // Update existing
        const { data, error } = await supabase
          .from('session_staff_notes')
          .update({ ...payload, author_name: authorName, status: 'draft', approved_at: null })
          .eq('id', myNote.id)
          .select()
          .single();
        if (error) throw error;
        const updated = data as SessionStaffNote;
        setMyNote(updated);
        setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
        return updated;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('session_staff_notes')
          .insert([{
            session_id: sessionId,
            student_id: studentId,
            author_user_id: user.id,
            author_name: authorName,
            ...payload,
            status: 'draft',
          }])
          .select()
          .single();
        if (error) throw error;
        const inserted = data as SessionStaffNote;
        setMyNote(inserted);
        setNotes(prev => [...prev, inserted]);
        return inserted;
      }
    } catch (err) {
      console.error('Error saving session staff note:', err);
      toast({ title: 'Error', description: 'Failed to save note.', variant: 'destructive' });
      return null;
    } finally {
      setSaving(false);
    }
  }, [user, sessionId, studentId, myNote]);

  const approveNote = useCallback(async () => {
    if (!myNote) return false;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('session_staff_notes')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', myNote.id)
        .select()
        .single();
      if (error) throw error;
      const updated = data as SessionStaffNote;
      setMyNote(updated);
      setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
      toast({ title: 'Note Approved', description: 'Your session note has been approved.' });
      return true;
    } catch (err) {
      console.error('Error approving note:', err);
      toast({ title: 'Error', description: 'Failed to approve note.', variant: 'destructive' });
      return false;
    } finally {
      setSaving(false);
    }
  }, [myNote]);

  const unapproveNote = useCallback(async () => {
    if (!myNote) return false;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('session_staff_notes')
        .update({ status: 'draft', approved_at: null })
        .eq('id', myNote.id)
        .select()
        .single();
      if (error) throw error;
      const updated = data as SessionStaffNote;
      setMyNote(updated);
      setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
      return true;
    } catch (err) {
      console.error('Error unapproving note:', err);
      return false;
    } finally {
      setSaving(false);
    }
  }, [myNote]);

  return { notes, myNote, loading, saving, saveNote, approveNote, unapproveNote, refresh: fetchNotes };
}
