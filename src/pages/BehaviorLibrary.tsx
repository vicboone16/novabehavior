import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Search, Copy, ArrowLeft, Merge, Users, Edit2, Building2, RotateCcw, Activity, Lightbulb, UserPlus, Archive, Trash2, ArchiveRestore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { BehaviorDefinition, BEHAVIOR_CATEGORIES } from '@/types/behavior';
import { useDataStore } from '@/store/dataStore';
import { EditBehaviorDialog } from '@/components/behavior-library/EditBehaviorDialog';
import { PromoteToStandardDialog } from '@/components/behavior-library/PromoteToStandardDialog';
import { AdvancedMergeDialog } from '@/components/behavior-library/AdvancedMergeDialog';
import { BxInterventionLibrary } from '@/components/behavior-interventions';
import { AddBehaviorToStudentDialog } from '@/components/behavior-library/AddBehaviorToStudentDialog';
import { TagManager } from '@/components/behavior-library/TagManager';
import { InlineNameEditor } from '@/components/behavior-library/InlineNameEditor';
import { AISearchBar } from '@/components/behavior-library/AISearchBar';
import { useBxTags } from '@/hooks/useBxTags';
import { useAuth } from '@/contexts/AuthContext';
import {
  useBehaviorBankSync,
  syncCustomBehaviorToDB,
  removeCustomBehaviorFromDB,
  syncOverrideToDB,
  removeOverrideFromDB,
  archiveBehaviorToDB,
  unarchiveBehaviorFromDB,
} from '@/hooks/useBehaviorBankSync';
import { supabase } from '@/integrations/supabase/client';

interface BehaviorLibraryProps {
  embedded?: boolean; // When true, hides the page header (used inside ClinicalLibrary)
}

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
    id: 'sexually-explicit',
    name: 'Sexually Explicit Verbalizations',
    operationalDefinition: 'Any verbalization that contains sexual content, including inappropriate comments about bodies, sexual acts, or explicit language directed at self or others.',
    category: 'Other',
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

export default function BehaviorLibrary({ embedded = false }: BehaviorLibraryProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const students = useDataStore((state) => state.students);
  const mergeBehaviors = useDataStore((state) => state.mergeBehaviors);
  const globalBehaviorBank = useDataStore((state) => state.globalBehaviorBank);
  const behaviorDefinitionOverrides = useDataStore((state) => state.behaviorDefinitionOverrides);
  const archivedBuiltInBehaviors = useDataStore((state) => state.archivedBuiltInBehaviors);
  const addToBehaviorBank = useDataStore((state) => state.addToBehaviorBank);
  const removeBankBehavior = useDataStore((state) => state.removeBankBehavior);
  const updateBankBehaviorDefinition = useDataStore((state) => state.updateBankBehaviorDefinition);
  const resetBehaviorDefinition = useDataStore((state) => state.resetBehaviorDefinition);
  const advancedMergeBehaviors = useDataStore((state) => state.advancedMergeBehaviors);
  const archiveBuiltInBehaviorStore = useDataStore((state) => state.archiveBuiltInBehavior);
  const unarchiveBuiltInBehaviorStore = useDataStore((state) => state.unarchiveBuiltInBehavior);
  
  // Sync behavior bank with DB on mount
  useBehaviorBankSync();

  // Tags system
  const {
    tags: allBxTags, fetchTags, getTagsForItem,
    addNewTagToItem, addTagToItem, removeTagFromItem,
    searchResults, isSearching, aiSearch,
  } = useBxTags();

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const [activeLibraryTab, setActiveLibraryTab] = useState<'behaviors' | 'interventions'>('behaviors');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddBehavior, setShowAddBehavior] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [showAdvancedMergeDialog, setShowAdvancedMergeDialog] = useState(false);
  const [mergeSource, setMergeSource] = useState<{ name: string; studentNames: string[] } | null>(null);
  const [mergeTarget, setMergeTarget] = useState<string>('');
  
  // Edit dialog state
  const [editingBehavior, setEditingBehavior] = useState<BehaviorDefinition | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // Promote dialog state
  const [promotingBehavior, setPromotingBehavior] = useState<(BehaviorDefinition & { studentNames?: string[] }) | null>(null);
  const [showPromoteDialog, setShowPromoteDialog] = useState(false);
  
  // Form state
  const [newName, setNewName] = useState('');
  const [newDefinition, setNewDefinition] = useState('');
  const [newCategory, setNewCategory] = useState('Other');
  const [newLevel, setNewLevel] = useState<'organization' | 'built-in'>('organization');

  // Add to student dialog state
  const [behaviorToAdd, setBehaviorToAdd] = useState<BehaviorDefinition | null>(null);
  const [showAddToStudentDialog, setShowAddToStudentDialog] = useState(false);
  const effectiveDefaultBehaviors = useMemo(() => {
    return DEFAULT_BEHAVIORS
      .filter(behavior => !archivedBuiltInBehaviors.includes(behavior.id))
      .map(behavior => {
        const override = behaviorDefinitionOverrides[behavior.id];
        if (override) {
          return {
            ...behavior,
            operationalDefinition: override.operationalDefinition || behavior.operationalDefinition,
            category: override.category || behavior.category,
            isEdited: true,
          };
        }
        return { ...behavior, isEdited: false };
      });
  }, [behaviorDefinitionOverrides, archivedBuiltInBehaviors]);

  // Get original definition for a built-in behavior
  const getOriginalDefinition = (behaviorId: string) => {
    const original = DEFAULT_BEHAVIORS.find(b => b.id === behaviorId);
    return original?.operationalDefinition;
  };

  // Get all custom behaviors from students - deduplicate by NAME
  const customBehaviorsMap = new Map<string, BehaviorDefinition & { studentNames: string[] }>();
  
  students.forEach(student => {
    student.behaviors.forEach(behavior => {
      const normalizedName = behavior.name.toLowerCase().trim();
      // Check if this behavior is already in the default list or global bank
      const isDefault = effectiveDefaultBehaviors.find(b => 
        b.id === behavior.id || b.name.toLowerCase().trim() === normalizedName
      );
      const isInGlobalBank = globalBehaviorBank.find(b =>
        b.id === behavior.id || b.name.toLowerCase().trim() === normalizedName
      );
      
      if (!isDefault && !isInGlobalBank) {
        if (customBehaviorsMap.has(normalizedName)) {
          const existing = customBehaviorsMap.get(normalizedName)!;
          if (!existing.studentNames.includes(student.name)) {
            existing.studentNames.push(student.name);
          }
        } else {
          customBehaviorsMap.set(normalizedName, {
            id: behavior.id,
            name: behavior.name,
            operationalDefinition: behavior.operationalDefinition || '',
            category: behavior.category || 'Other',
            isGlobal: false,
            studentNames: [student.name],
          });
        }
      }
    });
  });
  
  const customBehaviors = Array.from(customBehaviorsMap.values());

  // Combine all sources: defaults + global bank (built-in + organization) + custom
  const allBehaviors = [
    ...effectiveDefaultBehaviors.map(b => ({ ...b, source: 'built-in' as const })),
    ...globalBehaviorBank.map(b => ({
      ...b,
      source: ((b as any).isBuiltIn ? 'built-in' : 'organization') as 'built-in' | 'organization',
      studentNames: [] as string[],
    })),
    ...customBehaviors.map(b => ({ ...b, source: 'custom' as const })),
  ];

  const filteredBehaviors = allBehaviors.filter(behavior => {
    const matchesSearch =
      behavior.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      behavior.operationalDefinition.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || behavior.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedBehaviors = filteredBehaviors.reduce((acc, behavior) => {
    if (!acc[behavior.category]) {
      acc[behavior.category] = [];
    }
    acc[behavior.category].push(behavior);
    return acc;
  }, {} as Record<string, typeof filteredBehaviors>);

  const handleCopyDefinition = (behavior: BehaviorDefinition) => {
    navigator.clipboard.writeText(behavior.operationalDefinition);
    toast({ title: 'Definition copied to clipboard' });
  };

  const resetForm = () => {
    setNewName('');
    setNewDefinition('');
    setNewCategory('Other');
    setNewLevel('organization');
    setShowAddBehavior(false);
  };

  const handleAddBehavior = () => {
    if (newName.trim() && newDefinition.trim()) {
      const tempId = crypto.randomUUID();
      const newBehavior = {
        id: tempId,
        name: newName.trim(),
        operationalDefinition: newDefinition.trim(),
        category: newCategory,
        isGlobal: true,
        promotedAt: new Date(),
      };
      if (newLevel === 'built-in') {
        addToBehaviorBank({ ...newBehavior, isBuiltIn: true } as any);
      } else {
        addToBehaviorBank(newBehavior);
      }
      // Sync to DB after store updates (store generates actual id via uuid, so we sync after)
      setTimeout(() => {
        const latest = useDataStore.getState().globalBehaviorBank;
        const added = latest.find(b => b.name === newBehavior.name && b.operationalDefinition === newBehavior.operationalDefinition);
        if (added && user?.id) syncCustomBehaviorToDB(added, user.id);
      }, 50);
      toast({ title: `Behavior added as ${newLevel === 'built-in' ? 'built-in' : 'organization'} behavior` });
      resetForm();
    }
  };

  const handleAddToStudent = (behavior: BehaviorDefinition) => {
    setBehaviorToAdd(behavior);
    setShowAddToStudentDialog(true);
  };

  // Find mergeable behaviors (custom behaviors that match a bank behavior name)
  const mergeableBehaviors = useMemo(() => {
    const result: { custom: { name: string; studentNames: string[] }; bankBehavior: BehaviorDefinition }[] = [];
    
    customBehaviors.forEach(custom => {
      const matchingBank = effectiveDefaultBehaviors.find(
        bank => bank.name.toLowerCase().trim() === custom.name.toLowerCase().trim()
      );
      if (matchingBank) {
        result.push({ custom, bankBehavior: matchingBank });
      }
    });
    
    return result;
  }, [customBehaviors, effectiveDefaultBehaviors]);

  const handleMergeBehavior = () => {
    if (!mergeSource || !mergeTarget) return;
    
    mergeBehaviors(mergeSource.name, mergeTarget);
    toast({ 
      title: 'Behaviors merged', 
      description: `Linked ${mergeSource.studentNames.length} student behaviors to the library definition.` 
    });
    setShowMergeDialog(false);
    setMergeSource(null);
    setMergeTarget('');
  };

  const handleEditBehavior = (behavior: BehaviorDefinition) => {
    setEditingBehavior(behavior);
    setShowEditDialog(true);
  };

  const handleSaveEdit = (behaviorId: string, definition: string, category?: string) => {
    updateBankBehaviorDefinition(behaviorId, definition, category);
    // Determine behavior source: global bank (org/promoted), built-in override, or custom (student-only)
    const isGlobalBank = useDataStore.getState().globalBehaviorBank.some(b => b.id === behaviorId);
    const isBuiltIn = DEFAULT_BEHAVIORS.some(b => b.id === behaviorId);
    if (isGlobalBank) {
      // Organization/promoted custom behavior — sync updated record
      const updated = useDataStore.getState().globalBehaviorBank.find(b => b.id === behaviorId);
      if (updated && user?.id) syncCustomBehaviorToDB(updated, user.id);
    } else if (isBuiltIn) {
      // Built-in behavior — store as override
      if (user?.id) syncOverrideToDB(behaviorId, definition, category, user.id);
    } else {
      // Custom (student-only) behavior — promote it to global bank so it persists,
      // then sync to DB so the edit is saved.
      const editingB = editingBehavior;
      if (editingB) {
        const updatedBehavior = { ...editingB, operationalDefinition: definition, ...(category && { category }) };
        addToBehaviorBank({
          name: updatedBehavior.name,
          operationalDefinition: definition,
          category: category || updatedBehavior.category,
          isGlobal: true,
        });
        setTimeout(() => {
          const latest = useDataStore.getState().globalBehaviorBank;
          const added = latest.find(b => b.name === updatedBehavior.name);
          if (added && user?.id) syncCustomBehaviorToDB(added, user.id);
        }, 50);
      }
    }
    toast({ title: 'Definition updated' });
    setShowEditDialog(false);
    setEditingBehavior(null);
  };

  const handleResetDefinition = (behaviorId: string) => {
    resetBehaviorDefinition(behaviorId);
    removeOverrideFromDB(behaviorId);
    toast({ title: 'Definition reset to default' });
  };

  const handleArchiveBehavior = (behavior: typeof allBehaviors[0]) => {
    if (behavior.source === 'built-in') {
      archiveBuiltInBehaviorStore(behavior.id);
      if (user?.id) archiveBehaviorToDB(behavior.id, user.id);
      toast({ title: 'Behavior archived', description: `"${behavior.name}" is hidden from the library. You can restore it later.` });
    } else if (behavior.source === 'organization') {
      removeBankBehavior(behavior.id);
      removeCustomBehaviorFromDB(behavior.id);
      toast({ title: 'Behavior removed', description: `"${behavior.name}" has been removed from the organization library.` });
    } else {
      // custom (student-only) — no action needed since they live on student profiles
      toast({ title: 'Custom behaviors are managed per-student' });
    }
  };

  const handlePromoteBehavior = (behavior: BehaviorDefinition & { studentNames?: string[] }) => {
    setPromotingBehavior(behavior);
    setShowPromoteDialog(true);
  };

  const handleConfirmPromote = (behavior: BehaviorDefinition) => {
    addToBehaviorBank({
      name: behavior.name,
      operationalDefinition: behavior.operationalDefinition,
      category: behavior.category,
      isGlobal: true,
    });
    setTimeout(() => {
      const latest = useDataStore.getState().globalBehaviorBank;
      const added = latest.find(b => b.name === behavior.name);
      if (added && user?.id) syncCustomBehaviorToDB(added, user.id);
    }, 50);
    toast({ 
      title: 'Behavior promoted', 
      description: `"${behavior.name}" is now a standard organization behavior.` 
    });
    setShowPromoteDialog(false);
    setPromotingBehavior(null);
  };

  const handleAdvancedMerge = async (sourceId: string, targetId: string, useSourceName: boolean) => {
    // 1. Update DB-side session_data and behavior_session_data to remap source -> target
    try {
      // Remap session_data rows
      await supabase
        .from('session_data')
        .update({ behavior_id: targetId } as any)
        .eq('behavior_id', sourceId);

      // Remap behavior_session_data rows
      await supabase
        .from('behavior_session_data')
        .update({ behavior_id: targetId } as any)
        .eq('behavior_id', sourceId);

      // Update student_behavior_map entries
      await supabase
        .from('student_behavior_map')
        .update({ behavior_entry_id: targetId } as any)
        .eq('behavior_entry_id', sourceId);

      console.log(`[Merge] Remapped DB records from ${sourceId} -> ${targetId}`);
    } catch (dbErr) {
      console.error('[Merge] DB remap error (continuing with local merge):', dbErr);
    }

    // 2. Archive source from behavior bank (don't delete — preserve for historical resolution)
    try {
      await supabase
        .from('behavior_bank_entries')
        .update({ is_archived: true } as any)
        .eq('behavior_id', sourceId);
    } catch {
      // Fallback: remove if archive column doesn't exist
      removeCustomBehaviorFromDB(sourceId);
    }
    
    // 3. Update local store — remaps student behavior IDs and data entries
    advancedMergeBehaviors({ sourceBehaviorId: sourceId, targetBehaviorId: targetId, useSourceName });
    
    toast({ 
      title: 'Behaviors merged', 
      description: 'All data has been preserved and behaviors combined.' 
    });
  };

  // Prepare behaviors for advanced merge dialog
  const behaviorsForMerge = useMemo(() => {
    const result: Array<{
      id: string;
      name: string;
      operationalDefinition: string;
      category: string;
      isGlobal: boolean;
      studentNames: string[];
      studentCount: number;
    }> = [];

    // Add all behaviors with student counts
    allBehaviors.forEach(b => {
      const studentNames = (b as any).studentNames || [];
      result.push({
        id: b.id,
        name: b.name,
        operationalDefinition: b.operationalDefinition,
        category: b.category,
        isGlobal: b.isGlobal || false,
        studentNames,
        studentCount: studentNames.length,
      });
    });

    return result;
  }, [allBehaviors]);

  return (
    <div className={embedded ? '' : 'min-h-screen bg-background'}>
      {/* Header - only show when not embedded */}
      {!embedded && (
        <header className="bg-card border-b border-border sticky top-0 z-20">
          <div className="container py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Behavior Library</h1>
                  <p className="text-sm text-muted-foreground">
                    Operational definitions & intervention planning
                  </p>
                </div>
              </div>
              {activeLibraryTab === 'behaviors' && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowAdvancedMergeDialog(true)}>
                    <Merge className="w-4 h-4 mr-2" />
                    Merge Behaviors
                  </Button>
                  <Button onClick={() => setShowAddBehavior(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Behavior
                  </Button>
                </div>
              )}
            </div>
            
            {/* Library Tabs */}
            <Tabs value={activeLibraryTab} onValueChange={(v) => setActiveLibraryTab(v as 'behaviors' | 'interventions')} className="mt-4">
              <TabsList>
                <TabsTrigger value="behaviors" className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Behaviors to Track
                </TabsTrigger>
                <TabsTrigger value="interventions" className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  Behavior Interventions
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </header>
      )}

      {/* Embedded action bar — no tabs, just behaviors */}
      {embedded && (
        <div className="flex items-center justify-end mb-4 gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowAdvancedMergeDialog(true)}>
            <Merge className="w-4 h-4 mr-2" />
            Merge
          </Button>
          <Button size="sm" onClick={() => setShowAddBehavior(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Behavior
          </Button>
        </div>
      )}

      {/* Main Content */}
      <main className={embedded ? '' : 'container py-6'}>
        {(embedded || activeLibraryTab === 'behaviors') ? (
        <>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Sidebar with search and filters */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Search & Filter</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <AISearchBar
                    onSearch={aiSearch}
                    results={searchResults}
                    isSearching={isSearching}
                    placeholder="AI search: describe a behavior, setting, or strategy..."
                    onResultClick={(r) => {
                      setSearchQuery(r.name);
                    }}
                  />
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Filter behaviors..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {BEHAVIOR_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Built-in behaviors:</span>
                    <span className="font-medium">{DEFAULT_BEHAVIORS.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Organization behaviors:</span>
                    <span className="font-medium">{globalBehaviorBank.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Custom behaviors:</span>
                    <span className="font-medium">{customBehaviors.length}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-medium">{allBehaviors.length}</span>
                  </div>
                  {archivedBuiltInBehaviors.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Archived:</span>
                      <span className="font-medium">{archivedBuiltInBehaviors.length}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Merge duplicates card */}
            {mergeableBehaviors.length > 0 && (
              <Card className="border-primary/50 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Merge className="w-4 h-4 text-primary" />
                    Quick Merge
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {mergeableBehaviors.length} custom behavior{mergeableBehaviors.length > 1 ? 's' : ''} match library definitions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {mergeableBehaviors.map(({ custom, bankBehavior }) => (
                    <div key={custom.name} className="flex items-center justify-between p-2 bg-background rounded border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{custom.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {custom.studentNames.length} student{custom.studentNames.length > 1 ? 's' : ''}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="gap-1"
                        onClick={() => {
                          setMergeSource(custom);
                          setMergeTarget(bankBehavior.id);
                          setShowMergeDialog(true);
                        }}
                      >
                        <Merge className="w-3 h-3" />
                        Merge
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Behavior List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Behavior Definitions</CardTitle>
                <CardDescription>
                  Edit definitions, promote custom behaviors, or merge duplicates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-6">
                    {Object.entries(groupedBehaviors).map(([category, behaviors]) => (
                      <div key={category}>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                          {category}
                          <Badge variant="outline" className="text-xs">{behaviors.length}</Badge>
                        </h3>
                        <div className="space-y-3">
                          {behaviors.map((behavior) => (
                            <Card key={behavior.id} className="bg-secondary/20">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 mr-4">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <InlineNameEditor
                                        value={behavior.name}
                                        onSave={async (newName) => {
                                          updateBankBehaviorDefinition(behavior.id, behavior.operationalDefinition, behavior.category);
                                          const isGlobalBank = useDataStore.getState().globalBehaviorBank.some(b => b.id === behavior.id);
                                          if (isGlobalBank && user?.id) {
                                            const updated = useDataStore.getState().globalBehaviorBank.find(b => b.id === behavior.id);
                                            if (updated) syncCustomBehaviorToDB({ ...updated, name: newName }, user.id);
                                          }
                                          toast({ title: 'Name updated' });
                                        }}
                                      />
                                      {behavior.source === 'built-in' && (
                                        <Badge variant="secondary" className="text-xs">Built-in</Badge>
                                      )}
                                      {behavior.source === 'organization' && (
                                        <Badge className="text-xs bg-primary/20 text-primary hover:bg-primary/30">
                                          <Building2 className="w-3 h-3 mr-1" />
                                          Organization
                                        </Badge>
                                      )}
                                      {behavior.source === 'custom' && (
                                        <Badge variant="outline" className="text-xs">Custom</Badge>
                                      )}
                                      {(behavior as any).isEdited && (
                                        <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                                          <Edit2 className="w-3 h-3 mr-1" />
                                          Edited
                                        </Badge>
                                      )}
                                      {(behavior as any).studentNames && (behavior as any).studentNames.length > 0 && (
                                        <Badge variant="secondary" className="text-xs">
                                          <Users className="w-3 h-3 mr-1" />
                                          {(behavior as any).studentNames.length} student{(behavior as any).studentNames.length > 1 ? 's' : ''}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-2">
                                      {behavior.operationalDefinition}
                                    </p>
                                    <TagManager
                                      itemId={behavior.id}
                                      itemType="behavior"
                                      currentTags={getTagsForItem(behavior.id, 'behavior')}
                                      allTags={allBxTags}
                                      onAddNew={addNewTagToItem}
                                      onAddExisting={addTagToItem}
                                      onRemove={removeTagFromItem}
                                      compact
                                    />
                                  </div>
                                  <div className="flex gap-1 flex-shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleAddToStudent(behavior)}
                                      title="Add to student"
                                    >
                                      <UserPlus className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleCopyDefinition(behavior)}
                                      title="Copy definition"
                                    >
                                      <Copy className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleEditBehavior(behavior)}
                                      title="Edit definition"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                     {behavior.source === 'custom' && (
                                       <Button
                                         variant="ghost"
                                         size="icon"
                                         className="h-8 w-8 text-primary hover:text-primary"
                                         onClick={() => handlePromoteBehavior(behavior as BehaviorDefinition & { studentNames?: string[] })}
                                         title="Make standard"
                                       >
                                         <Building2 className="w-4 h-4" />
                                       </Button>
                                     )}
                                     {(behavior.source === 'built-in' || behavior.source === 'organization') && (
                                       <Button
                                         variant="ghost"
                                         size="icon"
                                         className="h-8 w-8 text-destructive hover:text-destructive"
                                         onClick={() => handleArchiveBehavior(behavior)}
                                         title={behavior.source === 'built-in' ? 'Archive (hide from library)' : 'Remove from organization library'}
                                       >
                                         {behavior.source === 'built-in' ? <Archive className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                                       </Button>
                                     )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ))}

                    {filteredBehaviors.length === 0 && (
                      <div className="text-center py-12">
                        <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No behaviors found matching your search.</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Archived Behaviors — moved to bottom */}
        {archivedBuiltInBehaviors.length > 0 && (
          <Card className="border-muted mt-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Archive className="w-4 h-4 text-muted-foreground" />
                Archived Behaviors
              </CardTitle>
              <CardDescription className="text-xs">
                {archivedBuiltInBehaviors.length} hidden behavior{archivedBuiltInBehaviors.length > 1 ? 's' : ''}. Click restore to reinstate.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {archivedBuiltInBehaviors.map(behaviorId => {
                  const original = DEFAULT_BEHAVIORS.find(b => b.id === behaviorId);
                  if (!original) return null;
                  return (
                    <div key={behaviorId} className="flex items-center justify-between p-2 bg-muted/50 rounded border">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{original.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{original.category}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => {
                          unarchiveBuiltInBehaviorStore(behaviorId);
                          unarchiveBehaviorFromDB(behaviorId);
                          toast({ title: 'Behavior restored', description: `"${original.name}" is now visible in the library again.` });
                        }}
                      >
                        <ArchiveRestore className="w-3 h-3" />
                        Restore
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
        </>
        ) : (
          <div className="h-[calc(100vh-200px)]">
            <BxInterventionLibrary />
          </div>
        )}
      </main>

      {/* Add Behavior Dialog */}
      <Dialog open={showAddBehavior} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Behavior to Library</DialogTitle>
            <DialogDescription>
              Add a new behavior definition to the library. Choose its level to control visibility.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Behavior Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Physical Aggression"
              />
            </div>

            <div className="space-y-2">
              <Label>Level</Label>
              <Select value={newLevel} onValueChange={(v) => setNewLevel(v as 'organization' | 'built-in')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="built-in">Built-in (standard default)</SelectItem>
                  <SelectItem value="organization">Organization</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {newLevel === 'built-in'
                  ? 'Built-in behaviors appear as standard defaults for all users.'
                  : 'Organization behaviors are available to add to any student in your org.'}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BEHAVIOR_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Operational Definition</Label>
              <Textarea
                value={newDefinition}
                onChange={(e) => setNewDefinition(e.target.value)}
                placeholder="Provide a clear, observable, and measurable definition of the behavior..."
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Include what the behavior looks like, how to measure it, and examples/non-examples.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleAddBehavior} disabled={!newName.trim() || !newDefinition.trim()}>
              Add to Library
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Merge Confirmation Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Merge className="w-5 h-5" />
              Merge Behaviors
            </DialogTitle>
            <DialogDescription>
              This will link all "{mergeSource?.name}" behaviors to the library definition.
            </DialogDescription>
          </DialogHeader>
          
          {mergeSource && (
            <div className="space-y-4">
              <div className="p-3 bg-secondary/50 rounded-lg">
                <p className="text-sm font-medium mb-1">Students affected:</p>
                <p className="text-sm text-muted-foreground">
                  {mergeSource.studentNames.join(', ')}
                </p>
              </div>
              
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm font-medium text-primary mb-1">What happens:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Behaviors are linked to the library definition</li>
                  <li>• <strong>Custom definitions on individual students are preserved</strong></li>
                  <li>• All collected data remains intact</li>
                  <li>• Duplicate entries in the library are removed</li>
                </ul>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMergeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleMergeBehavior}>
              <Merge className="w-4 h-4 mr-2" />
              Merge Behaviors
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Behavior Dialog */}
      <EditBehaviorDialog
        behavior={editingBehavior}
        isOpen={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setEditingBehavior(null);
        }}
        onSave={handleSaveEdit}
        onReset={handleResetDefinition}
        isBuiltIn={editingBehavior ? DEFAULT_BEHAVIORS.some(b => b.id === editingBehavior.id) : false}
        isEdited={editingBehavior ? !!behaviorDefinitionOverrides[editingBehavior.id] : false}
        originalDefinition={editingBehavior ? getOriginalDefinition(editingBehavior.id) : undefined}
      />

      {/* Promote to Standard Dialog */}
      <PromoteToStandardDialog
        behavior={promotingBehavior}
        isOpen={showPromoteDialog}
        onClose={() => {
          setShowPromoteDialog(false);
          setPromotingBehavior(null);
        }}
        onConfirm={handleConfirmPromote}
      />

      {/* Advanced Merge Dialog */}
      <AdvancedMergeDialog
        isOpen={showAdvancedMergeDialog}
        onClose={() => setShowAdvancedMergeDialog(false)}
        allBehaviors={behaviorsForMerge}
        onMerge={handleAdvancedMerge}
      />

      {/* Add Behavior to Student Dialog */}
      <AddBehaviorToStudentDialog
        behavior={behaviorToAdd}
        isOpen={showAddToStudentDialog}
        onClose={() => {
          setShowAddToStudentDialog(false);
          setBehaviorToAdd(null);
        }}
      />
    </div>
  );
}
