import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Loader2, ChevronRight, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useGoalsByDomain, type ClinicalGoal } from '@/hooks/useClinicalGoals';

function formatDomain(domain: string): string {
  const upper = domain.toUpperCase();
  if (['PECS', 'AAC', 'SIB', 'ADHD', 'PDA', 'SGD'].includes(upper)) return upper;
  return domain.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Phase sort order for PECS */
const PECS_PHASE_ORDER = [
  'Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Phase 5', 'Phase 6',
  'Communication Book Management', 'Prompt Fading', 'Error Correction',
  'Generalization', 'Advanced PECS Skills',
];

function phaseSort(a: string, b: string): number {
  const ia = PECS_PHASE_ORDER.indexOf(a);
  const ib = PECS_PHASE_ORDER.indexOf(b);
  if (ia >= 0 && ib >= 0) return ia - ib;
  if (ia >= 0) return -1;
  if (ib >= 0) return 1;
  return a.localeCompare(b);
}

/** AAC modality sort */
const AAC_MODALITY_ORDER = ['PECS', 'Proloquo', 'LAMP', 'SGD', 'Core Boards', 'Communication Books'];

function modalitySort(a: string, b: string): number {
  const ia = AAC_MODALITY_ORDER.indexOf(a);
  const ib = AAC_MODALITY_ORDER.indexOf(b);
  if (ia >= 0 && ib >= 0) return ia - ib;
  if (ia >= 0) return -1;
  if (ib >= 0) return 1;
  return a.localeCompare(b);
}

type GroupResult =
  | { type: 'flat'; goals: ClinicalGoal[] }
  | { type: 'phase' | 'subdomain'; groups: Map<string, ClinicalGoal[]> }
  | { type: 'nested'; groups: Map<string, Map<string, ClinicalGoal[]>> };

function groupGoals(goals: ClinicalGoal[], domain: string): GroupResult {
  const domainLower = domain.toLowerCase();

  if (domainLower === 'pecs') {
    const groups = new Map<string, ClinicalGoal[]>();
    goals.forEach(g => {
      const key = g.phase || 'Other';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(g);
    });
    // Sort by PECS phase order
    const sorted = new Map(
      Array.from(groups.entries()).sort(([a], [b]) => phaseSort(a, b))
    );
    return { type: 'phase', groups: sorted };
  }

  if (domainLower === 'aac') {
    const groups = new Map<string, Map<string, ClinicalGoal[]>>();
    goals.forEach(g => {
      const modality = g.subdomain || 'General';
      const category = g.goal_category ? formatLabel(g.goal_category) : 'General';
      if (!groups.has(modality)) groups.set(modality, new Map());
      const sub = groups.get(modality)!;
      if (!sub.has(category)) sub.set(category, []);
      sub.get(category)!.push(g);
    });
    // Sort modalities
    const sorted = new Map(
      Array.from(groups.entries()).sort(([a], [b]) => modalitySort(a, b))
    );
    return { type: 'nested', groups: sorted };
  }

  const hasSubdomains = goals.some(g => g.subdomain);
  if (hasSubdomains) {
    const groups = new Map<string, ClinicalGoal[]>();
    goals.forEach(g => {
      const key = g.subdomain || 'General';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(g);
    });
    return { type: 'subdomain', groups };
  }

  return { type: 'flat', goals };
}

export default function GoalBankDomainPage() {
  const { domainSlug } = useParams<{ domainSlug: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const domainKey = domainSlug || '';
  const { data: goals, isLoading } = useGoalsByDomain(domainKey);

  // Extract unique phases & categories for filters
  const phases = useMemo(() => {
    if (!goals) return [];
    return [...new Set(goals.map(g => g.phase).filter(Boolean))] as string[];
  }, [goals]);

  const categories = useMemo(() => {
    if (!goals) return [];
    return [...new Set(goals.map(g => g.goal_category).filter(Boolean))] as string[];
  }, [goals]);

  const filtered = useMemo(() => {
    if (!goals) return [];
    return goals.filter(g => {
      if (phaseFilter !== 'all' && g.phase !== phaseFilter) return false;
      if (categoryFilter !== 'all' && g.goal_category !== categoryFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        g.title.toLowerCase().includes(q) ||
        g.description?.toLowerCase().includes(q) ||
        g.objective?.toLowerCase().includes(q) ||
        g.phase?.toLowerCase().includes(q) ||
        g.subdomain?.toLowerCase().includes(q)
      );
    });
  }, [goals, search, phaseFilter, categoryFilter]);

  const grouped = useMemo(() => groupGoals(filtered, domainKey), [filtered, domainKey]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const basePath = `/clinical-library/clinical-collections/goal-banks/${domainSlug}`;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">{formatDomain(domainKey)}</h2>
        <p className="text-xs text-muted-foreground">{filtered.length} goals</p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search goals..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        {phases.length > 1 && (
          <Select value={phaseFilter} onValueChange={setPhaseFilter}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <SelectValue placeholder="All Phases" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Phases</SelectItem>
              {phases.sort(phaseSort).map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {categories.length > 1 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.sort().map(c => (
                <SelectItem key={c} value={c}>{formatLabel(c)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No goals found</p>
      ) : grouped.type === 'flat' ? (
        <GoalList goals={grouped.goals} basePath={basePath} navigate={navigate} />
      ) : grouped.type === 'phase' || grouped.type === 'subdomain' ? (
        <Accordion type="multiple" defaultValue={Array.from(grouped.groups.keys())} className="space-y-2">
          {Array.from(grouped.groups.entries()).map(([key, items]) => (
            <AccordionItem key={key} value={key} className="border rounded-lg px-4">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{key}</span>
                  <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <GoalList goals={items} basePath={basePath} navigate={navigate} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.groups.entries()).map(([modality, categories]) => (
            <div key={modality}>
              <h3 className="font-semibold text-sm mb-2 text-primary">{modality}</h3>
              <Accordion type="multiple" defaultValue={Array.from(categories.keys())} className="space-y-1.5 ml-2">
                {Array.from(categories.entries()).map(([cat, items]) => (
                  <AccordionItem key={cat} value={cat} className="border rounded-lg px-4">
                    <AccordionTrigger className="py-2 hover:no-underline">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{cat}</span>
                        <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <GoalList goals={items} basePath={basePath} navigate={navigate} />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GoalList({
  goals,
  basePath,
  navigate,
}: {
  goals: ClinicalGoal[];
  basePath: string;
  navigate: (to: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      {goals.map(goal => (
        <Card
          key={goal.id}
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate(`${basePath}/${goal.id}`)}
        >
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{goal.title}</p>
              {goal.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{goal.description}</p>
              )}
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {goal.phase && <Badge variant="outline" className="text-[10px]">{goal.phase}</Badge>}
                {goal.subdomain && <Badge variant="secondary" className="text-[10px]">{goal.subdomain}</Badge>}
                {goal.goal_category && <Badge variant="secondary" className="text-[10px]">{formatLabel(goal.goal_category)}</Badge>}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
