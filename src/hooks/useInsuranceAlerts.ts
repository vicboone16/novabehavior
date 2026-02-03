import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, parseISO } from 'date-fns';

export interface InsuranceAlert {
  id: string;
  type: 'expiring' | 'low_units' | 'exhausted' | 'no_match';
  title: string;
  message: string;
  authorizationId?: string;
  serviceName?: string;
  severity: 'warning' | 'error' | 'info';
  ctaLabel?: string;
  ctaAction?: string;
}

interface UseInsuranceAlertsResult {
  alerts: InsuranceAlert[];
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export function useInsuranceAlerts(
  studentId: string | undefined,
  fundingMode: 'school_based' | 'insurance',
  insuranceAlertsBackground: boolean = false
): UseInsuranceAlertsResult {
  const [alerts, setAlerts] = useState<InsuranceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    // Only fetch alerts for insurance mode (or school-based with background alerts)
    if (!studentId || (fundingMode === 'school_based' && !insuranceAlertsBackground)) {
      setAlerts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const newAlerts: InsuranceAlert[] = [];
      const today = new Date();

      // Fetch authorizations with their alert settings
      const { data: auths } = await supabase
        .from('authorizations')
        .select('id, auth_number, end_date, status, alert_expiring_30_days, alert_low_units_20, alert_exhausted, units_approved, units_used, units_remaining')
        .eq('student_id', studentId)
        .eq('status', 'active');

      if (auths) {
        for (const auth of auths) {
          const endDate = parseISO(auth.end_date);
          const daysLeft = differenceInDays(endDate, today);
          const usagePercent = auth.units_approved > 0 
            ? ((auth.units_used || 0) / auth.units_approved) * 100 
            : 0;

          // Expiring soon alert
          if (auth.alert_expiring_30_days && daysLeft <= 30 && daysLeft > 0) {
            newAlerts.push({
              id: `expiring-${auth.id}`,
              type: 'expiring',
              title: 'Authorization Expiring Soon',
              message: `Authorization ${auth.auth_number} ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`,
              authorizationId: auth.id,
              severity: daysLeft <= 7 ? 'error' : 'warning',
              ctaLabel: 'View Authorization',
              ctaAction: 'view_auth',
            });
          }

          // Low units alert
          if (auth.alert_low_units_20 && usagePercent >= 80 && usagePercent < 100) {
            const remaining = auth.units_remaining || (auth.units_approved - (auth.units_used || 0));
            newAlerts.push({
              id: `low-units-${auth.id}`,
              type: 'low_units',
              title: 'Low Units Remaining',
              message: `Authorization ${auth.auth_number} — ${remaining} units left (${Math.round(100 - usagePercent)}%).`,
              authorizationId: auth.id,
              severity: 'warning',
              ctaLabel: 'View Usage',
              ctaAction: 'view_usage',
            });
          }

          // Exhausted alert
          if (auth.alert_exhausted && (auth.units_remaining || 0) <= 0) {
            newAlerts.push({
              id: `exhausted-${auth.id}`,
              type: 'exhausted',
              title: 'Units Exhausted',
              message: `Authorization ${auth.auth_number} has no remaining units. New sessions may not be billable.`,
              authorizationId: auth.id,
              severity: 'error',
              ctaLabel: 'Add/Update Authorization',
              ctaAction: 'add_auth',
            });
          }
        }
      }

      // Check for sessions needing review (only in full insurance mode)
      if (fundingMode === 'insurance') {
        const { count } = await supabase
          .from('sessions')
          .select('id', { count: 'exact', head: true })
          .contains('student_ids', [studentId])
          .eq('authorization_status', 'needs_review');

        if (count && count > 0) {
          newAlerts.push({
            id: `needs-review-${studentId}`,
            type: 'no_match',
            title: 'Sessions Need Review',
            message: `${count} session${count === 1 ? '' : 's'} need review — no authorization match.`,
            severity: 'warning',
            ctaLabel: 'Review Sessions',
            ctaAction: 'review_sessions',
          });
        }
      }

      setAlerts(newAlerts);
    } catch (error) {
      console.error('Error fetching insurance alerts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [studentId, fundingMode, insuranceAlertsBackground]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return {
    alerts,
    isLoading,
    refetch: fetchAlerts,
  };
}
