import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Brain, AlertTriangle, TrendingUp, TrendingDown, Minus, 
  Shield, Activity, Users, Clock, Target, Heart, 
  ChevronRight, CheckCircle2, XCircle, Filter, Search
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { 
  useClinicalIntelligenceAccess, 
  useCICaseloadMetrics, 
  useCIAlerts,
  useCIInterventionRecs,
  type ClientMetrics,
  type CIAlert
} from '@/hooks/useClinicalIntelligence';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useDataStore } from '@/store/dataStore';
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
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-500 text-white',
    info: 'bg-blue-500 text-white',
  };
  return (
    <Badge className={`${colors[severity] || 'bg-muted'} text-xs`}>
      {severity}
    </Badge>
  );
}

export default function Intelligence() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentAgency } = useAgencyContext();
  const { hasCIDAccess, loading: accessLoading } = useClinicalIntelligenceAccess();
  const agencyId = currentAgency?.id || null;
  
  const { metrics, loading: metricsLoading } = useCICaseloadMetrics(agencyId);
  const { alerts, loading: alertsLoading, resolveAlert } = useCIAlerts(agencyId);
  const { recs, loading: recsLoading } = useCIInterventionRecs(agencyId);
  
  const students = useDataStore(s => s.students);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [trendFilter, setTrendFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('caseload');

  // Build enriched caseload data
  const caseloadData = useMemo(() => {
    return metrics.map(m => {
      const student = students.find(s => s.id === m.client_id);
      return {
        ...m,
        studentName: student?.name || 'Unknown Client',
      };
    });
  }, [metrics, students]);

  // Filter caseload
  const filteredCaseload = useMemo(() => {
    let data = caseloadData;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(d => d.studentName.toLowerCase().includes(q));
    }
    
    if (riskFilter !== 'all') {
      const [min, max] = riskFilter.split('-').map(Number);
      data = data.filter(d => d.risk_score >= min && d.risk_score <= max);
    }
    
    if (trendFilter === 'worsening') data = data.filter(d => d.trend_score > 5);
    else if (trendFilter === 'improving') data = data.filter(d => d.trend_score < -5);
    else if (trendFilter === 'stable') data = data.filter(d => d.trend_score >= -5 && d.trend_score <= 5);
    
    return data.sort((a, b) => b.risk_score - a.risk_score);
  }, [caseloadData, searchQuery, riskFilter, trendFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const total = metrics.length;
    const highRisk = metrics.filter(m => m.risk_score >= 75).length;
    const staleData = metrics.filter(m => m.data_freshness <= 20).length;
    const lowFidelity = metrics.filter(m => m.fidelity_score < 80).length;
    const lowParent = metrics.filter(m => m.parent_impl_score < 60).length;
    const openAlerts = alerts.filter(a => !a.resolved_at).length;
    return { total, highRisk, staleData, lowFidelity, lowParent, openAlerts };
  }, [metrics, alerts]);

  // Unresolved alerts sorted by severity
  const sortedAlerts = useMemo(() => {
    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, info: 3 };
    return [...alerts].sort((a, b) => {
      const resolvedA = a.resolved_at ? 1 : 0;
      const resolvedB = b.resolved_at ? 1 : 0;
      if (resolvedA !== resolvedB) return resolvedA - resolvedB;
      return (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4);
    });
  }, [alerts]);

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Clinical Intelligence</h1>
            <p className="text-sm text-muted-foreground">
              {currentAgency?.name || 'Agency'} — Caseload Command Center
            </p>
          </div>
        </div>
        {kpis.openAlerts > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            {kpis.openAlerts} Open Alert{kpis.openAlerts !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard icon={<Users className="w-5 h-5" />} label="My Clients" value={kpis.total} />
        <KPICard icon={<AlertTriangle className="w-5 h-5" />} label="High Risk" value={kpis.highRisk} variant={kpis.highRisk > 0 ? 'destructive' : 'default'} />
        <KPICard icon={<Clock className="w-5 h-5" />} label="Stale Data" value={kpis.staleData} variant={kpis.staleData > 0 ? 'warning' : 'default'} />
        <KPICard icon={<Shield className="w-5 h-5" />} label="Low Fidelity" value={kpis.lowFidelity} variant={kpis.lowFidelity > 0 ? 'warning' : 'default'} />
        <KPICard icon={<Heart className="w-5 h-5" />} label="Parent Training Due" value={kpis.lowParent} />
        <KPICard icon={<Activity className="w-5 h-5" />} label="Open Alerts" value={kpis.openAlerts} variant={kpis.openAlerts > 0 ? 'destructive' : 'default'} />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="caseload">Caseload</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
            {kpis.openAlerts > 0 && (
              <Badge variant="destructive" className="ml-1.5 text-[10px] px-1.5 py-0">{kpis.openAlerts}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Caseload Tab */}
        <TabsContent value="caseload" className="space-y-4">
          {/* Filters */}
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

          {/* Caseload Table */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredCaseload.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Brain className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {metrics.length === 0 
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCaseload.map(row => {
                    const freshness = getFreshnessLabel(row.data_freshness);
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.studentName}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={`${getRiskColor(row.risk_score)} text-xs font-mono`}>
                            {Math.round(row.risk_score)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {getTrendIcon(row.trend_score)}
                            <span className="text-xs text-muted-foreground">{getTrendLabel(row.trend_score)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-medium ${freshness.color}`}>{freshness.label}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-mono">{Math.round(row.goal_velocity_score)}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-mono">{Math.round(row.parent_impl_score)}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-mono ${row.fidelity_score < 80 ? 'text-orange-500' : ''}`}>
                            {Math.round(row.fidelity_score)}
                          </span>
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
            sortedAlerts.map(alert => {
              const client = students.find(s => s.id === alert.client_id);
              return (
                <Card key={alert.id} className={alert.resolved_at ? 'opacity-60' : ''}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <SeverityBadge severity={alert.severity} />
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{alert.message}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-[10px]">{alert.category}</Badge>
                            {client && <span>{client.name}</span>}
                            <span>{new Date(alert.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {alert.resolved_at ? (
                          <Badge variant="outline" className="text-emerald-500 border-emerald-500">Resolved</Badge>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={async () => {
                              if (!user) return;
                              const ok = await resolveAlert(alert.id, user.id);
                              if (ok) toast.success('Alert resolved');
                            }}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
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
              {recs.map(rec => {
                const client = students.find(s => s.id === rec.client_id);
                return (
                  <Card key={rec.id}>
                    <CardContent className="py-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{client?.name || 'Client'}</span>
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
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// KPI Card component
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
