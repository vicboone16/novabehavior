import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Brain, AlertTriangle, TrendingUp, TrendingDown, Minus, 
  Shield, Activity, Users, Clock, Target, Heart, 
  ChevronRight, CheckCircle2, XCircle, Search,
  Building2, CalendarClock, FileWarning, Radio, Zap,
  Eye, ShieldAlert, Award, Hand, FileText, Lightbulb,
  School
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { 
  useClinicalIntelligenceAccess, 
  useCICaseloadFeed,
  useCIAlertFeed,
  useCIInterventionRecs,
  type CaseloadFeedRow,
  type AlertFeedRow
} from '@/hooks/useClinicalIntelligence';
import { useClinicalTracking } from '@/hooks/useClinicalTracking';
import { useSupervisorSignals, type SupervisorSignal } from '@/hooks/useSupervisorSignals';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SupervisionPerformanceTab } from '@/components/intelligence/SupervisionPerformanceTab';
import { CaseloadIntelligenceCards } from '@/components/intelligence/CaseloadIntelligenceCards';
import { ClinicalAlertsPanel } from '@/components/intelligence/ClinicalAlertsPanel';
import { BCBAExportCenter } from '@/components/intelligence/BCBAExportCenter';
import { AlertRollupCards } from '@/components/intelligence/AlertRollupCards';
import { ClinicalIntelAlertList } from '@/components/intelligence/ClinicalIntelAlertList';
import { useClinicalIntelligenceAlerts } from '@/hooks/useClinicalIntelligenceAlerts';
import { useClassroomSummaries } from '@/hooks/useClassroomToday';
import { BeaconActivityKPIs } from '@/components/intelligence/BeaconActivityKPIs';

function getRiskColor(score: number) {
  if (score >= 75) return 'bg-destructive text-destructive-foreground';
  if (score >= 50) return 'bg-orange-500 text-white';
  if (score >= 25) return 'bg-yellow-500 text-white';
  return 'bg-emerald-500 text-white';
}

function getTrendIcon(score: number) {
  if (score > 5) return <TrendingUp className="w-4 h-4 text-destructive" />;
  if (score < -5) return <TrendingDown className="w-4 h-4 text-emerald-500" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

function getTrendLabel(score: number) {
  if (score > 5) return 'Worsening';
  if (score < -5) return 'Improving';
  return 'Stable';
}

function getFreshnessLabel(score: number) {
  if (score >= 80) return { label: 'Fresh', color: 'text-emerald-500' };
  if (score >= 50) return { label: 'OK', color: 'text-yellow-500' };
  if (score >= 20) return { label: 'Stale', color: 'text-orange-500' };
  return { label: 'Critical', color: 'text-destructive' };
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-destructive text-destructive-foreground',
    action: 'bg-orange-500 text-white',
    high: 'bg-orange-500 text-white',
    watch: 'bg-yellow-500 text-white',
    medium: 'bg-yellow-500 text-white',
    info: 'bg-blue-500 text-white',
  };
  return (
    <Badge className={`${colors[severity] || 'bg-muted'} text-xs`}>
      {severity}
    </Badge>
  );
}

function AuthStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    on_track: 'bg-emerald-500 text-white',
    at_risk: 'bg-orange-500 text-white',
    critical: 'bg-destructive text-destructive-foreground',
    expired: 'bg-muted text-muted-foreground',
  };
  const labels: Record<string, string> = {
    on_track: 'On Track',
    at_risk: 'At Risk',
    critical: 'Critical',
    expired: 'Expired',
  };
  return <Badge className={`${colors[status] || 'bg-muted'} text-xs`}>{labels[status] || status}</Badge>;
}

export default function Intelligence() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentAgency, agencies } = useAgencyContext();
  const { hasCIDAccess, hasCrossAgency, loading: accessLoading } = useClinicalIntelligenceAccess();
  
  // Agency scope: 'all' for cross-agency, specific ID otherwise
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>(() => {
    return hasCrossAgency ? 'all' : (currentAgency?.id || '');
  });

  // Resolve effective agency ID for queries
  const effectiveAgencyId = useMemo(() => {
    if (selectedAgencyId === 'all' && hasCrossAgency) return 'all';
    if (selectedAgencyId && selectedAgencyId !== 'all') return selectedAgencyId;
    return currentAgency?.id || null;
  }, [selectedAgencyId, hasCrossAgency, currentAgency?.id]);

  // Update default when access info loads
  useState(() => {
    if (!accessLoading && hasCrossAgency && !selectedAgencyId) {
      setSelectedAgencyId('all');
    }
  });
  
  // Use view-based hooks
  const { rows: caseloadRows, loading: metricsLoading } = useCICaseloadFeed(effectiveAgencyId);
  const { alerts, loading: alertsLoading, resolveAlert } = useCIAlertFeed(effectiveAgencyId);
  const { recs, loading: recsLoading } = useCIInterventionRecs(effectiveAgencyId);
  const { authorizations, forecasts, loading: authLoading, kpis: authKpis } = useClinicalTracking(effectiveAgencyId);
  
  // Unified CI alerts for priority alerts tab
  const { alerts: ciIntelAlerts, loading: ciIntelLoading, resolveAlert: resolveCIAlert } = useClinicalIntelligenceAlerts(effectiveAgencyId);
  
  // Compute supervision off-track from alerts feed
  const supervisionOffTrackCount = useMemo(() => {
    return alerts.filter(a => 
      a.category?.startsWith('supervision_off_track') || 
      a.category?.startsWith('supervision_at_risk')
    ).length;
  }, [alerts]);
  const { signals, loading: signalsLoading, resolveSignal } = useSupervisorSignals(effectiveAgencyId);
  const { classrooms: classroomSummaries, loading: classroomsLoading } = useClassroomSummaries(effectiveAgencyId);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [trendFilter, setTrendFilter] = useState<string>('all');
  const [signalTypeFilter, setSignalTypeFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('caseload');

  // Agency display name
  const agencyDisplayName = useMemo(() => {
    if (selectedAgencyId === 'all') return 'All Agencies';
    const membership = agencies.find(a => a.agency_id === selectedAgencyId);
    if (membership) return membership.agency.name;
    return currentAgency?.name || 'Agency';
  }, [selectedAgencyId, agencies, currentAgency]);

  // Filter caseload (client_name comes from view)
  const filteredCaseload = useMemo(() => {
    let data = [...caseloadRows];
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(d => (d.client_name || '').toLowerCase().includes(q));
    }
    
    if (riskFilter !== 'all') {
      const [min, max] = riskFilter.split('-').map(Number);
      data = data.filter(d => (d.risk_score ?? 0) >= min && (d.risk_score ?? 0) <= max);
    }
    
    if (trendFilter === 'worsening') data = data.filter(d => (d.trend_score ?? 0) > 5);
    else if (trendFilter === 'improving') data = data.filter(d => (d.trend_score ?? 0) < -5);
    else if (trendFilter === 'stable') data = data.filter(d => (d.trend_score ?? 0) >= -5 && (d.trend_score ?? 0) <= 5);
    
    return data.sort((a, b) => (b.risk_score ?? 0) - (a.risk_score ?? 0));
  }, [caseloadRows, searchQuery, riskFilter, trendFilter]);

  // KPIs from view data
  const kpis = useMemo(() => {
    const total = caseloadRows.length;
    const highRisk = caseloadRows.filter(m => (m.risk_score ?? 0) >= 75).length;
    const staleData = caseloadRows.filter(m => (m.data_freshness ?? 100) <= 20).length;
    const plateauedGoals = caseloadRows.filter(m => (m.goal_velocity_score ?? 100) < 30).length;
    const lowFidelity = caseloadRows.filter(m => (m.fidelity_score ?? 100) < 80).length;
    const lowParent = caseloadRows.filter(m => (m.parent_impl_score ?? 100) < 60).length;
    const openAlerts = alerts.length;
    return { total, highRisk, staleData, plateauedGoals, lowFidelity, lowParent, openAlerts };
  }, [caseloadRows, alerts]);

  // Sorted alerts (all unresolved from view)
  const sortedAlerts = useMemo(() => {
    const severityOrder: Record<string, number> = { critical: 0, action: 1, high: 1, watch: 2, medium: 2, info: 3 };
    return [...alerts].sort((a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4));
  }, [alerts]);

  // Filtered signals
  const filteredSignals = useMemo(() => {
    const severityOrder: Record<string, number> = { critical: 0, high: 1, action: 2, watch: 3 };
    let data = [...signals];
    if (signalTypeFilter !== 'all') data = data.filter(s => s.signal_type === signalTypeFilter);
    return data.sort((a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4));
  }, [signals, signalTypeFilter]);

  if (accessLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasCIDAccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <Brain className="w-12 h-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-bold">Clinical Intelligence</h2>
            <p className="text-muted-foreground">
              This feature is not enabled for your account. Contact your administrator to request access to the Clinical Intelligence module.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoading = metricsLoading || alertsLoading;

  return (
    <div className="space-y-6">
      {/* Header with Agency Selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Brain className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clinical Intelligence</h1>
            <p className="text-sm text-muted-foreground">
              {agencyDisplayName} — Caseload Command Center
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedAgencyId || currentAgency?.id || ''} onValueChange={setSelectedAgencyId}>
            <SelectTrigger className="w-[220px]">
              <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Select Agency" />
            </SelectTrigger>
            <SelectContent>
              {hasCrossAgency && (
                <SelectItem value="all">All Agencies (Global)</SelectItem>
              )}
              {agencies.map(m => (
                <SelectItem key={m.agency_id} value={m.agency_id}>
                  {m.agency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {kpis.openAlerts > 0 && (
            <Badge variant="destructive" className="text-sm px-3 py-1">
              {kpis.openAlerts} Open Alert{kpis.openAlerts !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <KPICard icon={<Users className="w-5 h-5" />} label="My Clients" value={kpis.total} />
        <KPICard icon={<AlertTriangle className="w-5 h-5" />} label="High Risk" value={kpis.highRisk} variant={kpis.highRisk > 0 ? 'destructive' : 'default'} />
        <KPICard icon={<Clock className="w-5 h-5" />} label="Stale Data" value={kpis.staleData} variant={kpis.staleData > 0 ? 'warning' : 'default'} />
        <KPICard icon={<Target className="w-5 h-5" />} label="Plateaued Goals" value={kpis.plateauedGoals} variant={kpis.plateauedGoals > 0 ? 'warning' : 'default'} />
        <KPICard icon={<Shield className="w-5 h-5" />} label="Fidelity Low" value={kpis.lowFidelity} variant={kpis.lowFidelity > 0 ? 'warning' : 'default'} />
        <KPICard icon={<Heart className="w-5 h-5" />} label="Parent Training Due" value={kpis.lowParent} variant={kpis.lowParent > 0 ? 'warning' : 'default'} />
        <KPICard icon={<CalendarClock className="w-5 h-5" />} label="Auth Expiring" value={authKpis.authExpiringSoon} variant={authKpis.authExpiringSoon > 0 ? 'destructive' : 'default'} />
        <KPICard icon={<Activity className="w-5 h-5" />} label="Open Alerts" value={kpis.openAlerts} variant={kpis.openAlerts > 0 ? 'destructive' : 'default'} />
      </div>

      {/* Clinical Intelligence Alert Rollup Cards */}
      <AlertRollupCards agencyId={effectiveAgencyId} />

      {/* Skill/Replacement Intelligence Summary Cards */}
      <CaseloadIntelligenceCards agencyId={effectiveAgencyId} />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="caseload">Caseload</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
            {kpis.openAlerts > 0 && (
              <Badge variant="destructive" className="ml-1.5 text-[10px] px-1.5 py-0">{kpis.openAlerts}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="clinical-alerts">
            <Lightbulb className="w-4 h-4 mr-1" />
            Intelligence Alerts
          </TabsTrigger>
          <TabsTrigger value="signals">
            <Radio className="w-4 h-4 mr-1" />
            Signals
            {signals.length > 0 && (
              <Badge className="ml-1.5 text-[10px] px-1.5 py-0 bg-orange-500 text-white">{signals.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="clinical-tracking">
            <CalendarClock className="w-4 h-4 mr-1" />
            Clinical Tracking
          </TabsTrigger>
          <TabsTrigger value="supervision">
            <Award className="w-4 h-4 mr-1" />
            Supervision
          </TabsTrigger>
          <TabsTrigger value="exports">
            <FileText className="w-4 h-4 mr-1" />
            BCBA Exports
          </TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="classroom-today">
            <School className="w-4 h-4 mr-1" />
            Classroom Today
            {classroomSummaries.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{classroomSummaries.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Caseload Tab */}
        <TabsContent value="caseload" className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search clients..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Risk Band" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk</SelectItem>
                <SelectItem value="75-100">High (75–100)</SelectItem>
                <SelectItem value="50-74">Moderate (50–74)</SelectItem>
                <SelectItem value="25-49">Low-Mod (25–49)</SelectItem>
                <SelectItem value="0-24">Low (0–24)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={trendFilter} onValueChange={setTrendFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Trend" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trends</SelectItem>
                <SelectItem value="worsening">Worsening</SelectItem>
                <SelectItem value="stable">Stable</SelectItem>
                <SelectItem value="improving">Improving</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCaseload.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Brain className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {caseloadRows.length === 0 
                    ? 'No client metrics computed yet. The intelligence engine will populate data automatically.'
                    : 'No clients match your filters.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-center">Risk</TableHead>
                    <TableHead className="text-center">Trend</TableHead>
                    <TableHead className="text-center">Freshness</TableHead>
                    <TableHead className="text-center">Goal Velocity</TableHead>
                    <TableHead className="text-center">Parent Impl.</TableHead>
                    <TableHead className="text-center">Fidelity</TableHead>
                    <TableHead className="text-center">Alerts</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCaseload.map(row => {
                    const freshness = getFreshnessLabel(row.data_freshness ?? 0);
                    return (
                      <TableRow key={row.client_id}>
                        <TableCell className="font-medium">{row.client_name || 'Unknown'}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={`${getRiskColor(row.risk_score ?? 0)} text-xs font-mono`}>
                            {Math.round(row.risk_score ?? 0)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {getTrendIcon(row.trend_score ?? 0)}
                            <span className="text-xs text-muted-foreground">{getTrendLabel(row.trend_score ?? 0)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-medium ${freshness.color}`}>{freshness.label}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-mono">{Math.round(row.goal_velocity_score ?? 0)}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-mono">{Math.round(row.parent_impl_score ?? 0)}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-mono ${(row.fidelity_score ?? 100) < 80 ? 'text-orange-500' : ''}`}>
                            {Math.round(row.fidelity_score ?? 0)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {(row.open_alert_count ?? 0) > 0 ? (
                            <Badge variant="destructive" className="text-[10px]">{row.open_alert_count}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate(`/intelligence/clients/${row.client_id}`)}>
                            View <ChevronRight className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-3">
          {alertsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : sortedAlerts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                <p className="text-muted-foreground">No alerts. Your caseload is looking good!</p>
              </CardContent>
            </Card>
          ) : (
            sortedAlerts.map(alert => (
              <Card key={alert.alert_id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <SeverityBadge severity={alert.severity} />
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{alert.message}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px]">{alert.category}</Badge>
                          {alert.client_name && <span>{alert.client_name}</span>}
                          <span>{new Date(alert.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={async () => {
                          if (!user) return;
                          const ok = await resolveAlert(alert.alert_id, user.id);
                          if (ok) toast.success('Alert resolved');
                        }}
                      >
                        Resolve
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Signals Tab */}
        <TabsContent value="signals" className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={signalTypeFilter} onValueChange={setSignalTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Signal Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="escalation">Escalation</SelectItem>
                <SelectItem value="incident">Incident</SelectItem>
                <SelectItem value="risk">High Risk</SelectItem>
                <SelectItem value="pattern">Pattern</SelectItem>
                <SelectItem value="reinforcement">Reinforcement Gap</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 text-xs text-muted-foreground ml-auto">
              <Radio className="w-3.5 h-3.5 text-primary animate-pulse" />
              Live — updates in real-time
            </div>
          </div>

          {signalsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSignals.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">No active signals</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Supervisor signals appear here when escalation spikes, high-severity incidents, or pattern detections are triggered.
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredSignals.map(signal => (
              <Card key={signal.id} className={signal.severity === 'critical' ? 'border-destructive/40' : signal.severity === 'high' ? 'border-orange-500/40' : ''}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="shrink-0 mt-0.5">
                        {signal.severity === 'critical' ? (
                          <Zap className="w-5 h-5 text-destructive" />
                        ) : signal.severity === 'high' ? (
                          <AlertTriangle className="w-5 h-5 text-orange-500" />
                        ) : (
                          <Eye className="w-5 h-5 text-yellow-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <SeverityBadge severity={signal.severity} />
                          <Badge variant="outline" className="text-[10px]">{signal.signal_type}</Badge>
                          <span className="text-[10px] text-muted-foreground uppercase">{signal.source}</span>
                        </div>
                        <p className="font-medium text-sm">{signal.title}</p>
                        {signal.message && (
                          <p className="text-xs text-muted-foreground mt-0.5">{signal.message}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                          {signal.client_name && <span className="font-medium text-foreground">{signal.client_name}</span>}
                          <span>{new Date(signal.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (!user) return;
                          const ok = await resolveSignal(signal.id, user.id);
                          if (ok) toast.success('Signal resolved');
                        }}
                      >
                        Resolve
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Clinical Tracking Tab */}
        <TabsContent value="clinical-tracking" className="space-y-4">
          {authLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPICard icon={<FileWarning className="w-5 h-5" />} label="Hours At Risk" value={authKpis.hoursAtRisk} variant={authKpis.hoursAtRisk > 0 ? 'warning' : 'default'} />
                <KPICard icon={<CalendarClock className="w-5 h-5" />} label="Auth Expiring ≤30d" value={authKpis.authExpiringSoon} variant={authKpis.authExpiringSoon > 0 ? 'destructive' : 'default'} />
                <KPICard icon={<Shield className="w-5 h-5" />} label="Off-Track" value={authKpis.offTrackForecasts} variant={authKpis.offTrackForecasts > 0 ? 'destructive' : 'default'} />
                <KPICard icon={<AlertTriangle className="w-5 h-5" />} label="At Risk" value={authKpis.atRiskForecasts} variant={authKpis.atRiskForecasts > 0 ? 'warning' : 'default'} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPICard icon={<Activity className="w-5 h-5" />} label="Avg Burn Rate %" value={authKpis.avgBurnRate} variant={authKpis.avgBurnRate < 70 ? 'destructive' : authKpis.avgBurnRate > 120 ? 'warning' : 'default'} />
                <KPICard icon={<Heart className="w-5 h-5" />} label="Parent Training Due" value={kpis.lowParent} />
                <KPICard icon={<Shield className="w-5 h-5" />} label="Supervision Off-Track" value={supervisionOffTrackCount} variant={supervisionOffTrackCount > 0 ? 'destructive' : 'default'} />
                <KPICard icon={<Users className="w-5 h-5" />} label="Open Alerts" value={kpis.openAlerts} variant={kpis.openAlerts > 0 ? 'warning' : 'default'} />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarClock className="w-4 h-4" />
                    Authorization Utilization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {authorizations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No active authorizations found for the selected agency scope.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client</TableHead>
                          <TableHead>Auth #</TableHead>
                          <TableHead className="text-center">Days Left</TableHead>
                          <TableHead className="text-center">Units Used</TableHead>
                          <TableHead className="text-center">Utilization</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {authorizations.map(auth => (
                          <TableRow key={auth.authorization_id}>
                            <TableCell className="font-medium">{auth.client_name}</TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground">{auth.auth_number}</TableCell>
                            <TableCell className="text-center">
                              <span className={auth.days_remaining <= 30 ? 'text-destructive font-semibold' : ''}>
                                {auth.days_remaining}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="font-mono text-sm">{auth.units_used} / {auth.units_approved}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center gap-2">
                                <Progress value={auth.pct_used} className="h-2 w-20" />
                                <span className="text-xs text-muted-foreground">{auth.pct_used}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <AuthStatusBadge status={auth.computed_status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Supervision Performance Tab */}
        <TabsContent value="supervision" className="space-y-4">
          <SupervisionPerformanceTab agencyId={effectiveAgencyId} />
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-3">
          {recsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : recs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No intervention recommendations yet. The engine will generate these based on client data and hypotheses.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {recs.map(rec => (
                <Card key={rec.id}>
                  <CardContent className="py-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{rec.client_id}</span>
                      <Badge className="bg-primary/10 text-primary font-mono text-xs">
                        Score: {Math.round(rec.score)}
                      </Badge>
                    </div>
                    {rec.reasons_json && (
                      <p className="text-xs text-muted-foreground">
                        {(rec.reasons_json as any).basis || 'Fit + Evidence + Feasibility'}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-[10px]">{rec.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Clinical Intelligence Alerts Tab — unified with filtering + drilldown */}
        <TabsContent value="clinical-alerts" className="space-y-4">
          <ClinicalAlertsPanel agencyId={effectiveAgencyId} />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mt-4">
            Priority Alerts (All Domains)
          </h3>
          <ClinicalIntelAlertList
            alerts={ciIntelAlerts}
            loading={ciIntelLoading}
            resolveAlert={resolveCIAlert}
            showFilters
            emptyMessage="No active intelligence alerts right now"
          />
        </TabsContent>

        {/* BCBA Export Center Tab */}
        <TabsContent value="exports" className="space-y-4">
          <BCBAExportCenter agencyId={effectiveAgencyId} />
        </TabsContent>

        {/* Classroom Today Tab */}
        <TabsContent value="classroom-today" className="space-y-4">
          {classroomsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : classroomSummaries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <School className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No classrooms found for the selected agency.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {classroomSummaries.map(room => (
                <Card key={room.id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => navigate(`/intelligence/classroom/${room.id}?from=/intelligence`)}>
                  <CardContent className="py-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <School className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm">{room.name}</span>
                      </div>
                      {room.activeSignalCount > 0 && (
                        <Badge className="bg-orange-500/15 text-orange-600 dark:text-orange-400 text-[10px]">
                          {room.activeSignalCount} signal{room.activeSignalCount > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {room.studentCount} students</span>
                      <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {room.behaviorEventsToday} events</span>
                      <span className="flex items-center gap-1"><Award className="w-3 h-3" /> {room.pointsAwardedToday} pts</span>
                    </div>
                    {(room.maydayEventsToday > 0 || room.staffPresent > 0) && (
                      <div className="flex gap-3 text-[10px] text-muted-foreground">
                        {room.maydayEventsToday > 0 && (
                          <span className="text-destructive font-medium">🚨 {room.maydayEventsToday} mayday</span>
                        )}
                        {room.staffPresent > 0 && (
                          <span>👤 {room.staffPresent} staff present</span>
                        )}
                      </div>
                    )}
                    <p className="text-[11px] italic text-muted-foreground">{room.signalSummary}</p>
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm" className="h-6 text-[11px] flex-1" onClick={(e) => { e.stopPropagation(); setActiveTab('signals'); }}>
                        <Eye className="w-3 h-3 mr-1" /> Signals
                      </Button>
                      <Button variant="default" size="sm" className="h-6 text-[11px] flex-1" onClick={(e) => { e.stopPropagation(); navigate(`/intelligence/classroom/${room.id}?from=/intelligence`); }}>
                        <School className="w-3 h-3 mr-1" /> Open Today
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPICard({ icon, label, value, variant = 'default' }: { 
  icon: React.ReactNode; 
  label: string; 
  value: number; 
  variant?: 'default' | 'destructive' | 'warning' 
}) {
  const borderColor = variant === 'destructive' ? 'border-destructive/30' : variant === 'warning' ? 'border-orange-500/30' : 'border-border';
  return (
    <Card className={`${borderColor}`}>
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
