import type { GraphMetric } from '@/types/graphDataState';

interface ABATooltipContentProps {
  graphType: 'skills' | 'behavior';
  metric: GraphMetric;
  active?: boolean;
  payload?: any[];
  label?: string;
}

export function ABATooltipContent({ graphType, metric, active, payload, label }: ABATooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null;

  const d = payload[0]?.payload;
  if (!d) return null;

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-xs space-y-1">
      <div className="font-semibold text-sm">{d.date || label}</div>
      {d.phase && (
        <div className="text-muted-foreground">Phase: {d.phase}</div>
      )}

      {graphType === 'skills' ? (
        <>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Value:</span>
            <span className="font-medium">{d.y != null ? `${d.y}%` : '—'}</span>
          </div>
          {d.totalTrials != null && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Trials:</span>
              <span>{d.totalTrials}</span>
            </div>
          )}
          {d.independent != null && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Independent (+):</span>
              <span className="text-primary font-medium">{d.independent}</span>
            </div>
          )}
          {d.prompted != null && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Prompted (+):</span>
              <span className="text-accent-foreground font-medium">{d.prompted}</span>
            </div>
          )}
          {d.incorrect != null && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Incorrect (−):</span>
              <span className="text-destructive font-medium">{d.incorrect}</span>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">
              {metric === 'frequency' ? 'Count' :
               metric === 'rate' ? 'Rate' :
               metric === 'duration' ? 'Duration' :
               metric === 'latency' ? 'Latency' : 'Value'}:
            </span>
            <span className="font-medium">{d.y ?? '—'}</span>
          </div>
          {d.sessionDuration != null && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Session Duration:</span>
              <span>{d.sessionDuration} min</span>
            </div>
          )}
        </>
      )}

      {d.notes && (
        <div className="pt-1 border-t text-muted-foreground">📝 {d.notes}</div>
      )}
    </div>
  );
}
