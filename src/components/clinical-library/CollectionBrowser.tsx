import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Search, ChevronDown, ChevronUp, BookOpen, Target, ListChecks, Filter, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Domain {
  id: string;
  key: string;
  title: string;
  sort_order: number;
}

interface Goal {
  id: string;
  domain_id: string;
  key: string;
  title: string;
  clinical_goal: string | null;
  objective_text: string | null;
  vbmapp_domain: string | null;
  vbmapp_level: number | null;
  younger_examples: string[] | null;
  older_examples: string[] | null;
  benchmark_count: number;
  is_active: boolean;
  sort_order: number;
}

interface Benchmark {
  id: string;
  goal_id: string;
  benchmark_order: number;
  benchmark_text: string;
}

interface Props {
  collectionId: string;
  collectionTitle: string;
  onBack: () => void;
}

export function CollectionBrowser({ collectionId, collectionTitle, onBack }: Props) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [benchmarks, setBenchmarks] = useState<Record<string, Benchmark[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [expandedBenchmarks, setExpandedBenchmarks] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState<string>('all');

  // Add goal dialog
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [addGoalDomainId, setAddGoalDomainId] = useState('');
  const [addGoalKey, setAddGoalKey] = useState('');
  const [addGoalTitle, setAddGoalTitle] = useState('');
  const [addGoalObjective, setAddGoalObjective] = useState('');
  const [addGoalClinicalGoal, setAddGoalClinicalGoal] = useState('');
  const [addGoalBenchmarks, setAddGoalBenchmarks] = useState('');
  const [saving, setSaving] = useState(false);

  // Add domain dialog
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [addDomainKey, setAddDomainKey] = useState('');
  const [addDomainTitle, setAddDomainTitle] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [domainRes, goalRes] = await Promise.all([
      supabase.from('clinical_curricula_domains').select('id, key, title, sort_order')
        .eq('collection_id', collectionId).order('sort_order'),
      supabase.from('clinical_curricula_goals').select('id, domain_id, key, title, clinical_goal, objective_text, vbmapp_domain, vbmapp_level, younger_examples, older_examples, benchmark_count, is_active, sort_order')
        .eq('is_active', true).order('sort_order'),
    ]);
    if (domainRes.error) { toast.error('Failed to load domains'); console.error(domainRes.error); }
    if (goalRes.error) { toast.error('Failed to load goals'); console.error(goalRes.error); }

    const domainIds = new Set((domainRes.data || []).map((d: any) => d.id));
    setDomains((domainRes.data || []) as Domain[]);
    setGoals(((goalRes.data || []) as Goal[]).filter(g => domainIds.has(g.domain_id)));
    setLoading(false);
  }, [collectionId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const loadBenchmarks = async (goalId: string) => {
    if (benchmarks[goalId]) {
      setExpandedBenchmarks(prev => {
        const next = new Set(prev);
        if (next.has(goalId)) next.delete(goalId); else next.add(goalId);
        return next;
      });
      return;
    }
    const { data, error } = await supabase
      .from('clinical_curricula_benchmarks')
      .select('id, goal_id, benchmark_order, benchmark_text')
      .eq('goal_id', goalId)
      .order('benchmark_order');
    if (error) { toast.error('Failed to load benchmarks'); return; }
    setBenchmarks(prev => ({ ...prev, [goalId]: (data || []) as Benchmark[] }));
    setExpandedBenchmarks(prev => new Set(prev).add(goalId));
  };

  const toggleDomain = (id: string) => {
    setExpandedDomains(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getFilteredGoals = (domainId: string) => {
    let filtered = goals.filter(g => g.domain_id === domainId);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(g =>
        g.title.toLowerCase().includes(q) ||
        g.clinical_goal?.toLowerCase().includes(q) ||
        g.objective_text?.toLowerCase().includes(q) ||
        g.key.toLowerCase().includes(q)
      );
    }
    return filtered;
  };

  const visibleDomains = domains.filter(d => {
    if (domainFilter !== 'all' && d.id !== domainFilter) return false;
    return getFilteredGoals(d.id).length > 0 || !search.trim();
  });

  const openAddGoal = (domainId?: string) => {
    setAddGoalDomainId(domainId || (domains[0]?.id ?? ''));
    setAddGoalKey('');
    setAddGoalTitle('');
    setAddGoalObjective('');
    setAddGoalClinicalGoal('');
    setAddGoalBenchmarks('');
    setShowAddGoal(true);
  };

  const handleAddGoal = async () => {
    if (!addGoalTitle.trim() || !addGoalDomainId) {
      toast.error('Title and domain are required');
      return;
    }
    setSaving(true);
    try {
      const benchmarkLines = addGoalBenchmarks.split('\n').map(b => b.trim()).filter(Boolean);
      const { data: goalData, error: goalError } = await supabase
        .from('clinical_curricula_goals')
        .insert({
          domain_id: addGoalDomainId,
          key: addGoalKey.trim() || addGoalTitle.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 30),
          title: addGoalTitle.trim(),
          clinical_goal: addGoalClinicalGoal.trim() || null,
          objective_text: addGoalObjective.trim() || null,
          benchmark_count: benchmarkLines.length,
          is_active: true,
          sort_order: goals.filter(g => g.domain_id === addGoalDomainId).length + 1,
        } as any)
        .select('id')
        .single();
      if (goalError) throw goalError;

      if (benchmarkLines.length > 0 && goalData) {
        const benchmarkInserts = benchmarkLines.map((text, idx) => ({
          goal_id: goalData.id,
          benchmark_order: idx + 1,
          benchmark_text: text,
        }));
        const { error: bmError } = await supabase
          .from('clinical_curricula_benchmarks')
          .insert(benchmarkInserts as any);
        if (bmError) console.error('Benchmark insert error:', bmError);
      }

      toast.success('Goal added');
      setShowAddGoal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add goal');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDomain = async () => {
    if (!addDomainTitle.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('clinical_curricula_domains')
        .insert({
          collection_id: collectionId,
          key: addDomainKey.trim() || addDomainTitle.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 30),
          title: addDomainTitle.trim(),
          sort_order: domains.length + 1,
        } as any);
      if (error) throw error;
      toast.success('Domain added');
      setShowAddDomain(false);
      setAddDomainKey('');
      setAddDomainTitle('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add domain');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {collectionTitle}
            </h2>
            <p className="text-xs text-muted-foreground">{domains.length} domains · {goals.length} goals</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAddDomain(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add Domain
          </Button>
          <Button size="sm" onClick={() => openAddGoal()}>
            <Plus className="w-4 h-4 mr-1" /> Add Goal
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search goals..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={domainFilter} onValueChange={setDomainFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="All Domains" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Domains</SelectItem>
            {domains.map(d => (
              <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || domainFilter !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setDomainFilter('all'); }}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Domain list */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading...
        </div>
      ) : visibleDomains.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No domains or goals found.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowAddDomain(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add First Domain
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleDomains.map(domain => {
            const domainGoals = getFilteredGoals(domain.id);
            const isExpanded = expandedDomains.has(domain.id);
            return (
              <Collapsible key={domain.id} open={isExpanded} onOpenChange={() => toggleDomain(domain.id)}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardContent className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          <div>
                            <p className="font-semibold text-foreground">{domain.title}</p>
                            <p className="text-xs text-muted-foreground">{domain.key}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{domainGoals.length} goals</Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={e => { e.stopPropagation(); openAddGoal(domain.id); }}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-3">
                      {domainGoals.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-xs text-muted-foreground">No goals in this domain yet.</p>
                          <Button variant="outline" size="sm" className="mt-2" onClick={() => openAddGoal(domain.id)}>
                            <Plus className="w-4 h-4 mr-1" /> Add Goal
                          </Button>
                        </div>
                      ) : domainGoals.map(goal => (
                        <Card key={goal.id} className="border-border/60 bg-muted/20">
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Target className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <span className="font-medium text-sm text-foreground">{goal.title}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Badge variant="outline" className="text-[10px] font-mono">{goal.key}</Badge>
                              </div>
                            </div>

                            {goal.clinical_goal && (
                              <div className="pl-6">
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Clinical Goal</p>
                                <p className="text-xs text-foreground">{goal.clinical_goal}</p>
                              </div>
                            )}

                            {goal.objective_text && (
                              <div className="pl-6">
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Objective</p>
                                <p className="text-xs text-foreground">{goal.objective_text}</p>
                              </div>
                            )}

                            {/* Benchmarks toggle */}
                            <div className="pl-6 pt-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                                onClick={() => loadBenchmarks(goal.id)}
                              >
                                <ListChecks className="w-3.5 h-3.5" />
                                {expandedBenchmarks.has(goal.id) ? 'Hide Benchmarks' : `Show Benchmarks${goal.benchmark_count ? ` (${goal.benchmark_count})` : ''}`}
                              </Button>
                              {expandedBenchmarks.has(goal.id) && benchmarks[goal.id] && (
                                <div className="mt-2 space-y-1.5">
                                  {benchmarks[goal.id].length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic">No benchmarks defined.</p>
                                  ) : benchmarks[goal.id].map(b => (
                                    <div key={b.id} className="flex items-start gap-2 text-xs rounded-md bg-background p-2 border border-border/50">
                                      <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">{b.benchmark_order}</Badge>
                                      <span className="text-foreground">{b.benchmark_text}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Add Goal Dialog */}
      <Dialog open={showAddGoal} onOpenChange={setShowAddGoal}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Domain *</Label>
              <Select value={addGoalDomainId} onValueChange={setAddGoalDomainId}>
                <SelectTrigger><SelectValue placeholder="Select domain" /></SelectTrigger>
                <SelectContent>
                  {domains.map(d => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Goal Code</Label>
              <Input value={addGoalKey} onChange={e => setAddGoalKey(e.target.value)} placeholder="e.g., ER-K2-007" />
            </div>
            <div>
              <Label>Title *</Label>
              <Input value={addGoalTitle} onChange={e => setAddGoalTitle(e.target.value)} placeholder="Short searchable title" />
            </div>
            <div>
              <Label>Clinical Goal</Label>
              <Textarea value={addGoalClinicalGoal} onChange={e => setAddGoalClinicalGoal(e.target.value)} rows={2} placeholder="Clinical goal statement" />
            </div>
            <div>
              <Label>Objective</Label>
              <Textarea value={addGoalObjective} onChange={e => setAddGoalObjective(e.target.value)} rows={2} placeholder="Measurable objective" />
            </div>
            <div>
              <Label>Benchmarks (one per line)</Label>
              <Textarea
                value={addGoalBenchmarks}
                onChange={e => setAddGoalBenchmarks(e.target.value)}
                rows={5}
                placeholder={"Uses skill with full prompt\nUses skill with partial prompt\nUses skill independently\nUses skill during frustration\nGeneralizes across settings"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddGoal(false)}>Cancel</Button>
            <Button onClick={handleAddGoal} disabled={saving}>{saving ? 'Saving...' : 'Save Goal'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Domain Dialog */}
      <Dialog open={showAddDomain} onOpenChange={setShowAddDomain}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Domain</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Key</Label>
              <Input value={addDomainKey} onChange={e => setAddDomainKey(e.target.value)} placeholder="e.g., coping-strategies" />
            </div>
            <div>
              <Label>Title *</Label>
              <Input value={addDomainTitle} onChange={e => setAddDomainTitle(e.target.value)} placeholder="e.g., Coping Strategies" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDomain(false)}>Cancel</Button>
            <Button onClick={handleAddDomain} disabled={saving}>{saving ? 'Saving...' : 'Save Domain'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}