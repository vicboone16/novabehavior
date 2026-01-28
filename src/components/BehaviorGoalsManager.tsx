import { useState } from 'react';
import { Target, Plus, Trash2, TrendingUp, TrendingDown, Minus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useDataStore } from '@/store/dataStore';
import { BehaviorGoal, GoalDirection, GoalMetric } from '@/types/behavior';

const DIRECTION_LABELS: Record<GoalDirection, { label: string; icon: typeof TrendingUp }> = {
  increase: { label: 'Increase', icon: TrendingUp },
  decrease: { label: 'Decrease', icon: TrendingDown },
  maintain: { label: 'Maintain', icon: Minus },
};

const METRIC_LABELS: Record<GoalMetric, string> = {
  frequency: 'Count per session',
  percentage: 'Interval percentage',
  duration: 'Duration (minutes)',
  rate: 'Rate per hour',
  latency: 'Latency (seconds)',
};

export function BehaviorGoalsManager() {
  const { 
    students, 
    behaviorGoals, 
    addBehaviorGoal, 
    removeBehaviorGoal,
    sessions,
    frequencyEntries,
    intervalEntries,
    durationEntries,
  } = useDataStore();
  
  const [open, setOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedBehaviorId, setSelectedBehaviorId] = useState('');
  const [direction, setDirection] = useState<GoalDirection>('decrease');
  const [metric, setMetric] = useState<GoalMetric>('frequency');
  const [targetValue, setTargetValue] = useState(0);
  const [baseline, setBaseline] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  const handleAddGoal = () => {
    if (!selectedStudentId || !selectedBehaviorId || targetValue <= 0) return;
    
    addBehaviorGoal({
      studentId: selectedStudentId,
      behaviorId: selectedBehaviorId,
      direction,
      metric,
      targetValue,
      baseline,
      startDate: new Date(),
      notes: notes.trim() || undefined,
    });
    
    // Reset form
    setSelectedBehaviorId('');
    setTargetValue(0);
    setBaseline(undefined);
    setNotes('');
  };

  const calculateProgress = (goal: BehaviorGoal): { current: number; percentage: number } => {
    const student = students.find(s => s.id === goal.studentId);
    const behavior = student?.behaviors.find(b => b.id === goal.behaviorId);
    if (!behavior) return { current: 0, percentage: 0 };

    let current = 0;
    
    switch (goal.metric) {
      case 'frequency': {
        const entry = frequencyEntries.find(e => 
          e.studentId === goal.studentId && e.behaviorId === goal.behaviorId
        );
        current = entry?.count || 0;
        break;
      }
      case 'percentage': {
        const intervals = intervalEntries.filter(e => 
          e.studentId === goal.studentId && e.behaviorId === goal.behaviorId
        );
        const occurred = intervals.filter(i => i.occurred).length;
        current = intervals.length > 0 ? Math.round((occurred / intervals.length) * 100) : 0;
        break;
      }
      case 'duration': {
        const durations = durationEntries.filter(e => 
          e.studentId === goal.studentId && e.behaviorId === goal.behaviorId
        );
        current = Math.round(durations.reduce((sum, d) => sum + d.duration, 0) / 60);
        break;
      }
      case 'rate': {
        const entry = frequencyEntries.find(e => 
          e.studentId === goal.studentId && e.behaviorId === goal.behaviorId
        );
        current = entry?.count || 0; // Rate needs session length to calculate
        break;
      }
    }

    let percentage = 0;
    if (goal.direction === 'decrease') {
      const base = goal.baseline || goal.targetValue * 2;
      percentage = Math.min(100, Math.max(0, ((base - current) / (base - goal.targetValue)) * 100));
    } else if (goal.direction === 'increase') {
      percentage = Math.min(100, (current / goal.targetValue) * 100);
    } else {
      // Maintain - check if within 10% of target
      const variance = Math.abs(current - goal.targetValue) / goal.targetValue;
      percentage = variance <= 0.1 ? 100 : Math.max(0, 100 - variance * 100);
    }

    return { current, percentage: Math.round(percentage) };
  };

  const getStudentGoals = (studentId: string) => 
    behaviorGoals.filter(g => g.studentId === studentId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Target className="w-4 h-4" />
          Goals
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Behavior Goals
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add New Goal */}
          <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-sm">Add New Goal</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Student</Label>
                <Select value={selectedStudentId} onValueChange={(v) => {
                  setSelectedStudentId(v);
                  setSelectedBehaviorId('');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {students.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Behavior</Label>
                <Select value={selectedBehaviorId} onValueChange={setSelectedBehaviorId} disabled={!selectedStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select behavior" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedStudent?.behaviors.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Direction</Label>
                <Select value={direction} onValueChange={(v) => setDirection(v as GoalDirection)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DIRECTION_LABELS).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Metric</Label>
                <Select value={metric} onValueChange={(v) => setMetric(v as GoalMetric)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(METRIC_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Target</Label>
                <Input
                  type="number"
                  value={targetValue || ''}
                  onChange={(e) => setTargetValue(parseFloat(e.target.value) || 0)}
                  min={0}
                  step={metric === 'percentage' ? 1 : 0.1}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Baseline (optional)</Label>
                <Input
                  type="number"
                  value={baseline ?? ''}
                  onChange={(e) => setBaseline(e.target.value ? parseFloat(e.target.value) : undefined)}
                  min={0}
                  placeholder="Current level"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Goal notes..."
                />
              </div>
            </div>

            <Button 
              onClick={handleAddGoal}
              disabled={!selectedStudentId || !selectedBehaviorId || targetValue <= 0}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Goal
            </Button>
          </div>

          {/* Goals by Student */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-muted-foreground">Active Goals</h3>
            
            {students.filter(s => getStudentGoals(s.id).length > 0).map(student => (
              <Collapsible key={student.id} defaultOpen>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between h-auto py-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: student.color }}
                      />
                      <span className="font-medium">{student.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {getStudentGoals(student.id).length} goals
                      </Badge>
                    </div>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {getStudentGoals(student.id).map(goal => {
                    const behavior = student.behaviors.find(b => b.id === goal.behaviorId);
                    const { current, percentage } = calculateProgress(goal);
                    const DirectionIcon = DIRECTION_LABELS[goal.direction].icon;
                    
                    return (
                      <div key={goal.id} className="bg-secondary/30 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <DirectionIcon className={`w-4 h-4 ${
                              goal.direction === 'decrease' ? 'text-destructive' :
                              goal.direction === 'increase' ? 'text-success' : 'text-warning'
                            }`} />
                            <span className="font-medium text-sm">{behavior?.name || 'Unknown'}</span>
                            <Badge variant="outline" className="text-xs">
                              {METRIC_LABELS[goal.metric]}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive"
                            onClick={() => removeBehaviorGoal(goal.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <Progress value={percentage} className="flex-1 h-2" />
                          <span className="text-xs font-medium w-12 text-right">{percentage}%</span>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Current: {current}</span>
                          <span>Target: {goal.direction === 'decrease' ? '≤' : goal.direction === 'increase' ? '≥' : '~'}{goal.targetValue}</span>
                        </div>
                        
                        {goal.notes && (
                          <p className="text-xs text-muted-foreground italic">{goal.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            ))}
            
            {behaviorGoals.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">
                No goals set yet. Add a goal above to track progress.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
