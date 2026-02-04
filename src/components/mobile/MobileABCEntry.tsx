import { useState, useCallback } from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDataStore } from '@/store/dataStore';
import { cn } from '@/lib/utils';
import { Student, Behavior } from '@/types/behavior';

const DEFAULT_ANTECEDENTS = [
  'Demand', 'Transition', 'Denied access', 'Attention away', 
  'Alone', 'Peer interaction', 'Change in routine', 'Sensory input'
];

const DEFAULT_CONSEQUENCES = [
  'Attention given', 'Escape/avoid', 'Tangible given', 'Ignored',
  'Redirected', 'Physical prompt', 'Verbal prompt', 'Time-out'
];

const FUNCTIONS = [
  'Escape', 'Attention', 'Tangible', 'Sensory', 'Unknown'
];

interface MobileABCEntryProps {
  open: boolean;
  onClose: () => void;
  student: Student;
  currentBehavior: Behavior;
}

export function MobileABCEntry({ open, onClose, student, currentBehavior }: MobileABCEntryProps) {
  const { addABCEntry, getStudentAntecedents, getStudentConsequences, addCustomAntecedent, addCustomConsequence } = useDataStore();
  
  const [selectedAntecedents, setSelectedAntecedents] = useState<string[]>([]);
  const [selectedBehaviors, setSelectedBehaviors] = useState<string[]>([currentBehavior.id]);
  const [selectedConsequences, setSelectedConsequences] = useState<string[]>([]);
  const [selectedFunction, setSelectedFunction] = useState<string>('');
  const [customAntecedent, setCustomAntecedent] = useState('');
  const [customConsequence, setCustomConsequence] = useState('');
  const [showCustomA, setShowCustomA] = useState(false);
  const [showCustomC, setShowCustomC] = useState(false);

  const studentAntecedents = getStudentAntecedents(student.id);
  const studentConsequences = getStudentConsequences(student.id);
  
  const allAntecedents = [...DEFAULT_ANTECEDENTS, ...studentAntecedents];
  const allConsequences = [...DEFAULT_CONSEQUENCES, ...studentConsequences];

  const activeBehaviors = student.behaviors.filter(b => !b.isArchived && !b.isMastered);

  const handleToggleAntecedent = (a: string) => {
    setSelectedAntecedents(prev => 
      prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]
    );
  };

  const handleToggleBehavior = (id: string) => {
    setSelectedBehaviors(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleConsequence = (c: string) => {
    setSelectedConsequences(prev => 
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    );
  };

  const handleAddCustomAntecedent = () => {
    if (customAntecedent.trim()) {
      addCustomAntecedent(student.id, customAntecedent.trim());
      setSelectedAntecedents(prev => [...prev, customAntecedent.trim()]);
      setCustomAntecedent('');
      setShowCustomA(false);
    }
  };

  const handleAddCustomConsequence = () => {
    if (customConsequence.trim()) {
      addCustomConsequence(student.id, customConsequence.trim());
      setSelectedConsequences(prev => [...prev, customConsequence.trim()]);
      setCustomConsequence('');
      setShowCustomC(false);
    }
  };

  const handleSave = useCallback(() => {
    if (selectedBehaviors.length === 0) return;

    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    // Create an entry for each selected behavior
    selectedBehaviors.forEach(behaviorId => {
      const behaviorObj = student.behaviors.find(b => b.id === behaviorId);
      addABCEntry({
        studentId: student.id,
        behaviorId,
        antecedent: selectedAntecedents[0] || '',
        antecedents: selectedAntecedents,
        behavior: behaviorObj?.name || '',
        consequence: selectedConsequences[0] || '',
        consequences: selectedConsequences,
        functions: selectedFunction ? [selectedFunction as any] : undefined,
        frequencyCount: 1,
      });
    });

    // Reset form
    setSelectedAntecedents([]);
    setSelectedBehaviors([currentBehavior.id]);
    setSelectedConsequences([]);
    setSelectedFunction('');
    
    onClose();
  }, [selectedBehaviors, selectedAntecedents, selectedConsequences, selectedFunction, student.id, currentBehavior.id, addABCEntry, onClose]);

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="flex items-center justify-between">
          <DrawerTitle>Record ABC Event</DrawerTitle>
          <DrawerClose asChild>
            <Button variant="ghost" size="icon">
              <X className="w-5 h-5" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4 pb-4" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <div className="space-y-6">
            {/* Antecedents */}
            <div>
              <h3 className="font-semibold mb-2">Antecedent (What happened before?)</h3>
              <div className="flex flex-wrap gap-2">
                {allAntecedents.map(a => (
                  <Badge
                    key={a}
                    variant={selectedAntecedents.includes(a) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer px-3 py-1.5 text-sm",
                      selectedAntecedents.includes(a) && "bg-primary"
                    )}
                    onClick={() => handleToggleAntecedent(a)}
                  >
                    {a}
                  </Badge>
                ))}
                {showCustomA ? (
                  <div className="flex gap-1">
                    <Input
                      value={customAntecedent}
                      onChange={(e) => setCustomAntecedent(e.target.value)}
                      placeholder="Custom..."
                      className="w-32 h-8"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCustomAntecedent()}
                    />
                    <Button size="sm" onClick={handleAddCustomAntecedent}>Add</Button>
                  </div>
                ) : (
                  <Badge
                    variant="outline"
                    className="cursor-pointer px-3 py-1.5"
                    onClick={() => setShowCustomA(true)}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Custom
                  </Badge>
                )}
              </div>
            </div>

            {/* Behaviors */}
            <div>
              <h3 className="font-semibold mb-2">Behavior</h3>
              <div className="flex flex-wrap gap-2">
                {activeBehaviors.map(b => (
                  <Badge
                    key={b.id}
                    variant={selectedBehaviors.includes(b.id) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer px-3 py-1.5 text-sm",
                      selectedBehaviors.includes(b.id) && "bg-primary"
                    )}
                    onClick={() => handleToggleBehavior(b.id)}
                  >
                    {b.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Consequences */}
            <div>
              <h3 className="font-semibold mb-2">Consequence (What happened after?)</h3>
              <div className="flex flex-wrap gap-2">
                {allConsequences.map(c => (
                  <Badge
                    key={c}
                    variant={selectedConsequences.includes(c) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer px-3 py-1.5 text-sm",
                      selectedConsequences.includes(c) && "bg-primary"
                    )}
                    onClick={() => handleToggleConsequence(c)}
                  >
                    {c}
                  </Badge>
                ))}
                {showCustomC ? (
                  <div className="flex gap-1">
                    <Input
                      value={customConsequence}
                      onChange={(e) => setCustomConsequence(e.target.value)}
                      placeholder="Custom..."
                      className="w-32 h-8"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCustomConsequence()}
                    />
                    <Button size="sm" onClick={handleAddCustomConsequence}>Add</Button>
                  </div>
                ) : (
                  <Badge
                    variant="outline"
                    className="cursor-pointer px-3 py-1.5"
                    onClick={() => setShowCustomC(true)}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Custom
                  </Badge>
                )}
              </div>
            </div>

            {/* Function */}
            <div>
              <h3 className="font-semibold mb-2">Hypothesized Function (optional)</h3>
              <div className="flex flex-wrap gap-2">
                {FUNCTIONS.map(f => (
                  <Badge
                    key={f}
                    variant={selectedFunction === f ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer px-3 py-1.5 text-sm",
                      selectedFunction === f && "bg-primary"
                    )}
                    onClick={() => setSelectedFunction(prev => prev === f ? '' : f)}
                  >
                    {f}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Save Button */}
        <div className="p-4 border-t">
          <Button
            onClick={handleSave}
            className="w-full h-12 text-lg font-semibold"
            disabled={selectedBehaviors.length === 0}
          >
            Save ABC Entry
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
