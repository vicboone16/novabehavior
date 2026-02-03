import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ComplianceData } from '@/types/supervision';
import { ComplianceGauge } from './ComplianceGauge';

export function SupervisionDashboard() {
  const [loading, setLoading] = useState(true);
  const [complianceData, setComplianceData] = useState<ComplianceData[]>([]);
  const [stats, setStats] = useState({
    totalSupervisees: 0,
    compliantCount: 0,
    pendingApproval: 0,
    hoursThisPeriod: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

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

      setStats({
        totalSupervisees: requirements?.length || 0,
        compliantCount: 0, // Would calculate based on actual data
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
            <CardTitle className="text-sm font-medium">Compliant</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.compliantCount}</div>
            <p className="text-xs text-muted-foreground">Meeting supervision requirements</p>
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
