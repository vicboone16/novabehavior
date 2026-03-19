import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Target, Loader2, ExternalLink, Search, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useGoalBankDomains, useGoalSearch } from '@/hooks/useClinicalGoals';

function formatDomain(domain: string): string {
  const upper = domain.toUpperCase();
  if (['PECS', 'AAC', 'SIB', 'ADHD', 'PDA', 'SGD'].includes(upper)) return upper;
  return domain
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function domainSlug(domain: string): string {
  return domain.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function domainDescription(domain: string): string {
  const map: Record<string, string> = {
    PECS: 'Picture Exchange Communication System — Phases 1–6, generalization & advanced skills',
    AAC: 'Augmentative & Alternative Communication — Proloquo, LAMP, SGD, Core Boards & more',
  };
  return map[domain.toUpperCase()] || `Goals and objectives for ${formatDomain(domain)}`;
}

export default function GoalBanksPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const crosswalkTagFilter = searchParams.get('crosswalkTag') || undefined;
  const { data: domains, isLoading } = useGoalBankDomains();
  const [search, setSearch] = useState('');

  const { data: searchResults } = useGoalSearch(search, { crosswalkTagId: crosswalkTagFilter });

  const showSearch = search.length >= 2 || !!crosswalkTagFilter;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Goal Banks</h2>
        <p className="text-xs text-muted-foreground">
          Select a domain to browse goals, objectives, and benchmarks
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search across all goal banks..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {crosswalkTagFilter && (
        <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => navigate('/clinical-library/clinical-collections/goal-banks')}>
          Filtered by crosswalk tag — click to clear
        </Badge>
      )}

      {/* Search results mode */}
      {showSearch && searchResults ? (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">{searchResults.length} results</p>
          {searchResults.map(goal => (
            <Card
              key={goal.id}
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate(`/clinical-library/clinical-collections/goal-banks/${domainSlug(goal.domain)}/${goal.id}`)}
            >
              <CardContent className="p-3">
                <p className="font-medium text-sm truncate">{goal.title}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">{goal.domain}</Badge>
                  {goal.phase && <Badge variant="secondary" className="text-[10px]">{goal.phase}</Badge>}
                  {goal.subdomain && <Badge variant="secondary" className="text-[10px]">{goal.subdomain}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !domains || domains.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="font-medium text-muted-foreground">No goal banks found</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Goal bank data will appear here once seeded in the database.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {domains.map(({ domain, goalCount }) => (
            <Card
              key={domain}
              className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all group"
              onClick={() =>
                navigate(`/clinical-library/clinical-collections/goal-banks/${domainSlug(domain)}`, {
                  state: { domainKey: domain },
                })
              }
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="font-semibold text-sm mb-1">{formatDomain(domain)}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{domainDescription(domain)}</p>
                <Badge variant="secondary" className="text-[10px]">{goalCount} goals</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
