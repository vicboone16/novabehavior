import { useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Search, Loader2, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useGoalsByDomain, type ClinicalGoal } from '@/hooks/useClinicalGoals';

function formatDomain(domain: string): string {
  const upper = domain.toUpperCase();
  if (['PECS', 'AAC', 'SIB', 'ADHD', 'PDA', 'SGD'].includes(upper)) return upper;
  return domain.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** Group goals based on domain type */
function groupGoals(goals: ClinicalGoal[], domain: string) {
  const domainLower = domain.toLowerCase();

  if (domainLower === 'pecs') {
    // Group by phase
    const groups = new Map<string, ClinicalGoal[]>();
    goals.forEach(g => {
      const key = g.phase || 'Other';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(g);
    });
    return { type: 'phase' as const, groups };
  }

  if (domainLower === 'aac') {
    // Group by subdomain/modality, then by goal_category
    const groups = new Map<string, Map<string, ClinicalGoal[]>>();
    goals.forEach(g => {
      const modality = g.subdomain || 'General';
      const category = g.goal_category || 'General';
      if (!groups.has(modality)) groups.set(modality, new Map());
      const sub = groups.get(modality)!;
      if (!sub.has(category)) sub.set(category, []);
      sub.get(category)!.push(g);
    });
    return { type: 'nested' as const, groups };
  }

  // Default: group by subdomain if present, otherwise flat
  const hasSubdomains = goals.some(g => g.subdomain);
  if (hasSubdomains) {
    const groups = new Map<string, ClinicalGoal[]>();
    goals.forEach(g => {
      const key = g.subdomain || 'General';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(g);
    });
    return { type: 'subdomain' as const, groups };
  }

  return { type: 'flat' as const, goals };
}

export default function GoalBankDomainPage() {
  const { domainSlug } = useParams<{ domainSlug: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  // Get the actual domain key from location state or derive from slug
  const domainKey: string = (location.state as any)?.domainKey || domainSlug?.replace(/-/g, '_') || '';
  const { data: goals, isLoading } = useGoalsByDomain(domainKey);

  const filtered = useMemo(() => {
    if (!goals) return [];
    if (!search) return goals;
    const q = search.toLowerCase();
    return goals.filter(g =>
      g.title.toLowerCase().includes(q) ||
      g.description?.toLowerCase().includes(q) ||
      g.objective?.toLowerCase().includes(q) ||
      g.phase?.toLowerCase().includes(q) ||
      g.subdomain?.toLowerCase().includes(q)
    );
  }, [goals, search]);

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

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search goals..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
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
        // Nested: AAC modality → category
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
                {goal.goal_category && <Badge variant="secondary" className="text-[10px]">{goal.goal_category}</Badge>}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
