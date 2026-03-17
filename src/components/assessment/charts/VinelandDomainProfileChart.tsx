import { useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, LabelList,
} from 'recharts';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface DomainScore {
  label: string;
  score: number | null;
  isComposite?: boolean;
}

interface VinelandDomainProfileChartProps {
  scores: DomainScore[];
  chartRef?: React.RefObject<HTMLDivElement>;
}

const ADAPTIVE_BANDS = [
  { min: 20, max: 70, label: 'Low', fill: 'hsl(var(--destructive) / 0.08)' },
  { min: 70, max: 85, label: 'Moderately Low', fill: 'hsl(var(--warning, 40 96% 50%) / 0.08)' },
  { min: 85, max: 115, label: 'Adequate', fill: 'hsl(var(--primary) / 0.06)' },
  { min: 115, max: 130, label: 'Moderately High', fill: 'hsl(var(--primary) / 0.04)' },
  { min: 130, max: 160, label: 'High', fill: 'hsl(var(--primary) / 0.02)' },
];

export function VinelandDomainProfileChart({ scores, chartRef }: VinelandDomainProfileChartProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const ref = chartRef || internalRef;

  const data = scores
    .filter(s => s.score != null)
    .map(s => ({
      name: s.label,
      score: s.score!,
      isComposite: s.isComposite || false,
    }));

  if (data.length === 0) return null;

  return (
    <Card className="print:shadow-none print:border">
      <CardHeader className="py-2 px-4">
        <h3 className="text-sm font-bold tracking-wide text-foreground uppercase">DOMAIN PROFILE CHART</h3>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div ref={ref} className="w-full" style={{ height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              {/* Reference bands for adaptive levels */}
              {ADAPTIVE_BANDS.map(band => (
                <ReferenceLine
                  key={band.label}
                  y={band.min}
                  stroke="hsl(var(--border))"
                  strokeDasharray="2 4"
                  strokeOpacity={0.5}
                />
              ))}
              <ReferenceLine y={100} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: 'Mean', position: 'right', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: 'hsl(var(--foreground))' }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={60}
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
                formatter={(value: number) => [value, 'Standard Score']}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {data.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.isComposite ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.7)'}
                  />
                ))}
                <LabelList dataKey="score" position="top" fontSize={11} fontWeight={600} fill="hsl(var(--foreground))" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
