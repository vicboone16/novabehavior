import { useState, useMemo, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { Settings, Download, TrendingUp, Target, Minus, Plus, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { GraphAnnotation } from '@/types/graphing';
import { splitMiddleTrendLine, leastSquaresRegression, generateAimLine, DataPoint } from '@/lib/graphCalculations';
import { toast } from 'sonner';

interface ChartDataPoint {
  date: string;
  dateIndex: number;
  [key: string]: any;
}

interface AdvancedGraphEditorProps {
  data: ChartDataPoint[];
  dataKeys: string[];
  annotations?: GraphAnnotation[];
  title?: string;
  studentId?: string;
}

const COLORS = ['hsl(199, 89%, 48%)', 'hsl(173, 58%, 49%)', 'hsl(262, 83%, 68%)', 'hsl(38, 92%, 60%)', 'hsl(0, 72%, 61%)'];

export function AdvancedGraphEditor({ data, dataKeys, annotations = [], title = 'Behavior Analysis', studentId }: AdvancedGraphEditorProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [showTrendLine, setShowTrendLine] = useState(false);
  const [trendMethod, setTrendMethod] = useState<'split-middle' | 'least-squares'>('split-middle');
  const [showAimLine, setShowAimLine] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [aimTarget, setAimTarget] = useState('');
  const [aimDeadlineIdx, setAimDeadlineIdx] = useState('');

  // Calculate trend lines
  const trendLines = useMemo(() => {
    if (!showTrendLine || data.length < 3) return {};

    const lines: Record<string, DataPoint[]> = {};
    dataKeys.forEach(key => {
      const points: DataPoint[] = data
        .filter(d => d[key] != null)
        .map(d => ({ x: d.dateIndex, y: d[key] as number }));

      if (points.length >= 3) {
        const result = trendMethod === 'split-middle'
          ? splitMiddleTrendLine(points)
          : leastSquaresRegression(points);
        lines[key] = result.points;
      }
    });
    return lines;
  }, [data, dataKeys, showTrendLine, trendMethod]);

  // Build chart data with trend lines
  const enrichedData = useMemo(() => {
    return data.map((d, i) => {
      const enriched = { ...d };
      Object.entries(trendLines).forEach(([key, points]) => {
        const trendPoint = points.find(p => p.x === d.dateIndex);
        if (trendPoint) {
          enriched[`${key}_trend`] = parseFloat(trendPoint.y.toFixed(2));
        }
      });
      return enriched;
    });
  }, [data, trendLines]);

  // Phase change lines from annotations
  const phaseChangeLines = annotations.filter(a => a.annotation_type === 'phase_change');

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
      toast.success('Chart exported as PNG');
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Switch id="trend" checked={showTrendLine} onCheckedChange={setShowTrendLine} />
              <Label htmlFor="trend" className="text-xs cursor-pointer">Trend</Label>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowSettings(true)} className="gap-1">
              <Settings className="w-3 h-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPNG} className="gap-1">
              <Image className="w-3 h-3" /> PNG
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={chartRef}>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={enrichedData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />

              {/* Phase change lines */}
              {phaseChangeLines.map((pcl, i) => (
                <ReferenceLine
                  key={pcl.id}
                  x={pcl.position_date || undefined}
                  stroke={pcl.style?.color || '#ef4444'}
                  strokeDasharray={pcl.style?.lineStyle === 'dashed' ? '8 4' : pcl.style?.lineStyle === 'dotted' ? '2 4' : undefined}
                  strokeWidth={pcl.style?.lineWidth || 2}
                  label={pcl.label_text || undefined}
                />
              ))}

              {/* Data lines */}
              {dataKeys.map((key, idx) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={{ fill: COLORS[idx % COLORS.length], r: 3 }}
                  connectNulls={false}
                />
              ))}

              {/* Trend lines */}
              {showTrendLine && dataKeys.map((key, idx) => (
                trendLines[key] && (
                  <Line
                    key={`${key}_trend`}
                    type="monotone"
                    dataKey={`${key}_trend`}
                    stroke={COLORS[idx % COLORS.length]}
                    strokeWidth={1}
                    strokeDasharray="6 3"
                    dot={false}
                    name={`${key} (${trendMethod})`}
                  />
                )
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {showTrendLine && (
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              Method: {trendMethod === 'split-middle' ? 'Split-Middle' : 'Least Squares'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setTrendMethod(trendMethod === 'split-middle' ? 'least-squares' : 'split-middle')}
            >
              Switch Method
            </Button>
          </div>
        )}
      </CardContent>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader><DialogTitle>Graph Settings</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Show Trend Line</Label>
              <Switch checked={showTrendLine} onCheckedChange={setShowTrendLine} />
            </div>
            <div>
              <Label>Trend Method</Label>
              <Select value={trendMethod} onValueChange={v => setTrendMethod(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="split-middle">Split-Middle (ABA Standard)</SelectItem>
                  <SelectItem value="least-squares">Least Squares Regression</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSettings(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
