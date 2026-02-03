import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldAlert, ShieldX, AlertTriangle, Users, Clock } from 'lucide-react';
import { useCoverageTasks } from '@/hooks/useCoverage';

export function CoverageDashboardWidgets() {
  const { stats, tasks } = useCoverageTasks({ status: 'pending' });

  // Calculate additional stats
  const blockedSessions = tasks.filter(t => t.task_type === 'resolve_coverage_block').length;
  const clientsMissingRules = new Set(
    tasks.filter(t => t.task_type === 'verify_coverage').map(t => t.client_id)
  ).size;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Due in 7 Days */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Due in 7 Days</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.due7}</div>
          <p className="text-xs text-muted-foreground">
            {stats.overdue > 0 && (
              <span className="text-red-600">{stats.overdue} overdue</span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Due in 14 Days */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Due in 14 Days</CardTitle>
          <Shield className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.due14}</div>
          <p className="text-xs text-muted-foreground">coverage verifications</p>
        </CardContent>
      </Card>

      {/* Sessions Blocked */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sessions Blocked</CardTitle>
          <ShieldX className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{blockedSessions}</div>
          <p className="text-xs text-muted-foreground">due to coverage issues</p>
        </CardContent>
      </Card>

      {/* Missing Rules */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Missing Rules</CardTitle>
          <Users className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{clientsMissingRules}</div>
          <p className="text-xs text-muted-foreground">clients need coverage setup</p>
        </CardContent>
      </Card>
    </div>
  );
}
