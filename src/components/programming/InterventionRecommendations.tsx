import { RefreshCw, Sparkles, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAbaLibraryPlans } from '@/hooks/useAbaLibraryPlans';

interface InterventionRecommendationsProps {
  clientId: string;
  agencyId?: string;
  onAddToPlan?: (interventionId: string, title: string) => void;
}

export function InterventionRecommendations({ clientId, agencyId, onAddToPlan }: InterventionRecommendationsProps) {
  const { topMatches, refreshRecommendations } = useAbaLibraryPlans(clientId, agencyId);

  if (topMatches.isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  const matches = topMatches.data || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Recommended Interventions
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refreshRecommendations.mutate()}
            disabled={refreshRecommendations.isPending}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshRecommendations.isPending ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {matches.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No matching interventions found. Add behavior function tags and client profile data to improve recommendations.
          </p>
        ) : (
          <div className="space-y-2">
            {matches.map((match: any) => (
              <div
                key={match.intervention_id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{match.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {match.intervention_type?.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Score: {Math.round(match.total_score)}
                    </span>
                  </div>
                </div>
                {onAddToPlan && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAddToPlan(match.intervention_id, match.title)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
