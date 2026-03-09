import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Target, GraduationCap, Stethoscope, Loader2, Play, AlertTriangle,
  TrendingUp, BookOpen, BarChart3, RefreshCw, CheckCircle2, History, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { OptimizationRecommendationCard } from '@/components/optimization/OptimizationRecommendationCard';

const db = supabase as any;

interface Client {
  client_id: string;
  first_name: string;
  last_name: string;
}

interface RunSummary {
  run_id: string;
  student_id: string | null;
  profile_key: string | null;
  context_scope: string | null;
  created_at: string | null;
  recommendation_count: number | null;
  high_priority_count: number | null;
  skill_recommendation_count: number | null;
  behavior_recommendation_count: number | null;
  caregiver_recommendation_count: number | null;
}

interface Recommendation {
  id: string;
  run_id: string;
  title: string;
  domain: string | null;
  severity: string | null;
  rationale: string | null;
  recommendation_key: string | null;
  recommended_action: string | null;
  suggested_goal_text: string | null;
  suggested_benchmark_text: string | null;
  suggested_support_text: string | null;
  source_object_type: string | null;
  student_id: string | null;
}

export default function GoalOptimization() {
  const { user } = useAuth();
  const [mode, setMode] = useState<'school' | 'clinical'>('clinical');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [running, setRunning] = useState(false);
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [domainFilter, setDomainFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('recommendations');
  const [exportHistory, setExportHistory] = useState<any[]>([]);
  const [goalDrafts, setGoalDrafts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    db.from('clients').select('client_id, first_name, last_name')
      .order('last_name')
      .then(({ data }: any) => setClients(data || []));
  }, [user]);

  const profileKey = mode === 'school' ? 'school_iep' : 'clinical_aba';

  const runOptimization = async () => {
    if (!selectedClient || !user) return;
    setRunning(true);
    setRecommendations([]);
    setRunSummary(null);
    try {
      const { data: runId, error } = await db.rpc('run_goal_optimization_engine', {
        p_student_id: selectedClient,
        p_profile_key: profileKey,
        p_context_scope: 'full',
        p_created_by: user.id,
      });
      if (error) throw error;
      if (!runId) throw new Error('No run ID returned');

      // Fetch summary
      const { data: summary } = await db
        .from('v_goal_optimization_run_summary')
        .select('*')
        .eq('run_id', runId)
        .maybeSingle();
      setRunSummary(summary);

      // Fetch recommendations
      const { data: recs } = await db
        .from('v_goal_optimization_recommendations')
        .select('*')
        .eq('run_id', runId)
        .order('severity', { ascending: true });
      setRecommendations(recs || []);

      toast.success(`Optimization complete — ${(recs || []).length} recommendations`);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Optimization failed');
    } finally {
      setRunning(false);
    }
  };

  const loadLatestRun = useCallback(async () => {
    if (!selectedClient) return;
    setLoading(true);
    try {
      const { data: runs } = await db
        .from('goal_optimization_runs')
        .select('id')
        .eq('student_id', selectedClient)
        .eq('profile_key', profileKey)
        .order('created_at', { ascending: false })
        .limit(1);

      if (runs?.[0]) {
        const runId = runs[0].id;
        const { data: summary } = await db
          .from('v_goal_optimization_run_summary')
          .select('*')
          .eq('run_id', runId)
          .maybeSingle();
        setRunSummary(summary);

        const { data: recs } = await db
          .from('v_goal_optimization_recommendations')
          .select('*')
          .eq('run_id', runId)
          .order('severity', { ascending: true });
        setRecommendations(recs || []);
      } else {
        setRunSummary(null);
        setRecommendations([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedClient, profileKey]);

  useEffect(() => {
    if (selectedClient) loadLatestRun();
  }, [selectedClient, loadLatestRun]);

  // Load export history and goal drafts when we have a run
  useEffect(() => {
    if (!runSummary?.run_id) { setExportHistory([]); setGoalDrafts([]); return; }
    db.from('v_goal_optimization_export_history').select('*').eq('run_id', runSummary.run_id).order('created_at', { ascending: false })
      .then(({ data }: any) => setExportHistory(data || []));
    db.from('goal_suggestion_drafts').select('*').eq('run_id', runSummary.run_id).order('created_at', { ascending: false })
      .then(({ data }: any) => setGoalDrafts(data || []));
  }, [runSummary?.run_id]);

  const filtered = domainFilter === 'all'
    ? recommendations
    : recommendations.filter(r => r.domain === domainFilter);

  const domains = [...new Set(recommendations.map(r => r.domain).filter(Boolean))];

  const clientName = clients.find(c => c.client_id === selectedClient);

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Target className="w-6 h-6 text-primary" />
          Goal & Program Optimization
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Analyze goals, programs, and supports to generate actionable clinical recommendations.
        </p>
      </div>

      {/* Mode + Client Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Optimization Mode</p>
            <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
              <TabsList className="w-full">
                <TabsTrigger value="school" className="flex-1 gap-1 text-xs">
                  <GraduationCap className="w-3.5 h-3.5" /> School / IEP
                </TabsTrigger>
                <TabsTrigger value="clinical" className="flex-1 gap-1 text-xs">
                  <Stethoscope className="w-3.5 h-3.5" /> Clinical / ABA
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Student / Client</p>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger><SelectValue placeholder="Select student…" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => (
                  <SelectItem key={c.client_id} value={c.client_id}>
                    {c.first_name} {c.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-end">
            <Button
              className="w-full gap-2"
              onClick={runOptimization}
              disabled={!selectedClient || running}
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {running ? 'Analyzing…' : 'Run Optimization'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Mode Description */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4">
          {mode === 'school' ? (
            <div className="space-y-1">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-primary" /> School / IEP Mode
              </p>
              <p className="text-xs text-muted-foreground">
                Focuses on IEP goals, annual review planning, benchmarks, classroom supports, educational relevance, school behavior supports, and meeting discussion points.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-primary" /> Clinical / ABA Mode
              </p>
              <p className="text-xs text-muted-foreground">
                Focuses on treatment planning, replacement behavior programming, caregiver training, maintenance/generalization sequencing, and ABA programming next steps.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Run Summary */}
      {runSummary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <SummaryCard label="Total" value={runSummary.recommendation_count} icon={<BarChart3 className="w-4 h-4" />} />
          <SummaryCard label="High Priority" value={runSummary.high_priority_count} icon={<AlertTriangle className="w-4 h-4 text-destructive" />} variant="destructive" />
          <SummaryCard label="Skill" value={runSummary.skill_recommendation_count} icon={<Target className="w-4 h-4" />} />
          <SummaryCard label="Behavior" value={runSummary.behavior_recommendation_count} icon={<AlertTriangle className="w-4 h-4" />} />
          <SummaryCard label="Caregiver" value={runSummary.caregiver_recommendation_count} icon={<BookOpen className="w-4 h-4" />} />
        </div>
      )}

      {/* Tabs: Recommendations / Goal Drafts / Export History */}
      {recommendations.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="recommendations" className="text-xs gap-1">
                <Target className="w-3 h-3" /> Recommendations ({recommendations.length})
              </TabsTrigger>
              <TabsTrigger value="drafts" className="text-xs gap-1">
                <FileText className="w-3 h-3" /> Goal Drafts ({goalDrafts.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs gap-1">
                <History className="w-3 h-3" /> Export History ({exportHistory.length})
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              {activeTab === 'recommendations' && (
                <Select value={domainFilter} onValueChange={setDomainFilter}>
                  <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Domains</SelectItem>
                    {domains.map(d => (
                      <SelectItem key={d} value={d!} className="capitalize">{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadLatestRun}>
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <TabsContent value="recommendations" className="space-y-4 mt-4">
            {['skill', 'behavior', 'caregiver', 'program'].map(domain => {
              const domainRecs = filtered.filter(r => r.domain === domain);
              if (domainRecs.length === 0) return null;
              return (
                <div key={domain} className="space-y-2">
                  <h3 className="text-sm font-semibold capitalize flex items-center gap-1.5">
                    {domain === 'skill' && <Target className="w-3.5 h-3.5" />}
                    {domain === 'behavior' && <AlertTriangle className="w-3.5 h-3.5" />}
                    {domain === 'caregiver' && <BookOpen className="w-3.5 h-3.5" />}
                    {domain === 'program' && <TrendingUp className="w-3.5 h-3.5" />}
                    {domain} ({domainRecs.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {domainRecs.map(rec => (
                      <OptimizationRecommendationCard key={rec.id} rec={rec as Recommendation} mode={mode} />
                    ))}
                  </div>
                </div>
              );
            })}
            {filtered.filter(r => !['skill', 'behavior', 'caregiver', 'program'].includes(r.domain || '')).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Other</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filtered
                    .filter(r => !['skill', 'behavior', 'caregiver', 'program'].includes(r.domain || ''))
                    .map(rec => (
                      <OptimizationRecommendationCard key={rec.id} rec={rec as Recommendation} mode={mode} />
                    ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="drafts" className="mt-4">
            {goalDrafts.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                  <FileText className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-xs text-muted-foreground">No goal drafts created yet. Use "Convert to Goal Draft" on any recommendation.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {goalDrafts.map((d: any) => (
                  <Card key={d.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">{d.draft_title}</h4>
                        <Badge variant="outline" className="text-[10px] capitalize">{d.draft_mode}</Badge>
                      </div>
                      {d.goal_text && (
                        <div className="bg-muted/40 rounded p-2">
                          <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Goal</p>
                          <p className="text-xs">{d.goal_text}</p>
                        </div>
                      )}
                      {d.benchmark_text && (
                        <div className="bg-muted/40 rounded p-2">
                          <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Benchmark</p>
                          <p className="text-xs">{d.benchmark_text}</p>
                        </div>
                      )}
                      {d.support_text && (
                        <div className="bg-muted/40 rounded p-2">
                          <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Support</p>
                          <p className="text-xs">{d.support_text}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] capitalize">{d.domain}</Badge>
                        <Badge variant={d.status === 'draft' ? 'outline' : 'default'} className="text-[10px] capitalize">{d.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {exportHistory.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center">
                  <History className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-xs text-muted-foreground">No exports yet. Use the action buttons on recommendations to send them to workflows.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {exportHistory.map((h: any) => (
                  <Card key={h.export_id}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <p className="text-xs font-medium">{h.recommendation_title || 'Recommendation'}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Sent to <span className="font-medium capitalize">{(h.export_target || '').replace(/_/g, ' ')}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] capitalize">{h.domain}</Badge>
                        <span className="text-[10px] text-muted-foreground">{new Date(h.created_at).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Empty state */}
      {!loading && !running && selectedClient && recommendations.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Target className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No optimization results yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click "Run Optimization" to analyze {clientName ? `${clientName.first_name}'s` : 'this student\'s'} goals and programs.
            </p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, variant }: { label: string; value: number | null; icon: React.ReactNode; variant?: string }) {
  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="shrink-0">{icon}</div>
        <div>
          <p className="text-lg font-bold">{value ?? 0}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
