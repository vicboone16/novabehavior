import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Shield, Zap, BookOpen, Target, Plus, FileText, UserPlus, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AddStrategyToClientDialog, StrategyItem } from '@/components/behavior-bank/AddStrategyToClientDialog';
import { toast } from 'sonner';

interface Strategy {
  id: string;
  behavior_key: string;
  intervention_type: string;
  strategy: string;
}

interface Goal {
  id: string;
  behavior_key: string;
  goal_text: string;
}

interface Replacement {
  id: string;
  behavior_key: string;
  replacement_behavior: string;
}

interface BenchmarkStep {
  id: string;
  behavior_key: string;
  step_number: number;
  benchmark_text: string;
}

interface UniversalStrategy {
  id: string;
  strategy_type: string;
  strategy: string;
}

const TYPE_ICONS: Record<string, typeof Shield> = {
  antecedent: Shield,
  teaching: BookOpen,
  reactive: Zap,
};

const TYPE_COLORS: Record<string, string> = {
  antecedent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  teaching: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  reactive: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

export default function BehaviorReductionStrategiesTab() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [replacements, setReplacements] = useState<Replacement[]>([]);
  const [benchmarks, setBenchmarks] = useState<BenchmarkStep[]>([]);
  const [universalStrategies, setUniversalStrategies] = useState<UniversalStrategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [behaviorFilter, setBehaviorFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeView, setActiveView] = useState<'by-behavior' | 'universal'>('by-behavior');

  // Selection + dialog state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogItems, setDialogItems] = useState<StrategyItem[]>([]);
  const [dialogMode, setDialogMode] = useState<'single' | 'bulk'>('single');

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setIsLoading(true);
    const [stratRes, goalRes, replRes, benchRes, uniRes] = await Promise.all([
      supabase.from('behavior_intervention_library').select('*'),
      supabase.from('behavior_goals_library').select('*'),
      supabase.from('behavior_replacement_library').select('*'),
      supabase.from('behavior_benchmark_steps').select('*').order('step_number'),
      supabase.from('universal_behavior_strategies').select('*'),
    ]);
    setStrategies((stratRes.data || []) as Strategy[]);
    setGoals((goalRes.data || []) as Goal[]);
    setReplacements((replRes.data || []) as Replacement[]);
    setBenchmarks((benchRes.data || []) as BenchmarkStep[]);
    setUniversalStrategies((uniRes.data || []) as UniversalStrategy[]);
    setIsLoading(false);
  }

  const behaviorKeys = useMemo(() => {
    const keys = new Set<string>();
    strategies.forEach(s => keys.add(s.behavior_key));
    goals.forEach(g => keys.add(g.behavior_key));
    return Array.from(keys).sort();
  }, [strategies, goals]);

  const filteredStrategies = useMemo(() => {
    return strategies.filter(s => {
      if (behaviorFilter !== 'all' && s.behavior_key !== behaviorFilter) return false;
      if (typeFilter !== 'all' && s.intervention_type !== typeFilter) return false;
      if (search && !s.strategy.toLowerCase().includes(search.toLowerCase()) && !s.behavior_key.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [strategies, behaviorFilter, typeFilter, search]);

  const filteredUniversal = useMemo(() => {
    return universalStrategies.filter(s => {
      if (typeFilter !== 'all' && s.strategy_type !== typeFilter) return false;
      if (search && !s.strategy.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [universalStrategies, typeFilter, search]);

  const groupedByBehavior = useMemo(() => {
    const groups: Record<string, { strategies: Strategy[]; goals: Goal[]; replacements: Replacement[]; benchmarks: BenchmarkStep[] }> = {};
    const keysToShow = behaviorFilter !== 'all' ? [behaviorFilter] : behaviorKeys;
    keysToShow.forEach(key => {
      groups[key] = {
        strategies: filteredStrategies.filter(s => s.behavior_key === key),
        goals: goals.filter(g => g.behavior_key === key),
        replacements: replacements.filter(r => r.behavior_key === key),
        benchmarks: benchmarks.filter(b => b.behavior_key === key),
      };
    });
    return groups;
  }, [filteredStrategies, goals, replacements, benchmarks, behaviorKeys, behaviorFilter]);

  const universalGrouped = useMemo(() => {
    const groups: Record<string, UniversalStrategy[]> = {};
    filteredUniversal.forEach(s => {
      if (!groups[s.strategy_type]) groups[s.strategy_type] = [];
      groups[s.strategy_type].push(s);
    });
    return groups;
  }, [filteredUniversal]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openSingleDialog = (item: StrategyItem) => {
    setDialogItems([item]);
    setDialogMode('single');
    setDialogOpen(true);
  };

  const openBulkDialog = () => {
    const items: StrategyItem[] = [];
    selectedIds.forEach(id => {
      const strat = strategies.find(s => s.id === id);
      if (strat) {
        items.push({ id: strat.id, type: 'strategy', label: strat.strategy, category: strat.intervention_type, behaviorKey: strat.behavior_key });
        return;
      }
      const uni = universalStrategies.find(s => s.id === id);
      if (uni) {
        items.push({ id: uni.id, type: 'strategy', label: uni.strategy, category: uni.strategy_type });
        return;
      }
      const goal = goals.find(g => g.id === id);
      if (goal) {
        items.push({ id: goal.id, type: 'goal', label: goal.goal_text, behaviorKey: goal.behavior_key });
        return;
      }
      const repl = replacements.find(r => r.id === id);
      if (repl) {
        items.push({ id: repl.id, type: 'replacement', label: repl.replacement_behavior, behaviorKey: repl.behavior_key });
      }
    });
    if (items.length === 0) {
      toast.error('No items selected');
      return;
    }
    setDialogItems(items);
    setDialogMode('bulk');
    setDialogOpen(true);
  };

  const addAllForBehavior = (key: string) => {
    const group = groupedByBehavior[key];
    if (!group) return;
    const items: StrategyItem[] = [];
    group.goals.forEach(g => items.push({ id: g.id, type: 'goal', label: g.goal_text, behaviorKey: key }));
    group.replacements.forEach(r => items.push({ id: r.id, type: 'replacement', label: r.replacement_behavior, behaviorKey: key }));
    group.strategies.forEach(s => items.push({ id: s.id, type: 'strategy', label: s.strategy, category: s.intervention_type, behaviorKey: key }));
    setDialogItems(items);
    setDialogMode('bulk');
    setDialogOpen(true);
  };

  if (isLoading) {
    return <div className="text-center py-16 text-muted-foreground">Loading behavior reduction strategies...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search strategies..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={behaviorFilter} onValueChange={setBehaviorFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Behavior" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Behaviors</SelectItem>
            {behaviorKeys.map(k => <SelectItem key={k} value={k}>{k.replace(/-/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="antecedent">Antecedent</SelectItem>
            <SelectItem value="teaching">Teaching</SelectItem>
            <SelectItem value="reactive">Reactive</SelectItem>
            <SelectItem value="reinforcement">Reinforcement</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex border rounded-md overflow-hidden">
          <Button
            variant={activeView === 'by-behavior' ? 'default' : 'ghost'}
            size="sm"
            className="h-9 rounded-none text-xs"
            onClick={() => setActiveView('by-behavior')}
          >
            By Behavior
          </Button>
          <Button
            variant={activeView === 'universal' ? 'default' : 'ghost'}
            size="sm"
            className="h-9 rounded-none text-xs"
            onClick={() => setActiveView('universal')}
          >
            Universal
          </Button>
        </div>
      </div>

      {/* Bulk mode toggle + action */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>{strategies.length} behavior strategies</span>
          <span>•</span>
          <span>{universalStrategies.length} universal strategies</span>
          <span>•</span>
          <span>{goals.length} goals</span>
          <span>•</span>
          <span>{replacements.length} replacements</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant={bulkMode ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5 text-xs h-8"
            onClick={() => {
              setBulkMode(!bulkMode);
              if (bulkMode) setSelectedIds(new Set());
            }}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            {bulkMode ? `Selected (${selectedIds.size})` : 'Multi-Select'}
          </Button>
          {bulkMode && selectedIds.size > 0 && (
            <Button size="sm" className="gap-1.5 text-xs h-8" onClick={openBulkDialog}>
              <Plus className="w-3.5 h-3.5" />
              Add {selectedIds.size} to Client / Report
            </Button>
          )}
        </div>
      </div>

      {activeView === 'by-behavior' ? (
        <Accordion type="multiple" className="space-y-2">
          {Object.entries(groupedByBehavior).map(([key, group]) => (
            <AccordionItem key={key} value={key} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-3 flex-1">
                  <Target className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm capitalize">{key.replace(/-/g, ' ')}</span>
                  <Badge variant="secondary" className="text-[10px]">{group.strategies.length} strategies</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto mr-2 gap-1 text-xs h-7"
                    onClick={(e) => { e.stopPropagation(); addAllForBehavior(key); }}
                  >
                    <Plus className="w-3 h-3" />
                    Add All
                  </Button>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4 space-y-4">
                {/* Goal */}
                {group.goals.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">BIP/IEP Goal</h4>
                    {group.goals.map(g => (
                      <div key={g.id} className="flex items-start gap-2">
                        {bulkMode && (
                          <Checkbox checked={selectedIds.has(g.id)} onCheckedChange={() => toggleSelect(g.id)} className="mt-1" />
                        )}
                        <p className="text-sm bg-muted/50 rounded-md p-3 flex-1">{g.goal_text}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => openSingleDialog({ id: g.id, type: 'goal', label: g.goal_text, behaviorKey: key })}
                          title="Add to client or report"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Replacement behaviors */}
                {group.replacements.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Replacement Behaviors</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {group.replacements.map(r => (
                        <Badge
                          key={r.id}
                          variant="outline"
                          className="text-xs cursor-pointer hover:bg-primary/10 transition-colors"
                          onClick={() => openSingleDialog({ id: r.id, type: 'replacement', label: r.replacement_behavior, behaviorKey: key })}
                        >
                          {bulkMode && (
                            <Checkbox
                              checked={selectedIds.has(r.id)}
                              onCheckedChange={() => toggleSelect(r.id)}
                              className="mr-1 h-3 w-3"
                            />
                          )}
                          {r.replacement_behavior}
                          <Plus className="w-3 h-3 ml-1 opacity-50" />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strategies by type */}
                {['antecedent', 'teaching', 'reactive'].map(type => {
                  const items = group.strategies.filter(s => s.intervention_type === type);
                  if (items.length === 0) return null;
                  const Icon = TYPE_ICONS[type] || Shield;
                  return (
                    <div key={type}>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5" />
                        {type} Strategies
                      </h4>
                      <ul className="space-y-1">
                        {items.map(s => (
                          <li key={s.id} className="text-sm flex items-start gap-2 group">
                            {bulkMode && (
                              <Checkbox checked={selectedIds.has(s.id)} onCheckedChange={() => toggleSelect(s.id)} className="mt-0.5" />
                            )}
                            <Badge className={`text-[10px] shrink-0 mt-0.5 ${TYPE_COLORS[type] || ''}`}>{type}</Badge>
                            <span className="flex-1">{s.strategy}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              onClick={() => openSingleDialog({ id: s.id, type: 'strategy', label: s.strategy, category: type, behaviorKey: key })}
                              title="Add to client or report"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}

                {/* Benchmark steps */}
                {group.benchmarks.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Benchmark Progression</h4>
                    <ol className="space-y-1">
                      {group.benchmarks.map(b => (
                        <li key={b.id} className="text-sm flex items-start gap-2 group">
                          {bulkMode && (
                            <Checkbox checked={selectedIds.has(b.id)} onCheckedChange={() => toggleSelect(b.id)} className="mt-0.5" />
                          )}
                          <span className="text-xs font-mono text-muted-foreground shrink-0 w-5 text-right">{b.step_number}.</span>
                          <span className="flex-1">{b.benchmark_text}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={() => openSingleDialog({ id: b.id, type: 'benchmark', label: b.benchmark_text, behaviorKey: key })}
                            title="Add to client or report"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </Button>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        /* Universal strategies view */
        <div className="space-y-4">
          {Object.entries(universalGrouped).map(([type, items]) => (
            <Card key={type}>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm capitalize flex items-center gap-2">
                  {TYPE_ICONS[type] ? (() => { const Icon = TYPE_ICONS[type]; return <Icon className="w-4 h-4" />; })() : null}
                  {type} Strategies
                  <Badge variant="secondary" className="text-[10px] ml-2">{items.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <ul className="space-y-1.5">
                  {items.map(s => (
                    <li key={s.id} className="text-sm flex items-start gap-2 group">
                      {bulkMode && (
                        <Checkbox checked={selectedIds.has(s.id)} onCheckedChange={() => toggleSelect(s.id)} className="mt-0.5" />
                      )}
                      <span className="flex-1">• {s.strategy}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={() => openSingleDialog({ id: s.id, type: 'strategy', label: s.strategy, category: type })}
                        title="Add to client or report"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add to Client / Export to Report Dialog */}
      <AddStrategyToClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        items={dialogItems}
        mode={dialogMode}
      />
    </div>
  );
}
