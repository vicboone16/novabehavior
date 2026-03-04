# Student Connect — Clinical Intelligence Integration Spec

> **Source**: Nova Core (NovaTrack) `src/pages/Intelligence.tsx`  
> **Target**: Nova Student Connect (`nova-client-connect`)  
> **Shared Backend**: `yboqqmkghwhlhhnsegje`

This document provides copy-paste-ready code to add the full Clinical Intelligence page to the Student Connect app, matching Nova Core's functionality.

---

## 1. New Hook: `src/hooks/useClinicalIntelligence.ts`

This hook uses `novaCore` (the untyped client pointing at Nova Core's Supabase) instead of the local `supabase` client.

```ts
import { useState, useEffect, useCallback } from 'react';
import { novaCore } from '@/lib/supabase-untyped';

// === Types ===

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
  behavior_id: string | null;
  hypothesis_id: string | null;
  intervention_id: string | null;
  score: number;
  reasons_json: Record<string, any>;
  status: string;
  created_at: string;
}

export interface AuthorizationSummary {
  authorization_id: string;
  client_id: string;
  agency_id: string;
  client_name: string;
  auth_number: string;
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
  offTrackForecasts: number;
}

// === Access Check ===

export function useClinicalIntelligenceAccess(roles: string[]) {
  // In Student Connect, check if user has supervisor/admin roles
  const hasCIDAccess = roles.some(r =>
    ['super_admin', 'admin', 'owner', 'bcba', 'clinical_director'].includes(r)
  );
  return { hasCIDAccess, hasCrossAgency: roles.includes('super_admin') };
}

// === Caseload Feed ===

export function useCICaseloadFeed(agencyId: string | null) {
  const [rows, setRows] = useState<CaseloadFeedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!agencyId) { setRows([]); setLoading(false); return; }
    try {
      setLoading(true);

      // Try the view first
      let query = novaCore.from('v_ci_caseload_feed').select('*');
      if (agencyId !== 'all') query = query.eq('agency_id', agencyId);
      const { data, error } = await query;

      if (!error && data) {
        setRows(data as CaseloadFeedRow[]);
      } else {
        // Fallback: query ci_client_metrics + students
        let mq = novaCore.from('ci_client_metrics').select('*');
        if (agencyId !== 'all') mq = mq.eq('agency_id', agencyId);
        const { data: metrics } = await mq;

        if (metrics && metrics.length > 0) {
          const clientIds = metrics.map((m: any) => m.client_id);
          const { data: students } = await novaCore
            .from('students')
            .select('id, first_name, last_name')
            .in('id', clientIds);

          const nameMap = new Map<string, string>();
          (students || []).forEach((s: any) => {
            nameMap.set(s.id, `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown');
          });

          // Count open alerts
          let aq = novaCore.from('ci_alerts').select('client_id').is('resolved_at', null);
          if (agencyId !== 'all') aq = aq.eq('agency_id', agencyId);
          const { data: alerts } = await aq;
          const alertCounts = new Map<string, number>();
          (alerts || []).forEach((a: any) => {
            if (a.client_id) alertCounts.set(a.client_id, (alertCounts.get(a.client_id) || 0) + 1);
          });

          setRows(metrics.map((m: any) => ({
            client_id: m.client_id,
            agency_id: m.agency_id,
            client_name: nameMap.get(m.client_id) || 'Unknown',
            risk_score: m.risk_score ?? 0,
            trend_score: m.trend_score ?? 0,
            data_freshness: m.data_freshness ?? 0,
            fidelity_score: m.fidelity_score ?? 0,
            goal_velocity_score: m.goal_velocity_score ?? 0,
            parent_impl_score: m.parent_impl_score ?? 0,
            metrics_updated_at: m.updated_at,
            open_alert_count: alertCounts.get(m.client_id) || 0,
          })));
        } else {
          setRows([]);
        }
      }
    } catch (err) {
      console.error('[CI] Error fetching caseload:', err);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { rows, loading, refresh: fetchData };
}

// === Alert Feed ===

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
        // Fallback
        let aq = novaCore.from('ci_alerts').select('*').is('resolved_at', null).order('created_at', { ascending: false });
        if (agencyId !== 'all') aq = aq.eq('agency_id', agencyId);
        const { data: raw } = await aq;

        if (raw && raw.length > 0) {
          const clientIds = raw.filter((a: any) => a.client_id).map((a: any) => a.client_id);
          const nameMap = new Map<string, string>();
          if (clientIds.length > 0) {
            const { data: students } = await novaCore.from('students').select('id, first_name, last_name').in('id', clientIds);
            (students || []).forEach((s: any) => nameMap.set(s.id, `${s.first_name || ''} ${s.last_name || ''}`.trim()));
          }
          setAlerts(raw.map((a: any) => ({
            alert_id: a.id, agency_id: a.agency_id, client_id: a.client_id,
            client_name: a.client_id ? nameMap.get(a.client_id) || null : null,
            category: a.category, severity: a.severity, message: a.message,
            explanation_json: a.explanation_json || {}, alert_key: a.alert_key || '',
            created_at: a.created_at, resolved_at: a.resolved_at, resolved_by: a.resolved_by,
          })));
        } else {
          setAlerts([]);
        }
      }
    } catch (err) {
      console.error('[CI] Error fetching alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const resolveAlert = async (alertId: string, userId: string) => {
    const { error } = await novaCore
      .from('ci_alerts')
      .update({ resolved_at: new Date().toISOString(), resolved_by: userId })
      .eq('id', alertId);
    if (!error) setAlerts(prev => prev.filter(a => a.alert_id !== alertId));
    return !error;
  };

  return { alerts, loading, refresh: fetchAlerts, resolveAlert };
}

// === Intervention Recommendations ===

export function useCIInterventionRecs(agencyId: string | null) {
  const [recs, setRecs] = useState<CIInterventionRec[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agencyId) { setRecs([]); setLoading(false); return; }
    const fetch = async () => {
      setLoading(true);
      let query = novaCore.from('ci_intervention_recs').select('*').order('score', { ascending: false });
      if (agencyId !== 'all') query = query.eq('agency_id', agencyId);
      const { data, error } = await query;
      if (!error && data) setRecs(data as CIInterventionRec[]);
      setLoading(false);
    };
    fetch();
  }, [agencyId]);

  return { recs, loading };
}

// === Clinical Tracking (Authorizations) ===

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
    } catch (err) {
      console.error('[ClinicalTracking] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const kpis: ClinicalTrackingKPIs = {
    hoursAtRisk: authorizations.filter(a => a.computed_status === 'at_risk' || a.computed_status === 'critical').length,
    authExpiringSoon: authorizations.filter(a => a.days_remaining <= 30 && a.computed_status !== 'expired').length,
    offTrackForecasts: 0,
  };

  return { authorizations, loading, kpis, refresh: fetchData };
}
```

---

## 2. New Page: `src/pages/Intelligence.tsx`

```tsx
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, AlertTriangle, TrendingUp, TrendingDown, Minus,
  Shield, Activity, Users, Clock, Target, Heart,
  ChevronRight, CheckCircle2, Search,
  Building2, CalendarClock, FileWarning, Loader2
} from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useNovaCoreUser } from '@/hooks/useNovaCoreUser';
import {
  useClinicalIntelligenceAccess,
  useCICaseloadFeed,
  useCIAlertFeed,
  useCIInterventionRecs,
  useClinicalTracking,
} from '@/hooks/useClinicalIntelligence';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

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
  return <Badge className={`${colors[severity] || 'bg-muted'} text-xs`}>{severity}</Badge>;
}

function AuthStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    on_track: 'bg-emerald-500 text-white',
    at_risk: 'bg-orange-500 text-white',
    critical: 'bg-destructive text-destructive-foreground',
    expired: 'bg-muted text-muted-foreground',
  };
  const labels: Record<string, string> = { on_track: 'On Track', at_risk: 'At Risk', critical: 'Critical', expired: 'Expired' };
  return <Badge className={`${colors[status] || 'bg-muted'} text-xs`}>{labels[status] || status}</Badge>;
}

function KPICard({ icon, label, value, variant = 'default' }: {
  icon: React.ReactNode; label: string; value: number;
  variant?: 'default' | 'destructive' | 'warning';
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

export default function Intelligence() {
  const navigate = useNavigate();
  const { novaCoreUserId, agencies, roles, currentAgencyId } = useNovaCoreUser();
  const { hasCIDAccess, hasCrossAgency } = useClinicalIntelligenceAccess(roles);

  const [selectedAgencyId, setSelectedAgencyId] = useState<string>(() =>
    hasCrossAgency ? 'all' : (currentAgencyId || '')
  );

  const effectiveAgencyId = useMemo(() => {
    if (selectedAgencyId === 'all' && hasCrossAgency) return 'all';
    if (selectedAgencyId && selectedAgencyId !== 'all') return selectedAgencyId;
    return currentAgencyId || null;
  }, [selectedAgencyId, hasCrossAgency, currentAgencyId]);

  const { rows: caseloadRows, loading: metricsLoading } = useCICaseloadFeed(effectiveAgencyId);
  const { alerts, loading: alertsLoading, resolveAlert } = useCIAlertFeed(effectiveAgencyId);
  const { recs, loading: recsLoading } = useCIInterventionRecs(effectiveAgencyId);
  const { authorizations, loading: authLoading, kpis: authKpis } = useClinicalTracking(effectiveAgencyId);

  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [trendFilter, setTrendFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('caseload');

  const agencyDisplayName = useMemo(() => {
    if (selectedAgencyId === 'all') return 'All Agencies';
    const agency = agencies.find(a => a.id === selectedAgencyId);
    return agency?.name || 'Agency';
  }, [selectedAgencyId, agencies]);

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

  const kpis = useMemo(() => {
    const total = caseloadRows.length;
    const highRisk = caseloadRows.filter(m => (m.risk_score ?? 0) >= 75).length;
    const staleData = caseloadRows.filter(m => (m.data_freshness ?? 100) <= 20).length;
    const openAlerts = alerts.length;
    return { total, highRisk, staleData, openAlerts };
  }, [caseloadRows, alerts]);

  if (!hasCIDAccess) {
    return (
      <div className="px-4 pt-8 text-center space-y-4">
        <Brain className="w-12 h-12 text-muted-foreground mx-auto" />
        <h2 className="text-xl font-bold">Clinical Intelligence</h2>
        <p className="text-muted-foreground text-sm">
          This feature is not enabled for your account. Contact your administrator.
        </p>
      </div>
    );
  }

  const isLoading = metricsLoading || alertsLoading;

  return (
    <div className="px-4 pt-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Brain className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-lg font-bold text-foreground">Intelligence</h1>
            <p className="text-xs text-muted-foreground">{agencyDisplayName}</p>
          </div>
        </div>
        {agencies.length > 1 && (
          <Select value={selectedAgencyId || currentAgencyId || ''} onValueChange={setSelectedAgencyId}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Agency" />
            </SelectTrigger>
            <SelectContent>
              {hasCrossAgency && <SelectItem value="all">All Agencies</SelectItem>}
              {agencies.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2">
        <KPICard icon={<Users className="w-4 h-4" />} label="Total Clients" value={kpis.total} />
        <KPICard icon={<AlertTriangle className="w-4 h-4" />} label="High Risk" value={kpis.highRisk} variant={kpis.highRisk > 0 ? 'destructive' : 'default'} />
        <KPICard icon={<Clock className="w-4 h-4" />} label="Stale Data" value={kpis.staleData} variant={kpis.staleData > 0 ? 'warning' : 'default'} />
        <KPICard icon={<Activity className="w-4 h-4" />} label="Open Alerts" value={kpis.openAlerts} variant={kpis.openAlerts > 0 ? 'destructive' : 'default'} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="caseload" className="flex-1 text-xs">Caseload</TabsTrigger>
          <TabsTrigger value="alerts" className="flex-1 text-xs">
            Alerts
            {kpis.openAlerts > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px] px-1 py-0">{kpis.openAlerts}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="clinical" className="flex-1 text-xs">Auth</TabsTrigger>
          <TabsTrigger value="recs" className="flex-1 text-xs">Recs</TabsTrigger>
        </TabsList>

        {/* Caseload Tab */}
        <TabsContent value="caseload" className="space-y-3 mt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search clients…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
          </div>

          <div className="flex gap-2">
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="Risk" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk</SelectItem>
                <SelectItem value="75-100">High</SelectItem>
                <SelectItem value="50-74">Moderate</SelectItem>
                <SelectItem value="0-49">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={trendFilter} onValueChange={setTrendFilter}>
              <SelectTrigger className="flex-1 h-8 text-xs"><SelectValue placeholder="Trend" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="worsening">Worsening</SelectItem>
                <SelectItem value="stable">Stable</SelectItem>
                <SelectItem value="improving">Improving</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : filteredCaseload.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {caseloadRows.length === 0 ? 'No metrics computed yet.' : 'No clients match your filters.'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCaseload.map(row => {
                const freshness = getFreshnessLabel(row.data_freshness ?? 0);
                return (
                  <Card key={row.client_id} className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{row.client_name}</span>
                      <Badge className={`${getRiskColor(row.risk_score ?? 0)} text-xs font-mono`}>
                        {Math.round(row.risk_score ?? 0)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {getTrendIcon(row.trend_score ?? 0)}
                        <span>{getTrendLabel(row.trend_score ?? 0)}</span>
                      </div>
                      <div>
                        <span className={freshness.color}>{freshness.label}</span>
                      </div>
                      <div>
                        Goal: <span className="font-mono">{Math.round(row.goal_velocity_score ?? 0)}</span>
                      </div>
                      <div>
                        {(row.open_alert_count ?? 0) > 0 ? (
                          <Badge variant="destructive" className="text-[10px]">{row.open_alert_count} alert{row.open_alert_count > 1 ? 's' : ''}</Badge>
                        ) : '—'}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="mt-2 w-full h-7 text-xs" onClick={() => navigate(`/clients?highlight=${row.client_id}`)}>
                      View Client <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-2 mt-3">
          {alertsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              No alerts. Looking good!
            </div>
          ) : (
            alerts.map(alert => (
              <Card key={alert.alert_id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <SeverityBadge severity={alert.severity} />
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">{alert.category}</Badge>
                        {alert.client_name && <span>{alert.client_name}</span>}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0 h-7 text-xs"
                    onClick={async () => {
                      if (!novaCoreUserId) return;
                      const ok = await resolveAlert(alert.alert_id, novaCoreUserId);
                      if (ok) toast.success('Alert resolved');
                    }}
                  >
                    Resolve
                  </Button>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Clinical Tracking Tab */}
        <TabsContent value="clinical" className="space-y-3 mt-3">
          {authLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : authorizations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No active authorizations.</div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <KPICard icon={<FileWarning className="w-4 h-4" />} label="Hours At Risk" value={authKpis.hoursAtRisk} variant={authKpis.hoursAtRisk > 0 ? 'warning' : 'default'} />
                <KPICard icon={<CalendarClock className="w-4 h-4" />} label="Auth Expiring" value={authKpis.authExpiringSoon} variant={authKpis.authExpiringSoon > 0 ? 'destructive' : 'default'} />
              </div>
              {authorizations.map(auth => (
                <Card key={auth.authorization_id} className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{auth.client_name}</span>
                    <AuthStatusBadge status={auth.computed_status} />
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mb-2">{auth.auth_number}</p>
                  <div className="flex items-center gap-2">
                    <Progress value={auth.pct_used} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground">{auth.pct_used}%</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{auth.units_used}/{auth.units_approved} units</span>
                    <span className={auth.days_remaining <= 30 ? 'text-destructive font-semibold' : ''}>{auth.days_remaining}d left</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recs" className="space-y-2 mt-3">
          {recsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : recs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              No recommendations yet.
            </div>
          ) : (
            recs.map(rec => (
              <Card key={rec.id} className="p-3 space-y-1">
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
                <Badge variant="outline" className="text-[10px]">{rec.status}</Badge>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

## 3. Integration Steps for Student Connect

### 3.1 Add the route in `App.tsx`

```tsx
import Intelligence from "@/pages/Intelligence";

// Inside AppRoutes, within the <Route element={<MobileLayout />}> block:
<Route path="/intelligence" element={<Intelligence />} />
```

### 3.2 Add nav item in `MobileLayout.tsx`

```tsx
import { Brain } from 'lucide-react';

// Update navItems:
const navItems = [
  { path: "/", icon: Home, label: "Today" },
  { path: "/schedule", icon: Calendar, label: "Schedule" },
  { path: "/clients", icon: Users, label: "Clients" },
  { path: "/intelligence", icon: Brain, label: "Intel" },
  { path: "/inbox", icon: InboxIcon, label: "Inbox" },
];
```

### 3.3 RLS Note

The `ci_client_metrics`, `ci_alerts`, `ci_intervention_recs`, and clinical views all live on the Nova Core backend. The `novaCore` untyped client already has the anon key, so RLS policies on those tables must allow read access for authenticated users (which they already do since the Student Connect app authenticates against the same Supabase project).

If any queries return empty despite data existing, ensure:
1. The user's Nova Core user_id has an active `agency_memberships` record
2. The `v_ci_caseload_feed` and `v_ci_alert_feed` views exist (the hooks have fallback logic)
3. Run `NOTIFY pgrst, 'reload schema'` on Nova Core if views were recently created

---

## 4. Teacher Comms + Pending Changes Integration

The same `teacher_messages` and `pending_student_changes` tables are accessible via `novaCore`. To add the Teacher Comms supervisor features to Student Connect, the same pattern applies — use `novaCore` instead of `supabase` in the hooks.

The existing `/inbox` page in Student Connect could be extended with a "Pending Changes" tab using the same `PendingChangesPanel` component pattern from the spec above.
