import { useState } from 'react';
import { Plus, Settings, Trash2, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useDataStore } from '@/store/dataStore';
import { Behavior } from '@/types/behavior';

export function BehaviorManager() {
  const { students, selectedStudentIds, addBehavior, removeBehavior } = useDataStore();
  const [newBehaviorName, setNewBehaviorName] = useState('');
  const [newBehaviorType, setNewBehaviorType] = useState<Behavior['type']>('frequency');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  const selectedStudents = students.filter((s) => selectedStudentIds.includes(s.id));

  const handleAddBehavior = () => {
    if (newBehaviorName.trim() && selectedStudentId) {
      addBehavior(selectedStudentId, {
        name: newBehaviorName.trim(),
        type: newBehaviorType,
      });
      setNewBehaviorName('');
    }
  };

  const addBehaviorToAll = () => {
    if (newBehaviorName.trim()) {
      selectedStudentIds.forEach((studentId) => {
        addBehavior(studentId, {
          name: newBehaviorName.trim(),
          type: newBehaviorType,
        });
      });
      setNewBehaviorName('');
    }
  };

  const getBehaviorTypeColor = (type: Behavior['type']) => {
    switch (type) {
      case 'frequency': return 'bg-info text-info-foreground';
      case 'duration': return 'bg-warning text-warning-foreground';
      case 'interval': return 'bg-accent text-accent-foreground';
      case 'abc': return 'bg-antecedent text-antecedent-foreground';
      default: return 'bg-secondary';
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Settings className="w-4 h-4" />
          Manage Behaviors
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Behavior Configuration
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add new behavior */}
          <div className="bg-secondary/30 rounded-lg p-4 space-y-3">
            <h3 className="font-medium text-sm text-foreground">Add New Behavior</h3>
            <div className="flex gap-2 flex-wrap">
              <Input
                placeholder="Behavior name..."
                value={newBehaviorName}
                onChange={(e) => setNewBehaviorName(e.target.value)}
                className="flex-1 min-w-[200px]"
              />
              <Select value={newBehaviorType} onValueChange={(v) => setNewBehaviorType(v as Behavior['type'])}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="frequency">Frequency</SelectItem>
                  <SelectItem value="duration">Duration</SelectItem>
                  <SelectItem value="interval">Interval</SelectItem>
                  <SelectItem value="abc">ABC</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {selectedStudents.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAddBehavior} disabled={!newBehaviorName.trim() || !selectedStudentId}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={addBehaviorToAll}
              disabled={!newBehaviorName.trim() || selectedStudentIds.length === 0}
            >
              Add to all selected students
            </Button>
          </div>

          {/* Behaviors per student */}
          <div className="space-y-4">
            {selectedStudents.map((student) => (
              <div key={student.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: student.color }}
                  />
                  <h4 className="font-semibold">{student.name}</h4>
                  <Badge variant="outline" className="ml-auto">
                    {student.behaviors.length} behaviors
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {student.behaviors.map((behavior) => (
                    <div 
                      key={behavior.id} 
                      className="flex items-center gap-2 bg-secondary/50 rounded-md px-3 py-1.5"
                    >
                      <Badge className={getBehaviorTypeColor(behavior.type)} variant="secondary">
                        {behavior.type}
                      </Badge>
                      <span className="text-sm font-medium">{behavior.name}</span>
                      <button
                        onClick={() => removeBehavior(student.id, behavior.id)}
                        className="text-muted-foreground hover:text-destructive ml-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {student.behaviors.length === 0 && (
                    <p className="text-muted-foreground text-sm">No behaviors configured</p>
                  )}
                </div>
              </div>
            ))}
            {selectedStudents.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Select students to configure their behaviors
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
