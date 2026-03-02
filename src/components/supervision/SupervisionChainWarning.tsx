import { useState, useEffect } from 'react';
import { AlertTriangle, UserX, Link2Off, Users } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface SupervisionChainWarningProps {
  staffUserId: string;
  credential?: string;
  compact?: boolean;
  onAssignSupervisor?: () => void;
}

interface SupervisionStatus {
  hasActiveSupervisor: boolean;
  supervisorName?: string;
  supervisorCredential?: string;
  linkExpiring?: boolean;
  expirationDate?: string;
}

export function SupervisionChainWarning({ 
  staffUserId, 
  credential,
  compact = false,
  onAssignSupervisor 
}: SupervisionChainWarningProps) {
  const [status, setStatus] = useState<SupervisionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!staffUserId) return;
    
    const checkSupervisionStatus = async () => {
      try {
        // Only check for RBTs and BTs — skip if credential is missing or not RBT/BT
        if (!credential || !['RBT', 'BT'].includes(credential)) {
          setStatus({ hasActiveSupervisor: true });
          setLoading(false);
          return;
        }

        const { data: links, error } = await supabase
          .from('supervisor_links')
          .select(`
            id,
            status,
            end_date,
            supervisor_staff_id,
            supervisor:profiles!supervisor_links_supervisor_staff_id_fkey(
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
          if (link.end_date) {
            const endDate = new Date(link.end_date);
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            linkExpiring = endDate <= thirtyDaysFromNow;
          }

          setStatus({
            hasActiveSupervisor: true,
            supervisorName,
            supervisorCredential: supervisor?.credential,
            linkExpiring,
            expirationDate: link.end_date || undefined,
          });
        }
      } catch (err) {
        console.error('Error checking supervision status:', err);
        setStatus({ hasActiveSupervisor: false });
      } finally {
        setLoading(false);
      }
    };

    checkSupervisionStatus();
  }, [staffUserId, credential]);

  if (loading || !status) return null;

  // Don't show anything if supervision is OK and not expiring
  if (status.hasActiveSupervisor && !status.linkExpiring) return null;

  // Compact mode for lists/cards
  if (compact) {
    if (!status.hasActiveSupervisor) {
      return (
        <div className="flex items-center gap-1.5 text-destructive text-xs font-medium">
          <Link2Off className="h-3 w-3" />
          No Supervisor
        </div>
      );
    }
    if (status.linkExpiring) {
      return (
        <div className="flex items-center gap-1.5 text-warning text-xs font-medium">
          <AlertTriangle className="h-3 w-3" />
          Supervision expires {status.expirationDate}
        </div>
      );
    }
    return null;
  }

  // Full alert mode
  if (!status.hasActiveSupervisor) {
    return (
      <Alert variant="destructive" className="border-destructive/50">
        <UserX className="h-4 w-4" />
        <AlertTitle>Missing Supervisor Chain</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-3">
            This staff member is an RBT/BT and requires an active supervisor to be scheduled for sessions.
            Scheduling is <strong>blocked</strong> until a supervisor is assigned.
          </p>
          {onAssignSupervisor && (
            <Button size="sm" variant="outline" onClick={onAssignSupervisor}>
              <Users className="h-4 w-4 mr-2" />
              Assign Supervisor
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (status.linkExpiring) {
    return (
      <Alert className="border-warning/50 bg-warning/10">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertTitle className="text-warning">Supervision Link Expiring</AlertTitle>
        <AlertDescription className="mt-2">
          <p>
            The supervision link with <strong>{status.supervisorName}</strong> ({status.supervisorCredential}) 
            expires on <strong>{status.expirationDate}</strong>. Please renew or assign a new supervisor.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
