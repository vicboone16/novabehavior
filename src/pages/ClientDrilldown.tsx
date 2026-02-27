import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  ArrowLeft, Brain, AlertTriangle, TrendingUp, TrendingDown, Minus,
  Target, FileText, Lightbulb, Activity, Clock, Shield, Heart,
  CheckCircle2, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import { useClientDrilldown } from '@/hooks/useClientDrilldown';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

function getRiskColor(score: number) {
  if (score >= 75) return 'bg-destructive text-destructive-foreground';
  if (score >= 50) return 'bg-orange-500/90 text-white';
  if (score >= 25) return 'bg-yellow-500/90 text-white';
  return 'bg-emerald-500/90 text-white';
}

function MetricCard({ icon, label, value, suffix, color }: {
  icon: React.ReactNode; label: string; value: number | string; suffix?: string; color?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color || 'bg-primary/10 text-primary'}`}>{icon}</div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}{suffix}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-destructive text-destructive-foreground',
    action: 'bg-orange-500/90 text-white',
    high: 'bg-orange-500/90 text-white',
    watch: 'bg-yellow-500/90 text-white',
    medium: 'bg-yellow-500/90 text-white',
    info: 'bg-blue-500/90 text-white',
  };
  return <Badge className={`${colors[severity] || 'bg-muted'} text-xs`}>{severity}</Badge>;
}

export default function ClientDrilldown() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { metrics, alerts, recs, clientName, goalData, loading } = useClientDrilldown(clientId);
  const [activeTab, setActiveTab] = useState('snapshot');

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeAlerts = alerts.filter(a => !a.resolved_at);
  const resolvedAlerts = alerts.filter(a => a.resolved_at);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/intelligence')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            {clientName || 'Client'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Clinical Intelligence Drilldown
            {metrics?.updated_at && ` • Updated ${format(new Date(metrics.updated_at), 'MMM d, HH:mm')}`}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="snapshot">Snapshot</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="narrative">Narrative</TabsTrigger>
        </TabsList>

        {/* ===== SNAPSHOT TAB ===== */}
        <TabsContent value="snapshot" className="space-y-4">
          {metrics ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <MetricCard icon={<AlertTriangle className="w-4 h-4" />} label="Risk Score" value={Math.round(metrics.risk_score)} color={metrics.risk_score >= 50 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'} />
                <MetricCard icon={<TrendingUp className="w-4 h-4" />} label="Trend" value={metrics.trend_score > 0 ? `+${Math.round(metrics.trend_score)}` : Math.round(metrics.trend_score).toString()} />
                <MetricCard icon={<Clock className="w-4 h-4" />} label="Freshness" value={Math.round(metrics.data_freshness)} suffix="%" />
                <MetricCard icon={<Target className="w-4 h-4" />} label="Goal Velocity" value={Math.round(metrics.goal_velocity_score)} suffix="%" />
                <MetricCard icon={<Heart className="w-4 h-4" />} label="Parent Impl." value={Math.round(metrics.parent_impl_score)} suffix="%" />
                <MetricCard icon={<Shield className="w-4 h-4" />} label="Fidelity" value={Math.round(metrics.fidelity_score)} suffix="%" />
              </div>

              {/* Explanation JSON */}
              {activeAlerts.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Active Alerts ({activeAlerts.length})</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {activeAlerts.map(alert => (
                      <div key={alert.id} className="flex items-start justify-between p-3 border rounded-lg">
                        <div className="flex items-start gap-2">
                          <SeverityBadge severity={alert.severity} />
                          <div>
                            <p className="text-sm font-medium">{alert.message}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{alert.category} • {format(new Date(alert.created_at), 'MMM d')}</p>
                            {alert.explanation_json && (
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {Object.entries(alert.explanation_json).map(([k, v]) => (
                                  <Badge key={k} variant="outline" className="text-[10px]">{k}: {typeof v === 'number' ? Math.round(v) : String(v)}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No metrics computed for this client yet.</CardContent></Card>
          )}
        </TabsContent>

        {/* ===== TRENDS TAB ===== */}
        <TabsContent value="trends" className="space-y-4">
          {metrics ? (
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Metric Overview</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={[
                      { name: 'Risk', value: metrics.risk_score, fill: 'hsl(var(--destructive))' },
                      { name: 'Trend', value: Math.max(0, metrics.trend_score), fill: 'hsl(var(--primary))' },
                      { name: 'Freshness', value: metrics.data_freshness, fill: 'hsl(142 76% 36%)' },
                      { name: 'Goal Vel.', value: metrics.goal_velocity_score, fill: 'hsl(var(--primary))' },
                      { name: 'Fidelity', value: metrics.fidelity_score, fill: 'hsl(var(--primary))' },
                      { name: 'Parent', value: metrics.parent_impl_score, fill: 'hsl(var(--primary))' },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {[0,1,2,3,4,5].map(i => <Cell key={i} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Score Breakdown</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: 'Risk Score', value: metrics.risk_score, max: 100, warn: 50 },
                    { label: 'Trend Score', value: metrics.trend_score, max: 100, warn: 40 },
                    { label: 'Data Freshness', value: metrics.data_freshness, max: 100, warn: -1 },
                    { label: 'Goal Velocity', value: metrics.goal_velocity_score, max: 100, warn: -1 },
                    { label: 'Fidelity', value: metrics.fidelity_score, max: 100, warn: -1 },
                    { label: 'Parent Impl.', value: metrics.parent_impl_score, max: 100, warn: -1 },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-mono font-medium">{Math.round(item.value)}</span>
                      </div>
                      <Progress value={Math.max(0, Math.min(100, item.value))} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No trend data available.</CardContent></Card>
          )}
        </TabsContent>

        {/* ===== GOALS TAB ===== */}
        <TabsContent value="goals" className="space-y-4">
          {goalData.length > 0 ? (
            <>
              <Card>
                <CardHeader><CardTitle className="text-base">Goal Velocity by Target</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={Math.max(200, goalData.length * 40)}>
                    <BarChart data={goalData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis type="category" dataKey="goal_name" width={150} className="text-xs" />
                      <Tooltip />
                      <Bar dataKey="accuracy" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              {/* Plateau list */}
              {goalData.filter(g => g.accuracy < 30).length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base text-destructive">Plateau Risk</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Goal</TableHead>
                          <TableHead className="text-right">Accuracy</TableHead>
                          <TableHead className="text-right">Trials</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {goalData.filter(g => g.accuracy < 30).map(g => (
                          <TableRow key={g.target_id}>
                            <TableCell className="font-medium">{g.goal_name}</TableCell>
                            <TableCell className="text-right font-mono text-destructive">{g.accuracy}%</TableCell>
                            <TableCell className="text-right font-mono">{g.total_trials}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No goal data available for this client.</CardContent></Card>
          )}
        </TabsContent>

        {/* ===== RECOMMENDATIONS TAB ===== */}
        <TabsContent value="recommendations" className="space-y-3">
          {recs.length > 0 ? (
            recs.map(rec => (
              <Card key={rec.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Lightbulb className="w-4 h-4 text-primary" />
                        <Badge variant="outline" className="text-xs">Score: {Math.round(rec.score)}</Badge>
                        <Badge variant="secondary" className="text-xs">{rec.status}</Badge>
                      </div>
                      {rec.reasons_json && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.entries(rec.reasons_json).map(([k, v]) => (
                            <Badge key={k} variant="outline" className="text-[10px]">{k}: {String(v)}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => toast.info('Add to Plan coming soon')}>
                      Add to Plan <ChevronRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Lightbulb className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              No intervention recommendations yet.
            </CardContent></Card>
          )}
        </TabsContent>

        {/* ===== NARRATIVE TAB ===== */}
        <TabsContent value="narrative" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4" /> Auto-Generated Narrative</CardTitle></CardHeader>
            <CardContent>
              {metrics ? (
                <div className="prose prose-sm max-w-none text-foreground">
                  <p>
                    <strong>{clientName}</strong> currently has a risk score of <strong>{Math.round(metrics.risk_score)}</strong> out of 100.
                    {metrics.risk_score >= 75 && ' This indicates a high-risk status requiring immediate clinical attention.'}
                    {metrics.risk_score >= 50 && metrics.risk_score < 75 && ' This indicates elevated risk that should be monitored closely.'}
                    {metrics.risk_score < 50 && ' This is within acceptable parameters.'}
                  </p>
                  <p>
                    The behavior trend score is <strong>{metrics.trend_score > 0 ? '+' : ''}{Math.round(metrics.trend_score)}</strong>,
                    indicating {metrics.trend_score > 5 ? 'a worsening trajectory over the last 14 days compared to the prior period' :
                    metrics.trend_score < -5 ? 'an improving trajectory — behavior frequency is decreasing' :
                    'a stable pattern with no significant change'}.
                  </p>
                  <p>
                    Data freshness is at <strong>{Math.round(metrics.data_freshness)}%</strong>
                    {metrics.data_freshness <= 20 ? ', which is critically stale — recent sessions may not have been logged.' :
                     metrics.data_freshness <= 50 ? ', which suggests data collection may need attention.' :
                     ', indicating recent and up-to-date data collection.'
                    }
                  </p>
                  <p>
                    Goal velocity is at <strong>{Math.round(metrics.goal_velocity_score)}%</strong> accuracy across active targets.
                    {metrics.goal_velocity_score < 30 && ' This is below threshold and may indicate a plateau requiring program modification.'}
                    Fidelity stands at <strong>{Math.round(metrics.fidelity_score)}%</strong>
                    {metrics.fidelity_score < 80 && ', which is below the 80% target'}.
                    Parent implementation score is <strong>{Math.round(metrics.parent_impl_score)}%</strong>
                    {metrics.parent_impl_score < 60 && ', suggesting caregiver training reinforcement may be needed'}.
                  </p>
                  {activeAlerts.length > 0 && (
                    <p>
                      There {activeAlerts.length === 1 ? 'is' : 'are'} currently <strong>{activeAlerts.length}</strong> active alert{activeAlerts.length !== 1 ? 's' : ''}:
                      {' '}{activeAlerts.map(a => a.message).join('; ')}.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">No metrics available to generate narrative.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
