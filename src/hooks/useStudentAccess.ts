import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface StudentAccessPermissions {
  canViewNotes: boolean;
  canViewDocuments: boolean;
  canCollectData: boolean;
  canEditProfile: boolean;
  canGenerateReports: boolean;
  permissionLevel: string;
  isOwner: boolean;
  isAdmin: boolean;
  loading: boolean;
}

const defaultPermissions: StudentAccessPermissions = {
  canViewNotes: false,
  canViewDocuments: false,
  canCollectData: false,
  canEditProfile: false,
  canGenerateReports: false,
  permissionLevel: 'none',
  isOwner: false,
  isAdmin: false,
  loading: true,
};

export function useStudentAccess(studentId: string | undefined): StudentAccessPermissions {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<StudentAccessPermissions>(defaultPermissions);

  useEffect(() => {
    if (!user || !studentId) {
      setPermissions({ ...defaultPermissions, loading: false });
      return;
    }

    const fetchPermissions = async () => {
      try {
        // Check if user is admin
        const { data: isAdminResult } = await supabase.rpc('is_admin', { _user_id: user.id });
        const isAdmin = Boolean(isAdminResult);

        // If admin, grant all permissions
        if (isAdmin) {
          setPermissions({
            canViewNotes: true,
            canViewDocuments: true,
            canCollectData: true,
            canEditProfile: true,
            canGenerateReports: true,
            permissionLevel: 'full',
            isOwner: false,
            isAdmin: true,
            loading: false,
          });
          return;
        }

        // Check if user owns this student
        const { data: student } = await supabase
          .from('students')
          .select('user_id')
          .eq('id', studentId)
          .single();

        const isOwner = student?.user_id === user.id;

        // If owner, grant all permissions
        if (isOwner) {
          setPermissions({
            canViewNotes: true,
            canViewDocuments: true,
            canCollectData: true,
            canEditProfile: true,
            canGenerateReports: true,
            permissionLevel: 'full',
            isOwner: true,
            isAdmin: false,
            loading: false,
          });
          return;
        }

        // Check user_student_access for granular permissions
        const { data: accessRecord } = await supabase
          .from('user_student_access')
          .select('*')
          .eq('student_id', studentId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (accessRecord) {
          setPermissions({
            canViewNotes: Boolean(accessRecord.can_view_notes),
            canViewDocuments: Boolean(accessRecord.can_view_documents),
            canCollectData: Boolean(accessRecord.can_collect_data),
            canEditProfile: Boolean(accessRecord.can_edit_profile),
            canGenerateReports: Boolean(accessRecord.can_generate_reports),
            permissionLevel: accessRecord.permission_level || 'none',
            isOwner: false,
            isAdmin: false,
            loading: false,
          });
        } else {
          // No explicit access record - no permissions
          setPermissions({
            ...defaultPermissions,
            loading: false,
          });
        }
      } catch (error) {
        console.error('Error fetching student access permissions:', error);
        setPermissions({ ...defaultPermissions, loading: false });
      }
    };

    fetchPermissions();
  }, [user, studentId]);

  return permissions;
}
