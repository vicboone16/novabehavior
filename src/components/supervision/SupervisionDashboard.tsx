import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ComplianceGauge } from './ComplianceGauge';
import { useAuth } from '@/contexts/AuthContext';

interface ComplianceRow {
  requirement_id: string;
  supervisee_user_id: string;
  supervisor_user_id: string;
  supervisee_name: string;
  supervisor_name: string;
  supervisee_credential: string | null;
  requirement_type: string;
  target_percentage: number;
  billing_period_start: string;
  billing_period_end: string;
  supervision_hours: number;
  direct_supervision_hours: number;
  indirect_supervision_hours: number;
  total_fieldwork_hours: number;
  total_logs: number;
  pending_approval_count: number;
}

export function SupervisionDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [complianceData, setComplianceData] = useState<ComplianceRow[]>([]);
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
      
      const { data, error } = await supabase
        .from('v_supervision_compliance' as any)
        .select('*')
        .eq('supervisor_user_id', user!.id);

      if (error) throw error;

      const rows = (data || []) as unknown as ComplianceRow[];
      const totalPending = rows.reduce((sum, r) => sum + r.pending_approval_count, 0);
      const totalHours = rows.reduce((sum, r) => sum + r.supervision_hours, 0);
      const compliant = rows.filter(r => {
        if (r.target_percentage <= 0) return true;
        const pct = r.total_fieldwork_hours > 0 ? (r.supervision_hours / r.total_fieldwork_hours) * 100 : 0;
        return pct >= r.target_percentage;
      }).length;

      setComplianceData(rows);
      setStats({
        totalSupervisees: rows.length,
        compliantCount: compliant,
        pendingApproval: totalPending,
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
      <div className="grid gap-4 md:grid-cols-3">
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
