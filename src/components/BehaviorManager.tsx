import { useState, useMemo } from 'react';
import { Plus, Settings, Trash2, Activity, Edit2, Check, X, BookOpen, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDataStore } from '@/store/dataStore';
import { DataCollectionMethod, METHOD_LABELS, Behavior, BehaviorDefinition, BEHAVIOR_CATEGORIES } from '@/types/behavior';

const ALL_METHODS: DataCollectionMethod[] = ['frequency', 'duration', 'interval', 'abc', 'latency'];

// Default behavior bank
const BEHAVIOR_BANK: BehaviorDefinition[] = [
  { id: 'aggression-physical', name: 'Physical Aggression', operationalDefinition: 'Forceful physical contact towards others', category: 'Aggression', isGlobal: true },
  { id: 'aggression-verbal', name: 'Verbal Aggression', operationalDefinition: 'Vocalized threats or hostile statements', category: 'Aggression', isGlobal: true },
  { id: 'sib', name: 'Self-Injurious Behavior', operationalDefinition: 'Behavior causing injury to oneself', category: 'Self-Injury', isGlobal: true },
  { id: 'property-destruction', name: 'Property Destruction', operationalDefinition: 'Damaging or breaking property', category: 'Property Destruction', isGlobal: true },
  { id: 'elopement', name: 'Elopement', operationalDefinition: 'Leaving designated area without permission', category: 'Elopement', isGlobal: true },
  { id: 'non-compliance', name: 'Non-Compliance', operationalDefinition: 'Failure to follow instructions', category: 'Non-Compliance', isGlobal: true },
  { id: 'task-refusal', name: 'Task Refusal', operationalDefinition: 'Refusing to complete requested tasks', category: 'Non-Compliance', isGlobal: true },
  { id: 'verbal-disruption', name: 'Verbal Disruption', operationalDefinition: 'Vocalizations interrupting instruction', category: 'Verbal Disruption', isGlobal: true },
  { id: 'out-of-seat', name: 'Out of Seat', operationalDefinition: 'Leaving seat without permission', category: 'Verbal Disruption', isGlobal: true },
  { id: 'stereotypy-motor', name: 'Motor Stereotypy', operationalDefinition: 'Repetitive motor movements', category: 'Stereotypy', isGlobal: true },
  { id: 'stereotypy-vocal', name: 'Vocal Stereotypy', operationalDefinition: 'Repetitive non-communicative vocalizations', category: 'Stereotypy', isGlobal: true },
  { id: 'on-task', name: 'On-Task Behavior', operationalDefinition: 'Engagement in assigned activities', category: 'Academic', isGlobal: true },
];

export function BehaviorManager() {
  const { students, selectedStudentIds, addBehaviorWithMethods, updateBehaviorMethods, removeBehavior } = useDataStore();
  const [newBehaviorName, setNewBehaviorName] = useState('');
  const [selectedMethods, setSelectedMethods] = useState<DataCollectionMethod[]>(['frequency']);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [editingBehavior, setEditingBehavior] = useState<{ studentId: string; behaviorId: string } | null>(null);
  const [editMethods, setEditMethods] = useState<DataCollectionMethod[]>([]);

  const selectedStudents = students.filter((s) => selectedStudentIds.includes(s.id));

  const toggleMethod = (method: DataCollectionMethod) => {
    setSelectedMethods((prev) =>
      prev.includes(method)
        ? prev.filter((m) => m !== method)
        : [...prev, method]
    );
  };

  const toggleEditMethod = (method: DataCollectionMethod) => {
    setEditMethods((prev) =>
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

  const startEditing = (studentId: string, behavior: Behavior) => {
    setEditingBehavior({ studentId, behaviorId: behavior.id });
    setEditMethods(behavior.methods || [behavior.type]);
  };

  const saveEdit = () => {
    if (editingBehavior && editMethods.length > 0) {
      updateBehaviorMethods(editingBehavior.studentId, editingBehavior.behaviorId, editMethods);
      setEditingBehavior(null);
      setEditMethods([]);
    }
  };

  const cancelEdit = () => {
    setEditingBehavior(null);
    setEditMethods([]);
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

  const isEditing = (studentId: string, behaviorId: string) => 
    editingBehavior?.studentId === studentId && editingBehavior?.behaviorId === behaviorId;

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
              <div className="flex-1 min-w-[200px] relative">
                <Input
                  placeholder="Type or select from bank..."
                  value={newBehaviorName}
                  onChange={(e) => setNewBehaviorName(e.target.value)}
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" title="Select from Behavior Bank">
                    <BookOpen className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <div className="p-2 border-b">
                    <p className="text-sm font-medium">Behavior Bank</p>
                    <p className="text-xs text-muted-foreground">Select a predefined behavior</p>
                  </div>
                  <ScrollArea className="h-64">
                    <div className="p-2 space-y-1">
                      {BEHAVIOR_BANK.map((b) => (
                        <button
                          key={b.id}
                          className="w-full text-left px-2 py-1.5 rounded hover:bg-secondary text-sm"
                          onClick={() => setNewBehaviorName(b.name)}
                        >
                          <span className="font-medium">{b.name}</span>
                          <span className="text-xs text-muted-foreground block">{b.category}</span>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent className="z-[9999] bg-popover">
                  {selectedStudents.length > 0 ? (
                    selectedStudents.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      No students selected. Please select students from the dashboard first.
                    </div>
                  )}
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
                <div className="space-y-2">
                  {student.behaviors.map((behavior) => (
                    <div 
                      key={behavior.id} 
                      className="bg-secondary/50 rounded-md p-2"
                    >
                      {isEditing(student.id, behavior.id) ? (
                        // Editing mode
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{behavior.name}</span>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={saveEdit}
                                disabled={editMethods.length === 0}
                              >
                                <Check className="w-3 h-3 text-success" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={cancelEdit}
                              >
                                <X className="w-3 h-3 text-destructive" />
                              </Button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {ALL_METHODS.map((method) => (
                              <button
                                key={method}
                                onClick={() => toggleEditMethod(method)}
                                className={`
                                  px-2 py-1 text-xs rounded-md transition-all border
                                  ${editMethods.includes(method) 
                                    ? `${getBehaviorTypeColor(method)} border-transparent` 
                                    : 'bg-background border-border hover:border-primary/50'}
                                `}
                              >
                                {METHOD_LABELS[method]}
                              </button>
                            ))}
                          </div>
                          {editMethods.length === 0 && (
                            <p className="text-xs text-destructive">Select at least one method</p>
                          )}
                        </div>
                      ) : (
                        // Display mode
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1 flex-wrap flex-1">
                            {(behavior.methods || [behavior.type]).map((method) => (
                              <Badge 
                                key={method} 
                                className={`${getBehaviorTypeColor(method)} text-xs`} 
                                variant="secondary"
                              >
                                {METHOD_LABELS[method]}
                              </Badge>
                            ))}
                            <span className="text-sm font-medium ml-1">{behavior.name}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => startEditing(student.id, behavior)}
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <button
                            onClick={() => removeBehavior(student.id, behavior.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
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
