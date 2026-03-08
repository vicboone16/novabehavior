import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SavedResult } from '@/hooks/useBehaviorRecommendations';

interface Props {
  result: SavedResult;
}

const formatLabel = (s: string | null) => s?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';

export function SavedResultRow({ result }: Props) {
  const navigate = useNavigate();

  return (
    <Card className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => navigate(`/behavior-recommendations/result/${result.id}`)}>
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap gap-1.5 items-center">
            {result.function_target && <Badge variant="outline" className="text-xs">{formatLabel(result.function_target)}</Badge>}
            {result.environment && <Badge variant="secondary" className="text-xs">{formatLabel(result.environment)}</Badge>}
            {result.escalation_level && <Badge variant="secondary" className="text-xs">{formatLabel(result.escalation_level)}</Badge>}
            {result.tier && <Badge variant="secondary" className="text-xs">{formatLabel(result.tier)}</Badge>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {result.student_id && <span>Student: {result.student_id.slice(0, 8)}…</span>}
            {result.created_at && <span>{new Date(result.created_at).toLocaleDateString()}</span>}
            {result.notes && <span className="truncate max-w-[200px]">{result.notes}</span>}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </CardContent>
    </Card>
  );
}
