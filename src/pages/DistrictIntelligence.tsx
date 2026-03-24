import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Loader2, Building2, Users, AlertTriangle, TrendingUp, MapPin, UserCheck, UserX, Shield, School, BarChart3, Download, ChevronRight, Target, Layers } from 'lucide-react';
import {
  useAgencyOverview,
  useStaffingClinicianLoad,
  useStaffingAgencySummary,
  useUnstaffedStudents,
  useLocationComparison,
  useOrgProgramRecommendations,
  useSchoolComparison,
  useSupervisorCaseloadDashboard,
  useStaffingCapacityVsLoad,
  useEntityClientCounts,
  useStaffingRecommendations,
  useProgramRecommendations,
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

// ==================== AGENCY OVERVIEW ====================
function AgencyOverviewTab() {
  const { data: agencies, isLoading } = useAgencyOverview();
  const { data: staffSummary } = useStaffingAgencySummary();
  const { data: entityCounts } = useEntityClientCounts();
  const { data: staffingRecs } = useStaffingRecommendations();
  const { data: programRecs } = useProgramRecommendations();

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Entity Client Distribution</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity</TableHead>
                  <TableHead className="text-right">Clients</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(entityCounts || []).slice(0, 10).map((e: any) => (
                  <TableRow key={e.entity_id}>
                    <TableCell className="font-medium">
                      {e.entity_name || 'Unnamed Entity'}
                      {e.entity_type && <Badge variant="outline" className="ml-2 text-[10px] capitalize">{e.entity_type}</Badge>}
                    </TableCell>
                    <TableCell className="text-right font-mono">{e.client_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Open Recommendations */}
      {((staffingRecs?.length || 0) > 0 || (programRecs?.length || 0) > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(staffingRecs?.length || 0) > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base text-yellow-600 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Open Staffing Recommendations</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {staffingRecs?.slice(0, 5).map((r: any) => (
                  <div key={r.id} className="p-2 border rounded text-sm">
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.rationale}</p>
                    <Badge variant="outline" className="mt-1 text-xs">Priority: {r.priority}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {(programRecs?.length || 0) > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base text-primary flex items-center gap-2"><Target className="w-4 h-4" /> Open Program Recommendations</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {programRecs?.slice(0, 5).map((r: any) => (
                  <div key={r.id} className="p-2 border rounded text-sm">
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.rationale}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{r.recommendation_type}</Badge>
                      <Badge variant="secondary" className="text-xs">{r.affected_client_count || 0} affected</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== SCHOOL COMPARISON ====================
function SchoolComparisonTab() {
  const { data: schools, isLoading } = useSchoolComparison();
  const navigate = useNavigate();

  if (isLoading) return <Loader2 className="animate-spin mx-auto mt-8" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Schools" value={schools?.length || 0} icon={School} />
        <KpiCard title="Total Students" value={(schools || []).reduce((s, x: any) => s + (x.student_count || 0), 0)} icon={Users} />
        <KpiCard title="High Risk" value={(schools || []).reduce((s, x: any) => s + (x.high_risk_client_count || 0), 0)} icon={AlertTriangle}
          variant={(schools || []).some((x: any) => x.high_risk_client_count > 0) ? 'danger' : 'default'} />
        <KpiCard title="Avg Progress" value={
          schools?.length ? `${((schools || []).reduce((s, x: any) => s + (x.progress_score_avg || 0), 0) / (schools?.length || 1)).toFixed(1)}%` : '—'
        } icon={TrendingUp} variant="success" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">School Comparison</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead className="text-right">Students</TableHead>
                <TableHead className="text-right">Doc Compliance</TableHead>
                <TableHead className="text-right">Supervision</TableHead>
                <TableHead className="text-right">Utilization</TableHead>
                <TableHead className="text-right">Behavior ↓</TableHead>
                <TableHead className="text-right">Replacement ↑</TableHead>
                <TableHead className="text-right">Progress</TableHead>
                <TableHead className="text-right">High Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(schools || []).map((s: any) => (
                <TableRow key={s.school_id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{s.school_name}</TableCell>
                  <TableCell className="text-right font-mono">{s.student_count || 0}</TableCell>
                  <TableCell className="text-right">
                    {s.documentation_compliance_rate != null ? (
                      <span className={s.documentation_compliance_rate < 80 ? 'text-destructive font-medium' : ''}>
                        {Number(s.documentation_compliance_rate).toFixed(0)}%
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {s.supervision_compliance_rate != null ? `${Number(s.supervision_compliance_rate).toFixed(0)}%` : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {s.utilization_rate != null ? `${Number(s.utilization_rate).toFixed(0)}%` : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {s.behavior_reduction_avg != null ? `${Number(s.behavior_reduction_avg).toFixed(1)}%` : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {s.replacement_growth_avg != null ? `${Number(s.replacement_growth_avg).toFixed(1)}%` : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {s.progress_score_avg != null ? `${Number(s.progress_score_avg).toFixed(1)}` : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {(s.high_risk_client_count || 0) > 0 ? (
                      <Badge variant="destructive">{s.high_risk_client_count}</Badge>
                    ) : <span className="text-muted-foreground">0</span>}
                  </TableCell>
                </TableRow>
              ))}
              {(!schools || schools.length === 0) && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No schools found. Assign students to school entities to populate this view.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== SUPERVISOR CASELOAD ====================
function SupervisorCaseloadTab() {
  const { data: supervisors, isLoading } = useSupervisorCaseloadDashboard();

  if (isLoading) return <Loader2 className="animate-spin mx-auto mt-8" />;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Supervisors" value={supervisors?.length || 0} icon={Shield} />
        <KpiCard title="Total Clients" value={(supervisors || []).reduce((s, x: any) => s + (x.client_count || 0), 0)} icon={Users} />
        <KpiCard title="High Risk Clients" value={(supervisors || []).reduce((s, x: any) => s + (x.high_risk_clients || 0), 0)} icon={AlertTriangle}
          variant={(supervisors || []).some((x: any) => x.high_risk_clients > 0) ? 'danger' : 'default'} />
        <KpiCard title="Avg Progress" value={
          supervisors?.length ? `${((supervisors || []).reduce((s, x: any) => s + (x.avg_progress_score || 0), 0) / (supervisors?.length || 1)).toFixed(1)}` : '—'
        } icon={TrendingUp} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Supervisor Caseload Overview</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supervisor</TableHead>
                <TableHead className="text-right">Clients</TableHead>
                <TableHead className="text-right">High Risk</TableHead>
                <TableHead className="text-right">Avg Progress</TableHead>
                <TableHead className="text-right">Behavior ↓</TableHead>
                <TableHead className="text-right">Replacement ↑</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(supervisors || []).map((s: any) => (
                <TableRow key={s.supervisor_user_id}>
                  <TableCell className="font-medium">{s.supervisor_user_id?.slice(0, 8)}…</TableCell>
                  <TableCell className="text-right font-mono">{s.client_count || 0}</TableCell>
                  <TableCell className="text-right">
                    {(s.high_risk_clients || 0) > 0 ? (
                      <Badge variant="destructive">{s.high_risk_clients}</Badge>
                    ) : '0'}
                  </TableCell>
                  <TableCell className="text-right">{s.avg_progress_score != null ? Number(s.avg_progress_score).toFixed(1) : '—'}</TableCell>
                  <TableCell className="text-right">{s.avg_behavior_reduction != null ? `${Number(s.avg_behavior_reduction).toFixed(1)}%` : '—'}</TableCell>
                  <TableCell className="text-right">{s.avg_replacement_growth != null ? `${Number(s.avg_replacement_growth).toFixed(1)}%` : '—'}</TableCell>
                </TableRow>
              ))}
              {(!supervisors || supervisors.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No supervisor caseload data. Assign staff to clients to populate.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== STAFFING OPTIMIZATION ====================
function StaffingOptimizationTab() {
  const { data: clinicians, isLoading } = useStaffingClinicianLoad();
  const { data: unstaffed } = useUnstaffedStudents();
  const { data: capacity } = useStaffingCapacityVsLoad();
  const { data: staffingRecs } = useStaffingRecommendations();

  if (isLoading) return <Loader2 className="animate-spin mx-auto mt-8" />;

  const overloaded = (clinicians || []).filter((c: any) => c.load_status === 'overloaded');

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Total Clinicians" value={clinicians?.length || 0} icon={Users} />
        <KpiCard title="Overloaded" value={overloaded.length} icon={AlertTriangle}
          variant={overloaded.length > 0 ? 'danger' : 'success'} />
        <KpiCard title="Unstaffed Students" value={unstaffed?.length || 0} icon={UserX}
          variant={(unstaffed?.length || 0) > 0 ? 'danger' : 'success'} />
        <KpiCard title="Open Recs" value={staffingRecs?.length || 0} icon={Target}
          variant={(staffingRecs?.length || 0) > 0 ? 'warning' : 'default'} />
      </div>

      {/* Capacity vs Load */}
      {(capacity?.length || 0) > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Staff Capacity vs Load</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Max Clients</TableHead>
                  <TableHead className="text-right">Assigned</TableHead>
                  <TableHead className="text-right">High Intensity</TableHead>
                  <TableHead className="text-right">Capacity %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(capacity || []).map((c: any) => (
                  <TableRow key={c.user_id}>
                    <TableCell className="font-medium">{c.user_id?.slice(0, 8)}…</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs capitalize">{c.primary_role}</Badge></TableCell>
                    <TableCell className="text-right font-mono">{c.max_clients}</TableCell>
                    <TableCell className="text-right font-mono">{c.assigned_clients}</TableCell>
                    <TableCell className="text-right font-mono">{c.high_intensity_clients || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Progress value={Number(c.client_capacity_pct) || 0} className="w-16 h-2" />
                        <span className={`text-xs font-mono ${Number(c.client_capacity_pct) > 90 ? 'text-destructive' : ''}`}>
                          {Number(c.client_capacity_pct || 0).toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Clinician Load Table */}
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

// ==================== LOCATION COMPARISON ====================
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

// ==================== RECOMMENDATIONS ====================
function RecommendationsTab() {
  const { data: programRecs, isLoading: pLoading } = useProgramRecommendations();
  const { data: staffingRecs, isLoading: sLoading } = useStaffingRecommendations();

  if (pLoading || sLoading) return <Loader2 className="animate-spin mx-auto mt-8" />;

  const allRecs = [
    ...(programRecs || []).map((r: any) => ({ ...r, _type: 'program' })),
    ...(staffingRecs || []).map((r: any) => ({ ...r, _type: 'staffing' })),
  ].sort((a, b) => (a.priority || 99) - (b.priority || 99));

  return (
    <div className="space-y-3">
      {allRecs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No actionable recommendations at this time
          </CardContent>
        </Card>
      ) : (
        allRecs.map((r: any, i: number) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${r._type === 'staffing' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                  {r._type === 'staffing' ? <AlertTriangle className="w-4 h-4" /> : <Target className="w-4 h-4" />}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="font-semibold text-sm">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.rationale}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="text-xs capitalize">{r._type}</Badge>
                    {r.recommendation_type && <Badge variant="secondary" className="text-xs">{r.recommendation_type}</Badge>}
                    {r.affected_client_count > 0 && <Badge variant="secondary" className="text-xs">{r.affected_client_count} affected</Badge>}
                    <Badge variant="outline" className="text-xs">Priority: {r.priority || '—'}</Badge>
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

// ==================== MAIN PAGE ====================
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
          <TabsTrigger value="overview">Agency Overview</TabsTrigger>
          <TabsTrigger value="schools">School Comparison</TabsTrigger>
          <TabsTrigger value="supervisors">Supervisor Caseload</TabsTrigger>
          <TabsTrigger value="staffing">Staffing Optimization</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><AgencyOverviewTab /></TabsContent>
        <TabsContent value="schools"><SchoolComparisonTab /></TabsContent>
        <TabsContent value="supervisors"><SupervisorCaseloadTab /></TabsContent>
        <TabsContent value="staffing"><StaffingOptimizationTab /></TabsContent>
        <TabsContent value="locations"><LocationComparisonTab /></TabsContent>
        <TabsContent value="recommendations"><RecommendationsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
