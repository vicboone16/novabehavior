import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  IEPMeetingPrep, 
  DataSummary, 
  GoalProgress, 
  Recommendation,
  DocumentCheckItem,
  Attendee,
  DEFAULT_DOCUMENTS_CHECKLIST 
} from '@/types/iepMeeting';

export function useIEPMeetingPrep(studentId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preps, setPreps] = useState<IEPMeetingPrep[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPreps = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      let query = supabase
        .from('iep_meeting_preps')
        .select('*')
        .eq('created_by', user.id)
        .order('meeting_date', { ascending: false });

      if (studentId) {
        query = query.eq('student_id', studentId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPreps((data || []) as unknown as IEPMeetingPrep[]);
    } catch (error) {
      console.error('Error fetching IEP meeting preps:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, studentId]);

  useEffect(() => {
    fetchPreps();
  }, [fetchPreps]);

  const createPrep = async (prep: {
    student_id: string;
    meeting_date: string;
    meeting_type: string;
    attendees?: Attendee[];
  }) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('iep_meeting_preps')
        .insert({
          student_id: prep.student_id,
          meeting_date: prep.meeting_date,
          meeting_type: prep.meeting_type,
          created_by: user.id,
          status: 'draft',
          documents_checklist: DEFAULT_DOCUMENTS_CHECKLIST as unknown as null,
          attendees: (prep.attendees || []) as unknown as null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Meeting Prep Created',
        description: 'IEP meeting preparation started',
      });

      await fetchPreps();
      return data as unknown as IEPMeetingPrep;
    } catch (error) {
      console.error('Error creating prep:', error);
      toast({
        title: 'Error',
        description: 'Failed to create meeting prep',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updatePrep = async (
    prepId: string, 
    updates: Partial<{
      meeting_date: string;
      meeting_type: string;
      data_summary: DataSummary;
      goal_progress: GoalProgress[];
      recommendations: Recommendation[];
      documents_checklist: DocumentCheckItem[];
      attendees: Attendee[];
      status: string;
    }>
  ) => {
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (updates.meeting_date) updateData.meeting_date = updates.meeting_date;
      if (updates.meeting_type) updateData.meeting_type = updates.meeting_type;
      if (updates.status) updateData.status = updates.status;
      if (updates.data_summary) updateData.data_summary = updates.data_summary;
      if (updates.goal_progress) updateData.goal_progress = updates.goal_progress;
      if (updates.recommendations) updateData.recommendations = updates.recommendations;
      if (updates.documents_checklist) updateData.documents_checklist = updates.documents_checklist;
      if (updates.attendees) updateData.attendees = updates.attendees;

      const { error } = await supabase
        .from('iep_meeting_preps')
        .update(updateData)
        .eq('id', prepId);

      if (error) throw error;

      toast({
        title: 'Saved',
        description: 'Meeting prep updated',
      });

      await fetchPreps();
    } catch (error) {
      console.error('Error updating prep:', error);
      toast({
        title: 'Error',
        description: 'Failed to update meeting prep',
        variant: 'destructive',
      });
    }
  };

  const deletePrep = async (prepId: string) => {
    try {
      const { error } = await supabase
        .from('iep_meeting_preps')
        .delete()
        .eq('id', prepId);

      if (error) throw error;

      toast({
        title: 'Deleted',
        description: 'Meeting prep removed',
      });

      await fetchPreps();
    } catch (error) {
      console.error('Error deleting prep:', error);
    }
  };

  return {
    preps,
    isLoading,
    createPrep,
    updatePrep,
    deletePrep,
    refresh: fetchPreps,
  };
}
