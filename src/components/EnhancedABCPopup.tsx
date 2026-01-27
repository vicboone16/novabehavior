import { useState, useMemo } from 'react';
import { Plus, X, Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useDataStore } from '@/store/dataStore';
import { 
  ANTECEDENT_OPTIONS, 
  CONSEQUENCE_OPTIONS, 
  FUNCTION_OPTIONS,
  BehaviorFunction,
  DataCollectionMethod
} from '@/types/behavior';

export function EnhancedABCPopup() {
  const { 
    students, 
    addEnhancedABCEntry,
    addBehaviorWithMethods
  } = useDataStore();

  const [open, setOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedBehaviorId, setSelectedBehaviorId] = useState<string>('');
  const [selectedAntecedents, setSelectedAntecedents] = useState<string[]>([]);
  const [selectedConsequences, setSelectedConsequences] = useState<string[]>([]);
  const [selectedFunctions, setSelectedFunctions] = useState<BehaviorFunction[]>([]);
  const [frequencyCount, setFrequencyCount] = useState(1);
  const [hasDuration, setHasDuration] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  const [newBehaviorName, setNewBehaviorName] = useState('');
  const [showNewBehavior, setShowNewBehavior] = useState(false);

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const selectedBehavior = selectedStudent?.behaviors.find(b => b.id === selectedBehaviorId);

  const allBehaviors = useMemo(() => {
    const behaviors: { id: string; name: string; studentId: string }[] = [];
    students.forEach(student => {
      student.behaviors.forEach(b => {
        behaviors.push({ id: b.id, name: b.name, studentId: student.id });
      });
    });
    return behaviors;
  }, [students]);

  const studentBehaviors = selectedStudent?.behaviors || [];

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

  const handleAddNewBehavior = () => {
    if (newBehaviorName.trim() && selectedStudentId) {
      const methods: DataCollectionMethod[] = ['abc', 'frequency'];
      addBehaviorWithMethods(selectedStudentId, newBehaviorName.trim(), methods);
      setNewBehaviorName('');
      setShowNewBehavior(false);
    }
  };

  const handleSave = () => {
    if (!selectedStudentId || !selectedBehaviorId) return;
    if (selectedAntecedents.length === 0 || selectedConsequences.length === 0) return;

    addEnhancedABCEntry({
      studentId: selectedStudentId,
      behaviorId: selectedBehaviorId,
      antecedent: selectedAntecedents.join(', '),
      antecedents: selectedAntecedents,
      behavior: selectedBehavior?.name || '',
      behaviors: [selectedBehavior?.name || ''],
      consequence: selectedConsequences.join(', '),
      consequences: selectedConsequences,
      functions: selectedFunctions,
      frequencyCount,
      hasDuration,
      durationMinutes: hasDuration ? durationMinutes : undefined,
    });

    // Reset form
    setSelectedAntecedents([]);
    setSelectedConsequences([]);
    setSelectedFunctions([]);
    setFrequencyCount(1);
    setHasDuration(false);
    setDurationMinutes(0);
    setOpen(false);
  };

  const isValid = selectedStudentId && 
                  selectedBehaviorId && 
                  selectedAntecedents.length > 0 && 
                  selectedConsequences.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Plus className="w-4 h-4" />
          Record ABC Event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record ABC Event</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Selection */}
          <div className="space-y-2">
            <Label>Student</Label>
            <Select value={selectedStudentId} onValueChange={(v) => {
              setSelectedStudentId(v);
              setSelectedBehaviorId('');
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select student..." />
              </SelectTrigger>
              <SelectContent>
                {students.map(s => (
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

          {/* Behavior Selection */}
          {selectedStudentId && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Behavior</Label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowNewBehavior(!showNewBehavior)}
                >
                  {showNewBehavior ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {showNewBehavior ? 'Cancel' : 'Add New'}
                </Button>
              </div>
              
              {showNewBehavior ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="New behavior name..."
                    value={newBehaviorName}
                    onChange={(e) => setNewBehaviorName(e.target.value)}
                  />
                  <Button onClick={handleAddNewBehavior} disabled={!newBehaviorName.trim()}>
                    Add
                  </Button>
                </div>
              ) : (
                <Select value={selectedBehaviorId} onValueChange={setSelectedBehaviorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select behavior..." />
                  </SelectTrigger>
                  <SelectContent>
                    {studentBehaviors.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Antecedents - Multi-select */}
          <div className="space-y-2">
            <Label className="text-antecedent">Antecedent(s)</Label>
            <div className="flex flex-wrap gap-2">
              {ANTECEDENT_OPTIONS.map((a) => (
                <button
                  key={a}
                  onClick={() => toggleAntecedent(a)}
                  className={`
                    px-3 py-1.5 text-sm rounded-md transition-all border
                    ${selectedAntecedents.includes(a) 
                      ? 'bg-antecedent text-antecedent-foreground border-antecedent' 
                      : 'bg-secondary hover:bg-antecedent/20 border-border'}
                  `}
                >
                  {a}
                  {selectedAntecedents.includes(a) && <Check className="w-3 h-3 ml-1 inline" />}
                </button>
              ))}
            </div>
          </div>

          {/* Consequences - Multi-select */}
          <div className="space-y-2">
            <Label className="text-consequence">Consequence(s)</Label>
            <div className="flex flex-wrap gap-2">
              {CONSEQUENCE_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => toggleConsequence(c)}
                  className={`
                    px-3 py-1.5 text-sm rounded-md transition-all border
                    ${selectedConsequences.includes(c) 
                      ? 'bg-consequence text-consequence-foreground border-consequence' 
                      : 'bg-secondary hover:bg-consequence/20 border-border'}
                  `}
                >
                  {c}
                  {selectedConsequences.includes(c) && <Check className="w-3 h-3 ml-1 inline" />}
                </button>
              ))}
            </div>
          </div>

          {/* Functions - Multi-select */}
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

          {/* Frequency Count */}
          <div className="space-y-2">
            <Label>Frequency Count (if behavior occurred multiple times)</Label>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setFrequencyCount(Math.max(1, frequencyCount - 1))}
              >
                -
              </Button>
              <Input
                type="number"
                value={frequencyCount}
                onChange={(e) => setFrequencyCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center"
                min={1}
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setFrequencyCount(frequencyCount + 1)}
              >
                +
              </Button>
              <span className="text-sm text-muted-foreground">occurrence(s)</span>
            </div>
          </div>

          {/* Duration Option */}
          <div className="space-y-2 border rounded-lg p-3 bg-secondary/30">
            <div className="flex items-center gap-2">
              <Checkbox 
                id="hasDuration"
                checked={hasDuration}
                onCheckedChange={(checked) => setHasDuration(checked === true)}
              />
              <Label htmlFor="hasDuration" className="flex items-center gap-2 cursor-pointer">
                <Clock className="w-4 h-4" />
                Behavior had duration (e.g., tantrum)
              </Label>
            </div>
            
            {hasDuration && (
              <div className="flex items-center gap-2 mt-2">
                <Label>Duration:</Label>
                <Input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseFloat(e.target.value) || 0)}
                  className="w-24"
                  step="0.1"
                  min={0}
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
            )}
          </div>

          {/* Summary */}
          {isValid && (
            <div className="bg-muted/50 rounded-lg p-3 space-y-1">
              <h4 className="text-sm font-semibold">Summary</h4>
              <div className="text-sm space-y-1">
                <p><span className="font-medium">Student:</span> {selectedStudent?.name}</p>
                <p><span className="font-medium">Behavior:</span> {selectedBehavior?.name}</p>
                <p><span className="text-antecedent font-medium">A:</span> {selectedAntecedents.join(', ')}</p>
                <p><span className="text-consequence font-medium">C:</span> {selectedConsequences.join(', ')}</p>
                {selectedFunctions.length > 0 && (
                  <p><span className="font-medium">Functions:</span> {selectedFunctions.join(', ')}</p>
                )}
                {frequencyCount > 1 && (
                  <p><span className="font-medium">Count:</span> {frequencyCount}x</p>
                )}
                {hasDuration && (
                  <p><span className="font-medium">Duration:</span> {durationMinutes} min</p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!isValid}>
              <Check className="w-4 h-4 mr-1" />
              Save Entry
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}