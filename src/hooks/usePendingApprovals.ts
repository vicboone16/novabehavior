import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function usePendingApprovals() {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasShownNotification, setHasShownNotification] = useState(false);

  useEffect(() => {
    const checkAdminAndPending = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Check if user is admin
        const { data: adminCheck } = await supabase.rpc('is_admin', { _user_id: user.id });
        setIsAdmin(!!adminCheck);

        if (adminCheck) {
          // Get pending approval count
          const { data: count } = await supabase.rpc('get_pending_approval_count');
          setPendingCount(count || 0);
        }
      } catch (error) {
        console.error('Error checking pending approvals:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndPending();
  }, [user]);

  const refreshPendingCount = async () => {
    if (!isAdmin) return;
    
    try {
      const { data: count } = await supabase.rpc('get_pending_approval_count');
      setPendingCount(count || 0);
    } catch (error) {
      console.error('Error refreshing pending count:', error);
    }
  };

  const markNotificationShown = () => {
    setHasShownNotification(true);
  };

  return {
    pendingCount,
    isAdmin,
    loading,
    hasShownNotification,
    markNotificationShown,
    refreshPendingCount,
  };
}
