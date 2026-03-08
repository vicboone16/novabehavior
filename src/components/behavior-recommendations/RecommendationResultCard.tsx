import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, BookmarkPlus, Plus } from 'lucide-react';
import type { RecommendationResult } from '@/hooks/useBehaviorRecommendations';

interface Props {
  result: RecommendationResult;
  rank: number;
  onViewStrategy: (strategyId: string) => void;
}

const evidenceColors: Record<string, string> = {
  strong: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  emerging: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  expert: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

const formatLabel = (s: string) => s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';

export function RecommendationResultCard({ result, rank, onViewStrategy }: Props) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {rank}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground truncate">{result.strategy_name}</h4>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {result.strategy_group && (
                  <Badge variant="outline" className="text-xs">{formatLabel(result.strategy_group)}</Badge>
                )}
                {result.category && (
                  <Badge variant="secondary" className="text-xs">{formatLabel(result.category)}</Badge>
                )}
                {result.evidence_level && (
                  <Badge className={`text-xs ${evidenceColors[result.evidence_level] || ''}`}>
                    {formatLabel(result.evidence_level)}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs font-mono">
                  Score: {result.priority_score}
                </Badge>
              </div>
              {result.rationale && (
                <p className="text-xs text-muted-foreground mt-2">{result.rationale}</p>
              )}
              {result.teacher_quick_version && (
                <p className="text-sm text-muted-foreground mt-2 border-l-2 border-primary/30 pl-2 italic">
                  {result.teacher_quick_version}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Button variant="ghost" size="sm" onClick={() => onViewStrategy(result.strategy_id)}>
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
