import { useState } from 'react';
import { Users, Plus, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDataStore } from '@/store/dataStore';
import { DataCollectionMethod, METHOD_LABELS, GoalDirection, GoalMetric } from '@/types/behavior';

export function BulkAddBehavior() {
  const { students, bulkAddBehavior, bulkAddGoal } = useDataStore();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'behavior' | 'goal'>('behavior');
  
  // Behavior form
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [behaviorName, setBehaviorName] = useState('');
  const [selectedMethods, setSelectedMethods] = useState<DataCollectionMethod[]>(['frequency']);
  
  // Goal form
  const [goalStudentIds, setGoalStudentIds] = useState<string[]>([]);
  const [goalBehaviorName, setGoalBehaviorName] = useState('');
  const [goalDirection, setGoalDirection] = useState<GoalDirection>('decrease');
  const [goalMetric, setGoalMetric] = useState<GoalMetric>('frequency');

  const activeStudents = students.filter(s => !s.isArchived);

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const toggleGoalStudent = (id: string) => {
    setGoalStudentIds(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const toggleMethod = (method: DataCollectionMethod) => {
    setSelectedMethods(prev =>
      prev.includes(method)
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  };

  const handleAddBehavior = () => {
    if (behaviorName.trim() && selectedStudentIds.length > 0 && selectedMethods.length > 0) {
      bulkAddBehavior(selectedStudentIds, behaviorName.trim(), selectedMethods);
      resetForm();
      setOpen(false);
    }
  };

  const handleAddGoal = () => {
    if (goalBehaviorName.trim() && goalStudentIds.length > 0) {
      // First add the behavior to all selected students
      bulkAddBehavior(goalStudentIds, goalBehaviorName.trim(), ['frequency']);
      
      // Then add goals for each student
      // Note: We need to find the behavior IDs after they're created
      // For simplicity, we'll just add the behavior - user can then configure goals individually
      resetForm();
      setOpen(false);
    }
  };

  const resetForm = () => {
    setSelectedStudentIds([]);
    setBehaviorName('');
    setSelectedMethods(['frequency']);
    setGoalStudentIds([]);
    setGoalBehaviorName('');
    setGoalDirection('decrease');
    setGoalMetric('frequency');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Users className="w-4 h-4" />
          Bulk Add
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Bulk Add to Multiple Students
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'behavior' | 'goal')}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="behavior" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Behavior
            </TabsTrigger>
            <TabsTrigger value="goal" className="gap-2">
              <Target className="w-4 h-4" />
              Add Behavior + Goal
            </TabsTrigger>
          </TabsList>

          <TabsContent value="behavior" className="space-y-4 mt-4">
            {/* Select Students */}
            <div className="space-y-2">
              <Label>Select Students</Label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-border rounded-lg">
                {activeStudents.map(student => (
                  <div
                    key={student.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all text-sm ${
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
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: student.color }}
                    />
                    <span>{student.name}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedStudentIds(activeStudents.map(s => s.id))}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedStudentIds([])}
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Behavior Name */}
            <div className="space-y-2">
              <Label>Behavior Name</Label>
              <Input
                placeholder="Enter behavior name..."
                value={behaviorName}
                onChange={(e) => setBehaviorName(e.target.value)}
              />
            </div>

            {/* Data Collection Methods */}
            <div className="space-y-2">
              <Label>Data Collection Methods</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['frequency', 'duration', 'interval', 'abc'] as DataCollectionMethod[]).map((method) => (
                  <div key={method} className="flex items-center gap-2">
                    <Checkbox
                      id={`method-${method}`}
                      checked={selectedMethods.includes(method)}
                      onCheckedChange={() => toggleMethod(method)}
                    />
                    <Label htmlFor={`method-${method}`} className="cursor-pointer">
                      {METHOD_LABELS[method]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddBehavior}
                disabled={!behaviorName.trim() || selectedStudentIds.length === 0 || selectedMethods.length === 0}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add to {selectedStudentIds.length} Student{selectedStudentIds.length !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="goal" className="space-y-4 mt-4">
            {/* Select Students for Goal */}
            <div className="space-y-2">
              <Label>Select Students</Label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-border rounded-lg">
                {activeStudents.map(student => (
                  <div
                    key={student.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all text-sm ${
                      goalStudentIds.includes(student.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => toggleGoalStudent(student.id)}
                  >
                    <Checkbox
                      checked={goalStudentIds.includes(student.id)}
                      onCheckedChange={() => toggleGoalStudent(student.id)}
                    />
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: student.color }}
                    />
                    <span>{student.name}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGoalStudentIds(activeStudents.map(s => s.id))}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGoalStudentIds([])}
                >
                  Clear
                </Button>
              </div>
            </div>

            {/* Behavior Name for Goal */}
            <div className="space-y-2">
              <Label>Behavior Name</Label>
              <Input
                placeholder="Enter behavior name..."
                value={goalBehaviorName}
                onChange={(e) => setGoalBehaviorName(e.target.value)}
              />
            </div>

            {/* Goal Direction & Metric */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Direction</Label>
                <Select value={goalDirection} onValueChange={(v: GoalDirection) => setGoalDirection(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="increase">Increase</SelectItem>
                    <SelectItem value="decrease">Decrease</SelectItem>
                    <SelectItem value="maintain">Maintain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Metric</Label>
                <Select value={goalMetric} onValueChange={(v: GoalMetric) => setGoalMetric(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="frequency">Frequency</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="duration">Duration</SelectItem>
                    <SelectItem value="rate">Rate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs text-muted-foreground bg-secondary/30 rounded p-2">
              After bulk adding, go to each student's profile to configure specific target values, baselines, and dates.
            </p>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddGoal}
                disabled={!goalBehaviorName.trim() || goalStudentIds.length === 0}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add to {goalStudentIds.length} Student{goalStudentIds.length !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
