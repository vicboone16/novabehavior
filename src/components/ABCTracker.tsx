import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDataStore } from '@/store/dataStore';
import { Behavior, ANTECEDENT_OPTIONS, CONSEQUENCE_OPTIONS } from '@/types/behavior';

interface ABCTrackerProps {
  studentId: string;
  behavior: Behavior;
  studentColor: string;
}

export function ABCTracker({ studentId, behavior, studentColor }: ABCTrackerProps) {
  const { addABCEntry, abcEntries } = useDataStore();
  const [selectedAntecedent, setSelectedAntecedent] = useState<string | null>(null);
  const [selectedBehavior, setSelectedBehavior] = useState<string | null>(null);
  const [selectedConsequence, setSelectedConsequence] = useState<string | null>(null);

  const todayEntries = abcEntries.filter(
    e => e.studentId === studentId && e.behaviorId === behavior.id
  );

  const handleRecord = () => {
    if (selectedAntecedent && selectedBehavior && selectedConsequence) {
      addABCEntry({
        studentId,
        behaviorId: behavior.id,
        antecedent: selectedAntecedent,
        behavior: selectedBehavior,
        consequence: selectedConsequence,
      });
      setSelectedAntecedent(null);
      setSelectedBehavior(null);
      setSelectedConsequence(null);
    }
  };

  const handleClear = () => {
    setSelectedAntecedent(null);
    setSelectedBehavior(null);
    setSelectedConsequence(null);
  };

  const isComplete = selectedAntecedent && selectedBehavior && selectedConsequence;

  return (
    <div className="bg-secondary/30 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{behavior.name}</span>
        <Badge variant="outline">{todayEntries.length} recorded</Badge>
      </div>

      {/* Antecedent */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-antecedent">A - Antecedent</span>
        <div className="flex flex-wrap gap-1">
          {ANTECEDENT_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => setSelectedAntecedent(option)}
              className={`
                px-2 py-1 text-xs rounded-md transition-all
                ${selectedAntecedent === option 
                  ? 'bg-antecedent text-antecedent-foreground' 
                  : 'bg-secondary hover:bg-antecedent/20 text-foreground'}
              `}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Behavior */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-behavior">B - Behavior</span>
        <button
          onClick={() => setSelectedBehavior(behavior.name)}
          className={`
            w-full px-3 py-2 text-sm rounded-md transition-all text-left
            ${selectedBehavior 
              ? 'bg-behavior text-behavior-foreground' 
              : 'bg-secondary hover:bg-behavior/20 text-foreground'}
          `}
        >
          {behavior.name} {selectedBehavior && '✓'}
        </button>
      </div>

      {/* Consequence */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-consequence">C - Consequence</span>
        <div className="flex flex-wrap gap-1">
          {CONSEQUENCE_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => setSelectedConsequence(option)}
              className={`
                px-2 py-1 text-xs rounded-md transition-all
                ${selectedConsequence === option 
                  ? 'bg-consequence text-consequence-foreground' 
                  : 'bg-secondary hover:bg-consequence/20 text-foreground'}
              `}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={handleClear}
          disabled={!selectedAntecedent && !selectedBehavior && !selectedConsequence}
        >
          <X className="w-4 h-4 mr-1" />
          Clear
        </Button>
        <Button
          size="sm"
          className="flex-1"
          onClick={handleRecord}
          disabled={!isComplete}
          style={{ 
            backgroundColor: isComplete ? studentColor : undefined,
          }}
        >
          <Check className="w-4 h-4 mr-1" />
          Record
        </Button>
      </div>
    </div>
  );
}
