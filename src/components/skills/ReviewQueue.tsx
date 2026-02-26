import { CheckCircle, XCircle, Clock, ArrowRight, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useReviewQueue } from '@/hooks/useCriteriaEngine';
import { PHASE_LABELS, CRITERIA_TYPE_LABELS, type TargetPhase, type CriteriaType } from '@/types/criteriaEngine';

interface ReviewQueueProps {
  studentId?: string;
}

export function ReviewQueue({ studentId }: ReviewQueueProps) {
  const { items, loading, updateItem } = useReviewQueue(studentId);

  if (loading) {
    return <div className="text-sm text-muted-foreground p-4">Loading review queue...</div>;
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <CheckCircle className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <h3 className="font-medium text-sm mb-1">All caught up!</h3>
          <p className="text-xs text-muted-foreground">No pending phase transitions to review.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Review Queue
        <Badge variant="secondary">{items.length}</Badge>
      </h3>

      {items.map(item => (
        <Card key={item.id} className="border-l-4 border-l-primary">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Target className="w-3 h-3 text-muted-foreground" />
                  <span className="font-medium text-sm">Target #{item.target_id.slice(0, 8)}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {CRITERIA_TYPE_LABELS[item.criteria_type as CriteriaType] || item.criteria_type}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{PHASE_LABELS[item.current_phase as TargetPhase] || item.current_phase}</span>
                  {item.suggested_phase && (
                    <>
                      <ArrowRight className="w-3 h-3" />
                      <span className="font-medium text-primary">
                        {PHASE_LABELS[item.suggested_phase as TargetPhase] || item.suggested_phase}
                      </span>
                    </>
                  )}
                </div>
                {item.evidence && (
                  <p className="text-xs text-muted-foreground">
                    Evidence: {JSON.stringify(item.evidence).slice(0, 80)}...
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => updateItem(item.id, 'approved')}
                >
                  <CheckCircle className="w-3 h-3 mr-1" /> Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => updateItem(item.id, 'dismissed')}
                >
                  <XCircle className="w-3 h-3 mr-1" /> Dismiss
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => updateItem(item.id, 'snoozed')}
                >
                  <Clock className="w-3 h-3 mr-1" /> Snooze
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
