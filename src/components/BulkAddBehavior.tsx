import { useState, useMemo, useCallback } from 'react';
import { useAssignedStudents } from '@/hooks/useAssignedStudents';
import { Users, Plus, Target, BookOpen, AlertTriangle, Check, X } from 'lucide-react';
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
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
import { DataCollectionMethod, METHOD_LABELS, GoalDirection, GoalMetric, BehaviorDefinition, BEHAVIOR_CATEGORIES, Behavior } from '@/types/behavior';
import { toast } from 'sonner';

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

// Fuzzy matching utilities
function normalizeString(str: string): string {
  return str.toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric
    .replace(/ing$/, '') // Remove -ing suffix
    .replace(/ment$/, '') // Remove -ment suffix
    .replace(/tion$/, '') // Remove -tion suffix
    .replace(/s$/, ''); // Remove trailing s
}

function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeString(str1);
  const norm2 = normalizeString(str2);
  
  // Exact normalized match
  if (norm1 === norm2) return 1.0;
  
  // One contains the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.9;
  
  // Levenshtein-based similarity for short strings
  const maxLen = Math.max(norm1.length, norm2.length);
  if (maxLen === 0) return 1.0;
  
  const distance = levenshteinDistance(norm1, norm2);
  const similarity = 1 - (distance / maxLen);
  
  return similarity;
}

function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  
  return dp[m][n];
}

interface DuplicateWarning {
  studentId: string;
  studentName: string;
  existingBehavior: Behavior;
  similarity: number;
  isExact: boolean;
}

interface StudentGoalConfig {
  studentId: string;
  metric: GoalMetric;
  targetValue?: number;
  baseline?: number;
}

export function BulkAddBehavior() {
  const { students, bulkAddBehavior, addBehaviorGoal, globalBehaviorBank, behaviorDefinitionOverrides, behaviorGoals } = useDataStore();
  const { assignedStudents } = useAssignedStudents();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'behavior' | 'goal'>('behavior');
  
  // Behavior form
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [behaviorName, setBehaviorName] = useState('');
  const [behaviorDefinition, setBehaviorDefinition] = useState('');
  const [selectedMethods, setSelectedMethods] = useState<DataCollectionMethod[]>(['frequency']);
  const [behaviorBankOpen, setBehaviorBankOpen] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState('');
  
  // Duplicate detection state
  const [duplicateWarnings, setDuplicateWarnings] = useState<DuplicateWarning[]>([]);
  const [acknowledgedWarnings, setAcknowledgedWarnings] = useState<Set<string>>(new Set());
  const [showWarningDialog, setShowWarningDialog] = useState(false);
  
  // Goal form
  const [goalStudentIds, setGoalStudentIds] = useState<string[]>([]);
  const [goalBehaviorName, setGoalBehaviorName] = useState('');
  const [goalBehaviorDefinition, setGoalBehaviorDefinition] = useState('');
  const [goalDirection, setGoalDirection] = useState<GoalDirection>('decrease');
  const [defaultGoalMetric, setDefaultGoalMetric] = useState<GoalMetric>('frequency');
  const [goalBankOpen, setGoalBankOpen] = useState(false);
  const [goalBankSearchQuery, setGoalBankSearchQuery] = useState('');
  const [goalMethods, setGoalMethods] = useState<DataCollectionMethod[]>(['frequency']);
  
  // Per-student goal configuration
  const [studentGoalConfigs, setStudentGoalConfigs] = useState<Map<string, StudentGoalConfig>>(new Map());
  const [showPerStudentConfig, setShowPerStudentConfig] = useState(false);

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

  // Combine all behavior sources, filtering out archived bank behaviors
  const allBankBehaviors = useMemo(() => [
    ...effectiveDefaultBehaviors,
    ...globalBehaviorBank.filter(b => !(b as any).isArchived),
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

  // Use only assigned students, sorted alphabetically
  const activeStudents = assignedStudents;

  // Check for duplicate/similar behaviors
  const checkForDuplicates = useCallback((name: string, studentIds: string[]): DuplicateWarning[] => {
    if (!name.trim()) return [];
    
    const warnings: DuplicateWarning[] = [];
    const SIMILARITY_THRESHOLD = 0.7;
    
    studentIds.forEach(studentId => {
      const student = students.find(s => s.id === studentId);
      if (!student) return;
      
      student.behaviors.forEach(existingBehavior => {
        if (existingBehavior.isArchived) return;
        
        const similarity = calculateSimilarity(name, existingBehavior.name);
        
        if (similarity >= SIMILARITY_THRESHOLD) {
          warnings.push({
            studentId,
            studentName: student.name,
            existingBehavior,
            similarity,
            isExact: existingBehavior.name.toLowerCase() === name.toLowerCase(),
          });
        }
      });
    });
    
    return warnings;
  }, [students]);

  // Update warnings when behavior name or selected students change
  const currentWarnings = useMemo(() => {
    const targetName = tab === 'behavior' ? behaviorName : goalBehaviorName;
    const targetStudents = tab === 'behavior' ? selectedStudentIds : goalStudentIds;
    return checkForDuplicates(targetName, targetStudents);
  }, [behaviorName, goalBehaviorName, selectedStudentIds, goalStudentIds, tab, checkForDuplicates]);

  // Check which students already have this behavior (for goal-only addition)
  const studentsWithBehavior = useMemo(() => {
    const result: Map<string, Behavior> = new Map();
    goalStudentIds.forEach(studentId => {
      const student = students.find(s => s.id === studentId);
      if (!student) return;
      
      const existing = student.behaviors.find(b => 
        !b.isArchived && b.name.toLowerCase() === goalBehaviorName.toLowerCase()
      );
      if (existing) {
        result.set(studentId, existing);
      }
    });
    return result;
  }, [goalStudentIds, goalBehaviorName, students]);

  // Check which students already have a goal for this behavior
  const studentsWithGoal = useMemo(() => {
    const result: Set<string> = new Set();
    goalStudentIds.forEach(studentId => {
      const existingBehavior = studentsWithBehavior.get(studentId);
      if (!existingBehavior) return;
      
      const hasGoal = behaviorGoals.some(g => 
        g.studentId === studentId && g.behaviorId === existingBehavior.id
      );
      if (hasGoal) {
        result.add(studentId);
      }
    });
    return result;
  }, [goalStudentIds, studentsWithBehavior, behaviorGoals]);

  const toggleStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const toggleGoalStudent = (id: string) => {
    setGoalStudentIds(prev => {
      const newList = prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id];
      // Initialize config for new student
      if (!prev.includes(id)) {
        setStudentGoalConfigs(configs => {
          const newConfigs = new Map(configs);
          newConfigs.set(id, { studentId: id, metric: defaultGoalMetric });
          return newConfigs;
        });
      }
      return newList;
    });
  };

  const toggleMethod = (method: DataCollectionMethod) => {
    setSelectedMethods(prev =>
      prev.includes(method)
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  };

  const toggleGoalMethod = (method: DataCollectionMethod) => {
    setGoalMethods(prev =>
      prev.includes(method)
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  };

  const updateStudentGoalConfig = (studentId: string, updates: Partial<StudentGoalConfig>) => {
    setStudentGoalConfigs(configs => {
      const newConfigs = new Map(configs);
      const existing = newConfigs.get(studentId) || { studentId, metric: defaultGoalMetric };
      newConfigs.set(studentId, { ...existing, ...updates });
      return newConfigs;
    });
  };

  const applyDefaultMetricToAll = () => {
    setStudentGoalConfigs(configs => {
      const newConfigs = new Map(configs);
      goalStudentIds.forEach(id => {
        const existing = newConfigs.get(id) || { studentId: id, metric: defaultGoalMetric };
        newConfigs.set(id, { ...existing, metric: defaultGoalMetric });
      });
      return newConfigs;
    });
  };

  const handleAddBehavior = () => {
    if (!behaviorName.trim() || selectedStudentIds.length === 0 || selectedMethods.length === 0) return;
    
    // Check for unacknowledged warnings
    const unacknowledged = currentWarnings.filter(w => !acknowledgedWarnings.has(`${w.studentId}-${w.existingBehavior.id}`));
    
    if (unacknowledged.length > 0) {
      setDuplicateWarnings(unacknowledged);
      setShowWarningDialog(true);
      return;
    }
    
    // Filter out students with exact duplicates (unless acknowledged)
    const studentsToAdd = selectedStudentIds.filter(id => {
      const exactDupe = currentWarnings.find(w => w.studentId === id && w.isExact);
      return !exactDupe || acknowledgedWarnings.has(`${id}-${exactDupe.existingBehavior.id}`);
    });
    
    if (studentsToAdd.length > 0) {
      bulkAddBehavior(studentsToAdd, behaviorName.trim(), selectedMethods);
      toast.success(`Added "${behaviorName}" to ${studentsToAdd.length} student${studentsToAdd.length !== 1 ? 's' : ''}`);
    }
    
    const skipped = selectedStudentIds.length - studentsToAdd.length;
    if (skipped > 0) {
      toast.info(`Skipped ${skipped} student${skipped !== 1 ? 's' : ''} who already had this behavior`);
    }
    
    resetForm();
    setOpen(false);
  };

  const handleProceedWithWarnings = () => {
    // Acknowledge all current warnings
    const newAcknowledged = new Set(acknowledgedWarnings);
    duplicateWarnings.forEach(w => {
      newAcknowledged.add(`${w.studentId}-${w.existingBehavior.id}`);
    });
    setAcknowledgedWarnings(newAcknowledged);
    setShowWarningDialog(false);
    
    // Retry the add
    setTimeout(() => {
      if (tab === 'behavior') {
        handleAddBehavior();
      } else {
        handleAddGoal();
      }
    }, 100);
  };

  const handleSkipDuplicates = () => {
    // Mark exact duplicates as skipped
    const newAcknowledged = new Set(acknowledgedWarnings);
    duplicateWarnings.forEach(w => {
      if (w.isExact) {
        // Don't acknowledge exact - they'll be skipped
      } else {
        // Acknowledge similar ones to allow
        newAcknowledged.add(`${w.studentId}-${w.existingBehavior.id}`);
      }
    });
    setAcknowledgedWarnings(newAcknowledged);
    setShowWarningDialog(false);
    
    // Remove exact duplicates from selection
    if (tab === 'behavior') {
      const exactDupeStudents = duplicateWarnings.filter(w => w.isExact).map(w => w.studentId);
      setSelectedStudentIds(prev => prev.filter(id => !exactDupeStudents.includes(id)));
    } else {
      const exactDupeStudents = duplicateWarnings.filter(w => w.isExact).map(w => w.studentId);
      setGoalStudentIds(prev => prev.filter(id => !exactDupeStudents.includes(id)));
    }
    
    // Retry
    setTimeout(() => {
      if (tab === 'behavior') {
        handleAddBehavior();
      } else {
        handleAddGoal();
      }
    }, 100);
  };

  const handleAddGoal = () => {
    if (!goalBehaviorName.trim() || goalStudentIds.length === 0) return;
    
    // Check for unacknowledged warnings (for similar behaviors)
    const unacknowledged = currentWarnings.filter(w => 
      !w.isExact && !acknowledgedWarnings.has(`${w.studentId}-${w.existingBehavior.id}`)
    );
    
    if (unacknowledged.length > 0) {
      setDuplicateWarnings(unacknowledged);
      setShowWarningDialog(true);
      return;
    }
    
    let behaviorsAdded = 0;
    let goalsAdded = 0;
    let goalsSkipped = 0;
    
    goalStudentIds.forEach(studentId => {
      const student = students.find(s => s.id === studentId);
      if (!student) return;
      
      let behaviorId: string;
      
      // Check if student already has this behavior
      const existingBehavior = studentsWithBehavior.get(studentId);
      
      if (existingBehavior) {
        behaviorId = existingBehavior.id;
      } else {
        // Add the behavior
        const newBehaviorId = crypto.randomUUID();
        behaviorId = newBehaviorId;
        
        // Add behavior with specified methods
        const primaryType = goalMethods[0] || 'frequency';
        useDataStore.getState().students.find(s => s.id === studentId);
        useDataStore.setState(state => ({
          students: state.students.map(s => 
            s.id === studentId
              ? {
                  ...s,
                  behaviors: [
                    ...s.behaviors,
                    { 
                      id: newBehaviorId, 
                      name: goalBehaviorName.trim(), 
                      type: primaryType, 
                      methods: goalMethods,
                      operationalDefinition: goalBehaviorDefinition || undefined,
                    },
                  ],
                }
              : s
          ),
        }));
        behaviorsAdded++;
      }
      
      // Check if goal already exists
      if (studentsWithGoal.has(studentId)) {
        goalsSkipped++;
        return;
      }
      
      // Get per-student config or use defaults
      const config = studentGoalConfigs.get(studentId) || { studentId, metric: defaultGoalMetric };
      
      // Add the goal
      addBehaviorGoal({
        studentId,
        behaviorId,
        direction: goalDirection,
        metric: config.metric,
        targetValue: config.targetValue,
        baseline: config.baseline,
        startDate: new Date(),
      });
      goalsAdded++;
    });
    
    // Show summary
    const messages: string[] = [];
    if (behaviorsAdded > 0) {
      messages.push(`Added behavior to ${behaviorsAdded} student${behaviorsAdded !== 1 ? 's' : ''}`);
    }
    if (goalsAdded > 0) {
      messages.push(`Created ${goalsAdded} goal${goalsAdded !== 1 ? 's' : ''}`);
    }
    if (goalsSkipped > 0) {
      messages.push(`Skipped ${goalsSkipped} existing goal${goalsSkipped !== 1 ? 's' : ''}`);
    }
    
    if (messages.length > 0) {
      toast.success(messages.join('. '));
    }
    
    resetForm();
    setOpen(false);
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
    setDefaultGoalMetric('frequency');
    setGoalBankOpen(false);
    setGoalBankSearchQuery('');
    setGoalMethods(['frequency']);
    setStudentGoalConfigs(new Map());
    setShowPerStudentConfig(false);
    setDuplicateWarnings([]);
    setAcknowledgedWarnings(new Set());
  };

  const getStudentName = (id: string) => students.find(s => s.id === id)?.name || 'Unknown';

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Users className="w-4 h-4" />
            Bulk Add
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
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

            <ScrollArea className="flex-1 max-h-[60vh]">
              <TabsContent value="behavior" className="space-y-4 mt-4 px-1">
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

                {/* Duplicate Warnings */}
                {currentWarnings.length > 0 && tab === 'behavior' && (
                  <Alert className="bg-warning/10 border-warning/50">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertTitle className="text-warning-foreground">Similar Behaviors Found</AlertTitle>
                    <AlertDescription className="text-sm">
                      <ul className="mt-2 space-y-1">
                        {currentWarnings.slice(0, 3).map((w, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <Badge variant={w.isExact ? 'destructive' : 'secondary'} className="text-xs">
                              {w.isExact ? 'Exact match' : `${Math.round(w.similarity * 100)}% similar`}
                            </Badge>
                            <span>{w.studentName}: "{w.existingBehavior.name}"</span>
                          </li>
                        ))}
                        {currentWarnings.length > 3 && (
                          <li className="text-muted-foreground">
                            ...and {currentWarnings.length - 3} more
                          </li>
                        )}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Data Collection Methods */}
                <div className="space-y-2">
                  <Label>Data Collection Methods</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['frequency', 'duration', 'interval', 'abc', 'latency'] as DataCollectionMethod[]).map((method) => (
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

              <TabsContent value="goal" className="space-y-4 mt-4 px-1">
                {/* Select Students for Goal */}
                <div className="space-y-2">
                  <Label>Select Students</Label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-border rounded-lg">
                    {activeStudents.map(student => {
                      const hasBehavior = studentsWithBehavior.has(student.id);
                      const hasGoal = studentsWithGoal.has(student.id);
                      
                      return (
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
                          {hasBehavior && (
                            <Badge variant="outline" className="text-xs px-1">
                              has behavior
                            </Badge>
                          )}
                          {hasGoal && (
                            <Badge variant="secondary" className="text-xs px-1">
                              has goal
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setGoalStudentIds(activeStudents.map(s => s.id));
                        const configs = new Map<string, StudentGoalConfig>();
                        activeStudents.forEach(s => {
                          configs.set(s.id, { studentId: s.id, metric: defaultGoalMetric });
                        });
                        setStudentGoalConfigs(configs);
                      }}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setGoalStudentIds([]);
                        setStudentGoalConfigs(new Map());
                      }}
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

                {/* Data Collection Methods for Behavior */}
                <div className="space-y-2">
                  <Label>Data Collection Methods (for new behaviors)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['frequency', 'duration', 'interval', 'abc', 'latency'] as DataCollectionMethod[]).map((method) => (
                      <div key={method} className="flex items-center gap-2">
                        <Checkbox
                          id={`goal-method-${method}`}
                          checked={goalMethods.includes(method)}
                          onCheckedChange={() => toggleGoalMethod(method)}
                        />
                        <Label htmlFor={`goal-method-${method}`} className="cursor-pointer text-sm">
                          {METHOD_LABELS[method]}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Goal Direction */}
                <div className="space-y-2">
                  <Label>Goal Direction</Label>
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

                {/* Default Metric + Per-Student Toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Goal Metric</Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowPerStudentConfig(!showPerStudentConfig)}
                      className="text-xs"
                    >
                      {showPerStudentConfig ? 'Use same for all' : 'Customize per student'}
                    </Button>
                  </div>
                  
                  {!showPerStudentConfig ? (
                    <div className="flex gap-2 items-center">
                      <Select value={defaultGoalMetric} onValueChange={(v: GoalMetric) => {
                        setDefaultGoalMetric(v);
                        applyDefaultMetricToAll();
                      }}>
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="frequency">Frequency</SelectItem>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="duration">Duration</SelectItem>
                          <SelectItem value="rate">Rate</SelectItem>
                          <SelectItem value="latency">Latency</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-xs text-muted-foreground">Applied to all students</span>
                    </div>
                  ) : (
                    <div className="space-y-2 border border-border rounded-lg p-3 max-h-48 overflow-y-auto">
                      {goalStudentIds.map(studentId => {
                        const config = studentGoalConfigs.get(studentId);
                        const student = students.find(s => s.id === studentId);
                        
                        return (
                          <div key={studentId} className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: student?.color }}
                            />
                            <span className="text-sm flex-1 truncate">{student?.name}</span>
                            <Select 
                              value={config?.metric || defaultGoalMetric} 
                              onValueChange={(v: GoalMetric) => updateStudentGoalConfig(studentId, { metric: v })}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="frequency">Frequency</SelectItem>
                                <SelectItem value="percentage">Percentage</SelectItem>
                                <SelectItem value="duration">Duration</SelectItem>
                                <SelectItem value="rate">Rate</SelectItem>
                                <SelectItem value="latency">Latency</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                      {goalStudentIds.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-2">
                          Select students to configure their metrics
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Summary */}
                {goalStudentIds.length > 0 && goalBehaviorName && (
                  <div className="text-xs bg-secondary/30 rounded p-3 space-y-1">
                    <p><strong>Summary:</strong></p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>
                        {goalStudentIds.length - studentsWithBehavior.size} student{goalStudentIds.length - studentsWithBehavior.size !== 1 ? 's' : ''} will get the behavior added
                      </li>
                      <li>
                        {studentsWithBehavior.size} student{studentsWithBehavior.size !== 1 ? 's' : ''} already have the behavior
                      </li>
                      <li>
                        {goalStudentIds.length - studentsWithGoal.size} goal{goalStudentIds.length - studentsWithGoal.size !== 1 ? 's' : ''} will be created
                      </li>
                      {studentsWithGoal.size > 0 && (
                        <li className="text-muted-foreground">
                          {studentsWithGoal.size} student{studentsWithGoal.size !== 1 ? 's' : ''} already have a goal (will be skipped)
                        </li>
                      )}
                    </ul>
                  </div>
                )}

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
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Duplicate Warning Dialog */}
      <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-warning-foreground">
              <AlertTriangle className="w-5 h-5" />
              Similar Behaviors Detected
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The following students already have similar behaviors:
            </p>
            
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {duplicateWarnings.map((w, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-secondary/30 rounded">
                    <div>
                      <p className="font-medium text-sm">{w.studentName}</p>
                      <p className="text-xs text-muted-foreground">
                        Existing: "{w.existingBehavior.name}"
                      </p>
                    </div>
                    <Badge variant={w.isExact ? 'destructive' : 'secondary'}>
                      {w.isExact ? 'Exact' : `${Math.round(w.similarity * 100)}%`}
                    </Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setShowWarningDialog(false)} className="gap-2">
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleSkipDuplicates} className="gap-2">
              Skip Duplicates
            </Button>
            <Button onClick={handleProceedWithWarnings} className="gap-2">
              <Check className="w-4 h-4" />
              Add Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
