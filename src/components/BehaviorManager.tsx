import { useState } from 'react';
import { Plus, Settings, Trash2, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useDataStore } from '@/store/dataStore';
import { DataCollectionMethod, METHOD_LABELS } from '@/types/behavior';

const ALL_METHODS: DataCollectionMethod[] = ['frequency', 'duration', 'interval', 'abc'];

export function BehaviorManager() {
  const { students, selectedStudentIds, addBehaviorWithMethods, removeBehavior } = useDataStore();
  const [newBehaviorName, setNewBehaviorName] = useState('');
  const [selectedMethods, setSelectedMethods] = useState<DataCollectionMethod[]>(['frequency']);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  const selectedStudents = students.filter((s) => selectedStudentIds.includes(s.id));

  const toggleMethod = (method: DataCollectionMethod) => {
    setSelectedMethods((prev) =>
      prev.includes(method)
        ? prev.filter((m) => m !== method)
        : [...prev, method]
    );
  };

  const handleAddBehavior = () => {
    if (newBehaviorName.trim() && selectedStudentId && selectedMethods.length > 0) {
      addBehaviorWithMethods(selectedStudentId, newBehaviorName.trim(), selectedMethods);
      setNewBehaviorName('');
    }
  };

  const addBehaviorToAll = () => {
    if (newBehaviorName.trim() && selectedMethods.length > 0) {
      selectedStudentIds.forEach((studentId) => {
        addBehaviorWithMethods(studentId, newBehaviorName.trim(), selectedMethods);
      });
      setNewBehaviorName('');
    }
  };

  const getBehaviorTypeColor = (type: DataCollectionMethod) => {
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
            </div>

            {/* Method Selection */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Data Collection Methods (select multiple)</Label>
              <div className="flex flex-wrap gap-3">
                {ALL_METHODS.map((method) => (
                  <div key={method} className="flex items-center gap-2">
                    <Checkbox
                      id={`method-${method}`}
                      checked={selectedMethods.includes(method)}
                      onCheckedChange={() => toggleMethod(method)}
                    />
                    <Label 
                      htmlFor={`method-${method}`} 
                      className="text-sm cursor-pointer"
                    >
                      {METHOD_LABELS[method]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleAddBehavior} 
                disabled={!newBehaviorName.trim() || !selectedStudentId || selectedMethods.length === 0}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add to Student
              </Button>
              <Button 
                variant="secondary" 
                onClick={addBehaviorToAll}
                disabled={!newBehaviorName.trim() || selectedStudentIds.length === 0 || selectedMethods.length === 0}
              >
                Add to All Selected
              </Button>
            </div>
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
                      <div className="flex gap-1">
                        {(behavior.methods || [behavior.type]).map((method) => (
                          <Badge 
                            key={method} 
                            className={`${getBehaviorTypeColor(method)} text-xs`} 
                            variant="secondary"
                          >
                            {method.charAt(0).toUpperCase()}
                          </Badge>
                        ))}
                      </div>
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
