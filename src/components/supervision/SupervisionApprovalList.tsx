import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Check, X, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface PendingLog {
  id: string;
  supervisor_user_id: string;
  supervisor_name: string;
  supervision_date: string;
  supervision_type: string;
  duration_minutes: number;
  activities: string[];
  notes: string | null;
}

export function SupervisionApprovalList() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pendingLogs, setPendingLogs] = useState<PendingLog[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingLogs();
  }, [user?.id]);

  const fetchPendingLogs = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Fetch pending supervision logs where current user is the supervisee
      const { data, error } = await supabase
        .from('supervision_logs')
        .select('*')
        .eq('supervisee_user_id', user.id)
        .eq('status', 'pending')
        .order('supervision_date', { ascending: false });

      if (error) throw error;

      // Fetch supervisor names
      const supervisorIds = [...new Set(data?.map(d => d.supervisor_user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name')
        .in('user_id', supervisorIds);

      const profileMap = new Map(
        profiles?.map(p => [
          p.user_id,
          p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim()
        ])
      );

      setPendingLogs(
        data?.map(d => ({
          id: d.id,
          supervisor_user_id: d.supervisor_user_id,
          supervisor_name: profileMap.get(d.supervisor_user_id) || 'Unknown',
          supervision_date: d.supervision_date,
          supervision_type: d.supervision_type,
          duration_minutes: d.duration_minutes,
          activities: (d.activities as string[]) || [],
          notes: d.notes,
        })) || []
      );
    } catch (error) {
      console.error('Error fetching pending logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (logId: string, approved: boolean) => {
    try {
      setProcessing(logId);

      const { error } = await supabase
        .from('supervision_logs')
        .update({
          status: approved ? 'approved' : 'rejected',
          approved_at: approved ? new Date().toISOString() : null,
          approved_by: approved ? user?.id : null,
        })
        .eq('id', logId);

      if (error) throw error;

      toast.success(approved ? 'Supervision approved' : 'Supervision rejected');
      fetchPendingLogs();
    } catch (error) {
      console.error('Error updating approval:', error);
      toast.error('Failed to update approval status');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Pending Approvals
          {pendingLogs.length > 0 && (
            <Badge variant="secondary">{pendingLogs.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pendingLogs.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            No supervision hours pending your approval.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 border rounded-lg space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">
                      Supervision by {log.supervisor_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(log.supervision_date), 'MMMM d, yyyy')} • 
                      {log.duration_minutes} minutes • 
                      <span className="capitalize">{log.supervision_type}</span>
                    </p>
                  </div>
                  <Badge variant="outline">Pending</Badge>
                </div>

                {log.activities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {log.activities.map((activity) => (
                      <Badge key={activity} variant="secondary" className="text-xs">
                        {activity}
                      </Badge>
                    ))}
                  </div>
                )}

                {log.notes && (
                  <p className="text-sm text-muted-foreground">{log.notes}</p>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleApproval(log.id, true)}
                    disabled={processing === log.id}
                    className="gap-1"
                  >
                    <Check className="w-3 h-3" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApproval(log.id, false)}
                    disabled={processing === log.id}
                    className="gap-1"
                  >
                    <X className="w-3 h-3" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
