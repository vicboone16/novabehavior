import { useMemo, useState } from 'react';
import { format, subDays, subMonths, isAfter } from 'date-fns';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, BarChart2 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useDataStore } from '@/store/dataStore';
import { Behavior } from '@/types/behavior';

interface BehaviorMiniChartProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  behavior: Behavior;
  studentColor: string;
}

type Range = '2w' | '1m' | '3m' | 'all';
type ChartMode = 'line' | 'bar';

export function BehaviorMiniChart({
  open, onOpenChange, studentId, behavior, studentColor,
}: BehaviorMiniChartProps) {
  const { frequencyEntries, durationEntries, getIntervalData } = useDataStore();
  const [range, setRange] = useState<Range>('1m');
  const [mode, setMode] = useState<ChartMode>('line');

  const cutoff = useMemo(() => {
    const now = new Date();
    if (range === '2w') return subDays(now, 14);
    if (range === '1m') return subMonths(now, 1);
    if (range === '3m') return subMonths(now, 3);
    return new Date(0);
  }, [range]);

  const data = useMemo(() => {
    const method = (behavior.methods || [behavior.type])[0];

    if (method === 'frequency') {
      const entries = frequencyEntries.filter(
        e => e.studentId === studentId && e.behaviorId === behavior.id && isAfter(new Date(e.timestamp), cutoff)
      );
      const byDay: Record<string, number> = {};
      for (const e of entries) {
        const day = format(new Date(e.timestamp), 'MM/dd');
        byDay[day] = (byDay[day] ?? 0) + e.count;
      }
      return Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, value: count }));
    }

    if (method === 'duration') {
      const entries = durationEntries.filter(
        e => e.studentId === studentId && e.behaviorId === behavior.id &&
          e.endTime && isAfter(new Date(e.startTime), cutoff)
      );
      const byDay: Record<string, number> = {};
      for (const e of entries) {
        const day = format(new Date(e.startTime), 'MM/dd');
        byDay[day] = (byDay[day] ?? 0) + e.duration;
      }
      return Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, seconds]) => ({ date, value: Math.round(seconds / 60 * 10) / 10 }));
    }

    if (method === 'interval') {
      const all = getIntervalData(studentId, behavior.id);
      const recent = all.filter(e => isAfter(new Date(e.timestamp), cutoff));
      if (recent.length === 0) return [];
      // Group by day, compute % occurrence
      const byDay: Record<string, { occurred: number; total: number }> = {};
      for (const e of recent) {
        if (e.voided || e.occurred === undefined) continue;
        const day = format(new Date(e.timestamp), 'MM/dd');
        if (!byDay[day]) byDay[day] = { occurred: 0, total: 0 };
        byDay[day].total++;
        if (e.occurred) byDay[day].occurred++;
      }
      return Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, { occurred, total }]) => ({
          date, value: total ? Math.round((occurred / total) * 100) : 0,
        }));
    }

    return [];
  }, [frequencyEntries, durationEntries, getIntervalData, studentId, behavior, cutoff]);

  const method = (behavior.methods || [behavior.type])[0];
  const yLabel = method === 'duration' ? 'min' : method === 'interval' ? '%' : 'count';

  const ChartComponent = mode === 'line' ? LineChart : BarChart;
  const DataComponent = mode === 'line' ? (
    <Line type="monotone" dataKey="value" stroke={studentColor} strokeWidth={2} dot={{ r: 3, fill: studentColor }} />
  ) : (
    <Bar dataKey="value" fill={studentColor} radius={[3, 3, 0, 0]} />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: studentColor }} />
            {behavior.name}
            <span className="text-xs font-normal text-muted-foreground ml-1">({method})</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between mb-2">
          <ToggleGroup type="single" value={range} onValueChange={v => v && setRange(v as Range)} size="sm">
            <ToggleGroupItem value="2w" className="text-xs px-2">2w</ToggleGroupItem>
            <ToggleGroupItem value="1m" className="text-xs px-2">1m</ToggleGroupItem>
            <ToggleGroupItem value="3m" className="text-xs px-2">3m</ToggleGroupItem>
            <ToggleGroupItem value="all" className="text-xs px-2">All</ToggleGroupItem>
          </ToggleGroup>
          <div className="flex gap-1">
            <Button
              variant={mode === 'line' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setMode('line')}
            >
              <TrendingUp className="w-3 h-3" />
            </Button>
            <Button
              variant={mode === 'bar' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setMode('bar')}
            >
              <BarChart2 className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {data.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            No data in this range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <ChartComponent data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} unit={yLabel === 'count' ? '' : yLabel} />
              <Tooltip
                formatter={(v: number) => [`${v}${yLabel === 'count' ? '' : ' ' + yLabel}`, behavior.name]}
                contentStyle={{ fontSize: 12 }}
              />
              {DataComponent}
            </ChartComponent>
          </ResponsiveContainer>
        )}

        {data.length > 0 && (() => {
          const vals = data.map(d => d.value);
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          const last = vals[vals.length - 1];
          const trend = vals.length > 1
            ? (last > vals[0] ? '↑' : last < vals[0] ? '↓' : '→')
            : '—';
          return (
            <div className="flex gap-4 text-xs text-muted-foreground mt-1 pt-2 border-t border-border">
              <span>Avg: <strong className="text-foreground">{avg.toFixed(1)}{yLabel === 'count' ? '' : yLabel}</strong></span>
              <span>Last: <strong className="text-foreground">{last}{yLabel === 'count' ? '' : yLabel}</strong></span>
              <span>Trend: <strong className="text-foreground">{trend}</strong></span>
              <span>Sessions: <strong className="text-foreground">{data.length}</strong></span>
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}
