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
  if (!d || d.isNoData) return null;

  const isPercent = metric === 'percent_correct' || metric === 'percent_independent' || metric === 'percent_prompted';
  const isCumulative = metric === 'cumulative_frequency' || metric === 'cumulative_duration';

  const formatValue = (v: number | null) => {
    if (v == null) return '—';
    if (isPercent) return `${v}%`;
    if (metric === 'rate') return v.toFixed(2);
    if (metric === 'duration' || metric === 'latency' || metric === 'cumulative_duration') return `${v} min`;
    return String(v);
  };

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md text-xs space-y-1.5 min-w-[180px]">
      {/* Date + session */}
      <div className="font-semibold text-sm">{d.date || label}</div>
      {d.sessionIndex != null && (
        <div className="text-muted-foreground text-[10px]">Session #{d.sessionIndex}</div>
      )}
      {d.phase && (
        <div className="text-muted-foreground">Phase: <span className="capitalize">{d.phase}</span></div>
      )}
      {d.dataState === 'observed_zero' && (
        <div className="text-muted-foreground italic">Observed — zero occurrences</div>
      )}

      <div className="border-t pt-1.5 space-y-1">
        {/* Primary metric value */}
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">
            {isCumulative ? 'Cumulative' : metric.replace(/_/g, ' ')}:
          </span>
          <span className="font-medium">{formatValue(d.y)}</span>
        </div>

        {/* Skills detail breakdown */}
        {graphType === 'skills' && (
          <>
            {d.totalTrials != null && d.correct != null && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Correct / Trials:</span>
                <span className="font-medium">{d.correct}/{d.totalTrials}</span>
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
                <span className="font-medium">{d.prompted}</span>
              </div>
            )}
            {d.incorrect != null && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Incorrect (−):</span>
                <span className="text-destructive font-medium">{d.incorrect}</span>
              </div>
            )}
          </>
        )}

        {/* Behavior detail */}
        {graphType === 'behavior' && (
          <>
            {metric === 'rate' && d.value != null && d.sessionDuration != null && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Count:</span>
                <span>{Math.round(d.value * d.sessionDuration)}</span>
              </div>
            )}
            {d.sessionDuration != null && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Session:</span>
                <span>{d.sessionDuration} min</span>
              </div>
            )}
            {metric === 'rate' && d.sessionDuration == null && (
              <div className="text-muted-foreground italic text-[10px]">
                Session duration missing — rate may be inaccurate
              </div>
            )}
          </>
        )}
      </div>

      {/* Overlay values */}
      {(d.movingAvg != null || d.trend != null) && (
        <div className="border-t pt-1 space-y-0.5 text-[10px]">
          {d.movingAvg != null && (
            <div className="flex justify-between gap-4 text-muted-foreground">
              <span>Moving Avg:</span>
              <span>{isPercent ? `${d.movingAvg}%` : d.movingAvg}</span>
            </div>
          )}
          {d.trend != null && (
            <div className="flex justify-between gap-4 text-muted-foreground">
              <span>Trend:</span>
              <span>{isPercent ? `${d.trend}%` : d.trend}</span>
            </div>
          )}
        </div>
      )}

      {d.notes && (
        <div className="pt-1 border-t text-muted-foreground">📝 {d.notes}</div>
      )}
    </div>
  );
}
