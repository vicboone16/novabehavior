import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface StaffAssignment {
  id: string;
  agency_id: string | null;
  user_id: string;
  classroom_id: string | null;
  student_id: string | null;
  role_slug: string;
  app_context: string | null;
  permission_level: string | null;
  can_collect_data: boolean | null;
  can_view_notes: boolean | null;
  can_view_documents: boolean | null;
  can_edit_profile: boolean | null;
  can_generate_reports: boolean | null;
  is_active: boolean;
  notes: string | null;
  assigned_at: string;
  updated_at: string;
  // joined fields
  email: string | null;
  staff_name: string | null;
  student_name: string | null;
}

export interface StaffAssignmentFormData {
  user_id: string;
  agency_id?: string | null;
  classroom_id?: string | null;
  student_id?: string | null;
  role_slug: string;
  app_context?: string | null;
  permission_level?: string | null;
  can_collect_data?: boolean;
  can_view_notes?: boolean;
  can_view_documents?: boolean;
  can_edit_profile?: boolean;
  can_generate_reports?: boolean;
  is_active?: boolean;
  notes?: string | null;
}

export function useStaffAssignments() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<StaffAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<{ id: string; email: string | null; display_name: string | null; first_name: string | null; last_name: string | null }[]>([]);
  const [agencies, setAgencies] = useState<{ id: string; name: string }[]>([]);
  const [classrooms, setClassrooms] = useState<{ id: string; name: string }[]>([]);
  const [students, setStudents] = useState<{ id: string; first_name: string | null; last_name: string | null }[]>([]);

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('v_staff_assignments')
        .select('*')
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      setAssignments((data as any[]) || []);
    } catch (err: any) {
      console.error('Error fetching staff assignments:', err);
      // Graceful fallback if view unavailable
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLookups = useCallback(async () => {
    try {
      const [profilesRes, agenciesRes, classroomsRes, studentsRes] = await Promise.all([
        supabase.from('profiles').select('id, email, display_name, first_name, last_name').limit(500),
        supabase.from('agencies').select('id, name').eq('status', 'active').limit(200),
        supabase.from('classrooms').select('id, name').limit(200),
        supabase.from('students').select('id, first_name, last_name').limit(500),
      ]);
      setProfiles(profilesRes.data || []);
      setAgencies(agenciesRes.data || []);
      setClassrooms(classroomsRes.data || []);
      setStudents(studentsRes.data || []);
    } catch {
      // graceful
    }
  }, []);

  useEffect(() => {
    fetchAssignments();
    fetchLookups();
  }, [fetchAssignments, fetchLookups]);

  const createAssignment = async (data: StaffAssignmentFormData) => {
    try {
      const { error } = await supabase.from('staff_assignments').insert({
        ...data,
        assigned_by: user?.id,
        is_active: data.is_active ?? true,
      });
      if (error) throw error;
      toast.success('Assignment created');
      fetchAssignments();
      return true;
    } catch (err: any) {
      toast.error('Failed to create assignment: ' + err.message);
      return false;
    }
  };

  const updateAssignment = async (id: string, data: Partial<StaffAssignmentFormData>) => {
    try {
      const { error } = await supabase.from('staff_assignments').update(data).eq('id', id);
      if (error) throw error;
      toast.success('Assignment updated');
      fetchAssignments();
      return true;
    } catch (err: any) {
      toast.error('Failed to update assignment: ' + err.message);
      return false;
    }
  };

  const removeAssignment = async (id: string) => {
    try {
      // Soft-disable via is_active
      const { error } = await supabase.from('staff_assignments').update({ is_active: false }).eq('id', id);
      if (error) throw error;
      toast.success('Assignment removed');
      fetchAssignments();
      return true;
    } catch (err: any) {
      toast.error('Failed to remove assignment: ' + err.message);
      return false;
    }
  };

  const deleteAssignment = async (id: string) => {
    try {
      const { error } = await supabase.from('staff_assignments').delete().eq('id', id);
      if (error) throw error;
      toast.success('Assignment permanently deleted');
      fetchAssignments();
      return true;
    } catch (err: any) {
      toast.error('Failed to delete assignment: ' + err.message);
      return false;
    }
  };

  const bulkAssignClassroom = async (classroomId: string, userIds: string[], roleSlug: string) => {
    try {
      const rows = userIds.map(uid => ({
        user_id: uid,
        classroom_id: classroomId,
        role_slug: roleSlug,
        assigned_by: user?.id,
        is_active: true,
      }));
      const { error } = await supabase.from('staff_assignments').insert(rows);
      if (error) throw error;
      toast.success(`${userIds.length} staff assigned to classroom`);
      fetchAssignments();
      return true;
    } catch (err: any) {
      toast.error('Bulk assign failed: ' + err.message);
      return false;
    }
  };

  return {
    assignments,
    loading,
    profiles,
    agencies,
    classrooms,
    students,
    createAssignment,
    updateAssignment,
    removeAssignment,
    deleteAssignment,
    bulkAssignClassroom,
    refetch: fetchAssignments,
  };
}
