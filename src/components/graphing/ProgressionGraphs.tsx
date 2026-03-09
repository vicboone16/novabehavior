import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, BarChart, Bar, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, BarChart3, Eye, Layers } from 'lucide-react';
import type { MTSSessionSummary } from '@/hooks/useMTS';
import type { ProgressionSummary } from '@/hooks/useProgressionGroups';
import type { BenchmarkCriterionStep } from '@/types/graphDataState';

interface ProgressionGraphsProps {
  mtsSessions?: MTSSessionSummary[];
  progressionSummaries?: ProgressionSummary[];
  benchmarkSteps?: BenchmarkCriterionStep[];
}

export function ProgressionGraphs({
  mtsSessions = [],
  progressionSummaries = [],
  benchmarkSteps = [],
}: ProgressionGraphsProps) {
  // MTS chart data — observed percent over time
  const mtsChartData = useMemo(() => {
    return [...mtsSessions]
      .sort((a, b) => a.session_date.localeCompare(b.session_date))
      .map(s => ({
        date: s.session_date,
        observedPercent: s.observed_percent,
        name: s.definition_name,
        intervals: s.completed_intervals,
      }));
  }, [mtsSessions]);

  // Progression bar data
  const progressionChartData = useMemo(() => {
    return progressionSummaries.map(s => ({
      name: s.group_name.length > 18 ? s.group_name.substring(0, 18) + '…' : s.group_name,
      fullName: s.group_name,
      type: s.progression_type,
      mastered: s.mastered_steps,
      total: s.total_steps,
      percentComplete: s.percent_complete,
    }));
  }, [progressionSummaries]);

  // Benchmark stair-step data
  const benchmarkChartData = useMemo(() => {
    return benchmarkSteps.map((step, i) => ({
      step: step.phase_label || step.benchmark_label || `Step ${step.benchmark_order}`,
      criterion: step.criterion_value,
      order: step.benchmark_order,
      status: step.step_status,
    }));
  }, [benchmarkSteps]);

  const hasAny = mtsChartData.length > 0 || progressionChartData.length > 0 || benchmarkChartData.length > 0;

  if (!hasAny) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Progression & MTS Graphs
        </CardTitle>
        <CardDescription className="text-xs">
          Staged progression, changing criterion, and time sampling trends
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={mtsChartData.length > 0 ? 'mts' : 'progression'}>
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${[mtsChartData.length > 0, progressionChartData.length > 0, benchmarkChartData.length > 0].filter(Boolean).length}, 1fr)` }}>
            {mtsChartData.length > 0 && (
              <TabsTrigger value="mts" className="text-xs gap-1">
                <Eye className="w-3 h-3" /> MTS
              </TabsTrigger>
            )}
            {progressionChartData.length > 0 && (
              <TabsTrigger value="progression" className="text-xs gap-1">
                <Layers className="w-3 h-3" /> Progression
              </TabsTrigger>
            )}
            {benchmarkChartData.length > 0 && (
              <TabsTrigger value="criterion" className="text-xs gap-1">
                <BarChart3 className="w-3 h-3" /> Criterion
              </TabsTrigger>
            )}
          </TabsList>

          {/* MTS observed percent over sessions */}
          {mtsChartData.length > 0 && (
            <TabsContent value="mts" className="mt-3">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={mtsChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                  <XAxis dataKey="date" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis domain={[0, 100]} fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="observedPercent"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                    name="% Observed Present"
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">
                  {mtsChartData.length} sessions
                </Badge>
                {mtsChartData.length > 0 && (
                  <Badge variant="outline" className="text-[10px]">
                    Last: {mtsChartData[mtsChartData.length - 1].observedPercent}%
                  </Badge>
                )}
              </div>
            </TabsContent>
          )}

          {/* Progression summary bars */}
          {progressionChartData.length > 0 && (
            <TabsContent value="progression" className="mt-3">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={progressionChartData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                  <XAxis type="number" domain={[0, 100]} fontSize={10} />
                  <YAxis type="category" dataKey="name" width={120} fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, _: string, props: any) => [
                      `${props.payload.mastered}/${props.payload.total} steps — ${value}%`,
                      props.payload.fullName,
                    ]}
                  />
                  <Bar dataKey="percentComplete" radius={[0, 4, 4, 0]}>
                    {progressionChartData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.percentComplete >= 100
                          ? 'hsl(var(--primary))'
                          : entry.percentComplete >= 50
                          ? 'hsl(var(--accent-foreground))'
                          : 'hsl(var(--muted-foreground))'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
          )}

          {/* Benchmark changing criterion stair-step */}
          {benchmarkChartData.length > 0 && (
            <TabsContent value="criterion" className="mt-3">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={benchmarkChartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                  <XAxis dataKey="step" fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis fontSize={10} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="criterion" name="Criterion Value" radius={[4, 4, 0, 0]}>
                    {benchmarkChartData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.status === 'met'
                          ? 'hsl(var(--primary))'
                          : entry.status === 'active'
                          ? 'hsl(var(--accent-foreground))'
                          : 'hsl(var(--muted-foreground))'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-2 mt-2 flex-wrap">
                {benchmarkChartData.map((s, i) => (
                  <Badge
                    key={i}
                    variant={s.status === 'active' ? 'default' : s.status === 'met' ? 'secondary' : 'outline'}
                    className="text-[10px]"
                  >
                    {s.step}: {s.criterion ?? '—'}
                  </Badge>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
