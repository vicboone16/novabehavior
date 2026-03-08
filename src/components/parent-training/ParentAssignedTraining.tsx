import { useNavigate } from 'react-router-dom';
import { BookOpen, Clock, CheckCircle2, ChevronRight, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ParentAssignment } from '@/hooks/useParentTrainingParent';

interface Props {
  assignments: ParentAssignment[];
  isLoading: boolean;
}

export function ParentAssignedTraining({ assignments, isLoading }: Props) {
  const navigate = useNavigate();

  const handleOpen = (a: ParentAssignment) => {
    navigate(`/parent-training/${a.module_id}`);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading assigned training…</div>;
  }

  if (assignments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BookOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
          <p className="text-muted-foreground font-medium">No assigned training yet</p>
          <p className="text-xs text-muted-foreground mt-1">Check back later or contact your provider for next steps.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-2">
        Modules assigned by your care team. Complete them at your own pace.
      </p>
      {assignments.map(a => {
        const isCompleted = a.status === 'completed';
        const isOverdue = a.due_at && new Date(a.due_at) < new Date() && !isCompleted;
        return (
          <Card
            key={a.assignment_id}
            className={`cursor-pointer transition-all hover:shadow-md ${isCompleted ? 'opacity-70' : ''} ${isOverdue ? 'border-destructive/50' : 'hover:border-primary/30'}`}
            onClick={() => handleOpen(a)}
          >
            <CardContent className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isCompleted ? 'bg-green-100 dark:bg-green-950' : 'bg-primary/10'}`}>
                  {isCompleted ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <BookOpen className="w-5 h-5 text-primary" />}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{a.module_title || 'Training Module'}</p>
                  {a.module_description && <p className="text-xs text-muted-foreground line-clamp-1">{a.module_description}</p>}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {a.est_minutes > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {a.est_minutes} min
                      </span>
                    )}
                    {a.goal_count > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Target className="w-3 h-3" /> {a.goal_count} goals
                      </span>
                    )}
                    <Badge variant={isCompleted ? 'default' : isOverdue ? 'destructive' : 'secondary'} className="text-xs capitalize">
                      {isOverdue ? 'Overdue' : a.status.replace('_', ' ')}
                    </Badge>
                    {a.due_at && !isCompleted && (
                      <span className="text-xs text-muted-foreground">
                        Due {new Date(a.due_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
