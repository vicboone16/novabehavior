import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDataStore } from '@/store/dataStore';

interface NoteRequirementResult {
  isRequired: boolean;
  requirementSource: 'student' | 'role' | 'none';
  loading: boolean;
}

export function useNoteRequirement(studentId: string | undefined): NoteRequirementResult {
  const { user } = useAuth();
  const { students } = useDataStore();
  const [result, setResult] = useState<NoteRequirementResult>({
    isRequired: false,
    requirementSource: 'none',
    loading: true,
  });

  useEffect(() => {
    if (!user || !studentId) {
      setResult({ isRequired: false, requirementSource: 'none', loading: false });
      return;
    }

    const checkRequirement = async () => {
      try {
        // First check student-level requirement from local state
        const student = students.find(s => s.id === studentId);
        if (student?.notesRequired) {
          setResult({ isRequired: true, requirementSource: 'student', loading: false });
          return;
        }

        // Check student-level requirement in database
        const { data: studentReq } = await supabase
          .from('note_requirements')
          .select('notes_required')
          .eq('student_id', studentId)
          .maybeSingle();

        if (studentReq?.notes_required) {
          setResult({ isRequired: true, requirementSource: 'student', loading: false });
          return;
        }

        // Check role-based requirement
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (userRoles && userRoles.length > 0) {
          for (const ur of userRoles) {
            const { data: roleReq } = await supabase
              .from('note_requirements')
              .select('notes_required')
              .eq('role', ur.role)
              .is('student_id', null)
              .maybeSingle();

            if (roleReq?.notes_required) {
              setResult({ isRequired: true, requirementSource: 'role', loading: false });
              return;
            }
          }
        }

        // No requirement found
        setResult({ isRequired: false, requirementSource: 'none', loading: false });
      } catch (error) {
        console.error('Error checking note requirement:', error);
        setResult({ isRequired: false, requirementSource: 'none', loading: false });
      }
    };

    checkRequirement();
  }, [user, studentId, students]);

  return result;
}

// Hook to check multiple students at once
export function useMultiStudentNoteRequirements(studentIds: string[]): Map<string, NoteRequirementResult> {
  const { user } = useAuth();
  const { students } = useDataStore();
  const [results, setResults] = useState<Map<string, NoteRequirementResult>>(new Map());

  useEffect(() => {
    if (!user || studentIds.length === 0) {
      setResults(new Map());
      return;
    }

    const checkRequirements = async () => {
      const newResults = new Map<string, NoteRequirementResult>();

      // Get all student-level requirements
      const { data: studentReqs } = await supabase
        .from('note_requirements')
        .select('student_id, notes_required')
        .in('student_id', studentIds);

      // Get user roles
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      // Check role-based requirements
      let roleRequiresNotes = false;
      if (userRoles && userRoles.length > 0) {
        for (const ur of userRoles) {
          const { data: roleReq } = await supabase
            .from('note_requirements')
            .select('notes_required')
            .eq('role', ur.role)
            .is('student_id', null)
            .maybeSingle();

          if (roleReq?.notes_required) {
            roleRequiresNotes = true;
            break;
          }
        }
      }

      // Build results for each student
      for (const studentId of studentIds) {
        const student = students.find(s => s.id === studentId);
        
        // Check local student setting first
        if (student?.notesRequired) {
          newResults.set(studentId, { isRequired: true, requirementSource: 'student', loading: false });
          continue;
        }

        // Check database student-level requirement
        const studentReq = studentReqs?.find(r => r.student_id === studentId);
        if (studentReq?.notes_required) {
          newResults.set(studentId, { isRequired: true, requirementSource: 'student', loading: false });
          continue;
        }

        // Apply role-based requirement
        if (roleRequiresNotes) {
          newResults.set(studentId, { isRequired: true, requirementSource: 'role', loading: false });
          continue;
        }

        newResults.set(studentId, { isRequired: false, requirementSource: 'none', loading: false });
      }

      setResults(newResults);
    };

    checkRequirements();
  }, [user, studentIds.join(','), students]);

  return results;
}
