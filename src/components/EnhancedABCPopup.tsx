import { useState, useMemo } from 'react';
import { Plus, X, Check, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDataStore } from '@/store/dataStore';
import { 
  ANTECEDENT_OPTIONS, 
  CONSEQUENCE_OPTIONS, 
  FUNCTION_OPTIONS,
  BehaviorFunction,
  DataCollectionMethod,
  ABCBehaviorEntry
} from '@/types/behavior';

interface SelectedBehavior {
  behaviorId: string;
  behaviorName: string;
  frequencyCount: number;
  hasDuration: boolean;
  durationMinutes: number;
}

export function EnhancedABCPopup() {
  const { 
    students, 
    addEnhancedABCEntry,
    addBehaviorWithMethods,
    addCustomAntecedent,
    addCustomConsequence,
    getStudentAntecedents,
    getStudentConsequences,
  } = useDataStore();

  const [open, setOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedBehaviors, setSelectedBehaviors] = useState<SelectedBehavior[]>([]);
  const [selectedAntecedents, setSelectedAntecedents] = useState<string[]>([]);
  const [selectedConsequences, setSelectedConsequences] = useState<string[]>([]);
  const [selectedFunctions, setSelectedFunctions] = useState<BehaviorFunction[]>([]);
  
  // New item inputs
  const [newBehaviorName, setNewBehaviorName] = useState('');
  const [showNewBehavior, setShowNewBehavior] = useState(false);
  const [newAntecedent, setNewAntecedent] = useState('');
  const [showNewAntecedent, setShowNewAntecedent] = useState(false);
  const [newConsequence, setNewConsequence] = useState('');
  const [showNewConsequence, setShowNewConsequence] = useState(false);

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const studentBehaviors = selectedStudent?.behaviors || [];
  
  // Combine standard options with student-specific custom ones
  const allAntecedents = useMemo(() => {
    const custom = selectedStudentId ? getStudentAntecedents(selectedStudentId) : [];
    return [...ANTECEDENT_OPTIONS, ...custom.filter(c => !ANTECEDENT_OPTIONS.includes(c))];
  }, [selectedStudentId, getStudentAntecedents]);

  const allConsequences = useMemo(() => {
    const custom = selectedStudentId ? getStudentConsequences(selectedStudentId) : [];
    return [...CONSEQUENCE_OPTIONS, ...custom.filter(c => !CONSEQUENCE_OPTIONS.includes(c))];
  }, [selectedStudentId, getStudentConsequences]);

  const toggleAntecedent = (a: string) => {
    setSelectedAntecedents(prev => 
      prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
    );
  };

  const toggleConsequence = (c: string) => {
    setSelectedConsequences(prev => 
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    );
  };

  const toggleFunction = (f: BehaviorFunction) => {
    setSelectedFunctions(prev => 
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    );
  };

  const toggleBehavior = (behaviorId: string, behaviorName: string) => {
    setSelectedBehaviors(prev => {
      const exists = prev.find(b => b.behaviorId === behaviorId);
      if (exists) {
        return prev.filter(b => b.behaviorId !== behaviorId);
      }
      return [...prev, {
        behaviorId,
        behaviorName,
        frequencyCount: 1,
        hasDuration: false,
        durationMinutes: 0,
      }];
    });
  };

  const updateBehaviorFrequency = (behaviorId: string, count: number) => {
    setSelectedBehaviors(prev => prev.map(b => 
      b.behaviorId === behaviorId ? { ...b, frequencyCount: Math.max(1, count) } : b
    ));
  };

  const updateBehaviorDuration = (behaviorId: string, hasDuration: boolean, durationMinutes?: number) => {
    setSelectedBehaviors(prev => prev.map(b => 
      b.behaviorId === behaviorId ? { 
        ...b, 
        hasDuration, 
        durationMinutes: durationMinutes ?? b.durationMinutes 
      } : b
    ));
  };

  const handleAddNewBehavior = () => {
    if (newBehaviorName.trim() && selectedStudentId) {
      const methods: DataCollectionMethod[] = ['abc', 'frequency'];
      addBehaviorWithMethods(selectedStudentId, newBehaviorName.trim(), methods);
      setNewBehaviorName('');
      setShowNewBehavior(false);
    }
  };

  const handleAddNewAntecedent = () => {
    if (newAntecedent.trim() && selectedStudentId) {
      addCustomAntecedent(selectedStudentId, newAntecedent.trim());
      setSelectedAntecedents(prev => [...prev, newAntecedent.trim()]);
      setNewAntecedent('');
      setShowNewAntecedent(false);
    }
  };

  const handleAddNewConsequence = () => {
    if (newConsequence.trim() && selectedStudentId) {
      addCustomConsequence(selectedStudentId, newConsequence.trim());
      setSelectedConsequences(prev => [...prev, newConsequence.trim()]);
      setNewConsequence('');
      setShowNewConsequence(false);
    }
  };

  const handleSave = () => {
    if (!selectedStudentId || selectedBehaviors.length === 0) return;
    if (selectedAntecedents.length === 0 || selectedConsequences.length === 0) return;

    // Create behavior entries for the ABC record
    const behaviorEntries: ABCBehaviorEntry[] = selectedBehaviors.map(b => ({
      behaviorId: b.behaviorId,
      behaviorName: b.behaviorName,
      frequencyCount: b.frequencyCount,
      hasDuration: b.hasDuration,
      durationMinutes: b.hasDuration ? b.durationMinutes : undefined,
    }));

    // Calculate totals
    const totalFrequency = selectedBehaviors.reduce((sum, b) => sum + b.frequencyCount, 0);
    const totalDuration = selectedBehaviors
      .filter(b => b.hasDuration)
      .reduce((sum, b) => sum + b.durationMinutes, 0);

    addEnhancedABCEntry({
      studentId: selectedStudentId,
      behaviorId: selectedBehaviors[0].behaviorId, // Primary behavior for backwards compat
      antecedent: selectedAntecedents.join(', '),
      antecedents: selectedAntecedents,
      behavior: selectedBehaviors.map(b => b.behaviorName).join(', '),
      behaviors: behaviorEntries,
      consequence: selectedConsequences.join(', '),
      consequences: selectedConsequences,
      functions: selectedFunctions,
      frequencyCount: totalFrequency,
      hasDuration: selectedBehaviors.some(b => b.hasDuration),
      durationMinutes: totalDuration > 0 ? totalDuration : undefined,
    });

    // Reset form
    resetForm();
    setOpen(false);
  };

  const resetForm = () => {
    setSelectedBehaviors([]);
    setSelectedAntecedents([]);
    setSelectedConsequences([]);
    setSelectedFunctions([]);
    setNewBehaviorName('');
    setNewAntecedent('');
    setNewConsequence('');
    setShowNewBehavior(false);
    setShowNewAntecedent(false);
    setShowNewConsequence(false);
  };

  const isValid = selectedStudentId && 
                  selectedBehaviors.length > 0 && 
                  selectedAntecedents.length > 0 && 
                  selectedConsequences.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="w-4 h-4" />
          Record ABC Event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Record ABC Event</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 pb-4">
            {/* Student Selection */}
            <div className="space-y-2">
              <Label>Student</Label>
              <Select value={selectedStudentId} onValueChange={(v) => {
                setSelectedStudentId(v);
                setSelectedBehaviors([]);
                setSelectedAntecedents([]);
                setSelectedConsequences([]);
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select student..." />
                </SelectTrigger>
                <SelectContent>
                  {students.filter(s => !s.isArchived).map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Antecedents - Multi-select with Add New */}
            {selectedStudentId && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-antecedent">Antecedent(s)</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowNewAntecedent(!showNewAntecedent)}
                    className="h-6 text-xs"
                  >
                    {showNewAntecedent ? <X className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                    {showNewAntecedent ? 'Cancel' : 'Add New'}
                  </Button>
                </div>
                
                {showNewAntecedent && (
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Custom antecedent for this student..."
                      value={newAntecedent}
                      onChange={(e) => setNewAntecedent(e.target.value)}
                      className="h-8"
                    />
                    <Button size="sm" onClick={handleAddNewAntecedent} disabled={!newAntecedent.trim()}>
                      Add
                    </Button>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2">
                  {allAntecedents.map((a) => {
                    const isCustom = !ANTECEDENT_OPTIONS.includes(a);
                    return (
                      <button
                        key={a}
                        onClick={() => toggleAntecedent(a)}
                        className={`
                          px-3 py-1.5 text-sm rounded-md transition-all border
                          ${selectedAntecedents.includes(a) 
                            ? 'bg-antecedent text-antecedent-foreground border-antecedent' 
                            : 'bg-secondary hover:bg-antecedent/20 border-border'}
                          ${isCustom ? 'ring-1 ring-primary/30' : ''}
                        `}
                      >
                        {a}
                        {isCustom && <span className="ml-1 text-xs opacity-70">★</span>}
                        {selectedAntecedents.includes(a) && <Check className="w-3 h-3 ml-1 inline" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Behavior Selection - Multi-select with individual settings */}
            {selectedStudentId && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-behavior">Behavior(s)</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowNewBehavior(!showNewBehavior)}
                    className="h-6 text-xs"
                  >
                    {showNewBehavior ? <X className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                    {showNewBehavior ? 'Cancel' : 'Add New'}
                  </Button>
                </div>
                
                {showNewBehavior && (
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="New behavior name..."
                      value={newBehaviorName}
                      onChange={(e) => setNewBehaviorName(e.target.value)}
                      className="h-8"
                    />
                    <Button size="sm" onClick={handleAddNewBehavior} disabled={!newBehaviorName.trim()}>
                      Add
                    </Button>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2 mb-2">
                  {studentBehaviors.map(b => {
                    const isSelected = selectedBehaviors.some(sb => sb.behaviorId === b.id);
                    return (
                      <button
                        key={b.id}
                        onClick={() => toggleBehavior(b.id, b.name)}
                        className={`
                          px-3 py-1.5 text-sm rounded-md transition-all border
                          ${isSelected 
                            ? 'bg-behavior text-behavior-foreground border-behavior' 
                            : 'bg-secondary hover:bg-behavior/20 border-border'}
                        `}
                      >
                        {b.name}
                        {isSelected && <Check className="w-3 h-3 ml-1 inline" />}
                      </button>
                    );
                  })}
                </div>

                {/* Selected behaviors with individual settings */}
                {selectedBehaviors.length > 0 && (
                  <div className="space-y-2 border rounded-lg p-3 bg-secondary/20">
                    <Label className="text-xs text-muted-foreground">Configure each behavior:</Label>
                    {selectedBehaviors.map(sb => (
                      <div key={sb.behaviorId} className="bg-background rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{sb.behaviorName}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 w-6 p-0 text-destructive"
                            onClick={() => toggleBehavior(sb.behaviorId, sb.behaviorName)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        {/* Frequency count */}
                        <div className="flex items-center gap-2">
                          <Label className="text-xs w-20">Count:</Label>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => updateBehaviorFrequency(sb.behaviorId, sb.frequencyCount - 1)}
                          >
                            -
                          </Button>
                          <Input
                            type="number"
                            value={sb.frequencyCount}
                            onChange={(e) => updateBehaviorFrequency(sb.behaviorId, parseInt(e.target.value) || 1)}
                            className="w-16 h-6 text-center text-sm"
                            min={1}
                          />
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => updateBehaviorFrequency(sb.behaviorId, sb.frequencyCount + 1)}
                          >
                            +
                          </Button>
                        </div>

                        {/* Duration option */}
                        <div className="flex items-center gap-2">
                          <Checkbox 
                            id={`duration-${sb.behaviorId}`}
                            checked={sb.hasDuration}
                            onCheckedChange={(checked) => updateBehaviorDuration(sb.behaviorId, checked === true)}
                          />
                          <Label htmlFor={`duration-${sb.behaviorId}`} className="text-xs flex items-center gap-1 cursor-pointer">
                            <Clock className="w-3 h-3" />
                            Has duration
                          </Label>
                          {sb.hasDuration && (
                            <div className="flex items-center gap-1 ml-2">
                              <Input
                                type="number"
                                value={sb.durationMinutes}
                                onChange={(e) => updateBehaviorDuration(sb.behaviorId, true, parseFloat(e.target.value) || 0)}
                                className="w-16 h-6 text-sm"
                                step="0.1"
                                min={0}
                              />
                              <span className="text-xs text-muted-foreground">min</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Consequences - Multi-select with Add New */}
            {selectedStudentId && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-consequence">Consequence(s)</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowNewConsequence(!showNewConsequence)}
                    className="h-6 text-xs"
                  >
                    {showNewConsequence ? <X className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                    {showNewConsequence ? 'Cancel' : 'Add New'}
                  </Button>
                </div>
                
                {showNewConsequence && (
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Custom consequence for this student..."
                      value={newConsequence}
                      onChange={(e) => setNewConsequence(e.target.value)}
                      className="h-8"
                    />
                    <Button size="sm" onClick={handleAddNewConsequence} disabled={!newConsequence.trim()}>
                      Add
                    </Button>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2">
                  {allConsequences.map((c) => {
                    const isCustom = !CONSEQUENCE_OPTIONS.includes(c);
                    return (
                      <button
                        key={c}
                        onClick={() => toggleConsequence(c)}
                        className={`
                          px-3 py-1.5 text-sm rounded-md transition-all border
                          ${selectedConsequences.includes(c) 
                            ? 'bg-consequence text-consequence-foreground border-consequence' 
                            : 'bg-secondary hover:bg-consequence/20 border-border'}
                          ${isCustom ? 'ring-1 ring-primary/30' : ''}
                        `}
                      >
                        {c}
                        {isCustom && <span className="ml-1 text-xs opacity-70">★</span>}
                        {selectedConsequences.includes(c) && <Check className="w-3 h-3 ml-1 inline" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Functions - Multi-select */}
            {selectedStudentId && (
              <div className="space-y-2">
                <Label>Hypothesized Function(s)</Label>
                <div className="flex flex-wrap gap-2">
                  {FUNCTION_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => toggleFunction(value)}
                      className={`
                        px-3 py-1.5 text-sm rounded-md transition-all border
                        ${selectedFunctions.includes(value) 
                          ? 'bg-primary text-primary-foreground border-primary' 
                          : 'bg-secondary hover:bg-primary/20 border-border'}
                      `}
                    >
                      {label}
                      {selectedFunctions.includes(value) && <Check className="w-3 h-3 ml-1 inline" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            {isValid && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <h4 className="text-sm font-semibold">Summary</h4>
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">Student:</span> {selectedStudent?.name}</p>
                  <div>
                    <span className="font-medium">Behaviors:</span>
                    <div className="ml-4 space-y-1 mt-1">
                      {selectedBehaviors.map(b => (
                        <div key={b.behaviorId} className="text-xs">
                          • {b.behaviorName}: {b.frequencyCount}x
                          {b.hasDuration && ` (${b.durationMinutes}min)`}
                        </div>
                      ))}
                    </div>
                  </div>
                  <p><span className="text-antecedent font-medium">A:</span> {selectedAntecedents.join(', ')}</p>
                  <p><span className="text-consequence font-medium">C:</span> {selectedConsequences.join(', ')}</p>
                  {selectedFunctions.length > 0 && (
                    <p><span className="font-medium">Functions:</span> {selectedFunctions.join(', ')}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => { resetForm(); setOpen(false); }}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            <Check className="w-4 h-4 mr-1" />
            Save Entry
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}