import { useState } from 'react';
import { Check, X, Pencil, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDataStore } from '@/store/dataStore';
import { Behavior, ANTECEDENT_OPTIONS, CONSEQUENCE_OPTIONS } from '@/types/behavior';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { format } from 'date-fns';

interface ABCTrackerProps {
  studentId: string;
  behavior: Behavior;
  studentColor: string;
}

export function ABCTracker({ studentId, behavior, studentColor }: ABCTrackerProps) {
  const { addABCEntry, abcEntries, updateABCEntry, deleteABCEntry, students, getStudentAntecedents, getStudentConsequences } = useDataStore();
  const [selectedAntecedent, setSelectedAntecedent] = useState<string | null>(null);
  const [selectedBehavior, setSelectedBehavior] = useState<string | null>(null);
  const [selectedConsequence, setSelectedConsequence] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [showEntries, setShowEntries] = useState(false);

  const student = students.find(s => s.id === studentId);
  const customAntecedents = getStudentAntecedents(studentId);
  const customConsequences = getStudentConsequences(studentId);
  const allAntecedents = [...ANTECEDENT_OPTIONS, ...customAntecedents.filter(a => !ANTECEDENT_OPTIONS.includes(a))];
  const allConsequences = [...CONSEQUENCE_OPTIONS, ...customConsequences.filter(c => !CONSEQUENCE_OPTIONS.includes(c))];

  const behaviorEntries = abcEntries.filter(
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
        frequencyCount: 1,
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

  const handleEdit = (entryId: string) => {
    const entry = abcEntries.find(e => e.id === entryId);
    if (entry) {
      setSelectedAntecedent(entry.antecedent);
      setSelectedBehavior(entry.behavior);
      setSelectedConsequence(entry.consequence);
      setEditingEntry(entryId);
    }
  };

  const handleSaveEdit = () => {
    if (editingEntry && selectedAntecedent && selectedBehavior && selectedConsequence) {
      updateABCEntry(editingEntry, {
        antecedent: selectedAntecedent,
        behavior: selectedBehavior,
        consequence: selectedConsequence,
      });
      setEditingEntry(null);
      setSelectedAntecedent(null);
      setSelectedBehavior(null);
      setSelectedConsequence(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    setSelectedAntecedent(null);
    setSelectedBehavior(null);
    setSelectedConsequence(null);
  };

  const handleDelete = (entryId: string) => {
    deleteABCEntry(entryId);
  };

  const isComplete = selectedAntecedent && selectedBehavior && selectedConsequence;

  return (
    <div className="bg-secondary/30 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{behavior.name}</span>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-xs gap-1"
          onClick={() => setShowEntries(true)}
        >
          <Clock className="w-3 h-3" />
          {behaviorEntries.length} recorded
        </Button>
      </div>

      {/* Antecedent */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-antecedent">A - Antecedent</span>
        <div className="flex flex-wrap gap-1">
          {allAntecedents.map((option) => (
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
          {allConsequences.map((option) => (
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
          onClick={editingEntry ? handleCancelEdit : handleClear}
          disabled={!selectedAntecedent && !selectedBehavior && !selectedConsequence && !editingEntry}
        >
          <X className="w-4 h-4 mr-1" />
          {editingEntry ? 'Cancel' : 'Clear'}
        </Button>
        <Button
          size="sm"
          className="flex-1"
          onClick={editingEntry ? handleSaveEdit : handleRecord}
          disabled={!isComplete}
          style={{ 
            backgroundColor: isComplete ? studentColor : undefined,
          }}
        >
          <Check className="w-4 h-4 mr-1" />
          {editingEntry ? 'Save' : 'Record'}
        </Button>
      </div>

      {/* Entries Dialog */}
      <Dialog open={showEntries} onOpenChange={setShowEntries}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>ABC Entries - {behavior.name}</span>
              <Badge variant="secondary">{behaviorEntries.length}</Badge>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2 py-2">
            {behaviorEntries.length === 0 ? (
              <p className="text-center text-muted-foreground py-4 text-sm">
                No entries recorded yet
              </p>
            ) : (
              behaviorEntries
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="border border-border rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.timestamp), 'h:mm a')}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            handleEdit(entry.id);
                            setShowEntries(false);
                          }}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(entry.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="font-medium text-antecedent block">A</span>
                        <span className="text-foreground">{entry.antecedent}</span>
                      </div>
                      <div>
                        <span className="font-medium text-behavior block">B</span>
                        <span className="text-foreground">{entry.behavior}</span>
                      </div>
                      <div>
                        <span className="font-medium text-consequence block">C</span>
                        <span className="text-foreground">{entry.consequence}</span>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEntries(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
