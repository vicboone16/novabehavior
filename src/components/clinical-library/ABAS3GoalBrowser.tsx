import { useState, useMemo } from 'react';
import { Search, ChevronRight, Layers, Target, ShieldCheck } from 'lucide-react';
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

export function ABAS3GoalBrowser({ clientId }: Props) {
  const { data: domains = [] } = useLibraryDomains('abas3');
  const { data: subdomains = [] } = useLibrarySubdomains('abas3');
  const { data: goals = [], isLoading } = useLibraryGoals('abas3');

  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [subdomainFilter, setSubdomainFilter] = useState('all');
  const [selectedGoal, setSelectedGoal] = useState<LibraryGoal | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const filteredSubdomains = useMemo(() => {
    if (domainFilter === 'all') return subdomains;
    return subdomains.filter(s => s.domain_key === domainFilter);
  }, [subdomains, domainFilter]);

  const filtered = useMemo(() => {
    return goals.filter(g => {
      const matchSearch = !search ||
        g.goal_title.toLowerCase().includes(search.toLowerCase()) ||
        g.goal_key.toLowerCase().includes(search.toLowerCase()) ||
        (g.tags ?? []).some(t => t.toLowerCase().includes(search.toLowerCase()));
      const matchDomain = domainFilter === 'all' || g.domain_key === domainFilter;
      const matchSub = subdomainFilter === 'all' || g.subdomain_key === subdomainFilter;
      return matchSearch && matchDomain && matchSub;
    });
  }, [goals, search, domainFilter, subdomainFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, LibraryGoal[]>();
    for (const g of filtered) {
      const key = g.subdomain_key ?? g.domain_key;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    }
    return map;
  }, [filtered]);

  if (selectedGoal) {
    return <LibraryGoalDetail goal={selectedGoal} libraryName="ABAS-3" onBack={() => setSelectedGoal(null)} clientId={clientId} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-sm">ABAS-3 Adaptive Behavior Goals</h3>
        <Badge variant="secondary" className="text-[10px]">{filtered.length} goals</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search goals…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
        </div>
        <Select value={domainFilter} onValueChange={v => { setDomainFilter(v); setSubdomainFilter('all'); }}>
          <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Composite" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Composites</SelectItem>
            {domains.map(d => <SelectItem key={d.domain_key} value={d.domain_key}>{d.domain_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={subdomainFilter} onValueChange={setSubdomainFilter}>
          <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="Skill Area" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Skill Areas</SelectItem>
            {filteredSubdomains.map(s => <SelectItem key={s.subdomain_key} value={s.subdomain_key}>{s.subdomain_name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground py-6 text-center">Loading ABAS-3 goals…</p>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground py-6 text-center">No goals match your filters.</p>
      ) : (
        <div className="space-y-2">
          {Array.from(grouped.entries()).map(([key, items]) => {
            const sub = subdomains.find(s => s.subdomain_key === key);
            const dom = domains.find(d => d.domain_key === key);
            const label = sub?.subdomain_name ?? dom?.domain_name ?? key;
            const isOpen = expanded.has(key);
            return (
              <Collapsible key={key} open={isOpen} onOpenChange={o => { const n = new Set(expanded); o ? n.add(key) : n.delete(key); setExpanded(n); }}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 transition-colors">
                  <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium flex-1">{label}</span>
                  <Badge variant="outline" className="text-[9px]">{items.length}</Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-8 space-y-1 mt-1">
                  {items.map(g => (
                    <Card key={g.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setSelectedGoal(g)}>
                      <CardContent className="p-3 flex items-start gap-2">
                        <Target className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium leading-snug">{g.goal_title}</p>
                          {g.goal_description && <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{g.goal_description}</p>}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(g.tags ?? []).slice(0, 3).map(t => <Badge key={t} variant="outline" className="text-[9px]">{t}</Badge>)}
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      </CardContent>
                    </Card>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
