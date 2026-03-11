import { format } from 'date-fns';
import {
  Pause, Play, CheckCircle, XCircle, Copy, RotateCcw,
  ArrowRight, Plus, Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTargetActivityLog } from '@/hooks/useTargetLifecycle';
import {
  type LifecycleAction,
  ACTION_LABELS,
  ACTION_COLORS,
} from '@/types/targetLifecycle';
import { PHASE_LABELS, type TargetPhase } from '@/types/criteriaEngine';

interface TargetActivityTimelineProps {
  targetId: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  hold: <Pause className="w-3.5 h-3.5" />,
  reinstate: <Play className="w-3.5 h-3.5" />,
  close: <CheckCircle className="w-3.5 h-3.5" />,
  reopen: <RotateCcw className="w-3.5 h-3.5" />,
  discontinue: <XCircle className="w-3.5 h-3.5" />,
  replace: <Copy className="w-3.5 h-3.5" />,
  phase_change: <ArrowRight className="w-3.5 h-3.5" />,
  status_change: <ArrowRight className="w-3.5 h-3.5" />,
  created: <Plus className="w-3.5 h-3.5" />,
};

export function TargetActivityTimeline({ targetId }: TargetActivityTimelineProps) {
  const { entries, loading } = useTargetActivityLog(targetId);

  if (loading) {
    return <div className="text-sm text-muted-foreground p-4">Loading timeline...</div>;
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center">
          <Clock className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-xs text-muted-foreground">No activity recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Activity Timeline
          <Badge variant="outline" className="text-[10px]">{entries.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

          <div className="space-y-3">
            {entries.map((entry) => {
              const action = entry.action as LifecycleAction;
              const colorClass = ACTION_COLORS[action] || 'text-muted-foreground';

              let description = '';
              if (action === 'phase_change') {
                const from = PHASE_LABELS[entry.previous_phase as TargetPhase] || entry.previous_phase;
                const to = PHASE_LABELS[entry.new_phase as TargetPhase] || entry.new_phase;
                description = `${from} → ${to}`;
              } else if (action === 'hold' || action === 'reinstate' || action === 'close' || action === 'reopen' || action === 'discontinue' || action === 'replace') {
                const from = entry.previous_status || '';
                const to = entry.new_status || '';
                if (from && to) description = `${from} → ${to}`;
              }

              return (
                <div key={entry.id} className="relative flex items-start gap-3 pl-1">
                  {/* Icon dot */}
                  <div className={`relative z-10 flex items-center justify-center w-6 h-6 rounded-full bg-background border-2 border-border ${colorClass}`}>
                    {ACTION_ICONS[action] || <ArrowRight className="w-3.5 h-3.5" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${colorClass}`}>
                        {ACTION_LABELS[action] || action}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    {description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
                    )}
                    {entry.reason && (
                      <p className="text-[11px] text-muted-foreground italic mt-0.5">
                        Reason: {entry.reason}
                      </p>
                    )}
                    {entry.notes && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{entry.notes}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
