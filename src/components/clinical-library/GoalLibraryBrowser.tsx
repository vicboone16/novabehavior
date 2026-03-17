import { useState, useMemo } from 'react';
import { Search, Filter, Target, ChevronRight, BookOpen, Layers } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import {
  useLibraryRegistry,
  useLibraryDomains,
  type LibraryGoal,
} from '@/hooks/useLibraryRegistry';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { LibraryGoalDetail } from './LibraryGoalDetail';

/** Fetch ALL active goals across all libraries */
function useAllLibraryGoals() {
  return useQuery({
    queryKey: ['all-library-goals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('library_goal_bank')
        .select('*')
        .eq('is_active', true)
        .order('library_key')
        .order('domain_key')
        .order('goal_title');
      if (error) throw error;
      return (data ?? []) as LibraryGoal[];
    },
  });
}

export function GoalLibraryBrowser() {
  const { data: libraries = [] } = useLibraryRegistry();
  const { data: allGoals = [], isLoading } = useAllLibraryGoals();
  const [search, setSearch] = useState('');
  const [libraryFilter, setLibraryFilter] = useState('all');
  const [domainFilter, setDomainFilter] = useState('all');
  const [selectedGoal, setSelectedGoal] = useState<LibraryGoal | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return allGoals.filter(g => {
      if (libraryFilter !== 'all' && g.library_key !== libraryFilter) return false;
      if (domainFilter !== 'all' && g.domain_key !== domainFilter) return false;
      if (search.length >= 2) {
        const q = search.toLowerCase();
        return g.goal_title.toLowerCase().includes(q) ||
          g.goal_description?.toLowerCase().includes(q) ||
          g.domain_key.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allGoals, search, libraryFilter, domainFilter]);

  // Group by library → domain
  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, LibraryGoal[]>>();
    filtered.forEach(g => {
      if (!map.has(g.library_key)) map.set(g.library_key, new Map());
      const domMap = map.get(g.library_key)!;
      if (!domMap.has(g.domain_key)) domMap.set(g.domain_key, []);
      domMap.get(g.domain_key)!.push(g);
    });
    return map;
  }, [filtered]);

  const uniqueLibraryKeys = [...new Set(allGoals.map(g => g.library_key))];
  const uniqueDomainKeys = [...new Set(
    (libraryFilter !== 'all' ? allGoals.filter(g => g.library_key === libraryFilter) : allGoals)
      .map(g => g.domain_key)
  )];

  const libraryName = (key: string) => libraries.find(l => l.library_key === key)?.library_name ?? key;

  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  if (selectedGoal) {
    return (
      <LibraryGoalDetail
        goal={selectedGoal}
        libraryName={libraryName(selectedGoal.library_key)}
        onBack={() => setSelectedGoal(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search all goals..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <Select value={libraryFilter} onValueChange={v => { setLibraryFilter(v); setDomainFilter('all'); }}>
          <SelectTrigger className="w-44 h-9">
            <BookOpen className="w-3.5 h-3.5 mr-1" />
            <SelectValue placeholder="Library" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Libraries</SelectItem>
            {uniqueLibraryKeys.map(k => (
              <SelectItem key={k} value={k}>{libraryName(k)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={domainFilter} onValueChange={setDomainFilter}>
          <SelectTrigger className="w-44 h-9">
            <Layers className="w-3.5 h-3.5 mr-1" />
            <SelectValue placeholder="Domain" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Domains</SelectItem>
            {uniqueDomainKeys.sort().map(k => (
              <SelectItem key={k} value={k}>{k.replace(/_/g, ' ')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="text-xs">{filtered.length} goals</Badge>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading goals…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No goals found.</p>
      ) : (
        <div className="space-y-2">
          {[...grouped.entries()].map(([libKey, domMap]) => (
            <Collapsible key={libKey} open={expanded.has(libKey)} onOpenChange={() => toggle(libKey)}>
              <CollapsibleTrigger asChild>
                <Card className="cursor-pointer hover:bg-muted/30 transition-colors">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ChevronRight className={`w-4 h-4 transition-transform ${expanded.has(libKey) ? 'rotate-90' : ''}`} />
                      <Target className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-sm">{libraryName(libKey)}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {[...domMap.values()].reduce((sum, arr) => sum + arr.length, 0)} goals
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-6 space-y-1 mt-1">
                {[...domMap.entries()].map(([domKey, goals]) => (
                  <Collapsible key={domKey} open={expanded.has(`${libKey}:${domKey}`)} onOpenChange={() => toggle(`${libKey}:${domKey}`)}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-2 rounded border border-border/50 bg-muted/20 cursor-pointer hover:bg-muted/40">
                        <div className="flex items-center gap-2">
                          <ChevronRight className={`w-3 h-3 transition-transform ${expanded.has(`${libKey}:${domKey}`) ? 'rotate-90' : ''}`} />
                          <span className="text-xs font-medium capitalize">{domKey.replace(/_/g, ' ')}</span>
                          <Badge variant="outline" className="text-[9px]">{goals.length}</Badge>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 space-y-1 mt-1">
                      {goals.map(goal => (
                        <div
                          key={goal.id}
                          className="flex items-center justify-between p-2 rounded border border-border/30 bg-background cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => setSelectedGoal(goal)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{goal.goal_title}</p>
                            {goal.subdomain_key && (
                              <Badge variant="secondary" className="text-[8px] mt-0.5">{goal.subdomain_key.replace(/_/g, ' ')}</Badge>
                            )}
                          </div>
                          <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  );
}
