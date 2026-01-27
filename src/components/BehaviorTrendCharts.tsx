import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useDataStore } from '@/store/dataStore';

const CHART_COLORS = [
  'hsl(199, 89%, 48%)',
  'hsl(173, 58%, 49%)',
  'hsl(262, 83%, 68%)',
  'hsl(38, 92%, 60%)',
  'hsl(0, 72%, 61%)',
  'hsl(280, 65%, 70%)',
];

export function BehaviorTrendCharts() {
  const { sessions, students } = useDataStore();
  const [filterStudent, setFilterStudent] = useState<string>('all');
  const [filterBehavior, setFilterBehavior] = useState<string>('all');

  const allBehaviors = useMemo(() => {
    const behaviors: { id: string; name: string }[] = [];
    students.forEach(student => {
      student.behaviors.forEach(b => {
        if (!behaviors.find(x => x.id === b.id)) {
          behaviors.push({ id: b.id, name: b.name });
        }
      });
    });
    return behaviors;
  }, [students]);

  // Process data for charts
  const chartData = useMemo(() => {
    const sessionData = sessions.map(session => {
      const date = format(new Date(session.date), 'MM/dd');
      const dateTime = format(new Date(session.date), 'MM/dd HH:mm');
      
      // Frequency data per session
      const frequencyByBehavior: Record<string, number> = {};
      session.frequencyEntries.forEach(entry => {
        if (filterStudent !== 'all' && entry.studentId !== filterStudent) return;
        if (filterBehavior !== 'all' && entry.behaviorId !== filterBehavior) return;
        
        const behavior = students.flatMap(s => s.behaviors).find(b => b.id === entry.behaviorId);
        const key = behavior?.name || 'Unknown';
        frequencyByBehavior[key] = (frequencyByBehavior[key] || 0) + entry.count;
      });

      // Interval data per session
      const intervalByBehavior: Record<string, { occurred: number; total: number }> = {};
      session.intervalEntries.forEach(entry => {
        if (filterStudent !== 'all' && entry.studentId !== filterStudent) return;
        if (filterBehavior !== 'all' && entry.behaviorId !== filterBehavior) return;
        
        const behavior = students.flatMap(s => s.behaviors).find(b => b.id === entry.behaviorId);
        const key = behavior?.name || 'Unknown';
        if (!intervalByBehavior[key]) intervalByBehavior[key] = { occurred: 0, total: 0 };
        intervalByBehavior[key].total++;
        if (entry.occurred) intervalByBehavior[key].occurred++;
      });

      // Duration data per session
      const durationByBehavior: Record<string, number> = {};
      session.durationEntries.forEach(entry => {
        if (filterStudent !== 'all' && entry.studentId !== filterStudent) return;
        if (filterBehavior !== 'all' && entry.behaviorId !== filterBehavior) return;
        
        const behavior = students.flatMap(s => s.behaviors).find(b => b.id === entry.behaviorId);
        const key = behavior?.name || 'Unknown';
        durationByBehavior[key] = (durationByBehavior[key] || 0) + entry.duration;
      });

      // Calculate interval percentages
      const intervalPercentages: Record<string, number> = {};
      Object.entries(intervalByBehavior).forEach(([key, value]) => {
        intervalPercentages[key] = value.total > 0 ? Math.round((value.occurred / value.total) * 100) : 0;
      });

      return {
        date,
        dateTime,
        sessionId: session.id,
        ...frequencyByBehavior,
        ...Object.fromEntries(
          Object.entries(intervalPercentages).map(([k, v]) => [`${k} (%)`, v])
        ),
        ...Object.fromEntries(
          Object.entries(durationByBehavior).map(([k, v]) => [`${k} (sec)`, v])
        ),
      };
    });

    return sessionData;
  }, [sessions, students, filterStudent, filterBehavior]);

  // Aggregate data for pie chart
  const aggregateData = useMemo(() => {
    const totals: Record<string, number> = {};
    
    sessions.forEach(session => {
      session.frequencyEntries.forEach(entry => {
        if (filterStudent !== 'all' && entry.studentId !== filterStudent) return;
        if (filterBehavior !== 'all' && entry.behaviorId !== filterBehavior) return;
        
        const behavior = students.flatMap(s => s.behaviors).find(b => b.id === entry.behaviorId);
        const key = behavior?.name || 'Unknown';
        totals[key] = (totals[key] || 0) + entry.count;
      });
    });

    return Object.entries(totals).map(([name, value], idx) => ({
      name,
      value,
      color: CHART_COLORS[idx % CHART_COLORS.length],
    }));
  }, [sessions, students, filterStudent, filterBehavior]);

  // Get unique behavior names for chart keys
  const behaviorNames = useMemo(() => {
    const names = new Set<string>();
    chartData.forEach(d => {
      Object.keys(d).forEach(key => {
        if (!['date', 'dateTime', 'sessionId'].includes(key)) {
          names.add(key);
        }
      });
    });
    return Array.from(names);
  }, [chartData]);

  if (sessions.length === 0) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Trends
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Behavior Trends</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No session data available</p>
            <p className="text-sm">Save sessions to see trend charts</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <TrendingUp className="w-4 h-4" />
          Trends
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Behavior Trends & Analysis
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 py-2 border-b">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
          </div>
          <Select value={filterStudent} onValueChange={setFilterStudent}>
            <SelectTrigger className="w-[150px] h-8">
              <SelectValue placeholder="All Students" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {students.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterBehavior} onValueChange={setFilterBehavior}>
            <SelectTrigger className="w-[150px] h-8">
              <SelectValue placeholder="All Behaviors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Behaviors</SelectItem>
              {allBehaviors.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline">{sessions.length} sessions</Badge>
        </div>

        {/* Charts */}
        <div className="flex-1 overflow-y-auto py-2">
          <Tabs defaultValue="frequency">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="frequency" className="gap-1">
                <BarChart3 className="w-3 h-3" />
                Frequency
              </TabsTrigger>
              <TabsTrigger value="trends" className="gap-1">
                <TrendingUp className="w-3 h-3" />
                Trends
              </TabsTrigger>
              <TabsTrigger value="distribution" className="gap-1">
                <PieChartIcon className="w-3 h-3" />
                Distribution
              </TabsTrigger>
            </TabsList>

            <TabsContent value="frequency" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Frequency by Session</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      {behaviorNames
                        .filter(n => !n.includes('(%)') && !n.includes('(sec)'))
                        .map((name, idx) => (
                          <Bar 
                            key={name} 
                            dataKey={name} 
                            fill={CHART_COLORS[idx % CHART_COLORS.length]} 
                          />
                        ))
                      }
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Interval Percentage by Session</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      {behaviorNames
                        .filter(n => n.includes('(%)'))
                        .map((name, idx) => (
                          <Bar 
                            key={name} 
                            dataKey={name} 
                            fill={CHART_COLORS[(idx + 2) % CHART_COLORS.length]} 
                          />
                        ))
                      }
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="trends" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Behavior Trends Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      {behaviorNames
                        .filter(n => !n.includes('(%)') && !n.includes('(sec)'))
                        .map((name, idx) => (
                          <Line 
                            key={name} 
                            type="monotone"
                            dataKey={name} 
                            stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                            strokeWidth={2}
                            dot={{ fill: CHART_COLORS[idx % CHART_COLORS.length] }}
                          />
                        ))
                      }
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Duration Trends (seconds)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      {behaviorNames
                        .filter(n => n.includes('(sec)'))
                        .map((name, idx) => (
                          <Line 
                            key={name} 
                            type="monotone"
                            dataKey={name} 
                            stroke={CHART_COLORS[(idx + 3) % CHART_COLORS.length]}
                            strokeWidth={2}
                          />
                        ))
                      }
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="distribution">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Frequency Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={aggregateData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {aggregateData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}