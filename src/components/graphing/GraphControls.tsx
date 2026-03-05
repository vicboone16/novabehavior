import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { SlidersHorizontal } from 'lucide-react';
import type {
  GraphMetric, XAxisMode, AggregationMode, ChartView, GraphOverlays,
} from '@/types/graphDataState';
import { SKILL_METRICS, BEHAVIOR_METRICS } from '@/types/graphDataState';

interface GraphControlsProps {
  graphType: 'skills' | 'behavior';
  metric: GraphMetric;
  onMetricChange: (m: GraphMetric) => void;
  xAxis: XAxisMode;
  onXAxisChange: (x: XAxisMode) => void;
  aggregation: AggregationMode;
  onAggregationChange: (a: AggregationMode) => void;
  chartView: ChartView;
  onChartViewChange: (v: ChartView) => void;
  overlays: GraphOverlays;
  onOverlaysChange: (o: GraphOverlays) => void;
}

export function GraphControls({
  graphType, metric, onMetricChange, xAxis, onXAxisChange,
  aggregation, onAggregationChange, chartView, onChartViewChange,
  overlays, onOverlaysChange,
}: GraphControlsProps) {
  const metrics = graphType === 'skills' ? SKILL_METRICS : BEHAVIOR_METRICS;

  const updateOverlay = (key: keyof GraphOverlays, value: any) => {
    onOverlaysChange({ ...overlays, [key]: value });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Metric */}
      <Select value={metric} onValueChange={v => onMetricChange(v as GraphMetric)}>
        <SelectTrigger className="h-7 text-xs w-[160px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {metrics.map(m => (
            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* X-Axis */}
      <Select value={xAxis} onValueChange={v => onXAxisChange(v as XAxisMode)}>
        <SelectTrigger className="h-7 text-xs w-[110px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="date">Date</SelectItem>
          <SelectItem value="session_number">Session #</SelectItem>
        </SelectContent>
      </Select>

      {/* Aggregation (only for date mode) */}
      {xAxis === 'date' && (
        <Select value={aggregation} onValueChange={v => onAggregationChange(v as AggregationMode)}>
          <SelectTrigger className="h-7 text-xs w-[110px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="per_session">Per Session</SelectItem>
            <SelectItem value="per_day">Per Day</SelectItem>
          </SelectContent>
        </Select>
      )}

      {/* Overlays popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
            <SlidersHorizontal className="w-3 h-3" /> Overlays
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3 space-y-3" align="end">
          <p className="text-xs font-medium text-foreground">Graph Overlays</p>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Phase Markers</Label>
            <Switch checked={overlays.phaseMarkers} onCheckedChange={v => updateOverlay('phaseMarkers', v)} className="scale-75" />
          </div>

          {graphType === 'skills' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Mastery Line</Label>
                <Switch checked={overlays.masteryThreshold} onCheckedChange={v => updateOverlay('masteryThreshold', v)} className="scale-75" />
              </div>
              {overlays.masteryThreshold && (
                <div className="flex items-center gap-2 pl-2">
                  <Label className="text-xs">Threshold:</Label>
                  <Input
                    type="number"
                    value={overlays.masteryThresholdValue}
                    onChange={e => updateOverlay('masteryThresholdValue', Number(e.target.value))}
                    className="h-6 w-16 text-xs"
                    min={0}
                    max={100}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Moving Average</Label>
              <Switch checked={overlays.movingAverage} onCheckedChange={v => updateOverlay('movingAverage', v)} className="scale-75" />
            </div>
            {overlays.movingAverage && (
              <div className="flex items-center gap-2 pl-2">
                <Label className="text-xs">Window:</Label>
                <Input
                  type="number"
                  value={overlays.movingAverageWindow}
                  onChange={e => updateOverlay('movingAverageWindow', Number(e.target.value))}
                  className="h-6 w-16 text-xs"
                  min={2}
                  max={20}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Trend Line (≥6 pts)</Label>
            <Switch checked={overlays.trendLine} onCheckedChange={v => updateOverlay('trendLine', v)} className="scale-75" />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Baseline Mean</Label>
            <Switch checked={overlays.baselineMean} onCheckedChange={v => updateOverlay('baselineMean', v)} className="scale-75" />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs">Data Completeness</Label>
            <Switch checked={overlays.dataCompleteness} onCheckedChange={v => updateOverlay('dataCompleteness', v)} className="scale-75" />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
