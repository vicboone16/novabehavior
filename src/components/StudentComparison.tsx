import { useState } from 'react';
import { Users, TrendingUp, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { format, subDays, isAfter } from 'date-fns';
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
} from 'recharts';

export function StudentComparison() {
  const { students, frequencyEntries, abcEntries, behaviorGoals } = useDataStore();
  const [open, setOpen] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<'7' | '14' | '30' | 'all'>('7');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

  const activeStudents = students.filter(s => !s.isArchived);

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const getDateFilter = () => {
    if (dateRange === 'all') return null;
    return subDays(new Date(), parseInt(dateRange));
  };

  // Get comparison data for selected students
  const getComparisonData = () => {
    const dateFilter = getDateFilter();
    const selectedStudents = activeStudents.filter(s => selectedStudentIds.includes(s.id));
    
    // Aggregate data by date
    const dateMap = new Map<string, { date: string; [key: string]: number | string }>();
    
    selectedStudents.forEach(student => {
      // Get frequency data
      const studentFreq = frequencyEntries.filter(e => {
        if (e.studentId !== student.id) return false;
        if (dateFilter && !isAfter(new Date(e.timestamp), dateFilter)) return false;
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

  // Get summary stats for each student
  const getSummaryStats = () => {
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

      const studentGoals = behaviorGoals.filter(g => g.studentId === id);
      const masteredGoals = studentGoals.filter(g => g.isMastered);

      const totalFrequency = studentFreq.reduce((sum, e) => sum + e.count, 0);

      return {
        id,
        name: student.name,
        color: student.color,
        totalFrequency,
        abcCount: studentABC.length,
        behaviorCount: student.behaviors.length,
        goalsCount: studentGoals.length,
        masteredGoalsCount: masteredGoals.length,
      };
    }).filter(Boolean);
  };

  const comparisonData = getComparisonData();
  const summaryStats = getSummaryStats();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Users className="w-4 h-4" />
          Compare Students
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Student Comparison
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

          {/* Controls */}
          {selectedStudentIds.length >= 2 && (
            <div className="flex gap-4">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Date Range</label>
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
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Chart Type</label>
                <Select value={chartType} onValueChange={(v: typeof chartType) => setChartType(v)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">Line Chart</SelectItem>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          {selectedStudentIds.length >= 2 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {summaryStats.map(stats => stats && (
                <div
                  key={stats.id}
                  className="bg-card border border-border rounded-lg p-3"
                  style={{ borderLeftColor: stats.color, borderLeftWidth: 4 }}
                >
                  <h4 className="font-medium text-sm truncate">{stats.name}</h4>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Frequency Total:</span>
                      <span className="font-medium text-foreground">{stats.totalFrequency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ABC Entries:</span>
                      <span className="font-medium text-foreground">{stats.abcCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Goals:</span>
                      <span className="font-medium text-foreground">
                        {stats.masteredGoalsCount}/{stats.goalsCount} mastered
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Chart */}
          {selectedStudentIds.length >= 2 && comparisonData.length > 0 && (
            <div className="h-80 bg-card border border-border rounded-lg p-4">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'line' ? (
                  <LineChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    {selectedStudentIds.map(id => {
                      const student = students.find(s => s.id === id);
                      return student ? (
                        <Line
                          key={id}
                          type="monotone"
                          dataKey={student.name}
                          stroke={student.color}
                          strokeWidth={2}
                          dot={{ fill: student.color }}
                        />
                      ) : null;
                    })}
                  </LineChart>
                ) : (
                  <BarChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    {selectedStudentIds.map(id => {
                      const student = students.find(s => s.id === id);
                      return student ? (
                        <Bar
                          key={id}
                          dataKey={student.name}
                          fill={student.color}
                        />
                      ) : null;
                    })}
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          )}

          {selectedStudentIds.length < 2 && (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Select at least 2 students to compare their data</p>
            </div>
          )}

          {selectedStudentIds.length >= 2 && comparisonData.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No frequency data found for the selected students in this date range</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
