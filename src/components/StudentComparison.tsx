import { useState, useMemo } from 'react';
import { Users, TrendingUp, BarChart3, Target, Clock, Activity, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDataStore } from '@/store/dataStore';
import { useAssignedStudents } from '@/hooks/useAssignedStudents';
import { format, subDays, isAfter, differenceInDays } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Cell,
  PieChart as RechartsPie,
  Pie,
} from 'recharts';

type ViewType = 'overview' | 'behaviors' | 'abc' | 'goals';

export function StudentComparison() {
  const { students, frequencyEntries, abcEntries, durationEntries, intervalEntries, behaviorGoals } = useDataStore();
  const { assignedStudents } = useAssignedStudents();
  const [open, setOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<'7' | '14' | '30' | 'all'>('7');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [viewType, setViewType] = useState<ViewType>('overview');
  const [selectedBehavior, setSelectedBehavior] = useState<string>('all');

  // Only show students assigned to this user (sorted alphabetically)
  const activeStudents = assignedStudents;

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const getDateFilter = () => {
    if (dateRange === 'all') return null;
    return subDays(new Date(), parseInt(dateRange));
  };

  // Get all unique behaviors across selected students
  const allBehaviors = useMemo(() => {
    const behaviorMap = new Map<string, string>();
    selectedStudentIds.forEach(id => {
      const student = students.find(s => s.id === id);
      student?.behaviors.forEach(b => {
        behaviorMap.set(b.name.toLowerCase(), b.name);
      });
    });
    return Array.from(behaviorMap.values());
  }, [selectedStudentIds, students]);

  // Get comparison data for selected students
  const getComparisonData = () => {
    const dateFilter = getDateFilter();
    const selectedStudents = activeStudents.filter(s => selectedStudentIds.includes(s.id));
    
    const dateMap = new Map<string, { date: string; [key: string]: number | string }>();
    
    selectedStudents.forEach(student => {
      const studentFreq = frequencyEntries.filter(e => {
        if (e.studentId !== student.id) return false;
        if (dateFilter && !isAfter(new Date(e.timestamp), dateFilter)) return false;
        if (selectedBehavior !== 'all') {
          const behavior = student.behaviors.find(b => b.id === e.behaviorId);
          if (!behavior || behavior.name.toLowerCase() !== selectedBehavior.toLowerCase()) return false;
        }
        return true;
      });

      studentFreq.forEach(entry => {
        const dateStr = format(new Date(entry.timestamp), 'MMM dd');
        const existing = dateMap.get(dateStr) || { date: dateStr };
        existing[student.name] = ((existing[student.name] as number) || 0) + entry.count;
        dateMap.set(dateStr, existing);
      });
    });

    return Array.from(dateMap.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  // Get detailed stats for each student
  const getDetailedStats = () => {
    const dateFilter = getDateFilter();
    
    return selectedStudentIds.map(id => {
      const student = students.find(s => s.id === id);
      if (!student) return null;

      const studentFreq = frequencyEntries.filter(e => {
        if (e.studentId !== id) return false;
        if (dateFilter && !isAfter(new Date(e.timestamp), dateFilter)) return false;
        return true;
      });

      const studentABC = abcEntries.filter(e => {
        if (e.studentId !== id) return false;
        if (dateFilter && !isAfter(new Date(e.timestamp), dateFilter)) return false;
        return true;
      });

      const studentDuration = durationEntries.filter(e => {
        if (e.studentId !== id) return false;
        if (dateFilter && !isAfter(new Date(e.startTime), dateFilter)) return false;
        return true;
      });

      const studentIntervals = intervalEntries.filter(e => {
        if (e.studentId !== id) return false;
        if (dateFilter && !isAfter(new Date(e.timestamp), dateFilter)) return false;
        return true;
      });

      const studentGoals = behaviorGoals.filter(g => g.studentId === id);
      const masteredGoals = studentGoals.filter(g => g.isMastered);

      const totalFrequency = studentFreq.reduce((sum, e) => sum + e.count, 0);
      const totalDuration = studentDuration.reduce((sum, e) => sum + (e.duration || 0), 0);
      const intervalOccurrences = studentIntervals.filter(e => e.occurred && !e.voided).length;
      const totalIntervals = studentIntervals.filter(e => !e.voided).length;

      // ABC function analysis
      const functionCounts: Record<string, number> = {};
      studentABC.forEach(entry => {
        (entry.functions || []).forEach(fn => {
          functionCounts[fn] = (functionCounts[fn] || 0) + 1;
        });
      });

      // Behavior breakdown
      const behaviorBreakdown = student.behaviors.map(b => {
        const freqCount = studentFreq
          .filter(e => e.behaviorId === b.id)
          .reduce((sum, e) => sum + e.count, 0);
        return { name: b.name, count: freqCount };
      }).sort((a, b) => b.count - a.count);

      return {
        id,
        name: student.name,
        color: student.color,
        totalFrequency,
        totalDuration,
        intervalOccurrences,
        totalIntervals,
        intervalPercentage: totalIntervals > 0 ? Math.round((intervalOccurrences / totalIntervals) * 100) : 0,
        abcCount: studentABC.length,
        behaviorCount: student.behaviors.length,
        goalsCount: studentGoals.length,
        masteredGoalsCount: masteredGoals.length,
        goalProgress: studentGoals.length > 0 ? Math.round((masteredGoals.length / studentGoals.length) * 100) : 0,
        functionCounts,
        behaviorBreakdown,
        goals: studentGoals.map(g => {
          const behavior = student.behaviors.find(b => b.id === g.behaviorId);
          return { ...g, behaviorName: behavior?.name || 'Unknown' };
        }),
      };
    }).filter(Boolean);
  };

  // Radar chart data for multi-dimensional comparison
  const getRadarData = () => {
    const stats = getDetailedStats();
    if (stats.length === 0) return [];

    const maxFreq = Math.max(...stats.map(s => s?.totalFrequency || 0), 1);
    const maxABC = Math.max(...stats.map(s => s?.abcCount || 0), 1);
    const maxGoals = Math.max(...stats.map(s => s?.goalsCount || 0), 1);
    const maxBehaviors = Math.max(...stats.map(s => s?.behaviorCount || 0), 1);

    return [
      { metric: 'Frequency', ...Object.fromEntries(stats.map(s => [s!.name, Math.round((s!.totalFrequency / maxFreq) * 100)])) },
      { metric: 'ABC Events', ...Object.fromEntries(stats.map(s => [s!.name, Math.round((s!.abcCount / maxABC) * 100)])) },
      { metric: 'Goals Set', ...Object.fromEntries(stats.map(s => [s!.name, Math.round((s!.goalsCount / maxGoals) * 100)])) },
      { metric: 'Goal Progress', ...Object.fromEntries(stats.map(s => [s!.name, s!.goalProgress])) },
      { metric: 'Behaviors', ...Object.fromEntries(stats.map(s => [s!.name, Math.round((s!.behaviorCount / maxBehaviors) * 100)])) },
      { metric: 'Interval %', ...Object.fromEntries(stats.map(s => [s!.name, s!.intervalPercentage])) },
    ];
  };

  const comparisonData = getComparisonData();
  const detailedStats = getDetailedStats();
  const radarData = getRadarData();

  const selectedStudents = activeStudents.filter(s => selectedStudentIds.includes(s.id));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Users className="w-4 h-4" />
          Compare Students
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Student Comparison Dashboard
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Student Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Students to Compare</label>
            <div className="flex flex-wrap gap-2">
              {activeStudents.map(student => (
                <div
                  key={student.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${
                    selectedStudentIds.includes(student.id)
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => toggleStudent(student.id)}
                >
                  <Checkbox
                    checked={selectedStudentIds.includes(student.id)}
                    onCheckedChange={() => toggleStudent(student.id)}
                  />
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: student.color }}
                  />
                  <span className="text-sm font-medium">{student.name}</span>
                </div>
              ))}
            </div>
          </div>

          {selectedStudentIds.length >= 2 && (
            <>
              {/* View Tabs */}
              <Tabs value={viewType} onValueChange={(v) => setViewType(v as ViewType)}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <TabsList>
                    <TabsTrigger value="overview" className="gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Overview
                    </TabsTrigger>
                    <TabsTrigger value="behaviors" className="gap-2">
                      <Activity className="w-4 h-4" />
                      Behaviors
                    </TabsTrigger>
                    <TabsTrigger value="abc" className="gap-2">
                      <PieChart className="w-4 h-4" />
                      ABC Analysis
                    </TabsTrigger>
                    <TabsTrigger value="goals" className="gap-2">
                      <Target className="w-4 h-4" />
                      Goals
                    </TabsTrigger>
                  </TabsList>

                  {/* Controls */}
                  <div className="flex gap-2">
                    <Select value={dateRange} onValueChange={(v: typeof dateRange) => setDateRange(v)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">Last 7 days</SelectItem>
                        <SelectItem value="14">Last 14 days</SelectItem>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="all">All time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-4 mt-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {detailedStats.map(stats => stats && (
                      <Card key={stats.id} style={{ borderLeftColor: stats.color, borderLeftWidth: 4 }}>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm truncate">{stats.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="py-2 space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Frequency</span>
                              <p className="font-bold text-lg">{stats.totalFrequency}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">ABC</span>
                              <p className="font-bold text-lg">{stats.abcCount}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Duration</span>
                              <p className="font-bold text-lg">{Math.round(stats.totalDuration / 60)}m</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Interval</span>
                              <p className="font-bold text-lg">{stats.intervalPercentage}%</p>
                            </div>
                          </div>
                          <div className="pt-2 border-t">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Goals</span>
                              <span>{stats.masteredGoalsCount}/{stats.goalsCount}</span>
                            </div>
                            <Progress value={stats.goalProgress} className="h-2" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Radar Comparison Chart */}
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">Multi-Dimensional Comparison</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radarData}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="metric" className="text-xs" />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} />
                            {selectedStudents.map(student => (
                              <Radar
                                key={student.id}
                                name={student.name}
                                dataKey={student.name}
                                stroke={student.color}
                                fill={student.color}
                                fillOpacity={0.2}
                              />
                            ))}
                            <Legend />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Trend Chart */}
                  <Card>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">Frequency Trends</CardTitle>
                        <Select value={chartType} onValueChange={(v: typeof chartType) => setChartType(v)}>
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="line">Line</SelectItem>
                            <SelectItem value="bar">Bar</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {comparisonData.length > 0 ? (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            {chartType === 'line' ? (
                              <LineChart data={comparisonData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="date" className="text-xs" />
                                <YAxis className="text-xs" />
                                <Tooltip />
                                <Legend />
                                {selectedStudents.map(student => (
                                  <Line
                                    key={student.id}
                                    type="monotone"
                                    dataKey={student.name}
                                    stroke={student.color}
                                    strokeWidth={2}
                                    dot={{ fill: student.color }}
                                  />
                                ))}
                              </LineChart>
                            ) : (
                              <BarChart data={comparisonData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                                <XAxis dataKey="date" className="text-xs" />
                                <YAxis className="text-xs" />
                                <Tooltip />
                                <Legend />
                                {selectedStudents.map(student => (
                                  <Bar key={student.id} dataKey={student.name} fill={student.color} />
                                ))}
                              </BarChart>
                            )}
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="h-64 flex items-center justify-center text-muted-foreground">
                          No frequency data for selected date range
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Behaviors Tab */}
                <TabsContent value="behaviors" className="space-y-4 mt-4">
                  <div className="flex gap-2 items-center">
                    <label className="text-sm font-medium">Filter by Behavior:</label>
                    <Select value={selectedBehavior} onValueChange={setSelectedBehavior}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Behaviors</SelectItem>
                        {allBehaviors.map(b => (
                          <SelectItem key={b} value={b.toLowerCase()}>{b}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Side-by-side behavior breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {detailedStats.map(stats => stats && (
                      <Card key={stats.id} style={{ borderTopColor: stats.color, borderTopWidth: 3 }}>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm">{stats.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {stats.behaviorBreakdown.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No behavior data
                            </p>
                          ) : (
                            stats.behaviorBreakdown.slice(0, 8).map((b, idx) => (
                              <div key={b.name} className="flex items-center justify-between">
                                <span className="text-sm truncate flex-1">{b.name}</span>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="h-2 rounded-full" 
                                    style={{ 
                                      width: `${Math.min(100, (b.count / (stats.behaviorBreakdown[0]?.count || 1)) * 80)}px`,
                                      backgroundColor: stats.color 
                                    }} 
                                  />
                                  <Badge variant="secondary" className="text-xs min-w-[40px] justify-center">
                                    {b.count}
                                  </Badge>
                                </div>
                              </div>
                            ))
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* ABC Analysis Tab */}
                <TabsContent value="abc" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {detailedStats.map(stats => stats && (
                      <Card key={stats.id} style={{ borderTopColor: stats.color, borderTopWidth: 3 }}>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm flex items-center justify-between">
                            {stats.name}
                            <Badge variant="secondary">{stats.abcCount} entries</Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {Object.keys(stats.functionCounts).length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No function analysis data
                            </p>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground mb-2">Hypothesized Functions:</p>
                              {Object.entries(stats.functionCounts)
                                .sort(([, a], [, b]) => b - a)
                                .map(([fn, count]) => (
                                  <div key={fn} className="flex items-center justify-between">
                                    <span className="text-sm capitalize">{fn}</span>
                                    <div className="flex items-center gap-2">
                                      <Progress 
                                        value={(count / stats.abcCount) * 100} 
                                        className="w-20 h-2" 
                                      />
                                      <span className="text-xs text-muted-foreground w-8 text-right">
                                        {Math.round((count / stats.abcCount) * 100)}%
                                      </span>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Goals Tab */}
                <TabsContent value="goals" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {detailedStats.map(stats => stats && (
                      <Card key={stats.id} style={{ borderTopColor: stats.color, borderTopWidth: 3 }}>
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm flex items-center justify-between">
                            {stats.name}
                            <div className="flex items-center gap-2">
                              <Badge variant={stats.goalProgress === 100 ? 'default' : 'secondary'}>
                                {stats.masteredGoalsCount}/{stats.goalsCount} mastered
                              </Badge>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {stats.goals.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No goals set
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {stats.goals.map(goal => (
                                <div 
                                  key={goal.id} 
                                  className={`p-2 rounded-lg border ${goal.isMastered ? 'bg-primary/5 border-primary/30' : 'border-border'}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium truncate">{goal.behaviorName}</span>
                                    {goal.isMastered && (
                                      <Badge className="bg-primary text-primary-foreground text-xs">
                                        Mastered
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {goal.direction === 'increase' ? '↑' : goal.direction === 'decrease' ? '↓' : '→'}{' '}
                                    {goal.metric}
                                    {goal.targetValue !== undefined && ` to ${goal.targetValue}`}
                                  </p>
                                  {goal.masteryDate && (
                                    <p className="text-xs text-primary mt-1">
                                      Mastered: {format(new Date(goal.masteryDate), 'MMM d, yyyy')}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}

          {selectedStudentIds.length < 2 && (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select at least 2 students to compare</p>
              <p className="text-sm mt-1">Choose students from the list above to see side-by-side comparisons</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
