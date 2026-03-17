import { useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, LabelList,
} from 'recharts';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface SubdomainScore {
  subdomain_name: string;
  domain_name: string;
  v_scale_score: number | null;
}

interface VinelandSubdomainProfileChartProps {
  scores: SubdomainScore[];
  chartRef?: React.RefObject<HTMLDivElement>;
}

const DOMAIN_COLORS: Record<string, string> = {
  Communication: 'hsl(var(--primary))',
  'Daily Living Skills': 'hsl(var(--primary) / 0.75)',
  Socialization: 'hsl(var(--primary) / 0.55)',
  'Motor Skills': 'hsl(var(--primary) / 0.4)',
};

export function VinelandSubdomainProfileChart({ scores, chartRef }: VinelandSubdomainProfileChartProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const ref = chartRef || internalRef;

  const data = scores
    .filter(s => s.v_scale_score != null)
    .map(s => ({
      name: s.subdomain_name,
      domain: s.domain_name,
      score: s.v_scale_score!,
    }));

  if (data.length === 0) return null;

  return (
    <Card className="print:shadow-none print:border">
      <CardHeader className="py-2 px-4">
        <h3 className="text-sm font-bold tracking-wide text-foreground uppercase">SUBDOMAIN V-SCALE PROFILE CHART</h3>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div ref={ref} className="w-full" style={{ height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 20, bottom: 40, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <ReferenceLine y={15} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: 'Mean', position: 'right', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 9, fill: 'hsl(var(--foreground))' }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={80}
              />
              <YAxis
                domain={[1, 24]}
                ticks={[1, 5, 10, 15, 20, 24]}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                label={{ value: 'v-Scale Score', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(value: number, _: string, props: any) => [value, `${props.payload.domain} — v-Scale`]}
              />
              <Bar dataKey="score" radius={[3, 3, 0, 0]} maxBarSize={36}>
                {data.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={DOMAIN_COLORS[entry.domain] || 'hsl(var(--primary) / 0.5)'}
                  />
                ))}
                <LabelList dataKey="score" position="top" fontSize={10} fontWeight={600} fill="hsl(var(--foreground))" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-2 justify-center">
          {Object.entries(DOMAIN_COLORS).map(([domain, color]) => {
            if (!data.some(d => d.domain === domain)) return null;
            return (
              <div key={domain} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                {domain}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
