import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Loader2, Building2, Users, AlertTriangle, TrendingUp, MapPin, UserCheck, UserX, Shield } from 'lucide-react';
import {
  useAgencyOverview,
  useStaffingClinicianLoad,
  useStaffingAgencySummary,
  useUnstaffedStudents,
  useLocationComparison,
  useOrgProgramRecommendations,
} from '@/hooks/useDistrictAgencyIntelligence';

function KpiCard({ title, value, subtitle, icon: Icon, variant = 'default' }: {
  title: string; value: string | number; subtitle?: string;
  icon: any; variant?: 'default' | 'warning' | 'danger' | 'success';
}) {
  const colors = {
    default: 'text-primary',
    warning: 'text-yellow-600',
    danger: 'text-destructive',
    success: 'text-emerald-600',
  };
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p className={`text-2xl font-bold ${colors[variant]}`}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg bg-muted ${colors[variant]}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    overloaded: { label: 'Overloaded', variant: 'destructive' },
    high: { label: 'High', variant: 'default' },
    normal: { label: 'Normal', variant: 'secondary' },
    idle: { label: 'Idle', variant: 'outline' },
  };
  const cfg = map[status] || { label: status, variant: 'outline' as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

function AgencyOverviewTab() {
  const { data: agencies, isLoading } = useAgencyOverview();
  const { data: staffSummary } = useStaffingAgencySummary();

  if (isLoading) return <Loader2 className="animate-spin mx-auto mt-8" />;

  const totals = (agencies || []).reduce(
    (acc, a) => ({
      clients: acc.clients + (a.total_clients || 0),
      active: acc.active + (a.active_clients || 0),
      locations: acc.locations + (a.total_locations || 0),
      staff: acc.staff + (a.total_staff || 0),
      commSupport: acc.commSupport + (a.communication_support_count || 0),
    }),
    { clients: 0, active: 0, locations: 0, staff: 0, commSupport: 0 }
  );

  const summary = staffSummary?.[0];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Total Clients" value={totals.clients} icon={Users} />
        <KpiCard title="Active Clients" value={totals.active} icon={UserCheck} variant="success" />
        <KpiCard title="Locations" value={totals.locations} icon={MapPin} />
        <KpiCard title="Total Staff" value={totals.staff} icon={Building2} />
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard title="Supervisors" value={summary.total_supervisors || 0} icon={Shield} />
          <KpiCard title="Direct Care" value={summary.total_direct_care || 0} icon={UserCheck} />
          <KpiCard title="Overloaded Staff" value={summary.overloaded_staff || 0} icon={AlertTriangle}
            variant={summary.overloaded_staff > 0 ? 'danger' : 'default'} />
          <KpiCard title="Strain Index" value={`${summary.strain_index || 0}%`} icon={TrendingUp}
            variant={summary.strain_index > 30 ? 'danger' : summary.strain_index > 15 ? 'warning' : 'success'}
            subtitle={summary.strain_index > 30 ? 'Critical' : summary.strain_index > 15 ? 'Elevated' : 'Healthy'} />
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Agencies</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agency</TableHead>
                <TableHead className="text-right">Clients</TableHead>
                <TableHead className="text-right">Active</TableHead>
                <TableHead className="text-right">Locations</TableHead>
                <TableHead className="text-right">Staff</TableHead>
                <TableHead className="text-right">Comm Support</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(agencies || []).map((a: any) => (
                <TableRow key={a.agency_id}>
                  <TableCell className="font-medium">{a.agency_name}</TableCell>
                  <TableCell className="text-right">{a.total_clients}</TableCell>
                  <TableCell className="text-right">{a.active_clients}</TableCell>
                  <TableCell className="text-right">{a.total_locations}</TableCell>
                  <TableCell className="text-right">{a.total_staff}</TableCell>
                  <TableCell className="text-right">{a.communication_support_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StaffingOptimizationTab() {
  const { data: clinicians, isLoading } = useStaffingClinicianLoad();
  const { data: unstaffed } = useUnstaffedStudents();

  if (isLoading) return <Loader2 className="animate-spin mx-auto mt-8" />;

  const overloaded = (clinicians || []).filter((c: any) => c.load_status === 'overloaded');
  const high = (clinicians || []).filter((c: any) => c.load_status === 'high');
  const idle = (clinicians || []).filter((c: any) => c.load_status === 'idle');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Total Clinicians" value={clinicians?.length || 0} icon={Users} />
        <KpiCard title="Overloaded" value={overloaded.length} icon={AlertTriangle}
          variant={overloaded.length > 0 ? 'danger' : 'success'} />
        <KpiCard title="High Load" value={high.length} icon={TrendingUp}
          variant={high.length > 0 ? 'warning' : 'default'} />
        <KpiCard title="Unstaffed Students" value={unstaffed?.length || 0} icon={UserX}
          variant={(unstaffed?.length || 0) > 0 ? 'danger' : 'success'} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Staff Caseload Distribution</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Credential</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead className="text-right">Active Cases</TableHead>
                <TableHead className="text-right">Primary</TableHead>
                <TableHead className="text-right">Supervised</TableHead>
                <TableHead>Load Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(clinicians || []).map((c: any) => (
                <TableRow key={c.profile_id}>
                  <TableCell className="font-medium">{c.first_name} {c.last_name}</TableCell>
                  <TableCell><Badge variant="outline">{c.credential}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground capitalize">{c.staff_tier?.replace('_', ' ')}</TableCell>
                  <TableCell className="text-right font-mono">{c.active_caseload}</TableCell>
                  <TableCell className="text-right font-mono">{c.primary_cases}</TableCell>
                  <TableCell className="text-right font-mono">{c.supervised_cases}</TableCell>
                  <TableCell><LoadStatusBadge status={c.load_status} /></TableCell>
                </TableRow>
              ))}
              {(!clinicians || clinicians.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No active clinicians with credentials found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {(unstaffed?.length || 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-destructive flex items-center gap-2">
              <UserX className="w-4 h-4" /> Unstaffed Active Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Agency</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Communication</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(unstaffed || []).map((s: any) => (
                  <TableRow key={s.student_id}>
                    <TableCell className="font-medium">{s.first_name} {s.last_name}</TableCell>
                    <TableCell>{s.agency_name || '—'}</TableCell>
                    <TableCell>{s.school_name || '—'}</TableCell>
                    <TableCell>
                      {s.communication_level ? (
                        <Badge variant="outline" className="text-xs">{s.communication_level}</Badge>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function LocationComparisonTab() {
  const { data: locations, isLoading } = useLocationComparison();

  if (isLoading) return <Loader2 className="animate-spin mx-auto mt-8" />;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Location Comparison</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Location</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>City/State</TableHead>
              <TableHead className="text-right">Clients</TableHead>
              <TableHead className="text-right">Staff</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(locations || []).map((l: any) => (
              <TableRow key={l.location_id}>
                <TableCell className="font-medium">{l.location_name}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs capitalize">{l.location_type || 'office'}</Badge></TableCell>
                <TableCell className="text-sm text-muted-foreground">{[l.city, l.state].filter(Boolean).join(', ') || '—'}</TableCell>
                <TableCell className="text-right font-mono">{l.client_count}</TableCell>
                <TableCell className="text-right font-mono">{l.staff_count}</TableCell>
                <TableCell>
                  <Badge variant={l.is_active ? 'secondary' : 'outline'}>
                    {l.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {(!locations || locations.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No locations found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function RecommendationsTab() {
  const { data: recs, isLoading } = useOrgProgramRecommendations();

  if (isLoading) return <Loader2 className="animate-spin mx-auto mt-8" />;

  return (
    <div className="space-y-3">
      {(!recs || recs.length === 0) ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No actionable recommendations at this time
          </CardContent>
        </Card>
      ) : (
        recs.map((r: any, i: number) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-yellow-100 text-yellow-700">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-sm">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.rationale}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">{r.recommendation_type}</Badge>
                    <Badge variant="secondary" className="text-xs">{r.affected_count} affected</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

export default function DistrictIntelligence() {
  const [tab, setTab] = useState('overview');

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">District & Agency Intelligence</h1>
        <p className="text-sm text-muted-foreground">Cross-organization visibility, staffing optimization, and program recommendations</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="staffing">Staffing Optimization</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><AgencyOverviewTab /></TabsContent>
        <TabsContent value="staffing"><StaffingOptimizationTab /></TabsContent>
        <TabsContent value="locations"><LocationComparisonTab /></TabsContent>
        <TabsContent value="recommendations"><RecommendationsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
