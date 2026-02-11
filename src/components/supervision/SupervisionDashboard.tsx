import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle, Clock, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ComplianceData } from '@/types/supervision';
import { ComplianceGauge } from './ComplianceGauge';
import { useAuth } from '@/contexts/AuthContext';

interface CaseloadClient {
  id: string;
  student_id: string;
  name: string;
  role: string;
  start_date: string;
}

export function SupervisionDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [complianceData, setComplianceData] = useState<ComplianceData[]>([]);
  const [caseloadClients, setCaseloadClients] = useState<CaseloadClient[]>([]);
  const [stats, setStats] = useState({
    totalSupervisees: 0,
    compliantCount: 0,
    pendingApproval: 0,
    hoursThisPeriod: 0,
  });

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user?.id]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch supervision requirements and calculate compliance
      const { data: requirements, error } = await supabase
        .from('supervision_requirements')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      // Fetch supervision logs for compliance calculation
      const { data: logs } = await supabase
        .from('supervision_logs')
        .select('*')
        .gte('supervision_date', new Date(new Date().setDate(1)).toISOString().split('T')[0]);

      const pendingCount = logs?.filter(l => l.status === 'pending').length || 0;
      const totalHours = logs?.reduce((sum, l) => sum + (l.duration_minutes / 60), 0) || 0;

      // Fetch caseload from both staff_caseloads and client_team_assignments
      const [caseloadRes, teamRes] = await Promise.all([
        supabase
          .from('staff_caseloads')
          .select('id, student_id')
          .eq('clinician_user_id', user!.id)
          .eq('status', 'active'),
        supabase
          .from('client_team_assignments')
          .select('id, client_id, role, start_date')
          .eq('staff_user_id', user!.id)
          .eq('is_active', true),
      ]);

      // Gather unique client IDs
      const seenIds = new Set<string>();
      const clientIds: string[] = [];
      (caseloadRes.data || []).forEach((d: any) => {
        if (!seenIds.has(d.student_id)) { seenIds.add(d.student_id); clientIds.push(d.student_id); }
      });
      (teamRes.data || []).forEach((t: any) => {
        if (!seenIds.has(t.client_id)) { seenIds.add(t.client_id); clientIds.push(t.client_id); }
      });

      // Fetch client names
      let clientNameMap = new Map<string, string>();
      if (clientIds.length > 0) {
        const { data: students } = await supabase
          .from('students')
          .select('id, name')
          .in('id', clientIds);
        clientNameMap = new Map((students || []).map(s => [s.id, s.name]));
      }

      // Build caseload list
      const clients: CaseloadClient[] = [];
      const addedIds = new Set<string>();
      
      (caseloadRes.data || []).forEach((d: any) => {
        if (!addedIds.has(d.student_id)) {
          addedIds.add(d.student_id);
          clients.push({
            id: d.id,
            student_id: d.student_id,
            name: clientNameMap.get(d.student_id) || 'Unknown',
            role: 'clinician',
            start_date: '',
          });
        }
      });
      (teamRes.data || []).forEach((t: any) => {
        if (!addedIds.has(t.client_id)) {
          addedIds.add(t.client_id);
          clients.push({
            id: t.id,
            student_id: t.client_id,
            name: clientNameMap.get(t.client_id) || 'Unknown',
            role: t.role || 'team member',
            start_date: t.start_date || '',
          });
        }
      });

      setCaseloadClients(clients);

      setStats({
        totalSupervisees: requirements?.length || 0,
        compliantCount: 0,
        pendingApproval: pendingCount,
        hoursThisPeriod: totalHours,
      });
    } catch (error) {
      console.error('Error fetching supervision data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Clients</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{caseloadClients.length}</div>
            <p className="text-xs text-muted-foreground">Active client assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Supervisees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSupervisees}</div>
            <p className="text-xs text-muted-foreground">Active supervision assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingApproval}</div>
            <p className="text-xs text-muted-foreground">Hours awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours This Period</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.hoursThisPeriod.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Total supervision hours logged</p>
          </CardContent>
        </Card>
      </div>

      {/* My Caseload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            My Caseload
          </CardTitle>
        </CardHeader>
        <CardContent>
          {caseloadClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No clients assigned to your caseload.
            </div>
          ) : (
            <div className="space-y-2">
              {caseloadClients.map((client) => (
                <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{client.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{client.role}</p>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compliance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Supervision Compliance Status</CardTitle>
        </CardHeader>
        <CardContent>
          {complianceData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No supervision requirements configured. Add supervisees to track compliance.
            </div>
          ) : (
            <div className="space-y-4">
              {complianceData.map((data) => (
                <div key={data.supervisee_user_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{data.supervisee_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {data.supervision_hours.toFixed(1)} / {data.total_direct_hours.toFixed(1)} hours
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <ComplianceGauge 
                      percentage={data.supervision_percentage} 
                      target={data.target_percentage} 
                    />
                    <Badge variant={data.is_compliant ? 'default' : 'destructive'}>
                      {data.is_compliant ? 'Compliant' : 'Non-Compliant'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
