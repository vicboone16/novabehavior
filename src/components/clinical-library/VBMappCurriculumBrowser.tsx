import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Search, ChevronDown, ChevronUp, BookOpen, Target, ListChecks, Filter, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
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
  onBack: () => void;
}

export function VBMappCurriculumBrowser({ onBack }: Props) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [benchmarks, setBenchmarks] = useState<Record<string, Benchmark[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [expandedBenchmarks, setExpandedBenchmarks] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [searchResults, setSearchResults] = useState<Goal[] | null>(null);
  const [aiSearch, setAiSearch] = useState(false);
  const [aiSearching, setAiSearching] = useState(false);
  const [aiMatchInfo, setAiMatchInfo] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [domainRes, goalRes] = await Promise.all([
      supabase.from('clinical_curricula_domains').select('id, key, title, sort_order').order('sort_order'),
      supabase.from('clinical_curricula_goals').select('id, domain_id, key, title, clinical_goal, objective_text, vbmapp_domain, vbmapp_level, younger_examples, older_examples, benchmark_count, is_active, sort_order').eq('is_active', true).order('sort_order'),
    ]);
    if (domainRes.error) { toast.error('Failed to load domains'); console.error(domainRes.error); }
    if (goalRes.error) { toast.error('Failed to load goals'); console.error(goalRes.error); }
    setDomains((domainRes.data || []) as Domain[]);
    setGoals((goalRes.data || []) as Goal[]);
    setLoading(false);
  }, []);

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

  const handleSearch = useCallback(async (text: string) => {
    setSearch(text);
    if (!text.trim()) { setSearchResults(null); setAiMatchInfo({}); return; }

    if (aiSearch) {
      setAiSearching(true);
      try {
        const { data, error } = await supabase.functions.invoke('curriculum-ai-search', {
          body: { query: text.trim() },
        });
        if (error) throw error;
        const matchedIds = new Set((data?.top_matching_goals ?? []).map((r: any) => r.goal_id));
        const matchInfoMap: Record<string, string> = {};
        (data?.top_matching_goals ?? []).forEach((r: any) => { matchInfoMap[r.goal_id] = r.why_matches; });
        setAiMatchInfo(matchInfoMap);
        setSearchResults(goals.filter(g => matchedIds.has(g.id)));
      } catch (e) {
        console.error(e);
        toast.error('AI search failed, falling back to text search');
        setAiSearch(false);
        // Fall through to RPC search below
      } finally {
        setAiSearching(false);
      }
      return;
    }

    const selectedDomain = domainFilter !== 'all' ? domains.find(d => d.id === domainFilter)?.title : null;
    const selectedLevel = levelFilter !== 'all' ? parseInt(levelFilter) : null;
    const { data, error } = await supabase.rpc('search_vbmapp_curricula', {
      p_query: text.trim(),
      p_domain: selectedDomain || null,
      p_level: selectedLevel || null,
      p_age_tag: null
    });
    if (error) { console.error(error); return; }
    const matchedIds = new Set((data as any[]).map(r => r.goal_id));
    setSearchResults(goals.filter(g => matchedIds.has(g.id)));
    setAiMatchInfo({});
  }, [goals, domains, domainFilter, levelFilter, aiSearch]);

  const toggleDomain = (id: string) => {
    setExpandedDomains(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const levels = [...new Set(goals.map(g => g.vbmapp_level).filter(Boolean))].sort((a, b) => (a ?? 0) - (b ?? 0));

  const getFilteredGoals = (domainId: string) => {
    let filtered = searchResults !== null ? searchResults.filter(g => g.domain_id === domainId) : goals.filter(g => g.domain_id === domainId);
    if (levelFilter !== 'all') {
      filtered = filtered.filter(g => g.vbmapp_level?.toString() === levelFilter);
    }
    return filtered;
  };

  const visibleDomains = domains.filter(d => {
    if (domainFilter !== 'all' && d.id !== domainFilter) return false;
    return getFilteredGoals(d.id).length > 0 || (searchResults === null && levelFilter === 'all');
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            VB-MAPP Curriculum Browser
          </h2>
          <p className="text-xs text-muted-foreground">{domains.length} domains · {goals.length} goals</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          {aiSearching ? (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
          ) : aiSearch ? (
            <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          )}
          <Input
            placeholder={aiSearch ? "AI-powered search..." : "Search goals..."}
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Switch checked={aiSearch} onCheckedChange={setAiSearch} className="scale-90" />
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> AI
          </span>
        </div>
        <Select value={domainFilter} onValueChange={setDomainFilter}>
          <SelectTrigger className="w-[180px]">
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
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            {levels.map(l => (
              <SelectItem key={l!} value={l!.toString()}>Level {l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || domainFilter !== 'all' || levelFilter !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setSearchResults(null); setDomainFilter('all'); setLevelFilter('all'); }}>
            Clear Filters
          </Button>
        )}
      </div>

      {/* Domain list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading VB-MAPP curriculum...</div>
      ) : visibleDomains.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No matching goals found.</CardContent></Card>
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
                        <Badge variant="secondary" className="text-xs">{domainGoals.length} goals</Badge>
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 space-y-3">
                      {domainGoals.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">No goals match current filters.</p>
                      ) : domainGoals.map(goal => (
                        <Card key={goal.id} className="border-border/60 bg-muted/20">
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Target className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <span className="font-medium text-sm text-foreground">{goal.title}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {goal.vbmapp_level != null && (
                                  <Badge variant="outline" className="text-[10px]">Level {goal.vbmapp_level}</Badge>
                                )}
                                {goal.vbmapp_domain && (
                                  <Badge variant="secondary" className="text-[10px]">{goal.vbmapp_domain}</Badge>
                                )}
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

                            {goal.younger_examples && goal.younger_examples.length > 0 && (
                              <div className="pl-6">
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Younger Learner Examples</p>
                                <ul className="text-xs text-foreground list-disc list-inside">
                                  {goal.younger_examples.map((ex, i) => <li key={i}>{ex}</li>)}
                                </ul>
                              </div>
                            )}

                            {goal.older_examples && goal.older_examples.length > 0 && (
                              <div className="pl-6">
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Older Learner Examples</p>
                                <ul className="text-xs text-foreground list-disc list-inside">
                                  {goal.older_examples.map((ex, i) => <li key={i}>{ex}</li>)}
                                </ul>
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
    </div>
  );
}
