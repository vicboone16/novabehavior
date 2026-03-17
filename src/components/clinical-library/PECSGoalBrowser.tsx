import { useState, useMemo } from 'react';
import { Search, ChevronRight, MessageCircle, Target, Layers } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import {
  useLibraryDomains,
  useLibrarySubdomains,
  useLibraryGoals,
  type LibraryGoal,
} from '@/hooks/useLibraryRegistry';
import { LibraryGoalDetail } from './LibraryGoalDetail';

interface Props {
  clientId?: string;
}

export function PECSGoalBrowser({ clientId }: Props) {
  const { data: domains = [] } = useLibraryDomains('pecs');
  const { data: subdomains = [] } = useLibrarySubdomains('pecs');
  const { data: goals = [], isLoading } = useLibraryGoals('pecs');

  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState('all');
  const [subdomainFilter, setSubdomainFilter] = useState('all');
  const [selectedGoal, setSelectedGoal] = useState<LibraryGoal | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filteredSubdomains = useMemo(() => {
    if (phaseFilter === 'all') return subdomains;
    return subdomains.filter(s => s.domain_key === phaseFilter);
  }, [subdomains, phaseFilter]);

  const filtered = useMemo(() => {
    return goals.filter(g => {
      if (phaseFilter !== 'all' && g.domain_key !== phaseFilter) return false;
      if (subdomainFilter !== 'all' && g.subdomain_key !== subdomainFilter) return false;
      if (search.length >= 2) {
        const q = search.toLowerCase();
        return (
          g.goal_title.toLowerCase().includes(q) ||
          g.goal_description?.toLowerCase().includes(q) ||
          g.tags?.some(t => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [goals, search, phaseFilter, subdomainFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, LibraryGoal[]>>();
    filtered.forEach(g => {
      const dk = g.domain_key;
      const sk = g.subdomain_key ?? '_none';
      if (!map.has(dk)) map.set(dk, new Map());
      const sMap = map.get(dk)!;
      if (!sMap.has(sk)) sMap.set(sk, []);
      sMap.get(sk)!.push(g);
    });
    return map;
  }, [filtered]);

  const phaseName = (key: string) =>
    domains.find(d => d.domain_key === key)?.domain_name ?? key.replace(/_/g, ' ');

  const subdomainName = (key: string) =>
    key === '_none'
      ? 'General'
      : subdomains.find(s => s.subdomain_key === key)?.subdomain_name ?? key.replace(/_/g, ' ');

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
        libraryName="PECS"
        onBack={() => setSelectedGoal(null)}
        clientId={clientId}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <MessageCircle className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold">PECS Communication Goals</h3>
        <Badge variant="outline" className="text-[9px]">intervention library</Badge>
        <Badge variant="secondary" className="text-[10px] ml-auto">{filtered.length} goals</Badge>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search PECS goals..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Select
          value={phaseFilter}
          onValueChange={v => {
            setPhaseFilter(v);
            setSubdomainFilter('all');
          }}
        >
          <SelectTrigger className="w-56 h-8 text-xs">
            <Layers className="w-3 h-3 mr-1" />
            <SelectValue placeholder="Phase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Phases</SelectItem>
            {domains.map(d => (
              <SelectItem key={d.domain_key} value={d.domain_key}>
                {d.domain_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={subdomainFilter} onValueChange={setSubdomainFilter}>
          <SelectTrigger className="w-48 h-8 text-xs">
            <SelectValue placeholder="Subdomain" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subdomains</SelectItem>
            {filteredSubdomains.map(s => (
              <SelectItem key={s.subdomain_key} value={s.subdomain_key}>
                {s.subdomain_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground py-6 text-center">Loading PECS goals…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Target className="w-6 h-6 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">No PECS goals found matching filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {[...grouped.entries()].map(([dk, sMap]) => (
            <Collapsible key={dk} open={expanded.has(dk)} onOpenChange={() => toggle(dk)}>
              <CollapsibleTrigger asChild>
                <Card className="cursor-pointer hover:bg-muted/30 transition-colors">
                  <CardContent className="p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-transform ${expanded.has(dk) ? 'rotate-90' : ''}`}
                      />
                      <MessageCircle className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-semibold">{phaseName(dk)}</span>
                      <Badge variant="secondary" className="text-[9px]">
                        {[...sMap.values()].reduce((s, a) => s + a.length, 0)} goals
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent className="pl-5 space-y-1 mt-1">
                {[...sMap.entries()].map(([sk, sGoals]) => (
                  <Collapsible
                    key={sk}
                    open={expanded.has(`${dk}:${sk}`)}
                    onOpenChange={() => toggle(`${dk}:${sk}`)}
                  >
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-2 rounded border border-border/50 bg-muted/20 cursor-pointer hover:bg-muted/40">
                        <div className="flex items-center gap-2">
                          <ChevronRight
                            className={`w-3 h-3 transition-transform ${expanded.has(`${dk}:${sk}`) ? 'rotate-90' : ''}`}
                          />
                          <span className="text-[11px] font-medium capitalize">{subdomainName(sk)}</span>
                          <Badge variant="outline" className="text-[8px]">{sGoals.length}</Badge>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 space-y-1 mt-1">
                      {sGoals.map(goal => (
                        <div
                          key={goal.id}
                          className="flex items-center justify-between p-2 rounded border border-border/30 bg-background cursor-pointer hover:bg-muted/30 transition-colors"
                          onClick={() => setSelectedGoal(goal)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium truncate">{goal.goal_title}</p>
                            {(goal.tags ?? []).length > 0 && (
                              <div className="flex gap-0.5 mt-0.5 flex-wrap">
                                {goal.tags!.slice(0, 3).map(t => (
                                  <Badge key={t} variant="secondary" className="text-[7px]">
                                    {t}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
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
