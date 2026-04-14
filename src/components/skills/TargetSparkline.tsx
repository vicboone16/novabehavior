import { useMemo } from 'react';
import { useTargetGraph } from '@/hooks/useTargetGraph';

interface TargetSparklineProps {
  targetId: string;
}

/**
 * Tiny inline sparkline showing the last 10 sessions' % correct.
 * Uses SVG polyline for zero-dependency rendering.
 */
export function TargetSparkline({ targetId }: TargetSparklineProps) {
  const { sparklineData, loading } = useTargetGraph(targetId, 'all');

  const points = useMemo(() => {
    if (sparklineData.length < 2) return null;
    const w = 100;
    const h = 28;
    const pad = 2;
    const innerW = w - pad * 2;
    const innerH = h - pad * 2;
    const step = innerW / (sparklineData.length - 1);

    return sparklineData
      .map((d, i) => `${pad + i * step},${pad + innerH - (d.value / 100) * innerH}`)
      .join(' ');
  }, [sparklineData]);

  if (loading) return null;

  if (!sparklineData.length || sparklineData.length < 2) {
    return (
      <span className="text-[10px] text-muted-foreground/50 italic">No data</span>
    );
  }

  const lastVal = sparklineData[sparklineData.length - 1].value;
  const color = lastVal >= 80 ? 'hsl(var(--chart-2))' : lastVal >= 50 ? 'hsl(var(--chart-4))' : 'hsl(var(--destructive))';

  return (
    <span className="inline-flex items-center gap-1">
      <svg width={100} height={28} className="shrink-0">
        <polyline
          points={points!}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {(() => {
          const parts = points!.split(' ');
          const last = parts[parts.length - 1].split(',');
          return (
            <circle
              cx={parseFloat(last[0])}
              cy={parseFloat(last[1])}
              r={2.5}
              fill={color}
            />
          );
        })()}
      </svg>
      <span className="text-[10px] font-medium" style={{ color }}>
        {lastVal}%
      </span>
    </span>
  );
}
