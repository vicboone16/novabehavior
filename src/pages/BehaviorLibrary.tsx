import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Search, Edit2, Trash2, Copy, ArrowLeft, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useToast } from '@/hooks/use-toast';
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

export default function BehaviorLibrary() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const students = useDataStore((state) => state.students);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddBehavior, setShowAddBehavior] = useState(false);
  const [editingBehavior, setEditingBehavior] = useState<BehaviorDefinition | null>(null);
  
  // Form state
  const [newName, setNewName] = useState('');
  const [newDefinition, setNewDefinition] = useState('');
  const [newCategory, setNewCategory] = useState('Other');

  // Get all custom behaviors from students - convert Behavior to BehaviorDefinition
  const customBehaviors: (BehaviorDefinition & { studentName?: string })[] = [];
  students.forEach(student => {
    student.behaviors.forEach(behavior => {
      // Check if this behavior is already in the default list
      const isDefault = DEFAULT_BEHAVIORS.find(b => b.id === behavior.id || b.name === behavior.name);
      if (!isDefault && !customBehaviors.find(b => b.id === behavior.id)) {
        customBehaviors.push({
          id: behavior.id,
          name: behavior.name,
          operationalDefinition: behavior.operationalDefinition || '',
          category: behavior.category || 'Other',
          isGlobal: false,
          studentName: student.name,
        });
      }
    });
  });

  const allBehaviors = [...DEFAULT_BEHAVIORS, ...customBehaviors];

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
  }, {} as Record<string, BehaviorDefinition[]>);

  const handleCopyDefinition = (behavior: BehaviorDefinition) => {
    navigator.clipboard.writeText(behavior.operationalDefinition);
    toast({ title: 'Definition copied to clipboard' });
  };

  const resetForm = () => {
    setNewName('');
    setNewDefinition('');
    setNewCategory('Other');
    setShowAddBehavior(false);
    setEditingBehavior(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
                  Operational definitions & behavior bank
                </p>
              </div>
            </div>
            <Button onClick={() => setShowAddBehavior(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Behavior
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Sidebar with search and filters */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Search & Filter</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search behaviors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
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
                    <span className="text-muted-foreground">Standard behaviors:</span>
                    <span className="font-medium">{DEFAULT_BEHAVIORS.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Custom behaviors:</span>
                    <span className="font-medium">{customBehaviors.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-medium">{allBehaviors.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Behavior List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Behavior Definitions</CardTitle>
                <CardDescription>
                  Click on a behavior to view full details or copy its definition
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
                                    <div className="flex items-center gap-2 mb-2">
                                      <h4 className="font-semibold">{behavior.name}</h4>
                                      {!behavior.isGlobal && (
                                        <Badge variant="outline" className="text-xs">Custom</Badge>
                                      )}
                                      {(behavior as any).studentName && (
                                        <Badge variant="secondary" className="text-xs">
                                          {(behavior as any).studentName}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      {behavior.operationalDefinition}
                                    </p>
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleCopyDefinition(behavior)}
                                    >
                                      <Copy className="w-4 h-4" />
                                    </Button>
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
      </main>

      {/* Add Behavior Dialog */}
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
            <Button disabled={!newName.trim() || !newDefinition.trim()}>
              Add to Library
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
