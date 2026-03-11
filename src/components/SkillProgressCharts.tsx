import { useMemo, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import { SkillTarget, DTTSession } from '@/types/behavior';
import { format, startOfDay, eachDayOfInterval, isWithinInterval } from 'date-fns';

interface TargetWithSessions extends SkillTarget {
  studentName: string;
  studentColor: string;
  sessions: DTTSession[];
}

interface SkillProgressChartsProps {
  targets: TargetWithSessions[];
  dateRange: {
    start: Date;
    end: Date;
  };
}

const STATUS_COLORS: Record<string, string> = {
  baseline: '#64748b',
  acquisition: '#3b82f6',
  maintenance: '#22c55e',
  generalization: '#a855f7',
  mastered: '#10b981',
};

export function SkillProgressCharts({ targets, dateRange }: SkillProgressChartsProps) {
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  // Progress over time chart data
  const progressData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      // Get all sessions for this day across all targets
      const daySessions = targets.flatMap(t => 
        t.sessions.filter(s => 
          isWithinInterval(new Date(s.date), { start: dayStart, end: dayEnd })
        )
      );

      const avgCorrect = daySessions.length > 0
        ? Math.round(daySessions.reduce((sum, s) => sum + s.percentCorrect, 0) / daySessions.length)
        : null;

      const avgIndependent = daySessions.length > 0
        ? Math.round(daySessions.reduce((sum, s) => sum + s.percentIndependent, 0) / daySessions.length)
        : null;

      return {
        date: format(day, 'MMM d'),
        fullDate: day,
        percentCorrect: avgCorrect,
        percentIndependent: avgIndependent,
        sessionCount: daySessions.length,
      };
    }).filter(d => d.sessionCount > 0);
  }, [targets, dateRange]);

  // Individual target progress
  const targetProgressData = useMemo(() => {
    return targets.slice(0, 5).map(target => {
      const sortedSessions = [...target.sessions].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      return {
        name: target.name.length > 20 ? target.name.substring(0, 20) + '...' : target.name,
        fullName: target.name,
        color: target.studentColor,
        data: sortedSessions.slice(-10).map((s, idx) => ({
          session: idx + 1,
          date: format(new Date(s.date), 'MMM d'),
          percentCorrect: s.percentCorrect,
          percentIndependent: s.percentIndependent,
        })),
      };
    });
  }, [targets]);

  // Status distribution
  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    targets.forEach(t => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: STATUS_COLORS[status] || '#6b7280',
    }));
  }, [targets]);

  // Method distribution
  const methodDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    targets.forEach(t => {
      counts[t.method] = (counts[t.method] || 0) + 1;
    });
    const methodLabels: Record<string, string> = {
      dtt: 'DTT',
      net: 'NET',
      task_analysis: 'Task Analysis',
      probe: 'Probe',
    };
    return Object.entries(counts).map(([method, count]) => ({
      name: methodLabels[method] || method,
      value: count,
    }));
  }, [targets]);

  // Mastery progress (sessions to mastery)
  const masteryProgress = useMemo(() => {
    return targets.filter(t => t.status === 'acquisition').map(target => {
      const sessions = target.sessions;
      const lastThree = sessions.slice(-3);
      const avgLastThree = lastThree.length > 0
        ? Math.round(lastThree.reduce((s, sess) => s + sess.percentCorrect, 0) / lastThree.length)
        : 0;

      const masteryThreshold = target.masteryCriteria?.percentCorrect || 80;
      const progress = Math.min(100, Math.round((avgLastThree / masteryThreshold) * 100));

      return {
        name: target.name.length > 15 ? target.name.substring(0, 15) + '...' : target.name,
        fullName: target.name,
        studentName: target.studentName,
        progress,
        avgPercent: avgLastThree,
        threshold: masteryThreshold,
        sessionsCount: sessions.length,
      };
    }).sort((a, b) => b.progress - a.progress);
  }, [targets]);

  if (targets.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Chart Type Toggle */}
      <div className="flex justify-end">
        <ToggleGroup type="single" value={chartType} onValueChange={(v) => v && setChartType(v as 'line' | 'bar')} size="sm">
          <ToggleGroupItem value="line" aria-label="Line chart" className="gap-1 h-7 px-2">
            <LineChartIcon className="w-3 h-3" />
            <span className="text-xs">Line</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="bar" aria-label="Bar chart" className="gap-1 h-7 px-2">
            <BarChart3 className="w-3 h-3" />
            <span className="text-xs">Bar</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      
      <Tabs defaultValue="progress" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="progress">Progress Over Time</TabsTrigger>
          <TabsTrigger value="targets">By Target</TabsTrigger>
          <TabsTrigger value="mastery">Mastery Progress</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
        </TabsList>

      <TabsContent value="progress" className="mt-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Overall Progress Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {progressData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                {chartType === 'line' ? (
                  <LineChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }} 
                      tickLine={false}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
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
                      dataKey="percentCorrect" 
                      name="% Correct"
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="percentIndependent" 
                      name="% Independent"
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ fill: '#10b981' }}
                    />
                  </LineChart>
                ) : (
                  <BarChart data={progressData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }} 
                      tickLine={false}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="percentCorrect" 
                      name="% Correct"
                      fill="hsl(var(--primary))" 
                    />
                    <Bar 
                      dataKey="percentIndependent" 
                      name="% Independent"
                      fill="#10b981" 
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No session data in selected date range
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="targets" className="mt-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Progress by Target (Last 10 Sessions)</CardTitle>
          </CardHeader>
          <CardContent>
            {targetProgressData.length > 0 && targetProgressData.some(t => t.data.length > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    dataKey="session" 
                    type="number"
                    domain={[1, 10]}
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    label={{ value: 'Session', position: 'bottom', offset: 0 }}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  {targetProgressData.filter(t => t.data.length > 0).map((target) => (
                    <Line 
                      key={target.fullName}
                      data={target.data}
                      type="monotone" 
                      dataKey="percentCorrect" 
                      name={target.name}
                      stroke={target.color}
                      strokeWidth={2}
                      dot={{ fill: target.color, r: 4 }}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No session data available
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="mastery" className="mt-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Progress Toward Mastery (Acquisition Targets)</CardTitle>
          </CardHeader>
          <CardContent>
            {masteryProgress.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart 
                  data={masteryProgress.slice(0, 10)} 
                  layout="vertical"
                  margin={{ left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis 
                    type="number" 
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={120}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string, props: any) => [
                      `${props.payload.avgPercent}% avg (${props.payload.sessionsCount} sessions)`,
                      props.payload.fullName
                    ]}
                  />
                  <Bar 
                    dataKey="progress" 
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No targets currently in acquisition
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="distribution" className="mt-4">
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Method Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={methodDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
    </div>
  );
}
