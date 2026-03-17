import { useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { format } from 'date-fns';

interface LongitudinalDataPoint {
  administration_date: string;
  abc_score?: number | null;
  communication?: number | null;
  daily_living_skills?: number | null;
  socialization?: number | null;
  motor_skills?: number | null;
}

interface VinelandLongitudinalChartProps {
  data: LongitudinalDataPoint[];
  chartRef?: React.RefObject<HTMLDivElement>;
}

const LINE_CONFIG = [
  { key: 'abc_score', label: 'ABC', color: 'hsl(var(--foreground))' },
  { key: 'communication', label: 'Communication', color: 'hsl(var(--primary))' },
  { key: 'daily_living_skills', label: 'Daily Living', color: 'hsl(var(--primary) / 0.7)' },
  { key: 'socialization', label: 'Socialization', color: 'hsl(var(--primary) / 0.5)' },
  { key: 'motor_skills', label: 'Motor', color: 'hsl(var(--primary) / 0.35)' },
];

export function VinelandLongitudinalChart({ data, chartRef }: VinelandLongitudinalChartProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const ref = chartRef || internalRef;

  if (data.length < 2) {
    return (
      <Card className="print:shadow-none print:border">
        <CardHeader className="py-2 px-4">
          <h3 className="text-sm font-bold tracking-wide text-foreground uppercase">LONGITUDINAL TREND</h3>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <p className="text-xs text-muted-foreground text-center py-6">
            No prior Vineland administrations available for trend display.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map(d => ({
    ...d,
    dateLabel: format(new Date(d.administration_date), 'MM/yyyy'),
  }));

  // Determine which lines have data
  const activeLines = LINE_CONFIG.filter(lc =>
    data.some(d => (d as any)[lc.key] != null)
  );

  return (
    <Card className="print:shadow-none print:border">
      <CardHeader className="py-2 px-4">
        <h3 className="text-sm font-bold tracking-wide text-foreground uppercase">LONGITUDINAL TREND</h3>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div ref={ref} className="w-full" style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <ReferenceLine y={100} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis
                domain={[40, 160]}
                ticks={[40, 55, 70, 85, 100, 115, 130, 145, 160]}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                label={{ value: 'Standard Score', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 6,
                  fontSize: 12,
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 10 }}
                iconType="plainline"
              />
              {activeLines.map(lc => (
                <Line
                  key={lc.key}
                  type="monotone"
                  dataKey={lc.key}
                  name={lc.label}
                  stroke={lc.color}
                  strokeWidth={lc.key === 'abc_score' ? 2.5 : 1.5}
                  dot={{ r: 4, fill: lc.color }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
