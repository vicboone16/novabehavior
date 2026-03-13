import { useNavigate } from 'react-router-dom';
import { Target, Loader2, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGoalBankDomains } from '@/hooks/useClinicalGoals';

/** Humanize domain key: "pecs" → "PECS", "aac" → "AAC", "emotional_regulation" → "Emotional Regulation" */
function formatDomain(domain: string): string {
  const upper = domain.toUpperCase();
  if (['PECS', 'AAC', 'SIB', 'ADHD', 'PDA', 'SGD'].includes(upper)) return upper;
  return domain
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Slug from domain key */
function domainSlug(domain: string): string {
  return domain.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export default function GoalBanksPage() {
  const navigate = useNavigate();
  const { data: domains, isLoading } = useGoalBankDomains();

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

      {!domains || domains.length === 0 ? (
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
                <Badge variant="secondary" className="text-[10px]">{goalCount} goals</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
