# Paste this entire prompt into the Student Connect project chat

Create the following 3 new files and update 2 existing files to add a Clinical Intelligence dashboard:

## FILE 1: Create `src/hooks/useClinicalIntelligence.ts`

```tsx
import { useState, useEffect, useCallback } from 'react';
import { novaCore } from '@/lib/supabase-untyped';

export interface CaseloadFeedRow {
  client_id: string;
  agency_id: string;
  client_name: string;
  risk_score: number;
  trend_score: number;
  data_freshness: number;
  fidelity_score: number;
  goal_velocity_score: number;
  parent_impl_score: number;
  metrics_updated_at: string;
  open_alert_count: number;
}

export interface AlertFeedRow {
  alert_id: string;
  agency_id: string;
  client_id: string | null;
  client_name: string | null;
  category: string;
  severity: 'critical' | 'action' | 'watch' | 'high' | 'medium' | 'info';
  message: string;
  explanation_json: Record<string, any>;
  alert_key: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface CIInterventionRec {
  id: string;
  agency_id: string;
  client_id: string;
  score: number;
  reasons_json: Record<string, any>;
  status: string;
  created_at: string;
}

export function useCICaseloadFeed(agencyId: string | null) {
  const [rows, setRows] = useState<CaseloadFeedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!agencyId) { setRows([]); setLoading(false); return; }
    try {
      setLoading(true);
      let query = novaCore.from('v_ci_caseload_feed').select('*');
      if (agencyId !== 'all') query = query.eq('agency_id', agencyId);
      const { data, error } = await query;

      if (!error && data) {
        setRows(data as CaseloadFeedRow[]);
      } else {
        let mq = novaCore.from('ci_client_metrics').select('*');
        if (agencyId !== 'all') mq = mq.eq('agency_id', agencyId);
        const { data: metrics } = await mq;

        if (metrics && metrics.length > 0) {
          const clientIds = metrics.map((m: any) => m.client_id);
          const { data: students } = await novaCore.from('students').select('id, first_name, last_name').in('id', clientIds);
          const nameMap = new Map<string, string>();
          if (students) {
            for (const s of students as any[]) {
              nameMap.set(s.id, `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown');
            }
          }
          let aq = novaCore.from('ci_alerts').select('client_id').is('resolved_at', null);
          if (agencyId !== 'all') aq = aq.eq('agency_id', agencyId);
          const { data: alertsData } = await aq;
          const alertCounts = new Map<string, number>();
          if (alertsData) {
            for (const a of alertsData as any[]) {
              if (a.client_id) alertCounts.set(a.client_id, (alertCounts.get(a.client_id) || 0) + 1);
            }
          }
          setRows(metrics.map((m: any) => ({
            client_id: m.client_id, agency_id: m.agency_id,
            client_name: nameMap.get(m.client_id) || 'Unknown',
            risk_score: m.risk_score ?? 0, trend_score: m.trend_score ?? 0,
            data_freshness: m.data_freshness ?? 0, fidelity_score: m.fidelity_score ?? 0,
            goal_velocity_score: m.goal_velocity_score ?? 0, parent_impl_score: m.parent_impl_score ?? 0,
            metrics_updated_at: m.updated_at, open_alert_count: alertCounts.get(m.client_id) || 0,
          })));
        } else { setRows([]); }
      }
    } catch (err) { console.error('[CI] Error fetching caseload feed:', err); }
    finally { setLoading(false); }
  }, [agencyId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { rows, loading, refresh: fetch };
}

export function useCIAlertFeed(agencyId: string | null) {
  const [alerts, setAlerts] = useState<AlertFeedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    if (!agencyId) { setAlerts([]); setLoading(false); return; }
    try {
      setLoading(true);
      let query = novaCore.from('v_ci_alert_feed').select('*').order('created_at', { ascending: false });
      if (agencyId !== 'all') query = query.eq('agency_id', agencyId);
      const { data, error } = await query;

      if (!error && data) {
        setAlerts(data as AlertFeedRow[]);
      } else {
        let aq = novaCore.from('ci_alerts').select('*').is('resolved_at', null).order('created_at', { ascending: false });
        if (agencyId !== 'all') aq = aq.eq('agency_id', agencyId);
        const { data: alertsData } = await aq;
        if (alertsData && alertsData.length > 0) {
          const clientIds = alertsData.filter((a: any) => a.client_id).map((a: any) => a.client_id);
          const nameMap = new Map<string, string>();
          if (clientIds.length > 0) {
            const { data: students } = await novaCore.from('students').select('id, first_name, last_name').in('id', clientIds);
            if (students) { for (const s of students as any[]) { nameMap.set(s.id, `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown'); } }
          }
          setAlerts(alertsData.map((a: any) => ({
            alert_id: a.id, agency_id: a.agency_id, client_id: a.client_id,
            client_name: a.client_id ? (nameMap.get(a.client_id) || null) : null,
            category: a.category, severity: a.severity, message: a.message,
            explanation_json: a.explanation_json || {}, alert_key: a.alert_key || '',
            created_at: a.created_at, resolved_at: a.resolved_at, resolved_by: a.resolved_by,
          })));
        } else { setAlerts([]); }
      }
    } catch (err) { console.error('[CI] Error fetching alert feed:', err); }
    finally { setLoading(false); }
  }, [agencyId]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const resolveAlert = async (alertId: string, userId: string) => {
    const { error } = await novaCore.from('ci_alerts').update({ resolved_at: new Date().toISOString(), resolved_by: userId }).eq('id', alertId);
    if (!error) setAlerts(prev => prev.filter(a => a.alert_id !== alertId));
    return !error;
  };

  return { alerts, loading, refresh: fetchAlerts, resolveAlert };
}

export function useCIInterventionRecs(agencyId: string | null) {
  const [recs, setRecs] = useState<CIInterventionRec[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId) { setRecs([]); setLoading(false); return; }
    const fetchRecs = async () => {
      setLoading(true);
      let query = novaCore.from('ci_intervention_recs').select('*').order('score', { ascending: false });
      if (agencyId !== 'all') query = query.eq('agency_id', agencyId);
      const { data, error } = await query;
      if (!error && data) setRecs(data as CIInterventionRec[]);
      setLoading(false);
    };
    fetchRecs();
  }, [agencyId]);

  return { recs, loading };
}
```

## FILE 2: Create `src/hooks/useClinicalTracking.ts`

```tsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { novaCore } from '@/lib/supabase-untyped';

export interface AuthorizationSummary {
  authorization_id: string;
  client_id: string;
  agency_id: string;
  client_name: string;
  auth_number: string;
  service_codes: string[];
  start_date: string;
  end_date: string;
  units_approved: number;
  units_used: number;
  units_remaining: number;
  days_remaining: number;
  pct_used: number;
  pct_time_elapsed: number;
  computed_status: 'on_track' | 'at_risk' | 'critical' | 'expired';
}

export interface ClinicalTrackingKPIs {
  hoursAtRisk: number;
  authExpiringSoon: number;
  parentTrainingDue: number;
  supervisionOffTrack: number;
  offTrackForecasts: number;
}

export function useClinicalTracking(agencyId: string | null) {
  const [authorizations, setAuthorizations] = useState<AuthorizationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!agencyId) { setAuthorizations([]); setLoading(false); return; }
    try {
      setLoading(true);
      let q = novaCore.from('v_clinical_authorization_summary').select('*');
      if (agencyId !== 'all') q = q.eq('agency_id', agencyId);
      const { data } = await q;
      if (data) {
        const sorted = (data as AuthorizationSummary[]).sort((a, b) => {
          const order: Record<string, number> = { critical: 0, at_risk: 1, on_track: 2, expired: 3 };
          return (order[a.computed_status] ?? 4) - (order[b.computed_status] ?? 4);
        });
        setAuthorizations(sorted);
      }
    } catch (err) { console.error('[ClinicalTracking] Error:', err); }
    finally { setLoading(false); }
  }, [agencyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const kpis = useMemo<ClinicalTrackingKPIs>(() => {
    const active = authorizations.filter(a => a.computed_status !== 'expired');
    return {
      hoursAtRisk: active.filter(a => a.computed_status === 'at_risk' || a.computed_status === 'critical').length,
      authExpiringSoon: active.filter(a => a.days_remaining <= 30).length,
      parentTrainingDue: 0,
      supervisionOffTrack: 0,
      offTrackForecasts: 0,
    };
  }, [authorizations]);

  return { authorizations, loading, kpis, refresh: fetchData };
}
```

## FILE 3: Create `src/pages/Intelligence.tsx`

```tsx
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
} from '@/hooks/useClinicalIntelligence';
import { useClinicalTracking } from '@/hooks/useClinicalTracking';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

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
  icon: React.ReactNode; label: string; value: number;
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

  const kpis = useMemo(() => ({
    total: caseloadRows.length,
    highRisk: caseloadRows.filter(m => m.risk_score >= 75).length,
    staleData: caseloadRows.filter(m => m.data_freshness <= 20).length,
    openAlerts: alerts.length,
  }), [caseloadRows, alerts]);

  const sortedAlerts = useMemo(() => {
    const order: Record<string, number> = { critical: 0, action: 1, high: 1, watch: 2, medium: 2, info: 3 };
    return [...alerts].sort((a, b) => (order[a.severity] ?? 4) - (order[b.severity] ?? 4));
  }, [alerts]);

  const isLoading = metricsLoading || alertsLoading;

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      <div className="flex items-center gap-3">
        <Brain className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-lg font-bold text-foreground">Clinical Intelligence</h1>
          <p className="text-xs text-muted-foreground">{agencyName} — Caseload Command Center</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <KPICard icon={<Users className="w-4 h-4" />} label="Clients" value={kpis.total} />
        <KPICard icon={<AlertTriangle className="w-4 h-4" />} label="High Risk" value={kpis.highRisk} variant={kpis.highRisk > 0 ? 'destructive' : 'default'} />
        <KPICard icon={<Clock className="w-4 h-4" />} label="Stale Data" value={kpis.staleData} variant={kpis.staleData > 0 ? 'warning' : 'default'} />
        <KPICard icon={<Activity className="w-4 h-4" />} label="Open Alerts" value={kpis.openAlerts} variant={kpis.openAlerts > 0 ? 'destructive' : 'default'} />
      </div>

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

        <TabsContent value="caseload" className="space-y-3 mt-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Search clients..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-9 text-sm" />
            </div>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-[110px] h-9 text-xs"><SelectValue placeholder="Risk" /></SelectTrigger>
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
                  <Card key={row.client_id} className="active:bg-accent/50 transition-colors">
                    <CardContent className="py-3 px-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm truncate flex-1">{row.client_name}</span>
                        <Badge className={`${getRiskColor(row.risk_score)} text-[10px] font-mono ml-2`}>{Math.round(row.risk_score)}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1">{getTrendIcon(row.trend_score)}<span>{getTrendLabel(row.trend_score)}</span></div>
                        <span className={freshness.color}>{freshness.label}</span>
                        <span>Goal: {Math.round(row.goal_velocity_score)}</span>
                        <span>Fidelity: {Math.round(row.fidelity_score)}</span>
                        {row.open_alert_count > 0 && <Badge variant="destructive" className="text-[9px] px-1 py-0">{row.open_alert_count}</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

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
                    <Button variant="outline" size="sm" className="text-xs shrink-0" onClick={async () => {
                      if (!user) return;
                      const ok = await resolveAlert(alert.alert_id, user.id);
                      if (ok) toast.success('Alert resolved');
                    }}>Resolve</Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

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
                          <span className={auth.days_remaining <= 30 ? 'text-destructive font-semibold' : ''}>{auth.days_remaining}d left</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

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
                  {rec.reasons_json && <p className="text-[11px] text-muted-foreground">{(rec.reasons_json as any).basis || 'Fit + Evidence + Feasibility'}</p>}
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
```

## FILE 4: Update `src/App.tsx`

Add this import after the existing page imports (after line 21):
```tsx
import Intelligence from "@/pages/Intelligence";
```

Add this route inside the `<Route element={<MobileLayout />}>` block (after the `/admin/provision` route on line 75):
```tsx
<Route path="/intelligence" element={<Intelligence />} />
```

## FILE 5: Update `src/components/layout/MobileLayout.tsx`

Add `Brain` to the lucide-react import on line 3:
```tsx
import { Home, Calendar, Users, Inbox as InboxIcon, Brain, Building2, LogOut, Settings2, ShieldCheck, ArrowLeftRight, Link2, UserPlus } from "lucide-react";
```

Update the `navItems` array (lines 15-20) to add Intelligence as a 5th tab:
```tsx
const navItems = [
  { path: "/", icon: Home, label: "Today" },
  { path: "/schedule", icon: Calendar, label: "Schedule" },
  { path: "/intelligence", icon: Brain, label: "Intel" },
  { path: "/clients", icon: Users, label: "Clients" },
  { path: "/inbox", icon: InboxIcon, label: "Inbox" },
];
```

That's all the changes needed. The hooks use the existing `novaCore` client from `src/lib/supabase-untyped.ts` to query the shared Nova Core backend. No database changes or new edge functions needed.
