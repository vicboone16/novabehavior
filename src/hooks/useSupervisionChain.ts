import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SupervisionStatus {
  hasActiveSupervisor: boolean;
  supervisorName?: string;
  supervisorCredential?: string;
  supervisorUserId?: string;
  linkExpiring?: boolean;
  expirationDate?: string;
  daysUntilExpiration?: number;
}

interface UseSupervisionChainOptions {
  enabled?: boolean;
}

/**
 * Hook to check and enforce supervision chain requirements for RBT/BT staff
 */
export function useSupervisionChain(
  staffUserId: string | undefined,
  credential: string | undefined,
  options: UseSupervisionChainOptions = {}
) {
  const { enabled = true } = options;
  const [status, setStatus] = useState<SupervisionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const requiresSupervision = credential === 'RBT' || credential === 'BT';

  const checkSupervisionStatus = useCallback(async () => {
    if (!staffUserId || !enabled) {
      setLoading(false);
      return;
    }

    // Non-RBT/BT don't need supervision chain
    if (!requiresSupervision) {
      setStatus({ hasActiveSupervisor: true });
      setLoading(false);
      return;
    }

    try {
      const { data: links, error } = await supabase
        .from('supervisor_links')
        .select(`
          id,
          status,
          end_date,
          supervisor_staff_id,
          supervisor:profiles!supervisor_links_supervisor_staff_id_fkey(
            user_id,
            display_name,
            first_name,
            last_name,
            credential
          )
        `)
        .eq('supervisee_staff_id', staffUserId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!links || links.length === 0) {
        setStatus({ hasActiveSupervisor: false });
      } else {
        const link = links[0];
        const supervisor = link.supervisor as any;
        const supervisorName = supervisor?.display_name ||
          `${supervisor?.first_name || ''} ${supervisor?.last_name || ''}`.trim() ||
          'Unknown';

        // Check if link is expiring soon (within 30 days)
        let linkExpiring = false;
        let daysUntilExpiration: number | undefined;
        
        if (link.end_date) {
          const endDate = new Date(link.end_date);
          const today = new Date();
          const diffTime = endDate.getTime() - today.getTime();
          daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          linkExpiring = daysUntilExpiration <= 30 && daysUntilExpiration > 0;
        }

        setStatus({
          hasActiveSupervisor: true,
          supervisorName,
          supervisorCredential: supervisor?.credential,
          supervisorUserId: supervisor?.user_id,
          linkExpiring,
          expirationDate: link.end_date || undefined,
          daysUntilExpiration,
        });
      }
    } catch (err) {
      console.error('Error checking supervision status:', err);
      setStatus({ hasActiveSupervisor: false });
    } finally {
      setLoading(false);
    }
  }, [staffUserId, requiresSupervision, enabled]);

  useEffect(() => {
    checkSupervisionStatus();
  }, [checkSupervisionStatus]);

  // Determine if scheduling should be blocked
  const isBlocked = requiresSupervision && status !== null && !status.hasActiveSupervisor;
  const isWarning = status?.linkExpiring === true;

  return {
    status,
    loading,
    requiresSupervision,
    isBlocked,
    isWarning,
    refresh: checkSupervisionStatus,
  };
}

/**
 * Check supervision status for multiple staff members at once
 */
export async function checkMultipleStaffSupervision(
  staffIds: string[]
): Promise<Map<string, SupervisionStatus>> {
  const results = new Map<string, SupervisionStatus>();

  if (staffIds.length === 0) return results;

  try {
    // Get all active supervision links for these staff
    const { data: links, error } = await supabase
      .from('supervisor_links')
      .select(`
        supervisee_staff_id,
        end_date,
        supervisor:profiles!supervisor_links_supervisor_staff_id_fkey(
          user_id,
          display_name,
          credential
        )
      `)
      .in('supervisee_staff_id', staffIds)
      .eq('status', 'active');

    if (error) throw error;

    // Build a map of supervisee -> supervisor info
    const supervisorMap = new Map<string, any>();
    for (const link of links || []) {
      supervisorMap.set(link.supervisee_staff_id, link);
    }

    // Set results for each staff member
    for (const staffId of staffIds) {
      const link = supervisorMap.get(staffId);
      
      if (!link) {
        results.set(staffId, { hasActiveSupervisor: false });
      } else {
        const supervisor = link.supervisor as any;
        let linkExpiring = false;
        let daysUntilExpiration: number | undefined;
        
        if (link.end_date) {
          const endDate = new Date(link.end_date);
          const today = new Date();
          const diffTime = endDate.getTime() - today.getTime();
          daysUntilExpiration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          linkExpiring = daysUntilExpiration <= 30 && daysUntilExpiration > 0;
        }

        results.set(staffId, {
          hasActiveSupervisor: true,
          supervisorName: supervisor?.display_name || 'Unknown',
          supervisorCredential: supervisor?.credential,
          supervisorUserId: supervisor?.user_id,
          linkExpiring,
          expirationDate: link.end_date,
          daysUntilExpiration,
        });
      }
    }
  } catch (err) {
    console.error('Error checking multiple staff supervision:', err);
    // Return all as blocked on error to be safe
    for (const staffId of staffIds) {
      results.set(staffId, { hasActiveSupervisor: false });
    }
  }

  return results;
}

/**
 * Validate if an RBT can be scheduled for a given date
 * Uses the database function can_schedule_rbt
 */
export async function validateRbtScheduling(
  staffUserId: string,
  sessionDate: Date
): Promise<{ allowed: boolean; reason: string }> {
  try {
    const { data, error } = await supabase.rpc('can_schedule_rbt', {
      _staff_user_id: staffUserId,
      _session_date: sessionDate.toISOString().split('T')[0],
    });

    if (error) throw error;

    if (data && data.length > 0) {
      return {
        allowed: data[0].allowed,
        reason: data[0].reason,
      };
    }

    return { allowed: false, reason: 'Unable to verify supervision status' };
  } catch (err) {
    console.error('Error validating RBT scheduling:', err);
    return { allowed: false, reason: 'Error checking supervision chain' };
  }
}
