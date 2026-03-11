import { useState, useEffect } from 'react';
import { ClipboardList, AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { useNavigate } from 'react-router-dom';
import { STATUSES, PRIORITIES, REQUEST_TYPES } from '@/hooks/useServiceRequests';
import { format } from 'date-fns';

export function ServiceRequestsWidget() {
  const { user, userRole } = useAuth();
  const { currentAgency } = useAgencyContext();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  useEffect(() => {
    if (!currentAgency?.id || !user) return;
    const fetch = async () => {
      // Role-based query: admins see all, staff see their own + assigned
      let query = supabase
        .from('service_requests')
        .select('*')
        .eq('agency_id', currentAgency.id)
        .not('status', 'in', '("completed","closed","cancelled")')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(5);

      if (!isAdmin) {
        query = query.or(`requested_by.eq.${user.id},assigned_to.eq.${user.id}`);
      }

      const { data } = await query;
      setRequests(data || []);
      setLoading(false);
    };
    fetch();
  }, [currentAgency?.id, user, isAdmin]);

  const urgentCount = requests.filter(r => r.priority === 'crisis' || r.priority === 'urgent').length;
  const waitingCount = requests.filter(r => r.status?.startsWith('waiting')).length;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4 text-primary" />
            Service Requests
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate('/resource-hub?tab=requests')}>
            View All <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Summary chips */}
        <div className="flex gap-2 mb-2">
          {urgentCount > 0 && (
            <Badge variant="destructive" className="text-[10px] gap-1">
              <AlertTriangle className="w-3 h-3" /> {urgentCount} urgent
            </Badge>
          )}
          {waitingCount > 0 && (
            <Badge variant="secondary" className="text-[10px] gap-1">
              <Clock className="w-3 h-3" /> {waitingCount} waiting
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px]">{requests.length} active</Badge>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground">Loading...</p>
        ) : requests.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No active requests</p>
        ) : (
          requests.slice(0, 4).map(req => {
            const priorityObj = PRIORITIES.find(p => p.value === req.priority);
            const statusObj = STATUSES.find(s => s.value === req.status);
            return (
              <div key={req.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer"
                onClick={() => navigate('/resource-hub?tab=requests')}>
                <span className={`text-[10px] font-medium w-10 ${priorityObj?.color || ''}`}>
                  {priorityObj?.label}
                </span>
                <span className="text-xs flex-1 truncate">{req.title}</span>
                <Badge variant="secondary" className={`text-[9px] ${statusObj?.color || ''}`}>
                  {statusObj?.label}
                </Badge>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
