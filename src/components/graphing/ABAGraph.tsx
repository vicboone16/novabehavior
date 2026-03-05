import { useState, useMemo, useRef, useCallback } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, Area,
} from 'recharts';
import { Image, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { GraphControls } from './GraphControls';
import { ABATooltipContent } from './ABATooltip';
import { splitMiddleTrendLine, type DataPoint } from '@/lib/graphCalculations';
import type {
  ABADataPoint, GraphMetric, XAxisMode, AggregationMode, ChartView, GraphOverlays,
} from '@/types/graphDataState';
import { DEFAULT_OVERLAYS } from '@/types/graphDataState';

interface PhaseMarker {
  date: string;
  sessionIndex: number;
  label: string;
}

interface ABAGraphProps {
  data: ABADataPoint[];
  title?: string;
  graphType?: 'skills' | 'behavior';
  phaseMarkers?: PhaseMarker[];
}

/**
 * ABA-clinical graph with proper data_state handling:
 * - no_data: no point, line gap
 * - observed_zero: point at y=0, line connects
 * - measured: point at value, line connects
 */
export function ABAGraph({ data, title = 'Data Analysis', graphType = 'skills', phaseMarkers = [] }: ABAGraphProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [metric, setMetric] = useState<GraphMetric>(graphType === 'skills' ? 'percent_correct' : 'frequency');
  const [xAxis, setXAxis] = useState<XAxisMode>('date');
  const [aggregation, setAggregation] = useState<AggregationMode>('per_session');
  const [chartView, setChartView] = useState<ChartView>('line');
  const [overlays, setOverlays] = useState<GraphOverlays>(DEFAULT_OVERLAYS);

  const isCumulative = metric === 'cumulative_frequency' || metric === 'cumulative_duration';
  const isPercent = metric === 'percent_correct' || metric === 'percent_independent' || metric === 'percent_prompted';

  // Build chart data with null values for no_data to create gaps
  const chartData = useMemo(() => {
    let cumulative = 0;

    return data.map((d, i) => {
      const xLabel = xAxis === 'date' ? d.date : `#${d.sessionIndex}`;
      const isNoData = d.dataState === 'no_data';

      // For cumulative, no_data keeps cumulative unchanged but plots null
      let yValue: number | null;
      if (isNoData) {
        yValue = null; // null causes Recharts to break the line
      } else if (isCumulative) {
        cumulative += (d.value ?? 0);
        yValue = cumulative;
      } else {
        yValue = d.value ?? 0;
      }

      return {
        ...d,
        xLabel,
        xVal: xAxis === 'date' ? d.date : d.sessionIndex,
        y: yValue,
        isNoData,
      };
    });
  }, [data, xAxis, isCumulative]);

  // Moving average (skip no_data gaps)
  const movingAvgData = useMemo(() => {
    if (!overlays.movingAverage) return null;
    const w = overlays.movingAverageWindow;
    const result: (number | null)[] = new Array(chartData.length).fill(null);
    const validValues: { idx: number; val: number }[] = [];

    chartData.forEach((d, i) => {
      if (d.y != null) validValues.push({ idx: i, val: d.y });
    });

    for (let vi = 0; vi < validValues.length; vi++) {
      if (vi < w - 1) continue;
      const window = validValues.slice(vi - w + 1, vi + 1);
      const avg = window.reduce((s, p) => s + p.val, 0) / w;
      result[validValues[vi].idx] = parseFloat(avg.toFixed(2));
    }

    return result;
  }, [chartData, overlays.movingAverage, overlays.movingAverageWindow]);

  // Trend line (only on non-null points, ≥6 required)
  const trendLineValues = useMemo(() => {
    if (!overlays.trendLine) return null;
    const validPoints: { origIdx: number; point: DataPoint }[] = [];
    chartData.forEach((d, i) => {
      if (d.y != null) validPoints.push({ origIdx: i, point: { x: validPoints.length, y: d.y } });
    });
    if (validPoints.length < 6) return null;

    const result = splitMiddleTrendLine(validPoints.map(v => v.point));
    const values: (number | null)[] = new Array(chartData.length).fill(null);
    result.points.forEach((p, i) => {
      values[validPoints[i].origIdx] = parseFloat(p.y.toFixed(2));
    });
    return values;
  }, [chartData, overlays.trendLine]);

  // Baseline mean
  const baselineMeanValue = useMemo(() => {
    if (!overlays.baselineMean) return null;
    const baselinePoints = chartData.filter(d => d.y != null && (d.phase === 'Baseline' || d.phase === 'baseline'));
    if (baselinePoints.length === 0) return null;
    return baselinePoints.reduce((s, p) => s + (p.y ?? 0), 0) / baselinePoints.length;
  }, [chartData, overlays.baselineMean]);

  // Final data with overlays merged
  const finalChartData = useMemo(() => {
    return chartData.map((d, i) => ({
      ...d,
      movingAvg: movingAvgData?.[i] ?? null,
      trend: trendLineValues?.[i] ?? null,
    }));
  }, [chartData, movingAvgData, trendLineValues]);

  const yDomain = isPercent ? [0, 100] : [0, 'auto'] as [number, string | number];
  const yTicks = isPercent ? [0, 20, 40, 60, 80, 100] : undefined;

  const validPointCount = finalChartData.filter(d => d.y != null).length;

  const handleExportPNG = useCallback(() => {
    if (!chartRef.current) return;
    const svg = chartRef.current.querySelector('svg');
    if (!svg) { toast.error('No chart to export'); return; }
    const canvas = document.createElement('canvas');
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new window.Image();
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(2, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = `${title.replace(/\s+/g, '_')}_chart.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Chart exported');
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }, [title]);

  // Custom dot renderer: no dot for null/no_data, solid circle otherwise
  const renderDot = useCallback((props: any) => {
    const { cx, cy, payload } = props;
    if (payload?.isNoData || payload?.y == null || cx == null || cy == null) return null;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={3.5}
        fill="hsl(var(--primary))"
        stroke="hsl(var(--background))"
        strokeWidth={1.5}
      />
    );
  }, []);

  // Active dot (hover)
  const renderActiveDot = useCallback((props: any) => {
    const { cx, cy, payload } = props;
    if (payload?.isNoData || payload?.y == null || cx == null || cy == null) return null;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill="hsl(var(--primary))"
        stroke="hsl(var(--background))"
        strokeWidth={2}
      />
    );
  }, []);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <Button variant="outline" size="sm" onClick={handleExportPNG} className="gap-1">
            <Image className="w-3 h-3" /> PNG
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <GraphControls
          graphType={graphType}
          metric={metric}
          onMetricChange={setMetric}
          xAxis={xAxis}
          onXAxisChange={setXAxis}
          aggregation={aggregation}
          onAggregationChange={setAggregation}
          chartView={chartView}
          onChartViewChange={setChartView}
          overlays={overlays}
          onOverlaysChange={setOverlays}
        />

        {/* Phase label band */}
        {overlays.phaseMarkers && phaseMarkers.length > 0 && (
          <div className="flex gap-0 text-[10px] font-medium select-none">
            {phaseMarkers.map((pm, i) => (
              <div
                key={i}
                className="flex-1 text-center py-0.5 border-r border-border last:border-r-0 bg-muted/30 rounded-sm"
              >
                {pm.label}
              </div>
            ))}
          </div>
        )}

        {/* Data completeness overlay hint */}
        {overlays.dataCompleteness && (
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-3 h-2 bg-primary/20 rounded-sm inline-block" /> Data collected
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-2 bg-destructive/15 rounded-sm inline-block" /> No data
            </span>
          </div>
        )}

        <div ref={chartRef}>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={finalChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis
                dataKey="xLabel"
                fontSize={10}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                interval="preserveStartEnd"
              />
              <YAxis
                fontSize={10}
                domain={yDomain as any}
                ticks={yTicks}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                allowDecimals={!isPercent}
              />
              <Tooltip
                content={<ABATooltipContent graphType={graphType} metric={metric} />}
                filterNull={true}
              />
              <Legend />

              {/* Mastery threshold line */}
              {overlays.masteryThreshold && isPercent && (
                <ReferenceLine
                  y={overlays.masteryThresholdValue}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="8 4"
                  strokeWidth={1}
                  label={{
                    value: `${overlays.masteryThresholdValue}%`,
                    position: 'right',
                    fontSize: 10,
                    fill: 'hsl(var(--destructive))',
                  }}
                />
              )}

              {/* Baseline mean */}
              {baselineMeanValue != null && (
                <ReferenceLine
                  y={parseFloat(baselineMeanValue.toFixed(1))}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={{
                    value: `BL Mean: ${baselineMeanValue.toFixed(1)}`,
                    position: 'left',
                    fontSize: 9,
                    fill: 'hsl(var(--muted-foreground))',
                  }}
                />
              )}

              {/* Phase change vertical lines */}
              {overlays.phaseMarkers && phaseMarkers.map((pm, i) => (
                <ReferenceLine
                  key={`phase-${i}`}
                  x={xAxis === 'date' ? pm.date : `#${pm.sessionIndex}`}
                  stroke="hsl(var(--border))"
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
                />
              ))}

              {/* Main data line — connectNulls=false creates gaps at no_data */}
              <Line
                type="monotone"
                dataKey="y"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={renderDot}
                activeDot={renderActiveDot}
                connectNulls={false}
                name={metric.replace(/_/g, ' ')}
                isAnimationActive={false}
              />

              {/* Moving average overlay */}
              {overlays.movingAverage && (
                <Line
                  type="monotone"
                  dataKey="movingAvg"
                  stroke="hsl(var(--accent-foreground))"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  dot={false}
                  name={`MA(${overlays.movingAverageWindow})`}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              )}

              {/* Trend line overlay */}
              {overlays.trendLine && trendLineValues && (
                <Line
                  type="monotone"
                  dataKey="trend"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1}
                  strokeDasharray="6 3"
                  dot={false}
                  name="Trend"
                  connectNulls={true}
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {validPointCount} data points
          </Badge>
          {data.filter(d => d.dataState === 'no_data').length > 0 && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {data.filter(d => d.dataState === 'no_data').length} gaps
            </Badge>
          )}
          {overlays.trendLine && trendLineValues && (
            <Badge variant="outline" className="text-xs">
              <TrendingUp className="w-3 h-3 mr-1" /> Trend active
            </Badge>
          )}
          {isCumulative && (
            <Badge variant="outline" className="text-xs">
              Cumulative
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
