import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, BookOpen, Target, Lightbulb, Zap, Star, GraduationCap, Filter, Eye, Edit2, Copy, Archive, Plus, Link2, ChevronRight, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useBehaviorLibraryData, BxProblem, BxGoal, BxObjective, BxStrategy, CiRec } from '@/hooks/useBehaviorLibraryData';

const FUNCTION_OPTIONS = ['attention', 'escape', 'tangible', 'automatic', 'multiple', 'unknown'];
const SETTING_OPTIONS = ['classroom', 'home', 'community', 'clinic'];
const TIER_OPTIONS = ['Tier 1', 'Tier 2', 'Tier 3'];
const GRADE_BAND_OPTIONS = ['PreK', 'K-2', '3-5', '6-8', '9-12', 'Adult'];
const ROLE_OPTIONS = ['BCBA', 'teacher', 'aide', 'parent'];

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <Icon className="w-12 h-12 mx-auto mb-4 opacity-30" />
      <p>{message}</p>
    </div>
  );
}

function FilterBar({ search, setSearch, functionFilter, setFunctionFilter, settingFilter, setSettingFilter, tierFilter, setTierFilter, gradeFilter, setGradeFilter, crisisFilter, setCrisisFilter, roleFilter, setRoleFilter }: any) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      <Select value={functionFilter} onValueChange={setFunctionFilter}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Function" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Functions</SelectItem>
          {FUNCTION_OPTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={settingFilter} onValueChange={setSettingFilter}>
        <SelectTrigger className="w-[130px]"><SelectValue placeholder="Setting" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Settings</SelectItem>
          {SETTING_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={tierFilter} onValueChange={setTierFilter}>
        <SelectTrigger className="w-[120px]"><SelectValue placeholder="Tier" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Tiers</SelectItem>
          {TIER_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={gradeFilter} onValueChange={setGradeFilter}>
        <SelectTrigger className="w-[120px]"><SelectValue placeholder="Grade" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Grades</SelectItem>
          {GRADE_BAND_OPTIONS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={roleFilter} onValueChange={setRoleFilter}>
        <SelectTrigger className="w-[120px]"><SelectValue placeholder="Role" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Roles</SelectItem>
          {ROLE_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button variant={crisisFilter ? 'destructive' : 'outline'} size="sm" onClick={() => setCrisisFilter(!crisisFilter)} className="gap-1">
        <AlertTriangle className="w-3 h-3" /> Crisis
      </Button>
    </div>
  );
}

function useFilters() {
  const [search, setSearch] = useState('');
  const [functionFilter, setFunctionFilter] = useState('all');
  const [settingFilter, setSettingFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [crisisFilter, setCrisisFilter] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  return { search, setSearch, functionFilter, setFunctionFilter, settingFilter, setSettingFilter, tierFilter, setTierFilter, gradeFilter, setGradeFilter, crisisFilter, setCrisisFilter, roleFilter, setRoleFilter };
}

function applyStrategyFilters(strategies: BxStrategy[], filters: ReturnType<typeof useFilters>) {
  return strategies.filter(s => {
    if (filters.search && !s.strategy_name.toLowerCase().includes(filters.search.toLowerCase()) && !(s.short_description || '').toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.functionFilter !== 'all' && !(s.function_tags || []).includes(filters.functionFilter)) return false;
    if (filters.settingFilter !== 'all' && !(s.setting_tags || []).includes(filters.settingFilter)) return false;
    if (filters.tierFilter !== 'all' && !(s.tier_tags || []).includes(filters.tierFilter)) return false;
    if (filters.gradeFilter !== 'all' && !(s.grade_band_tags || []).includes(filters.gradeFilter)) return false;
    if (filters.roleFilter !== 'all' && !(s.role_tags || []).includes(filters.roleFilter)) return false;
    if (filters.crisisFilter && !s.crisis_relevance) return false;
    return true;
  });
}

// ========== Strategy Detail Panel ==========
function StrategyDetailPanel({ strategy, onClose, linkedObjectives, linkedGoals, linkedProblems }: {
  strategy: BxStrategy; onClose: () => void;
  linkedObjectives: any[]; linkedGoals: any[]; linkedProblems: any[];
}) {
  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-card border-l border-border shadow-xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-bold text-foreground">{strategy.strategy_name}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {strategy.short_description && <p className="text-sm text-muted-foreground">{strategy.short_description}</p>}
          {strategy.full_description && <div><h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Full Description</h4><p className="text-sm">{strategy.full_description}</p></div>}

          <div className="flex flex-wrap gap-1">
            {(strategy.function_tags || []).map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
            {(strategy.setting_tags || []).map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
            {(strategy.tier_tags || []).map(t => <Badge key={t} className="text-xs">{t}</Badge>)}
            {(strategy.grade_band_tags || []).map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
            {strategy.crisis_relevance && <Badge variant="destructive" className="text-xs">Crisis</Badge>}
            {strategy.requires_bcba && <Badge variant="default" className="text-xs">BCBA Required</Badge>}
          </div>

          <Separator />

          {strategy.implementation_steps?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Implementation Steps</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">{strategy.implementation_steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
            </div>
          )}

          {strategy.staff_script && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Staff Script</h4>
              <p className="text-sm bg-muted p-2 rounded italic">{strategy.staff_script}</p>
            </div>
          )}

          {strategy.fidelity_checklist?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Fidelity Checklist</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">{strategy.fidelity_checklist.map((f, i) => <li key={i}>{f}</li>)}</ul>
            </div>
          )}

          {strategy.data_targets?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Data Collection Targets</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">{strategy.data_targets.map((d, i) => <li key={i}>{d}</li>)}</ul>
            </div>
          )}

          {strategy.family_version && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Family/Home Version</h4>
              <p className="text-sm">{strategy.family_version}</p>
            </div>
          )}

          {strategy.teacher_quick_version && (
            <div>
              <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Teacher Quick-Use Version</h4>
              <p className="text-sm">{strategy.teacher_quick_version}</p>
            </div>
          )}

          <Separator />

          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Linked Objectives ({linkedObjectives.length})</h4>
            {linkedObjectives.length === 0 ? <p className="text-xs text-muted-foreground">No linked objectives</p> : (
              <div className="space-y-1">{linkedObjectives.map((o: any) => <Badge key={o.id} variant="outline" className="mr-1">{o.objective_title}</Badge>)}</div>
            )}
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Linked Goals ({linkedGoals.length})</h4>
            {linkedGoals.length === 0 ? <p className="text-xs text-muted-foreground">No linked goals</p> : (
              <div className="space-y-1">{linkedGoals.map((g: any) => <Badge key={g.id} variant="outline" className="mr-1">{g.goal_title}</Badge>)}</div>
            )}
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Linked Problems ({linkedProblems.length})</h4>
            {linkedProblems.length === 0 ? <p className="text-xs text-muted-foreground">No linked problems</p> : (
              <div className="space-y-1">{linkedProblems.map((p: any) => <Badge key={p.id} variant="outline" className="mr-1">{p.title}</Badge>)}</div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

export default function BehaviorLibraryFull({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const data = useBehaviorLibraryData();
  const filters = useFilters();
  const [selectedStrategy, setSelectedStrategy] = useState<BxStrategy | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<BxProblem | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<BxGoal | null>(null);
  const [selectedObjective, setSelectedObjective] = useState<BxObjective | null>(null);

  useEffect(() => { data.fetchAll(); }, []);

  // Filtered data
  const filteredProblems = useMemo(() => {
    return data.problems.filter(p => {
      if (filters.search && !p.title.toLowerCase().includes(filters.search.toLowerCase()) && !(p.definition || '').toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (filters.functionFilter !== 'all' && !(p.function_tags || []).includes(filters.functionFilter)) return false;
      return true;
    });
  }, [data.problems, filters.search, filters.functionFilter]);

  const filteredGoals = useMemo(() => {
    return data.goals.filter(g => {
      if (filters.search && !g.goal_title.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  }, [data.goals, filters.search]);

  const filteredObjectives = useMemo(() => {
    return data.objectives.filter(o => {
      if (filters.search && !o.objective_title.toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  }, [data.objectives, filters.search]);

  const filteredStrategies = useMemo(() => applyStrategyFilters(data.strategies, filters), [data.strategies, filters]);

  const filteredRecs = useMemo(() => {
    return data.recs.filter(r => {
      if (filters.search && !JSON.stringify(r.reasons_json || '').toLowerCase().includes(filters.search.toLowerCase())) return false;
      return true;
    });
  }, [data.recs, filters.search]);

  return (
    <div className={embedded ? '' : 'min-h-screen bg-background'}>
      {!embedded && (
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-foreground">Behavior Intervention Library</h1>
              <p className="text-xs text-muted-foreground">PracticeWise-style searchable clinical library</p>
            </div>
          </div>
        </div>
      </header>
      )}

      <main className="container py-6">
        {data.isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading library data...</div>
        ) : (
          <Tabs defaultValue="problems">
            <TabsList className="mb-4 flex flex-wrap gap-1">
              <TabsTrigger value="problems" className="gap-1"><AlertTriangle className="w-3.5 h-3.5" />Problems ({data.problems.length})</TabsTrigger>
              <TabsTrigger value="goals" className="gap-1"><Target className="w-3.5 h-3.5" />Goals ({data.goals.length})</TabsTrigger>
              <TabsTrigger value="objectives" className="gap-1"><Lightbulb className="w-3.5 h-3.5" />Objectives ({data.objectives.length})</TabsTrigger>
              <TabsTrigger value="strategies" className="gap-1"><Zap className="w-3.5 h-3.5" />Strategies ({data.strategies.length})</TabsTrigger>
              <TabsTrigger value="recommendations" className="gap-1"><Star className="w-3.5 h-3.5" />Recommendations ({data.recs.length})</TabsTrigger>
              <TabsTrigger value="training" className="gap-1"><GraduationCap className="w-3.5 h-3.5" />Training</TabsTrigger>
            </TabsList>

            {/* ====== PRESENTING PROBLEMS ====== */}
            <TabsContent value="problems">
              <FilterBar {...filters} />
              {filteredProblems.length === 0 ? <EmptyState icon={AlertTriangle} message="No presenting problems found" /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProblems.map(p => (
                    <Card key={p.id} className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all" onClick={() => setSelectedProblem(p)}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-sm">{p.title}</CardTitle>
                          <Badge variant={p.risk_level === 'crisis' ? 'destructive' : p.risk_level === 'high' ? 'destructive' : 'outline'} className="text-xs ml-2 shrink-0">{p.risk_level}</Badge>
                        </div>
                        <CardDescription className="line-clamp-2 text-xs">{p.definition || 'No definition'}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {(p.function_tags || []).slice(0, 3).map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                          <Badge variant="secondary" className="text-[10px]">{p.domain}</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Link2 className="w-3 h-3" />{data.getGoalCountForProblem(p.id)} goals</span>
                          <span className="flex items-center gap-1"><Link2 className="w-3 h-3" />{data.getObjectiveCountForProblem(p.id)} objectives</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ====== GOALS ====== */}
            <TabsContent value="goals">
              <FilterBar {...filters} />
              {filteredGoals.length === 0 ? <EmptyState icon={Target} message="No replacement goals found" /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredGoals.map(g => (
                    <Card key={g.id} className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all" onClick={() => setSelectedGoal(g)}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{g.goal_title}</CardTitle>
                        <CardDescription className="text-xs">{g.domain || 'General'}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {(g.tags || []).slice(0, 4).map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Link2 className="w-3 h-3" />{data.getObjectiveCountForGoal(g.id)} objectives</span>
                          <Badge variant={g.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{g.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ====== OBJECTIVES ====== */}
            <TabsContent value="objectives">
              <FilterBar {...filters} />
              {filteredObjectives.length === 0 ? <EmptyState icon={Lightbulb} message="No objectives found" /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredObjectives.map(o => (
                    <Card key={o.id} className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all" onClick={() => setSelectedObjective(o)}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{o.objective_title}</CardTitle>
                        <CardDescription className="line-clamp-2 text-xs">{o.operational_definition || 'No definition'}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {(o.replacement_skill_tags || []).slice(0, 4).map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{data.getStrategyCountForObjective(o.id)} strategies</span>
                          <span>{data.getGoalCountForObjective(o.id)} goals</span>
                          <Badge variant={o.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{o.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ====== STRATEGIES ====== */}
            <TabsContent value="strategies">
              <FilterBar {...filters} />
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">{filteredStrategies.length} strategies</p>
                <Button size="sm" className="gap-1" onClick={() => navigate('/intervention-builder')}>
                  <Plus className="w-3.5 h-3.5" /> New Strategy
                </Button>
              </div>
              {filteredStrategies.length === 0 ? <EmptyState icon={Zap} message="No strategies match your filters" /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStrategies.map(s => (
                    <Card key={s.id} className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all" onClick={() => setSelectedStrategy(s)}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-sm">{s.strategy_name}</CardTitle>
                          {s.crisis_relevance && <Badge variant="destructive" className="text-[10px] ml-1 shrink-0">Crisis</Badge>}
                        </div>
                        <CardDescription className="line-clamp-2 text-xs">{s.short_description || 'No description'}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {(s.function_tags || []).slice(0, 2).map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                          {(s.setting_tags || []).slice(0, 2).map(t => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                          {(s.tier_tags || []).slice(0, 1).map(t => <Badge key={t} className="text-[10px]">{t}</Badge>)}
                          {s.requires_bcba && <Badge variant="default" className="text-[10px]">BCBA</Badge>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{data.getLinkedObjectivesForStrategy(s.id).length} objectives</span>
                          <Badge variant={s.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{s.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ====== RECOMMENDATIONS ====== */}
            <TabsContent value="recommendations">
              <FilterBar {...filters} />
              {filteredRecs.length === 0 ? <EmptyState icon={Star} message="No recommendations generated yet" /> : (
                <div className="space-y-3">
                  {filteredRecs.map(r => {
                    const reasons = r.reasons_json || {};
                    return (
                      <Card key={r.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">Recommendation</p>
                              <p className="text-xs text-muted-foreground">Score: {r.score ?? '—'} | Status: {r.status}</p>
                              {reasons.match_tags && <div className="flex flex-wrap gap-1 mt-1">{(reasons.match_tags as string[] || []).map((t: string, i: number) => <Badge key={i} variant="outline" className="text-[10px]">{t}</Badge>)}</div>}
                              {reasons.contraindication_penalty && <p className="text-xs text-destructive mt-1">Contraindication penalty: {reasons.contraindication_penalty}</p>}
                            </div>
                            <div className="flex gap-1">
                              <Button variant="outline" size="sm"><Eye className="w-3.5 h-3.5" /></Button>
                              <Button variant="outline" size="sm"><Edit2 className="w-3.5 h-3.5" /></Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ====== TRAINING ====== */}
            <TabsContent value="training">
              <div className="text-center py-12">
                <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-30 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">Training modules linked to interventions</p>
                <Button onClick={() => navigate('/academy')} className="gap-2">
                  <GraduationCap className="w-4 h-4" /> Open Academy
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </main>

      {/* ========== Side Panel for Strategy Detail ========== */}
      {selectedStrategy && (
        <StrategyDetailPanel
          strategy={selectedStrategy}
          onClose={() => setSelectedStrategy(null)}
          linkedObjectives={data.getLinkedObjectivesForStrategy(selectedStrategy.id)}
          linkedGoals={data.getLinkedGoalsForStrategy(selectedStrategy.id)}
          linkedProblems={data.getLinkedProblemsForStrategy(selectedStrategy.id)}
        />
      )}

      {/* ========== Problem Detail Dialog ========== */}
      <Dialog open={!!selectedProblem} onOpenChange={() => setSelectedProblem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{selectedProblem?.title}</DialogTitle></DialogHeader>
          {selectedProblem && (
            <div className="space-y-3">
              <p className="text-sm">{selectedProblem.definition || 'No definition provided'}</p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary">{selectedProblem.domain}</Badge>
                <Badge variant={selectedProblem.risk_level === 'high' || selectedProblem.risk_level === 'crisis' ? 'destructive' : 'outline'}>{selectedProblem.risk_level}</Badge>
                {(selectedProblem.function_tags || []).map(t => <Badge key={t} variant="outline">{t}</Badge>)}
              </div>
              {(selectedProblem.examples || []).length > 0 && (
                <div><h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Examples</h4>
                  <ul className="list-disc list-inside text-sm space-y-1">{selectedProblem.examples.map((e, i) => <li key={i}>{e}</li>)}</ul>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {data.getGoalCountForProblem(selectedProblem.id)} linked goals · {data.getObjectiveCountForProblem(selectedProblem.id)} linked objectives
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========== Goal Detail Dialog ========== */}
      <Dialog open={!!selectedGoal} onOpenChange={() => setSelectedGoal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{selectedGoal?.goal_title}</DialogTitle></DialogHeader>
          {selectedGoal && (
            <div className="space-y-3">
              <Badge variant="secondary">{selectedGoal.domain}</Badge>
              <div className="flex flex-wrap gap-1">{(selectedGoal.tags || []).map(t => <Badge key={t} variant="outline">{t}</Badge>)}</div>
              <p className="text-xs text-muted-foreground">{data.getObjectiveCountForGoal(selectedGoal.id)} linked objectives</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========== Objective Detail Dialog ========== */}
      <Dialog open={!!selectedObjective} onOpenChange={() => setSelectedObjective(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{selectedObjective?.objective_title}</DialogTitle></DialogHeader>
          {selectedObjective && (
            <div className="space-y-3">
              <p className="text-sm">{selectedObjective.operational_definition || 'No definition'}</p>
              {selectedObjective.mastery_criteria && <div><h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Mastery Criteria</h4><p className="text-sm">{selectedObjective.mastery_criteria}</p></div>}
              <div className="flex flex-wrap gap-1">{(selectedObjective.replacement_skill_tags || []).map(t => <Badge key={t} variant="outline">{t}</Badge>)}</div>
              <p className="text-xs text-muted-foreground">{data.getStrategyCountForObjective(selectedObjective.id)} strategies · {data.getGoalCountForObjective(selectedObjective.id)} goals</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
