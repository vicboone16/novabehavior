import { useState, useMemo, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, BarChart, Bar,
} from 'recharts';
import { Settings, Image, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { GraphControls } from './GraphControls';
import { ABATooltipContent } from './ABATooltip';
import { splitMiddleTrendLine, leastSquaresRegression, DataPoint } from '@/lib/graphCalculations';
import type {
  ABADataPoint, GraphMetric, XAxisMode, AggregationMode, ChartView, GraphOverlays, DataState,
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

const PRIMARY_COLOR = 'hsl(var(--primary))';
const MUTED_COLOR = 'hsl(var(--muted-foreground))';

export function ABAGraph({ data, title = 'Data Analysis', graphType = 'skills', phaseMarkers = [] }: ABAGraphProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [metric, setMetric] = useState<GraphMetric>(graphType === 'skills' ? 'percent_correct' : 'frequency');
  const [xAxis, setXAxis] = useState<XAxisMode>('date');
  const [aggregation, setAggregation] = useState<AggregationMode>('per_session');
  const [chartView, setChartView] = useState<ChartView>('line');
  const [overlays, setOverlays] = useState<GraphOverlays>(DEFAULT_OVERLAYS);

  // Filter out no_data points and build chart segments
  const { chartData, segments } = useMemo(() => {
    const measuredData = data.filter(d => d.dataState !== 'no_data');
    const formatted = measuredData.map((d, i) => ({
      ...d,
      xLabel: xAxis === 'date' ? d.date : `#${d.sessionIndex}`,
      xVal: xAxis === 'date' ? d.date : d.sessionIndex,
      y: d.value ?? 0,
    }));

    // Build segments (break lines at no_data gaps)
    const segs: number[][] = [];
    let currentSeg: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (data[i].dataState === 'no_data') {
        if (currentSeg.length > 0) { segs.push(currentSeg); currentSeg = []; }
      } else {
        currentSeg.push(i);
      }
    }
    if (currentSeg.length > 0) segs.push(currentSeg);

    return { chartData: formatted, segments: segs };
  }, [data, xAxis]);

  // Moving average computation
  const movingAvgData = useMemo(() => {
    if (!overlays.movingAverage || chartData.length < overlays.movingAverageWindow) return null;
    const w = overlays.movingAverageWindow;
    return chartData.map((d, i) => {
      if (i < w - 1) return { ...d, movingAvg: null };
      const slice = chartData.slice(i - w + 1, i + 1);
      const avg = slice.reduce((s, p) => s + p.y, 0) / w;
      return { ...d, movingAvg: parseFloat(avg.toFixed(2)) };
    });
  }, [chartData, overlays.movingAverage, overlays.movingAverageWindow]);

  // Trend line
  const trendLineData = useMemo(() => {
    if (!overlays.trendLine || chartData.length < 6) return null;
    const points: DataPoint[] = chartData.map((d, i) => ({ x: i, y: d.y }));
    const result = splitMiddleTrendLine(points);
    return result.points;
  }, [chartData, overlays.trendLine]);

  // Compute cumulative if needed
  const finalChartData = useMemo(() => {
    const isCumulative = metric === 'cumulative_frequency' || metric === 'cumulative_duration';
    const base = movingAvgData || chartData;

    if (!isCumulative) {
      return base.map((d, i) => ({
        ...d,
        trend: trendLineData?.[i]?.y ?? null,
      }));
    }

    let cumulative = 0;
    return base.map((d, i) => {
      cumulative += d.y;
      return { ...d, y: cumulative, trend: trendLineData?.[i]?.y ?? null };
    });
  }, [chartData, movingAvgData, trendLineData, metric]);

  const isPercent = metric === 'percent_correct' || metric === 'percent_independent' || metric === 'percent_prompted';
  const yDomain = isPercent ? [0, 100] : undefined;
  const yTicks = isPercent ? [0, 20, 40, 60, 80, 100] : undefined;

  const handleExportPNG = () => {
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
  };

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

        {/* Phase band */}
        {overlays.phaseMarkers && phaseMarkers.length > 0 && (
          <div className="flex gap-0 text-[10px] font-medium">
            {phaseMarkers.map((pm, i) => {
              const nextPm = phaseMarkers[i + 1];
              return (
                <div key={i} className="flex-1 text-center py-0.5 border-r border-border last:border-r-0 bg-muted/30 rounded-sm">
                  {pm.label}
                </div>
              );
            })}
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
              />
              <YAxis
                fontSize={10}
                domain={yDomain}
                ticks={yTicks}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip content={<ABATooltipContent graphType={graphType} metric={metric} />} />
              <Legend />

              {/* Mastery threshold */}
              {overlays.masteryThreshold && isPercent && (
                <ReferenceLine
                  y={overlays.masteryThresholdValue}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="8 4"
                  strokeWidth={1}
                  label={{ value: `${overlays.masteryThresholdValue}%`, position: 'right', fontSize: 10 }}
                />
              )}

              {/* Phase change lines */}
              {overlays.phaseMarkers && phaseMarkers.map((pm, i) => (
                <ReferenceLine
                  key={i}
                  x={xAxis === 'date' ? pm.date : `#${pm.sessionIndex}`}
                  stroke="hsl(var(--border))"
                  strokeDasharray="6 3"
                  strokeWidth={1.5}
                />
              ))}

              {/* Main data line */}
              <Line
                type="monotone"
                dataKey="y"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', r: 3 }}
                connectNulls={false}
                name={metric.replace(/_/g, ' ')}
              />

              {/* Moving average */}
              {overlays.movingAverage && (
                <Line
                  type="monotone"
                  dataKey="movingAvg"
                  stroke="hsl(var(--accent-foreground))"
                  strokeWidth={1}
                  strokeDasharray="4 2"
                  dot={false}
                  name={`MA(${overlays.movingAverageWindow})`}
                  connectNulls={false}
                />
              )}

              {/* Trend line */}
              {overlays.trendLine && (
                <Line
                  type="monotone"
                  dataKey="trend"
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={1}
                  strokeDasharray="6 3"
                  dot={false}
                  name="Trend"
                  connectNulls={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {finalChartData.length} data points
          </Badge>
          {overlays.trendLine && chartData.length >= 6 && (
            <Badge variant="outline" className="text-xs">
              <TrendingUp className="w-3 h-3 mr-1" /> Trend active
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
