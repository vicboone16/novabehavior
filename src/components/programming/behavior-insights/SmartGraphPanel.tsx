import { useMemo, useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Area, AreaChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import type { ViewMode } from './types';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(199, 89%, 48%)',
  'hsl(173, 58%, 49%)',
  'hsl(262, 83%, 68%)',
  'hsl(38, 92%, 60%)',
  'hsl(0, 72%, 61%)',
  'hsl(330, 70%, 55%)',
  'hsl(120, 50%, 45%)',
];

interface SmartGraphPanelProps {
  chartData: Record<string, any>[];
  behaviorNames: string[];
  viewMode: ViewMode;
  recommendedView: string;
  title?: string;
}

export function SmartGraphPanel({ chartData, behaviorNames, viewMode, recommendedView, title }: SmartGraphPanelProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const showRecommendation = viewMode !== recommendedView && behaviorNames.length > 3;

  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          No data available for the selected filters. Try adjusting the date range or selecting behaviors.
        </CardContent>
      </Card>
    );
  }

  const renderOverlay = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ fontSize: 11 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {behaviorNames.map((name, i) => (
          <Line
            key={name}
            type="monotone"
            dataKey={name}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 2 }}
            connectNulls={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );

  const renderStacked = () => (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ fontSize: 11 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {behaviorNames.map((name, i) => (
          <Area
            key={name}
            type="monotone"
            dataKey={name}
            stackId="1"
            fill={COLORS[i % COLORS.length]}
            stroke={COLORS[i % COLORS.length]}
            fillOpacity={0.4}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderGrouped = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip contentStyle={{ fontSize: 11 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {behaviorNames.map((name, i) => (
          <Bar key={name} dataKey={name} fill={COLORS[i % COLORS.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  const renderSmallMultiples = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {behaviorNames.map((name, i) => (
        <Card key={name} className="overflow-hidden">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              {name}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                <XAxis dataKey="date" tick={false} />
                <YAxis tick={{ fontSize: 9 }} width={30} />
                <Line type="monotone" dataKey={name} stroke={COLORS[i % COLORS.length]} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderChart = () => {
    switch (viewMode) {
      case 'stacked': return renderStacked();
      case 'grouped':
      case 'top_behaviors': return renderGrouped();
      case 'small_multiples':
      case 'contrast': return renderSmallMultiples();
      case 'overlay':
      case 'compare':
      case 'raw':
      default: return renderOverlay();
    }
  };

  return (
    <Card>
      <CardHeader className="py-2.5 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">{title || 'Behavior Trends'}</CardTitle>
        {showRecommendation && (
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Info className="w-3 h-3" />
            Try "{recommendedView.replace('_', ' ')}" for better readability
          </Badge>
        )}
      </CardHeader>
      <CardContent className="px-2 pb-3" ref={chartRef}>
        {renderChart()}
      </CardContent>
    </Card>
  );
}
