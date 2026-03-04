import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, AlertTriangle, TrendingUp, TrendingDown, Minus,
  Shield, Activity, Users, Clock, Target, Heart,
  ChevronRight, CheckCircle2, Search,
  CalendarClock, FileWarning, Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  useCICaseloadFeed,
  useCIAlertFeed,
  useCIInterventionRecs,
  type CaseloadFeedRow,
  type AlertFeedRow,
} from '@/hooks/useClinicalIntelligence';
import { useClinicalTracking } from '@/hooks/useClinicalTracking';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

// === Helpers ===

function getRiskColor(score: number) {
  if (score >= 75) return 'bg-destructive text-destructive-foreground';
  if (score >= 50) return 'bg-orange-500 text-white';
  if (score >= 25) return 'bg-yellow-500 text-white';
  return 'bg-emerald-500 text-white';
}

function getTrendIcon(score: number) {
  if (score > 5) return <TrendingUp className="w-3.5 h-3.5 text-destructive" />;
  if (score < -5) return <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />;
  return <Minus className="w-3.5 h-3.5 text-muted-foreground" />;
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
  return <Badge className={`${colors[severity] || 'bg-muted'} text-[10px]`}>{severity}</Badge>;
}

function AuthStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    on_track: 'bg-emerald-500 text-white',
    at_risk: 'bg-orange-500 text-white',
    critical: 'bg-destructive text-destructive-foreground',
    expired: 'bg-muted text-muted-foreground',
  };
  const labels: Record<string, string> = { on_track: 'On Track', at_risk: 'At Risk', critical: 'Critical', expired: 'Expired' };
  return <Badge className={`${colors[status] || 'bg-muted'} text-[10px]`}>{labels[status] || status}</Badge>;
}

function KPICard({ icon, label, value, variant = 'default' }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  variant?: 'default' | 'destructive' | 'warning';
}) {
  const borderColor = variant === 'destructive' ? 'border-destructive/30' : variant === 'warning' ? 'border-orange-500/30' : 'border-border';
  return (
    <Card className={borderColor}>
      <CardContent className="py-2.5 px-3">
        <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
          {icon}
          <span className="text-[10px]">{label}</span>
        </div>
        <p className={`text-xl font-bold ${variant === 'destructive' ? 'text-destructive' : variant === 'warning' ? 'text-orange-500' : 'text-foreground'}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

// === Main Component ===

export default function Intelligence() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { current } = useWorkspace();

  const agencyId = current?.id || null;
  const agencyName = current?.name || 'Agency';

  const { rows: caseloadRows, loading: metricsLoading } = useCICaseloadFeed(agencyId);
  const { alerts, loading: alertsLoading, resolveAlert } = useCIAlertFeed(agencyId);
  const { recs, loading: recsLoading } = useCIInterventionRecs(agencyId);
  const { authorizations, loading: authLoading, kpis: authKpis } = useClinicalTracking(agencyId);

  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('caseload');

  // Filter caseload
  const filteredCaseload = useMemo(() => {
    let data = [...caseloadRows];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(d => (d.client_name || '').toLowerCase().includes(q));
    }
    if (riskFilter !== 'all') {
      const [min, max] = riskFilter.split('-').map(Number);
      data = data.filter(d => d.risk_score >= min && d.risk_score <= max);
    }
    return data.sort((a, b) => b.risk_score - a.risk_score);
  }, [caseloadRows, searchQuery, riskFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const total = caseloadRows.length;
    const highRisk = caseloadRows.filter(m => m.risk_score >= 75).length;
    const staleData = caseloadRows.filter(m => m.data_freshness <= 20).length;
    const openAlerts = alerts.length;
    return { total, highRisk, staleData, openAlerts };
  }, [caseloadRows, alerts]);

  const sortedAlerts = useMemo(() => {
    const order: Record<string, number> = { critical: 0, action: 1, high: 1, watch: 2, medium: 2, info: 3 };
    return [...alerts].sort((a, b) => (order[a.severity] ?? 4) - (order[b.severity] ?? 4));
  }, [alerts]);

  const isLoading = metricsLoading || alertsLoading;

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Brain className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-lg font-bold text-foreground">Clinical Intelligence</h1>
          <p className="text-xs text-muted-foreground">{agencyName} — Caseload Command Center</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2">
        <KPICard icon={<Users className="w-4 h-4" />} label="Clients" value={kpis.total} />
        <KPICard icon={<AlertTriangle className="w-4 h-4" />} label="High Risk" value={kpis.highRisk} variant={kpis.highRisk > 0 ? 'destructive' : 'default'} />
        <KPICard icon={<Clock className="w-4 h-4" />} label="Stale Data" value={kpis.staleData} variant={kpis.staleData > 0 ? 'warning' : 'default'} />
        <KPICard icon={<Activity className="w-4 h-4" />} label="Open Alerts" value={kpis.openAlerts} variant={kpis.openAlerts > 0 ? 'destructive' : 'default'} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="caseload" className="text-xs">Caseload</TabsTrigger>
          <TabsTrigger value="alerts" className="text-xs relative">
            Alerts
            {kpis.openAlerts > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[9px] flex items-center justify-center font-bold">
                {kpis.openAlerts > 9 ? '9+' : kpis.openAlerts}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="auth" className="text-xs">Auth</TabsTrigger>
          <TabsTrigger value="recs" className="text-xs">Recs</TabsTrigger>
        </TabsList>

        {/* === Caseload Tab === */}
        <TabsContent value="caseload" className="space-y-3 mt-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Search clients..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-9 text-sm" />
            </div>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-[110px] h-9 text-xs">
                <SelectValue placeholder="Risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk</SelectItem>
                <SelectItem value="75-100">High</SelectItem>
                <SelectItem value="50-74">Moderate</SelectItem>
                <SelectItem value="0-49">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : filteredCaseload.length === 0 ? (
            <Card><CardContent className="py-8 text-center">
              <Brain className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{caseloadRows.length === 0 ? 'No metrics computed yet.' : 'No clients match filters.'}</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {filteredCaseload.map(row => {
                const freshness = getFreshnessLabel(row.data_freshness);
                return (
                  <Card key={row.client_id} className="active:bg-accent/50 transition-colors" onClick={() => navigate(`/clients`)}>
                    <CardContent className="py-3 px-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm truncate flex-1">{row.client_name}</span>
                        <Badge className={`${getRiskColor(row.risk_score)} text-[10px] font-mono ml-2`}>
                          {Math.round(row.risk_score)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          {getTrendIcon(row.trend_score)}
                          <span>{getTrendLabel(row.trend_score)}</span>
                        </div>
                        <span className={freshness.color}>{freshness.label}</span>
                        <span>Goal: {Math.round(row.goal_velocity_score)}</span>
                        <span>Fidelity: {Math.round(row.fidelity_score)}</span>
                        {row.open_alert_count > 0 && (
                          <Badge variant="destructive" className="text-[9px] px-1 py-0">{row.open_alert_count}</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* === Alerts Tab === */}
        <TabsContent value="alerts" className="space-y-2 mt-3">
          {alertsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : sortedAlerts.length === 0 ? (
            <Card><CardContent className="py-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No alerts. Caseload looks good!</p>
            </CardContent></Card>
          ) : (
            sortedAlerts.map(alert => (
              <Card key={alert.alert_id}>
                <CardContent className="py-3 px-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <SeverityBadge severity={alert.severity} />
                        <Badge variant="outline" className="text-[9px]">{alert.category}</Badge>
                      </div>
                      <p className="text-sm font-medium leading-tight">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                        {alert.client_name && <span>{alert.client_name}</span>}
                        <span>{new Date(alert.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs shrink-0"
                      onClick={async () => {
                        if (!user) return;
                        const ok = await resolveAlert(alert.alert_id, user.id);
                        if (ok) toast.success('Alert resolved');
                      }}
                    >
                      Resolve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* === Auth Tracking Tab === */}
        <TabsContent value="auth" className="space-y-3 mt-3">
          {authLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <KPICard icon={<FileWarning className="w-4 h-4" />} label="Hours At Risk" value={authKpis.hoursAtRisk} variant={authKpis.hoursAtRisk > 0 ? 'warning' : 'default'} />
                <KPICard icon={<CalendarClock className="w-4 h-4" />} label="Auth Expiring" value={authKpis.authExpiringSoon} variant={authKpis.authExpiringSoon > 0 ? 'destructive' : 'default'} />
              </div>

              {authorizations.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No active authorizations.</CardContent></Card>
              ) : (
                <div className="space-y-2">
                  {authorizations.map(auth => (
                    <Card key={auth.authorization_id}>
                      <CardContent className="py-3 px-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate flex-1">{auth.client_name}</span>
                          <AuthStatusBadge status={auth.computed_status} />
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">{auth.auth_number}</div>
                        <div className="flex items-center gap-2">
                          <Progress value={auth.pct_used} className="h-1.5 flex-1" />
                          <span className="text-[11px] text-muted-foreground">{auth.pct_used}%</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{auth.units_used}/{auth.units_approved} units</span>
                          <span className={auth.days_remaining <= 30 ? 'text-destructive font-semibold' : ''}>
                            {auth.days_remaining}d left
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* === Recommendations Tab === */}
        <TabsContent value="recs" className="space-y-2 mt-3">
          {recsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : recs.length === 0 ? (
            <Card><CardContent className="py-8 text-center">
              <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No recommendations yet.</p>
            </CardContent></Card>
          ) : (
            recs.map(rec => (
              <Card key={rec.id}>
                <CardContent className="py-3 px-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{rec.client_id.slice(0, 8)}…</span>
                    <Badge className="bg-primary/10 text-primary font-mono text-[10px]">Score: {Math.round(rec.score)}</Badge>
                  </div>
                  {rec.reasons_json && (
                    <p className="text-[11px] text-muted-foreground">{(rec.reasons_json as any).basis || 'Fit + Evidence + Feasibility'}</p>
                  )}
                  <Badge variant="outline" className="text-[9px] mt-1">{rec.status}</Badge>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
