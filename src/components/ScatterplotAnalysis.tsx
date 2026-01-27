import { useState, useMemo } from 'react';
import { Clock, Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useDataStore } from '@/store/dataStore';
import { format, getHours, getDay, startOfWeek, addDays } from 'date-fns';
import { 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis,
  Tooltip, 
  ResponsiveContainer,
  CartesianGrid,
  Cell 
} from 'recharts';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface TimeSlot {
  day: number;
  hour: number;
  count: number;
  behaviors: string[];
}

export function ScatterplotAnalysis() {
  const { students, sessions, frequencyEntries, abcEntries } = useDataStore();
  const [open, setOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [selectedBehaviorId, setSelectedBehaviorId] = useState<string>('all');
  const [viewType, setViewType] = useState<'heatmap' | 'scatter'>('heatmap');

  const selectedStudent = selectedStudentId !== 'all' 
    ? students.find(s => s.id === selectedStudentId) 
    : null;

  const allBehaviors = useMemo(() => {
    const behaviors: { id: string; name: string; studentName: string }[] = [];
    students.forEach(s => {
      s.behaviors.forEach(b => {
        behaviors.push({ id: b.id, name: b.name, studentName: s.name });
      });
    });
    return behaviors;
  }, [students]);

  const timeData = useMemo(() => {
    const slots: Map<string, TimeSlot> = new Map();
    
    // Process frequency entries with timestamps
    frequencyEntries.forEach(entry => {
      if (selectedStudentId !== 'all' && entry.studentId !== selectedStudentId) return;
      if (selectedBehaviorId !== 'all' && entry.behaviorId !== selectedBehaviorId) return;
      
      const student = students.find(s => s.id === entry.studentId);
      const behavior = student?.behaviors.find(b => b.id === entry.behaviorId);
      if (!behavior) return;

      (entry.timestamps || [new Date(entry.timestamp)]).forEach(ts => {
        const date = new Date(ts);
        const day = getDay(date);
        const hour = getHours(date);
        const key = `${day}-${hour}`;
        
        const existing = slots.get(key) || { day, hour, count: 0, behaviors: [] };
        existing.count += 1;
        if (!existing.behaviors.includes(behavior.name)) {
          existing.behaviors.push(behavior.name);
        }
        slots.set(key, existing);
      });
    });

    // Process ABC entries
    abcEntries.forEach(entry => {
      if (selectedStudentId !== 'all' && entry.studentId !== selectedStudentId) return;
      
      const student = students.find(s => s.id === entry.studentId);
      const date = new Date(entry.timestamp);
      const day = getDay(date);
      const hour = getHours(date);
      const key = `${day}-${hour}`;
      
      const existing = slots.get(key) || { day, hour, count: 0, behaviors: [] };
      existing.count += entry.frequencyCount || 1;
      const behaviorNames = entry.behaviors?.map(b => b.behaviorName) || [entry.behavior];
      behaviorNames.forEach(name => {
        if (!existing.behaviors.includes(name)) {
          existing.behaviors.push(name);
        }
      });
      slots.set(key, existing);
    });

    return Array.from(slots.values());
  }, [frequencyEntries, abcEntries, selectedStudentId, selectedBehaviorId, students]);

  const heatmapData = useMemo(() => {
    const matrix: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));
    timeData.forEach(slot => {
      matrix[slot.day][slot.hour] = slot.count;
    });
    return matrix;
  }, [timeData]);

  const maxCount = useMemo(() => Math.max(...timeData.map(t => t.count), 1), [timeData]);

  const getHeatColor = (count: number) => {
    if (count === 0) return 'hsl(var(--muted))';
    const intensity = count / maxCount;
    if (intensity < 0.25) return 'hsl(199, 89%, 80%)';
    if (intensity < 0.5) return 'hsl(199, 89%, 60%)';
    if (intensity < 0.75) return 'hsl(38, 92%, 50%)';
    return 'hsl(0, 72%, 51%)';
  };

  const scatterData = timeData.map(slot => ({
    x: slot.hour,
    y: slot.day,
    z: slot.count,
    behaviors: slot.behaviors.join(', '),
  }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Clock className="w-4 h-4" />
          Scatterplot
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Time-Based Behavior Analysis
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Student</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Behavior</Label>
              <Select value={selectedBehaviorId} onValueChange={setSelectedBehaviorId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Behaviors</SelectItem>
                  {(selectedStudent?.behaviors || allBehaviors).map(b => (
                    <SelectItem key={'id' in b ? b.id : b.id} value={'id' in b ? b.id : b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Tabs value={viewType} onValueChange={(v) => setViewType(v as 'heatmap' | 'scatter')}>
              <TabsList>
                <TabsTrigger value="heatmap">Heatmap</TabsTrigger>
                <TabsTrigger value="scatter">Scatter</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs">
            <span className="text-muted-foreground">Frequency:</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--muted))' }} />
              <span>None</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(199, 89%, 80%)' }} />
              <span>Low</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(38, 92%, 50%)' }} />
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(0, 72%, 51%)' }} />
              <span>High</span>
            </div>
          </div>

          {/* Visualization */}
          {viewType === 'heatmap' ? (
            <div className="space-y-2">
              {/* Hour labels */}
              <div className="flex items-center gap-1 ml-12">
                {HOURS.filter(h => h % 3 === 0).map(h => (
                  <div key={h} className="flex-1 text-center text-xs text-muted-foreground">
                    {h}:00
                  </div>
                ))}
              </div>
              
              {/* Grid */}
              {DAYS.map((day, dayIndex) => (
                <div key={day} className="flex items-center gap-1">
                  <div className="w-10 text-xs text-muted-foreground text-right pr-2">{day}</div>
                  <div className="flex-1 flex gap-0.5">
                    {HOURS.map(hour => {
                      const count = heatmapData[dayIndex][hour];
                      return (
                        <div
                          key={hour}
                          className="flex-1 h-6 rounded-sm transition-colors cursor-pointer hover:ring-2 hover:ring-primary"
                          style={{ backgroundColor: getHeatColor(count) }}
                          title={`${day} ${hour}:00 - ${count} occurrences`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name="Hour" 
                    domain={[0, 23]}
                    tickFormatter={(v) => `${v}:00`}
                    className="text-xs"
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name="Day"
                    domain={[0, 6]}
                    tickFormatter={(v) => DAYS[v]}
                    className="text-xs"
                  />
                  <ZAxis type="number" dataKey="z" range={[50, 500]} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload?.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover border rounded-lg shadow-lg p-3">
                            <p className="font-medium">{DAYS[data.y]} at {data.x}:00</p>
                            <p className="text-sm text-muted-foreground">{data.z} occurrences</p>
                            {data.behaviors && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Behaviors: {data.behaviors}
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter data={scatterData}>
                    {scatterData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={getHeatColor(entry.z)}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-secondary/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{timeData.reduce((sum, t) => sum + t.count, 0)}</div>
              <div className="text-xs text-muted-foreground">Total Occurrences</div>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">
                {timeData.length > 0 
                  ? DAYS[timeData.sort((a, b) => b.count - a.count)[0]?.day] || '-'
                  : '-'}
              </div>
              <div className="text-xs text-muted-foreground">Peak Day</div>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">
                {timeData.length > 0 
                  ? `${timeData.sort((a, b) => b.count - a.count)[0]?.hour || 0}:00`
                  : '-'}
              </div>
              <div className="text-xs text-muted-foreground">Peak Hour</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
