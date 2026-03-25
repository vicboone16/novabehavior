import { useState, useMemo } from 'react';
import { BookOpen, Plus, Search, Trash2, Copy, Building2, Edit2, Archive, ArchiveRestore } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useBehaviorBankSync,
  syncCustomBehaviorToDB,
  removeCustomBehaviorFromDB,
  archiveBehaviorToDB,
  unarchiveBehaviorFromDB,
} from '@/hooks/useBehaviorBankSync';
import { useBehaviorOperations } from '@/hooks/useCanonicalBehaviors';
import { CanonicalStatusBadge } from '@/components/programming/CanonicalStatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BehaviorDefinition, BEHAVIOR_CATEGORIES } from '@/types/behavior';
import { useDataStore } from '@/store/dataStore';

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

interface BehaviorBankProps {
  onSelectBehavior: (behavior: BehaviorDefinition) => void;
  customBehaviors?: BehaviorDefinition[];
  onAddCustomBehavior?: (behavior: Omit<BehaviorDefinition, 'id'>) => void;
  onDeleteCustomBehavior?: (id: string) => void;
}

export function BehaviorBank({ 
  onSelectBehavior, 
  customBehaviors = [], 
  onAddCustomBehavior,
  onDeleteCustomBehavior,
}: BehaviorBankProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddBehavior, setShowAddBehavior] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDefinition, setNewDefinition] = useState('');
  const [newCategory, setNewCategory] = useState('Other');

  // Sync behavior bank with DB on mount
  useBehaviorBankSync();

  // Canonical operations
  const { archiveBehavior: canonicalArchive } = useBehaviorOperations();

  // Get global behavior bank and overrides from store
  const globalBehaviorBank = useDataStore((state) => state.globalBehaviorBank);
  const addToBehaviorBank = useDataStore((state) => state.addToBehaviorBank);
  const removeBankBehavior = useDataStore((state) => state.removeBankBehavior);
  const behaviorDefinitionOverrides = useDataStore((state) => state.behaviorDefinitionOverrides);
  const archivedBuiltInBehaviors = useDataStore((state) => state.archivedBuiltInBehaviors);
  const archiveBuiltInBehaviorStore = useDataStore((state) => state.archiveBuiltInBehavior);
  const unarchiveBuiltInBehaviorStore = useDataStore((state) => state.unarchiveBuiltInBehavior);

  // Apply overrides to default behaviors
  const effectiveDefaultBehaviors = useMemo(() => {
    return DEFAULT_BEHAVIORS.map(behavior => {
      const override = behaviorDefinitionOverrides[behavior.id];
      if (override) {
        return {
          ...behavior,
          operationalDefinition: override.operationalDefinition || behavior.operationalDefinition,
          category: override.category || behavior.category,
          isEdited: true,
          source: 'built-in' as const,
          isArchived: archivedBuiltInBehaviors.includes(behavior.id),
        };
      }
      return { ...behavior, isEdited: false, source: 'built-in' as const, isArchived: archivedBuiltInBehaviors.includes(behavior.id) };
    });
  }, [behaviorDefinitionOverrides, archivedBuiltInBehaviors]);

  // Combine all behavior sources
  const allBehaviors = useMemo(() => [
    ...effectiveDefaultBehaviors,
    ...globalBehaviorBank.map(b => ({ ...b, source: 'organization' as const, isEdited: false, isArchived: false })),
    ...customBehaviors.map(b => ({ ...b, source: 'custom' as const, isEdited: false, isArchived: false })),
  ], [effectiveDefaultBehaviors, globalBehaviorBank, customBehaviors]);

  const filteredBehaviors = allBehaviors.filter(behavior => {
    const matchesSearch = 
      behavior.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      behavior.operationalDefinition.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || behavior.category === selectedCategory;
    const matchesArchived = showArchived ? behavior.isArchived : !behavior.isArchived;
    return matchesSearch && matchesCategory && matchesArchived;
  });

  const groupedBehaviors = filteredBehaviors.reduce((acc, behavior) => {
    if (!acc[behavior.category]) {
      acc[behavior.category] = [];
    }
    acc[behavior.category].push(behavior);
    return acc;
  }, {} as Record<string, typeof filteredBehaviors>);

  const handleAddBehavior = () => {
    if (newName.trim() && newDefinition.trim() && onAddCustomBehavior) {
      onAddCustomBehavior({
        name: newName.trim(),
        operationalDefinition: newDefinition.trim(),
        category: newCategory,
        isGlobal: false,
      });
      resetForm();
    }
  };

  const resetForm = () => {
    setNewName('');
    setNewDefinition('');
    setNewCategory('Other');
    setShowAddBehavior(false);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Behavior Bank
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={showArchived ? 'secondary' : 'outline'}
                onClick={() => setShowArchived(!showArchived)}
              >
                <Archive className="w-4 h-4 mr-1" />
                {showArchived ? 'Active' : 'Archived'}
                {!showArchived && archivedBuiltInBehaviors.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs px-1">{archivedBuiltInBehaviors.length}</Badge>
                )}
              </Button>
              {onAddCustomBehavior && (
                <Button size="sm" onClick={() => setShowAddBehavior(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Custom
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search behaviors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {BEHAVIOR_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Behavior List */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {Object.entries(groupedBehaviors).map(([category, behaviors]) => (
                <div key={category}>
                  <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                    {category}
                  </h4>
                  <div className="space-y-2">
                    {behaviors.map((behavior) => (
                      <div
                        key={behavior.id}
                        className="p-3 bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 mr-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="font-medium text-sm">{behavior.name}</h5>
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
                              {behavior.isEdited && (
                                <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                                  <Edit2 className="w-3 h-3 mr-1" />
                                  Edited
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {behavior.operationalDefinition}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            {!behavior.isArchived && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8"
                                onClick={() => onSelectBehavior(behavior)}
                              >
                                <Copy className="w-3 h-3 mr-1" />
                                Use
                              </Button>
                            )}
                            {behavior.source === 'built-in' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                title={behavior.isArchived ? 'Restore behavior' : 'Archive behavior'}
                                onClick={() => {
                                  if (behavior.isArchived) {
                                    unarchiveBuiltInBehaviorStore(behavior.id);
                                    unarchiveBehaviorFromDB(behavior.id);
                                  } else {
                                    archiveBuiltInBehaviorStore(behavior.id);
                                    if (user?.id) archiveBehaviorToDB(behavior.id, user.id);
                                  }
                                }}
                              >
                                {behavior.isArchived ? (
                                  <ArchiveRestore className="w-3 h-3" />
                                ) : (
                                  <Archive className="w-3 h-3" />
                                )}
                              </Button>
                            )}
                            {behavior.source === 'custom' && onDeleteCustomBehavior && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => onDeleteCustomBehavior(behavior.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {filteredBehaviors.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No behaviors found matching your search.
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add Custom Behavior Dialog */}
      <Dialog open={showAddBehavior} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Custom Behavior</DialogTitle>
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
              Add to Bank
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
