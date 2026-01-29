import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Filter, Plus, Clock, LineChart as LineChartIcon } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useDataStore } from '@/store/dataStore';
import { toast } from 'sonner';

const CHART_COLORS = [
  'hsl(199, 89%, 48%)',
  'hsl(173, 58%, 49%)',
  'hsl(262, 83%, 68%)',
  'hsl(38, 92%, 60%)',
  'hsl(0, 72%, 61%)',
  'hsl(280, 65%, 70%)',
];

export function BehaviorTrendCharts() {
  const { sessions, students, frequencyEntries, addHistoricalFrequency } = useDataStore();
  const [filterStudent, setFilterStudent] = useState<string>('all');
  const [filterBehavior, setFilterBehavior] = useState<string>('all');
  const [showRatePerHour, setShowRatePerHour] = useState(false);
  const [showAddHistorical, setShowAddHistorical] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  
  // Historical entry form state
  const [histDate, setHistDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [histStudentId, setHistStudentId] = useState('');
  const [histBehaviorId, setHistBehaviorId] = useState('');
  const [histCount, setHistCount] = useState('1');
  const [histDuration, setHistDuration] = useState('30');

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

  // Process data for charts - use null for missing data (no data collected) vs 0 for zero occurrences
  const chartData = useMemo(() => {
    // Get unique dates from all sessions
    const sessionsByDate = new Map<string, typeof sessions[0][]>();
    sessions.forEach(session => {
      const date = format(new Date(session.date), 'yyyy-MM-dd');
      if (!sessionsByDate.has(date)) {
        sessionsByDate.set(date, []);
      }
      sessionsByDate.get(date)!.push(session);
    });

    const sessionData = Array.from(sessionsByDate.entries()).map(([dateKey, dateSessions]) => {
      const date = format(new Date(dateKey), 'MM/dd');
      
      // Aggregate data across all sessions for this date
      const frequencyByBehavior: Record<string, number | null> = {};
      const rateByBehavior: Record<string, number | null> = {};
      const intervalByBehavior: Record<string, { occurred: number; total: number }> = {};
      const durationByBehavior: Record<string, number | null> = {};
      
      // Track which behaviors had data collected on this date
      const behaviorsWithData = new Set<string>();
      
      dateSessions.forEach(session => {
        const sessionLengthMinutes = session.sessionLengthMinutes || 30;
        
        // Process frequency entries
        session.frequencyEntries.forEach(entry => {
          if (filterStudent !== 'all' && entry.studentId !== filterStudent) return;
          if (filterBehavior !== 'all' && entry.behaviorId !== filterBehavior) return;
          
          const behavior = students.flatMap(s => s.behaviors).find(b => b.id === entry.behaviorId);
          const key = behavior?.name || 'Unknown';
          behaviorsWithData.add(key);
          
          // Use actual count value (including 0)
          frequencyByBehavior[key] = (frequencyByBehavior[key] ?? 0) + entry.count;
          
          // Calculate rate per hour
          const durationMinutes = (entry as any).observationDurationMinutes || sessionLengthMinutes;
          const ratePerHour = entry.count / (durationMinutes / 60);
          rateByBehavior[key] = (rateByBehavior[key] ?? 0) + ratePerHour;
        });

        // Process interval data
        session.intervalEntries.forEach(entry => {
          if (filterStudent !== 'all' && entry.studentId !== filterStudent) return;
          if (filterBehavior !== 'all' && entry.behaviorId !== filterBehavior) return;
          
          const behavior = students.flatMap(s => s.behaviors).find(b => b.id === entry.behaviorId);
          const key = behavior?.name || 'Unknown';
          behaviorsWithData.add(key);
          
          if (!intervalByBehavior[key]) intervalByBehavior[key] = { occurred: 0, total: 0 };
          intervalByBehavior[key].total++;
          if (entry.occurred) intervalByBehavior[key].occurred++;
        });

        // Process duration data
        session.durationEntries.forEach(entry => {
          if (filterStudent !== 'all' && entry.studentId !== filterStudent) return;
          if (filterBehavior !== 'all' && entry.behaviorId !== filterBehavior) return;
          
          const behavior = students.flatMap(s => s.behaviors).find(b => b.id === entry.behaviorId);
          const key = behavior?.name || 'Unknown';
          behaviorsWithData.add(key);
          
          durationByBehavior[key] = (durationByBehavior[key] ?? 0) + entry.duration;
        });
      });

      // Calculate interval percentages (only for behaviors with interval data)
      const intervalPercentages: Record<string, number | null> = {};
      Object.entries(intervalByBehavior).forEach(([key, value]) => {
        intervalPercentages[key] = value.total > 0 ? Math.round((value.occurred / value.total) * 100) : 0;
      });

      // Build the data point - only include values for behaviors that had data collected
      const dataPoint: Record<string, any> = {
        date,
        dateKey,
      };
      
      // Add frequency data - null if no data was collected for that behavior
      Object.entries(frequencyByBehavior).forEach(([key, value]) => {
        dataPoint[key] = value;
      });
      
      // Add rate data
      Object.entries(rateByBehavior).forEach(([key, value]) => {
        dataPoint[`${key} (/hr)`] = value !== null ? parseFloat(value.toFixed(2)) : null;
      });
      
      // Add interval percentages
      Object.entries(intervalPercentages).forEach(([key, value]) => {
        dataPoint[`${key} (%)`] = value;
      });
      
      // Add duration data
      Object.entries(durationByBehavior).forEach(([key, value]) => {
        dataPoint[`${key} (sec)`] = value;
      });

      return dataPoint;
    });

    // Sort by date
    return sessionData.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
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
        if (!['date', 'dateKey', 'dateTime', 'sessionId', 'sessionLengthMinutes'].includes(key)) {
          names.add(key);
        }
      });
    });
    return Array.from(names);
  }, [chartData]);

  // Handle adding historical frequency entry
  const handleAddHistoricalEntry = () => {
    if (!histStudentId || !histBehaviorId) {
      toast.error('Please select a student and behavior');
      return;
    }
    
    const count = parseInt(histCount) || 1;
    const durationMinutes = parseFloat(histDuration) || 30;
    const timestamp = new Date(`${histDate}T12:00:00`);
    
    addHistoricalFrequency({
      studentId: histStudentId,
      behaviorId: histBehaviorId,
      count,
      timestamp,
      observationDurationMinutes: durationMinutes,
    });
    
    toast.success(`Added ${count} occurrences (${(count / (durationMinutes / 60)).toFixed(2)}/hr)`);
    setShowAddHistorical(false);
    setHistCount('1');
    setHistDuration('30');
  };

  // Get behaviors for selected student
  const studentBehaviors = useMemo(() => {
    if (!histStudentId) return [];
    const student = students.find(s => s.id === histStudentId);
    return student?.behaviors || [];
  }, [histStudentId, students]);

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

        {/* Filters and Controls */}
        <div className="flex flex-wrap gap-3 py-2 border-b items-center">
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
          
          {/* Chart Type Toggle */}
          <ToggleGroup type="single" value={chartType} onValueChange={(v) => v && setChartType(v as 'line' | 'bar')} size="sm">
            <ToggleGroupItem value="line" aria-label="Line chart" className="gap-1 h-7 px-2">
              <LineChartIcon className="w-3 h-3" />
              <span className="text-xs hidden sm:inline">Line</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="bar" aria-label="Bar chart" className="gap-1 h-7 px-2">
              <BarChart3 className="w-3 h-3" />
              <span className="text-xs hidden sm:inline">Bar</span>
            </ToggleGroupItem>
          </ToggleGroup>
          
          <div className="flex items-center gap-2 ml-auto">
            <Switch
              id="show-rate"
              checked={showRatePerHour}
              onCheckedChange={setShowRatePerHour}
            />
            <Label htmlFor="show-rate" className="text-xs cursor-pointer">
              Rate/hr
            </Label>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddHistorical(true)}
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Historical
          </Button>
        </div>

        {/* Add Historical Entry Dialog */}
        {showAddHistorical && (
          <Card className="mx-2 my-2 border-primary/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Add Historical Frequency Entry
              </CardTitle>
              <CardDescription className="text-xs">
                Enter data collected outside of sessions with observation duration for rate calculation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    value={histDate}
                    onChange={(e) => setHistDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Student</Label>
                  <Select value={histStudentId} onValueChange={(v) => { setHistStudentId(v); setHistBehaviorId(''); }}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {students.filter(s => !s.isArchived).map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Behavior</Label>
                  <Select value={histBehaviorId} onValueChange={setHistBehaviorId} disabled={!histStudentId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {studentBehaviors.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Count</Label>
                  <Input
                    type="number"
                    min="1"
                    value={histCount}
                    onChange={(e) => setHistCount(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Observation Duration (minutes)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={histDuration}
                    onChange={(e) => setHistDuration(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Calculated Rate</Label>
                  <div className="h-8 px-3 flex items-center bg-muted rounded-md text-sm font-medium">
                    {((parseInt(histCount) || 0) / ((parseFloat(histDuration) || 30) / 60)).toFixed(2)} per hour
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddHistoricalEntry}>
                  <Plus className="w-3 h-3 mr-1" />
                  Add Entry
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowAddHistorical(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="flex-1 overflow-y-auto py-2">
          <Tabs defaultValue="frequency">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="frequency" className="gap-1">
                <BarChart3 className="w-3 h-3" />
                Frequency
              </TabsTrigger>
              <TabsTrigger value="rate" className="gap-1">
                <Clock className="w-3 h-3" />
                Rate/Hour
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
                  <CardTitle className="text-sm">Frequency by Session (Raw Counts)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    {chartType === 'line' ? (
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Legend />
                        {behaviorNames
                          .filter(n => !n.includes('(%)') && !n.includes('(sec)') && !n.includes('(/hr)'))
                          .map((name, idx) => (
                            <Line 
                              key={name} 
                              type="monotone"
                              dataKey={name} 
                              stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                              strokeWidth={2}
                              dot={{ fill: CHART_COLORS[idx % CHART_COLORS.length], r: 4 }}
                              connectNulls={false}
                            />
                          ))
                        }
                      </LineChart>
                    ) : (
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Legend />
                        {behaviorNames
                          .filter(n => !n.includes('(%)') && !n.includes('(sec)') && !n.includes('(/hr)'))
                          .map((name, idx) => (
                            <Bar 
                              key={name} 
                              dataKey={name} 
                              fill={CHART_COLORS[idx % CHART_COLORS.length]} 
                            />
                          ))
                        }
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Interval Percentage by Session</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    {chartType === 'line' ? (
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={12} />
                        <YAxis fontSize={12} domain={[0, 100]} />
                        <Tooltip />
                        <Legend />
                        {behaviorNames
                          .filter(n => n.includes('(%)'))
                          .map((name, idx) => (
                            <Line 
                              key={name} 
                              type="monotone"
                              dataKey={name} 
                              stroke={CHART_COLORS[(idx + 2) % CHART_COLORS.length]}
                              strokeWidth={2}
                              dot={{ fill: CHART_COLORS[(idx + 2) % CHART_COLORS.length], r: 4 }}
                              connectNulls={false}
                            />
                          ))
                        }
                      </LineChart>
                    ) : (
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
                    )}
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Rate Per Hour Tab */}
            <TabsContent value="rate" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Behavior Rate Per Hour</CardTitle>
                  <CardDescription className="text-xs">
                    Frequency normalized by observation duration for accurate comparison
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    {chartType === 'line' ? (
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip formatter={(value: number) => `${value.toFixed(2)}/hr`} />
                        <Legend />
                        {behaviorNames
                          .filter(n => n.includes('(/hr)'))
                          .map((name, idx) => (
                            <Line 
                              key={name} 
                              type="monotone"
                              dataKey={name} 
                              stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                              strokeWidth={2}
                              dot={{ fill: CHART_COLORS[idx % CHART_COLORS.length], r: 4 }}
                              connectNulls={false}
                            />
                          ))
                        }
                      </LineChart>
                    ) : (
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip formatter={(value: number) => `${value.toFixed(2)}/hr`} />
                        <Legend />
                        {behaviorNames
                          .filter(n => n.includes('(/hr)'))
                          .map((name, idx) => (
                            <Bar 
                              key={name} 
                              dataKey={name} 
                              fill={CHART_COLORS[idx % CHART_COLORS.length]} 
                            />
                          ))
                        }
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Rate Trends Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip formatter={(value: number) => `${value.toFixed(2)}/hr`} />
                      <Legend />
                      {behaviorNames
                        .filter(n => n.includes('(/hr)'))
                        .map((name, idx) => (
                          <Line 
                            key={name} 
                            type="monotone"
                            dataKey={name} 
                            stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                            strokeWidth={2}
                            dot={{ fill: CHART_COLORS[idx % CHART_COLORS.length], r: 4 }}
                            connectNulls={false}
                          />
                        ))
                      }
                    </LineChart>
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
                        .filter(n => !n.includes('(%)') && !n.includes('(sec)') && !n.includes('(/hr)'))
                        .map((name, idx) => (
                          <Line 
                            key={name} 
                            type="monotone"
                            dataKey={name} 
                            stroke={CHART_COLORS[idx % CHART_COLORS.length]}
                            strokeWidth={2}
                            dot={{ fill: CHART_COLORS[idx % CHART_COLORS.length], r: 4 }}
                            connectNulls={false}
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
                            dot={{ fill: CHART_COLORS[(idx + 3) % CHART_COLORS.length], r: 4 }}
                            connectNulls={false}
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