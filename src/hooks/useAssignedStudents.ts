import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDataStore } from '@/store/dataStore';

/**
 * Returns the subset of active (non-archived) students that are assigned to
 * the current user via staff_caseloads or client_team_assignments.
 *
 * Admins and super-admins bypass the filter and see all active students.
 * If the user has no explicit caseload entries we fall back to all active
 * students so the view is never accidentally empty for owners / solo clinicians.
 */
export function useAssignedStudents() {
  const { user } = useAuth();
  const { students } = useDataStore();
  const [assignedStudentIds, setAssignedStudentIds] = useState<Set<string> | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchAssignments = async () => {
      try {
        // Check admin status server-side
        const { data: adminResult } = await supabase.rpc('is_admin', { _user_id: user.id });
        const admin = Boolean(adminResult);
        setIsAdmin(admin);

        if (admin) {
          setAssignedStudentIds(null); // null = no filter (all)
          setLoading(false);
          return;
        }

        // Fetch from both assignment tables in parallel
        const [caseloadRes, teamRes] = await Promise.all([
          supabase
            .from('staff_caseloads')
            .select('student_id')
            .eq('clinician_user_id', user.id)
            .eq('status', 'active'),
          supabase
            .from('client_team_assignments')
            .select('client_id')
            .eq('staff_user_id', user.id)
            .eq('is_active', true),
        ]);

        const ids = new Set<string>();
        (caseloadRes.data || []).forEach(r => ids.add(r.student_id));
        (teamRes.data || []).forEach(r => ids.add(r.client_id));

        // If the user has no caseload entries at all, show all students
        // (avoids blank screens for solo practitioners / owners)
        setAssignedStudentIds(ids.size > 0 ? ids : null);
      } catch (err) {
        console.error('[useAssignedStudents] Error fetching assignments:', err);
        setAssignedStudentIds(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [user]);

  const activeStudents = students
    .filter(s => !s.isArchived)
    .sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name));

  const assignedStudents =
    assignedStudentIds === null
      ? activeStudents
      : activeStudents.filter(s => assignedStudentIds.has(s.id));

  return { assignedStudents, isAdmin, loading };
}
