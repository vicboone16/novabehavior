import { useSupervisionPerformance } from '@/hooks/useSupervisionPerformance';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Loader2, AlertTriangle, Shield, Users, Target, TrendingDown, TrendingUp, Award } from 'lucide-react';

function KPICard({ icon, label, value, variant = 'default' }: { 
  icon: React.ReactNode; label: string; value: number | string; variant?: 'default' | 'destructive' | 'warning' 
}) {
  const borderColor = variant === 'destructive' ? 'border-destructive/30' : variant === 'warning' ? 'border-orange-500/30' : 'border-border';
  return (
    <Card className={borderColor}>
      <CardContent className="py-3 px-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className={`text-2xl font-bold ${variant === 'destructive' ? 'text-destructive' : variant === 'warning' ? 'text-orange-500' : 'text-foreground'}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    off_track: { label: 'Off Track', cls: 'bg-destructive text-destructive-foreground' },
    at_risk: { label: 'At Risk', cls: 'bg-orange-500 text-white' },
    on_track: { label: 'On Track', cls: 'bg-emerald-500 text-white' },
    not_required: { label: 'N/A', cls: 'bg-muted text-muted-foreground' },
  };
  const s = map[status] || { label: status, cls: 'bg-muted' };
  return <Badge className={`${s.cls} text-xs`}>{s.label}</Badge>;
}

interface Props {
  agencyId: string | null;
}

export function SupervisionPerformanceTab({ agencyId }: Props) {
  const { supervisorLeaderboard, clientLeaderboard, loading, kpis } = useSupervisionPerformance(agencyId);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard icon={<AlertTriangle className="w-5 h-5" />} label="Off-Track Cases" value={kpis.offTrack} variant={kpis.offTrack > 0 ? 'destructive' : 'default'} />
        <KPICard icon={<Shield className="w-5 h-5" />} label="At-Risk Cases" value={kpis.atRisk} variant={kpis.atRisk > 0 ? 'warning' : 'default'} />
        <KPICard icon={<Target className="w-5 h-5" />} label="Avg Compliance %" value={`${kpis.avgCompliance}%`} variant={kpis.avgCompliance < 80 ? 'warning' : 'default'} />
        <KPICard icon={<Users className="w-5 h-5" />} label="Total Clients" value={kpis.totalClients} />
      </div>

      {/* Supervisor Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-4 h-4" />
            Supervisor Performance (30d)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {supervisorLeaderboard.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground text-sm">No supervision data available.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supervisor</TableHead>
                  <TableHead className="text-center">Clients</TableHead>
                  <TableHead className="text-center">Avg Compliance</TableHead>
                  <TableHead className="text-center">On Track</TableHead>
                  <TableHead className="text-center">At Risk</TableHead>
                  <TableHead className="text-center">Off Track</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supervisorLeaderboard.map(row => (
                  <TableRow key={row.staff_user_id}>
                    <TableCell className="font-medium">{row.staff_name || 'Unknown'}</TableCell>
                    <TableCell className="text-center">{row.total_clients}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <Progress value={row.avg_compliance_percent} className="h-2 w-16" />
                        <span className="text-xs">{Math.round(row.avg_compliance_percent)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-emerald-600 font-semibold">{row.on_track_count}</TableCell>
                    <TableCell className="text-center text-orange-500 font-semibold">{row.at_risk_count}</TableCell>
                    <TableCell className="text-center text-destructive font-semibold">{row.off_track_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Client Compliance Leaderboard (worst first) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingDown className="w-4 h-4" />
            Client Supervision Compliance (Worst First)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clientLeaderboard.length === 0 ? (
            <p className="text-center py-6 text-muted-foreground text-sm">No client supervision data available.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-center">Required Hrs</TableHead>
                  <TableHead className="text-center">Delivered Hrs</TableHead>
                  <TableHead className="text-center">Compliance</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientLeaderboard.slice(0, 25).map(row => (
                  <TableRow key={row.client_id}>
                    <TableCell className="font-medium">{row.client_name || 'Unknown'}</TableCell>
                    <TableCell className="text-center font-mono text-sm">{row.required_hours}</TableCell>
                    <TableCell className="text-center font-mono text-sm">{row.delivered_hours}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <Progress value={Math.min(row.compliance_percent, 100)} className="h-2 w-16" />
                        <span className="text-xs">{Math.round(row.compliance_percent)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={row.supervision_status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
