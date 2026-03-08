import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, GraduationCap, Pencil, Archive } from 'lucide-react';
import type { BehaviorStrategy } from '@/hooks/useBehaviorStrategyLibrary';

interface Props {
  strategy: BehaviorStrategy;
  canEdit: boolean;
  onView: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
}

const evidenceColors: Record<string, string> = {
  strong: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  moderate: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  emerging: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  expert_consensus: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

export function StrategyCard({ strategy, canEdit, onView, onEdit, onArchive }: Props) {
  const isArchived = strategy.strategy_name.startsWith('[ARCHIVED]');

  return (
    <Card className={`transition-shadow hover:shadow-md ${isArchived ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-tight">
            {strategy.strategy_name.replace('[ARCHIVED] ', '')}
          </CardTitle>
          {strategy.evidence_level && (
            <Badge variant="outline" className={`shrink-0 text-[10px] ${evidenceColors[strategy.evidence_level] || ''}`}>
              {strategy.evidence_level.replace('_', ' ')}
            </Badge>
          )}
        </div>
        {strategy.strategy_group && (
          <p className="text-[11px] text-muted-foreground capitalize">
            {strategy.strategy_group.replace(/_/g, ' ')}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {strategy.teacher_quick_version && (
          <p className="text-xs text-muted-foreground line-clamp-2">{strategy.teacher_quick_version}</p>
        )}
        {!strategy.teacher_quick_version && strategy.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{strategy.description}</p>
        )}

        <div className="flex flex-wrap gap-1">
          {(strategy.function_targets || []).map(ft => (
            <Badge key={ft} variant="secondary" className="text-[10px]">{ft}</Badge>
          ))}
          {(strategy.environments || []).slice(0, 2).map(env => (
            <Badge key={env} variant="outline" className="text-[10px]">{env}</Badge>
          ))}
        </div>

        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          {strategy.step_count != null && <span>{strategy.step_count} steps</span>}
          {strategy.training_link_count != null && strategy.training_link_count > 0 && (
            <>
              <span>·</span>
              <GraduationCap className="h-3 w-3" />
              <span>{strategy.training_link_count} training</span>
            </>
          )}
        </div>

        <div className="flex gap-1 pt-1">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onView}>
            <Eye className="h-3 w-3 mr-1" /> View
          </Button>
          {canEdit && onEdit && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onEdit}>
              <Pencil className="h-3 w-3 mr-1" /> Edit
            </Button>
          )}
          {canEdit && onArchive && !isArchived && (
            <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={onArchive}>
              <Archive className="h-3 w-3 mr-1" /> Archive
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
