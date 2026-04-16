import { useState, useMemo } from 'react';
import { Plus, Settings, Trash2, Activity, Edit2, Check, X, BookOpen, ChevronDown, FileText, Trophy, ArchiveRestore, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDataStore } from '@/store/dataStore';
import { DataCollectionMethod, METHOD_LABELS, Behavior, BehaviorDefinition, BEHAVIOR_CATEGORIES } from '@/types/behavior';
import { BehaviorInterventionsPicker } from '@/components/behavior-interventions';
import { BehaviorActionsMenu } from '@/components/behaviors/BehaviorActionsMenu';
import { toast } from 'sonner';

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
  const { students, selectedStudentIds, addBehaviorWithMethods, updateBehaviorMethods, updateBehaviorDefinition, removeBehavior, setBehaviorMastered, unarchiveBehavior, behaviorDefinitionOverrides, globalBehaviorBank } = useDataStore();
  
  // Apply overrides to bank definitions so users get the full updated definition
  const effectiveBehaviorBank = useMemo(() => {
    return BEHAVIOR_BANK.map(b => {
      const override = behaviorDefinitionOverrides[b.id];
      if (override) {
        return {
          ...b,
          operationalDefinition: override.operationalDefinition || b.operationalDefinition,
          category: override.category || b.category,
        };
      }
      return b;
    });
  }, [behaviorDefinitionOverrides]);
  
  const [newBehaviorName, setNewBehaviorName] = useState('');
  const [newBehaviorDefinition, setNewBehaviorDefinition] = useState('');
  const [newBehaviorCategory, setNewBehaviorCategory] = useState('');
  const [selectedMethods, setSelectedMethods] = useState<DataCollectionMethod[]>(['frequency']);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [editingBehavior, setEditingBehavior] = useState<{ studentId: string; behaviorId: string } | null>(null);
  const [editMethods, setEditMethods] = useState<DataCollectionMethod[]>([]);
  const [editingDefinition, setEditingDefinition] = useState<{ studentId: string; behaviorId: string } | null>(null);
  const [editDefinitionText, setEditDefinitionText] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // All non-archived students for the dropdown
  const allActiveStudents = students.filter((s) => !s.isArchived);
  // Only currently selected students for bulk operations and display
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
      addBehaviorWithMethods(selectedStudentId, newBehaviorName.trim(), selectedMethods, {
        operationalDefinition: newBehaviorDefinition.trim() || undefined,
        category: newBehaviorCategory || undefined,
      });
      setNewBehaviorName('');
      setNewBehaviorDefinition('');
      setNewBehaviorCategory('');
    }
  };

  const addBehaviorToAll = () => {
    if (newBehaviorName.trim() && selectedMethods.length > 0) {
      selectedStudentIds.forEach((studentId) => {
        addBehaviorWithMethods(studentId, newBehaviorName.trim(), selectedMethods, {
          operationalDefinition: newBehaviorDefinition.trim() || undefined,
          category: newBehaviorCategory || undefined,
        });
      });
      setNewBehaviorName('');
      setNewBehaviorDefinition('');
      setNewBehaviorCategory('');
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

  const startEditingDefinition = (studentId: string, behavior: Behavior) => {
    setEditingDefinition({ studentId, behaviorId: behavior.id });
    setEditDefinitionText(behavior.operationalDefinition || '');
  };

  const saveDefinition = () => {
    if (editingDefinition) {
      updateBehaviorDefinition(editingDefinition.studentId, editingDefinition.behaviorId, editDefinitionText);
      setEditingDefinition(null);
      setEditDefinitionText('');
    }
  };

  const cancelDefinitionEdit = () => {
    setEditingDefinition(null);
    setEditDefinitionText('');
  };

  const selectFromBank = (b: typeof BEHAVIOR_BANK[0]) => {
    setNewBehaviorName(b.name);
    setNewBehaviorDefinition(b.operationalDefinition);
    setNewBehaviorCategory(b.category);
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
        <button className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-xs md:text-sm font-medium ring-offset-background transition-all hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 gap-1.5 md:gap-2">
          <Settings className="w-3.5 h-3.5 md:w-4 md:h-4" />
          Manage Behaviors
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Behavior Configuration
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="behaviors" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="behaviors" className="gap-2">
              <Activity className="w-4 h-4" />
              Behaviors to Track
            </TabsTrigger>
            <TabsTrigger value="interventions" className="gap-2">
              <Brain className="w-4 h-4" />
              Behavior Interventions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="behaviors" className="flex-1 overflow-y-auto mt-4">
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
                      {effectiveBehaviorBank.map((b) => (
                        <button
                          key={b.id}
                          className="w-full text-left px-2 py-1.5 rounded hover:bg-secondary text-sm"
                          onClick={() => selectFromBank(b)}
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
                <SelectContent className="z-[9999] bg-popover max-h-[300px]">
                  {allActiveStudents.length > 0 ? (
                    allActiveStudents.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          {s.name}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      No students found. Add students first.
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Operational Definition (shown when behavior is selected) */}
            {newBehaviorName && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Operational Definition (can be customized per student later)</Label>
                <textarea
                  placeholder="Define the behavior in observable, measurable terms..."
                  value={newBehaviorDefinition}
                  onChange={(e) => setNewBehaviorDefinition(e.target.value)}
                  className="w-full min-h-[60px] p-2 text-sm border border-border rounded-md bg-background resize-y"
                />
              </div>
            )}

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
            {selectedStudents.map((student) => {
              const activeBehaviors = student.behaviors.filter(b => !b.isMastered && !b.isArchived);
              const masteredBehaviors = student.behaviors.filter(b => b.isMastered || b.isArchived);
              
              return (
              <div key={student.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: student.color }}
                  />
                  <h4 className="font-semibold">{student.displayName || student.name}</h4>
                  <Badge variant="outline" className="ml-auto">
                    {activeBehaviors.length} active
                  </Badge>
                  {masteredBehaviors.length > 0 && (
                    <Badge 
                      variant="secondary" 
                      className="cursor-pointer"
                      onClick={() => setShowArchived(!showArchived)}
                    >
                      {masteredBehaviors.length} mastered/archived
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  {activeBehaviors.map((behavior) => (
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
                      ) : editingDefinition?.studentId === student.id && editingDefinition?.behaviorId === behavior.id ? (
                        // Editing definition mode
                        <div className="space-y-2 w-full">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{behavior.name}</span>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={saveDefinition}
                              >
                                <Check className="w-3 h-3 text-success" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={cancelDefinitionEdit}
                              >
                                <X className="w-3 h-3 text-destructive" />
                              </Button>
                            </div>
                          </div>
                          <textarea
                            placeholder="Enter student-specific operational definition..."
                            value={editDefinitionText}
                            onChange={(e) => setEditDefinitionText(e.target.value)}
                            className="w-full min-h-[80px] p-2 text-sm border border-border rounded-md bg-background resize-y"
                          />
                          <p className="text-xs text-muted-foreground">
                            This definition is specific to {student.displayName || student.name} and won't affect the library.
                          </p>
                        </div>
                      ) : (
                        // Display mode
                        <div className="space-y-1 flex-1">
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
                              className="h-6 w-6 p-0 text-amber-600 hover:text-amber-700"
                              onClick={() => {
                                setBehaviorMastered(student.id, behavior.id, true);
                                toast.success(`${behavior.name} marked as mastered`);
                              }}
                              title="Mark as mastered (archive)"
                            >
                              <Trophy className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => startEditingDefinition(student.id, behavior)}
                              title="Edit definition for this student"
                            >
                              <FileText className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => startEditing(student.id, behavior)}
                              title="Edit data collection methods"
                            >
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <BehaviorActionsMenu
                              studentId={student.id}
                              behaviorId={behavior.id}
                              behaviorName={behavior.name}
                            />
                          </div>
                          {behavior.operationalDefinition && (
                            <p className="text-xs text-muted-foreground pl-1 line-clamp-2">
                              {behavior.operationalDefinition}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Mastered/Archived behaviors section */}
                  {showArchived && masteredBehaviors.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <Trophy className="w-3 h-3" /> Mastered / Archived
                      </p>
                      {masteredBehaviors.map((behavior) => (
                        <div 
                          key={behavior.id} 
                          className="bg-muted/30 rounded-md p-2 opacity-60 hover:opacity-100 transition-opacity"
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1 flex-wrap flex-1">
                              {(behavior.methods || [behavior.type]).map((method) => (
                                <Badge 
                                  key={method} 
                                  className="bg-muted text-muted-foreground text-xs" 
                                  variant="secondary"
                                >
                                  {METHOD_LABELS[method]}
                                </Badge>
                              ))}
                              <span className="text-sm font-medium ml-1 text-muted-foreground">{behavior.name}</span>
                              {behavior.isMastered && (
                                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                                  Mastered
                                </Badge>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-primary"
                              onClick={() => {
                                unarchiveBehavior(student.id, behavior.id);
                                toast.success(`${behavior.name} reactivated for data collection`);
                              }}
                              title="Unarchive / Resume tracking"
                            >
                              <ArchiveRestore className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {activeBehaviors.length === 0 && masteredBehaviors.length === 0 && (
                    <p className="text-muted-foreground text-sm">No behaviors configured</p>
                  )}
                </div>
              </div>
            )})}
            {selectedStudents.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Select students to configure their behaviors
              </p>
            )}
          </div>
            </div>
          </TabsContent>

          <TabsContent value="interventions" className="flex-1 overflow-y-auto mt-4">
            <BehaviorInterventionsPicker compact hideHeader />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
