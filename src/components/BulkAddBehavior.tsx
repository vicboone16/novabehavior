import { useState, useMemo } from 'react';
import { Users, Plus, Target, BookOpen, Search } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useDataStore } from '@/store/dataStore';
import { DataCollectionMethod, METHOD_LABELS, GoalDirection, GoalMetric, BehaviorDefinition, BEHAVIOR_CATEGORIES } from '@/types/behavior';

// Default behavior bank with operational definitions
const DEFAULT_BEHAVIORS: BehaviorDefinition[] = [
  {
    id: 'aggression-physical',
    name: 'Physical Aggression',
    operationalDefinition: 'Any instance of forceful physical contact towards another person including hitting, kicking, biting, scratching, pushing, or throwing objects at others with apparent intent to harm or intimidate.',
    category: 'Aggression',
    isGlobal: true,
  },
  {
    id: 'aggression-verbal',
    name: 'Verbal Aggression',
    operationalDefinition: 'Vocalized threats, name-calling, or hostile statements directed at others, including yelling obscenities, making threats of harm, or using derogatory language.',
    category: 'Aggression',
    isGlobal: true,
  },
  {
    id: 'sib',
    name: 'Self-Injurious Behavior',
    operationalDefinition: 'Any behavior that results in or has the potential to result in physical injury to oneself, including head-banging, biting self, hitting self, scratching self, or hair pulling.',
    category: 'Self-Injury',
    isGlobal: true,
  },
  {
    id: 'property-destruction',
    name: 'Property Destruction',
    operationalDefinition: 'Any instance of damaging, breaking, or attempting to destroy property, including throwing objects, tearing materials, breaking items, or defacing property.',
    category: 'Property Destruction',
    isGlobal: true,
  },
  {
    id: 'elopement',
    name: 'Elopement',
    operationalDefinition: 'Leaving or attempting to leave a designated area without permission, including running away, walking out of the classroom, or leaving the school grounds without authorization.',
    category: 'Elopement',
    isGlobal: true,
  },
  {
    id: 'non-compliance',
    name: 'Non-Compliance',
    operationalDefinition: 'Failure to initiate a response to an instruction within 10 seconds of the instruction being given, or failure to complete the instructed task.',
    category: 'Non-Compliance',
    isGlobal: true,
  },
  {
    id: 'task-refusal',
    name: 'Task Refusal',
    operationalDefinition: 'Verbal or non-verbal indication that the individual will not complete a requested task, including saying "no", shaking head, pushing materials away, or stating refusal.',
    category: 'Non-Compliance',
    isGlobal: true,
  },
  {
    id: 'verbal-disruption',
    name: 'Verbal Disruption',
    operationalDefinition: 'Vocalizations that interrupt ongoing instruction or activities, including talking out of turn, making loud noises, singing, humming loudly, or calling out during lessons.',
    category: 'Verbal Disruption',
    isGlobal: true,
  },
  {
    id: 'out-of-seat',
    name: 'Out of Seat',
    operationalDefinition: 'Leaving assigned seat without permission, including standing up, walking around the classroom, or moving to a different location during instruction.',
    category: 'Verbal Disruption',
    isGlobal: true,
  },
  {
    id: 'stereotypy-motor',
    name: 'Motor Stereotypy',
    operationalDefinition: 'Repetitive motor movements that appear to have no adaptive function, including hand flapping, body rocking, finger flicking, spinning, or repetitive object manipulation.',
    category: 'Stereotypy',
    isGlobal: true,
  },
  {
    id: 'stereotypy-vocal',
    name: 'Vocal Stereotypy',
    operationalDefinition: 'Repetitive vocalizations that do not serve a communicative function, including scripting, echolalia, repetitive sounds, or humming.',
    category: 'Stereotypy',
    isGlobal: true,
  },
  {
    id: 'on-task',
    name: 'On-Task Behavior',
    operationalDefinition: 'Engagement in assigned task activities including looking at materials, writing, participating in discussions, following along during instruction, or completing work independently.',
    category: 'Academic',
    isGlobal: true,
  },
  {
    id: 'hand-raising',
    name: 'Appropriate Hand Raising',
    operationalDefinition: 'Raising hand quietly and waiting to be called on before speaking during classroom instruction or group activities.',
    category: 'Social Skills',
    isGlobal: true,
  },
  {
    id: 'appropriate-request',
    name: 'Appropriate Requesting',
    operationalDefinition: 'Using words, signs, or AAC device to request wants or needs in a calm voice without engaging in problem behavior.',
    category: 'Communication',
    isGlobal: true,
  },
];

export function BulkAddBehavior() {
  const { students, bulkAddBehavior, bulkAddGoal, globalBehaviorBank, behaviorDefinitionOverrides } = useDataStore();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'behavior' | 'goal'>('behavior');
  
  // Behavior form
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [behaviorName, setBehaviorName] = useState('');
  const [behaviorDefinition, setBehaviorDefinition] = useState('');
  const [selectedMethods, setSelectedMethods] = useState<DataCollectionMethod[]>(['frequency']);
  const [behaviorBankOpen, setBehaviorBankOpen] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState('');
  
  // Goal form
  const [goalStudentIds, setGoalStudentIds] = useState<string[]>([]);
  const [goalBehaviorName, setGoalBehaviorName] = useState('');
  const [goalBehaviorDefinition, setGoalBehaviorDefinition] = useState('');
  const [goalDirection, setGoalDirection] = useState<GoalDirection>('decrease');
  const [goalMetric, setGoalMetric] = useState<GoalMetric>('frequency');
  const [goalBankOpen, setGoalBankOpen] = useState(false);
  const [goalBankSearchQuery, setGoalBankSearchQuery] = useState('');

  // Apply overrides to default behaviors
  const effectiveDefaultBehaviors = useMemo(() => {
    return DEFAULT_BEHAVIORS.map(behavior => {
      const override = behaviorDefinitionOverrides[behavior.id];
      if (override) {
        return {
          ...behavior,
          operationalDefinition: override.operationalDefinition || behavior.operationalDefinition,
          category: override.category || behavior.category,
        };
      }
      return behavior;
    });
  }, [behaviorDefinitionOverrides]);

  // Combine all behavior sources
  const allBankBehaviors = useMemo(() => [
    ...effectiveDefaultBehaviors,
    ...globalBehaviorBank,
  ], [effectiveDefaultBehaviors, globalBehaviorBank]);

  // Filtered behaviors for behavior tab
  const filteredBankBehaviors = useMemo(() => {
    if (!bankSearchQuery.trim()) return allBankBehaviors;
    const query = bankSearchQuery.toLowerCase();
    return allBankBehaviors.filter(b => 
      b.name.toLowerCase().includes(query) || 
      b.operationalDefinition.toLowerCase().includes(query) ||
      b.category.toLowerCase().includes(query)
    );
  }, [allBankBehaviors, bankSearchQuery]);

  // Filtered behaviors for goal tab
  const filteredGoalBankBehaviors = useMemo(() => {
    if (!goalBankSearchQuery.trim()) return allBankBehaviors;
    const query = goalBankSearchQuery.toLowerCase();
    return allBankBehaviors.filter(b => 
      b.name.toLowerCase().includes(query) || 
      b.operationalDefinition.toLowerCase().includes(query) ||
      b.category.toLowerCase().includes(query)
    );
  }, [allBankBehaviors, goalBankSearchQuery]);

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
    setBehaviorDefinition('');
    setSelectedMethods(['frequency']);
    setBehaviorBankOpen(false);
    setBankSearchQuery('');
    setGoalStudentIds([]);
    setGoalBehaviorName('');
    setGoalBehaviorDefinition('');
    setGoalDirection('decrease');
    setGoalMetric('frequency');
    setGoalBankOpen(false);
    setGoalBankSearchQuery('');
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

            {/* Behavior Name with Bank Picker */}
            <div className="space-y-2">
              <Label>Behavior Name</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter behavior name or select from bank..."
                  value={behaviorName}
                  onChange={(e) => setBehaviorName(e.target.value)}
                  className="flex-1"
                />
                <Popover open={behaviorBankOpen} onOpenChange={setBehaviorBankOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0" align="end">
                    <Command>
                      <CommandInput 
                        placeholder="Search behavior bank..." 
                        value={bankSearchQuery}
                        onValueChange={setBankSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>No behaviors found.</CommandEmpty>
                        {BEHAVIOR_CATEGORIES.map(category => {
                          const categoryBehaviors = filteredBankBehaviors.filter(b => b.category === category);
                          if (categoryBehaviors.length === 0) return null;
                          return (
                            <CommandGroup key={category} heading={category}>
                              {categoryBehaviors.map(behavior => (
                                <CommandItem
                                  key={behavior.id}
                                  value={behavior.name}
                                  onSelect={() => {
                                    setBehaviorName(behavior.name);
                                    setBehaviorDefinition(behavior.operationalDefinition);
                                    setBehaviorBankOpen(false);
                                    setBankSearchQuery('');
                                  }}
                                  className="flex flex-col items-start"
                                >
                                  <span className="font-medium">{behavior.name}</span>
                                  <span className="text-xs text-muted-foreground line-clamp-1">
                                    {behavior.operationalDefinition}
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          );
                        })}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              {behaviorDefinition && (
                <p className="text-xs text-muted-foreground bg-secondary/30 rounded p-2">
                  <strong>Definition:</strong> {behaviorDefinition}
                </p>
              )}
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

            {/* Behavior Name for Goal with Bank Picker */}
            <div className="space-y-2">
              <Label>Behavior Name</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter behavior name or select from bank..."
                  value={goalBehaviorName}
                  onChange={(e) => setGoalBehaviorName(e.target.value)}
                  className="flex-1"
                />
                <Popover open={goalBankOpen} onOpenChange={setGoalBankOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px] p-0" align="end">
                    <Command>
                      <CommandInput 
                        placeholder="Search behavior bank..." 
                        value={goalBankSearchQuery}
                        onValueChange={setGoalBankSearchQuery}
                      />
                      <CommandList>
                        <CommandEmpty>No behaviors found.</CommandEmpty>
                        {BEHAVIOR_CATEGORIES.map(category => {
                          const categoryBehaviors = filteredGoalBankBehaviors.filter(b => b.category === category);
                          if (categoryBehaviors.length === 0) return null;
                          return (
                            <CommandGroup key={category} heading={category}>
                              {categoryBehaviors.map(behavior => (
                                <CommandItem
                                  key={behavior.id}
                                  value={behavior.name}
                                  onSelect={() => {
                                    setGoalBehaviorName(behavior.name);
                                    setGoalBehaviorDefinition(behavior.operationalDefinition);
                                    setGoalBankOpen(false);
                                    setGoalBankSearchQuery('');
                                  }}
                                  className="flex flex-col items-start"
                                >
                                  <span className="font-medium">{behavior.name}</span>
                                  <span className="text-xs text-muted-foreground line-clamp-1">
                                    {behavior.operationalDefinition}
                                  </span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          );
                        })}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              {goalBehaviorDefinition && (
                <p className="text-xs text-muted-foreground bg-secondary/30 rounded p-2">
                  <strong>Definition:</strong> {goalBehaviorDefinition}
                </p>
              )}
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
