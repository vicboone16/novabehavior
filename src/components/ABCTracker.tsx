import { useState, useMemo } from 'react';
import { Check, X, Pencil, Trash2, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDataStore } from '@/store/dataStore';
import { 
  Behavior, 
  ANTECEDENT_OPTIONS, 
  CONSEQUENCE_OPTIONS,
  FUNCTION_OPTIONS,
  BehaviorFunction 
} from '@/types/behavior';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';
import { format } from 'date-fns';

interface ABCTrackerProps {
  studentId: string;
  behavior: Behavior;
  studentColor: string;
}

export function ABCTracker({ studentId, behavior, studentColor }: ABCTrackerProps) {
  const { addEnhancedABCEntry, abcEntries, updateABCEntry, deleteABCEntry, students, getStudentAntecedents, getStudentConsequences } = useDataStore();
  const [selectedAntecedents, setSelectedAntecedents] = useState<string[]>([]);
  const [selectedBehavior, setSelectedBehavior] = useState<string | null>(null);
  const [selectedConsequences, setSelectedConsequences] = useState<string[]>([]);
  const [selectedFunctions, setSelectedFunctions] = useState<BehaviorFunction[]>([]);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [showEntries, setShowEntries] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [editDateValue, setEditDateValue] = useState('');

  const student = students.find(s => s.id === studentId);
  const customAntecedents = getStudentAntecedents(studentId);
  const customConsequences = getStudentConsequences(studentId);
  const allAntecedents = useMemo(() => 
    [...ANTECEDENT_OPTIONS, ...customAntecedents.filter(a => !ANTECEDENT_OPTIONS.includes(a))],
    [customAntecedents]
  );
  const allConsequences = useMemo(() => 
    [...CONSEQUENCE_OPTIONS, ...customConsequences.filter(c => !CONSEQUENCE_OPTIONS.includes(c))],
    [customConsequences]
  );

  const behaviorEntries = abcEntries.filter(
    e => e.studentId === studentId && e.behaviorId === behavior.id
  );

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

  const handleRecord = () => {
    if (selectedAntecedents.length > 0 && selectedBehavior && selectedConsequences.length > 0) {
      // Use addEnhancedABCEntry to also sync with frequency counts
      addEnhancedABCEntry({
        studentId,
        behaviorId: behavior.id,
        antecedent: selectedAntecedents[0], // Primary for legacy
        antecedents: selectedAntecedents,
        behavior: selectedBehavior,
        consequence: selectedConsequences[0], // Primary for legacy
        consequences: selectedConsequences,
        functions: selectedFunctions.length > 0 ? selectedFunctions : undefined,
        frequencyCount: 1,
      });
      handleClear();
    }
  };

  const handleClear = () => {
    setSelectedAntecedents([]);
    setSelectedBehavior(null);
    setSelectedConsequences([]);
    setSelectedFunctions([]);
  };

  const handleEdit = (entryId: string) => {
    const entry = abcEntries.find(e => e.id === entryId);
    if (entry) {
      // Support both legacy single and new multi-select format
      setSelectedAntecedents(entry.antecedents || (entry.antecedent ? [entry.antecedent] : []));
      setSelectedBehavior(entry.behavior);
      setSelectedConsequences(entry.consequences || (entry.consequence ? [entry.consequence] : []));
      setSelectedFunctions(entry.functions || []);
      setEditingEntry(entryId);
    }
  };

  const handleSaveEdit = () => {
    if (editingEntry && selectedAntecedents.length > 0 && selectedBehavior && selectedConsequences.length > 0) {
      updateABCEntry(editingEntry, {
        antecedent: selectedAntecedents[0],
        antecedents: selectedAntecedents,
        behavior: selectedBehavior,
        consequence: selectedConsequences[0],
        consequences: selectedConsequences,
        functions: selectedFunctions.length > 0 ? selectedFunctions : undefined,
      });
      setEditingEntry(null);
      handleClear();
    }
  };

  const handleCancelEdit = () => {
    setEditingEntry(null);
    handleClear();
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      deleteABCEntry(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const isComplete = selectedAntecedents.length > 0 && selectedBehavior && selectedConsequences.length > 0;

  // Helper to display entry antecedents/consequences
  const formatMultiple = (items: string[] | undefined, single: string): string => {
    if (items && items.length > 0) {
      return items.length > 1 ? `${items[0]} +${items.length - 1}` : items[0];
    }
    return single;
  };

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

      {/* Antecedent - Multi-select */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-antecedent">A - Antecedent(s)</span>
          {selectedAntecedents.length > 0 && (
            <Badge variant="secondary" className="text-xs h-5">
              {selectedAntecedents.length} selected
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {allAntecedents.map((option) => {
            const isCustom = !ANTECEDENT_OPTIONS.includes(option);
            return (
              <button
                key={option}
                onClick={() => toggleAntecedent(option)}
                className={`
                  px-2 py-1 text-xs rounded-md transition-all
                  ${selectedAntecedents.includes(option)
                    ? 'bg-antecedent text-antecedent-foreground' 
                    : 'bg-secondary hover:bg-antecedent/20 text-foreground'}
                  ${isCustom ? 'ring-1 ring-primary/30' : ''}
                `}
              >
                {option}
                {isCustom && <span className="ml-0.5 opacity-70">★</span>}
                {selectedAntecedents.includes(option) && <Check className="w-3 h-3 ml-0.5 inline" />}
              </button>
            );
          })}
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

      {/* Consequence - Multi-select */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-consequence">C - Consequence(s)</span>
          {selectedConsequences.length > 0 && (
            <Badge variant="secondary" className="text-xs h-5">
              {selectedConsequences.length} selected
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {allConsequences.map((option) => {
            const isCustom = !CONSEQUENCE_OPTIONS.includes(option);
            return (
              <button
                key={option}
                onClick={() => toggleConsequence(option)}
                className={`
                  px-2 py-1 text-xs rounded-md transition-all
                  ${selectedConsequences.includes(option) 
                    ? 'bg-consequence text-consequence-foreground' 
                    : 'bg-secondary hover:bg-consequence/20 text-foreground'}
                  ${isCustom ? 'ring-1 ring-primary/30' : ''}
                `}
              >
                {option}
                {isCustom && <span className="ml-0.5 opacity-70">★</span>}
                {selectedConsequences.includes(option) && <Check className="w-3 h-3 ml-0.5 inline" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Function - Multi-select */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Function (optional)</span>
          {selectedFunctions.length > 0 && (
            <Badge variant="secondary" className="text-xs h-5">
              {selectedFunctions.length} selected
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {FUNCTION_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => toggleFunction(value)}
              className={`
                px-2 py-1 text-xs rounded-md transition-all
                ${selectedFunctions.includes(value)
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary hover:bg-primary/20 text-foreground'}
              `}
            >
              {label}
              {selectedFunctions.includes(value) && <Check className="w-3 h-3 ml-0.5 inline" />}
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
          disabled={selectedAntecedents.length === 0 && !selectedBehavior && selectedConsequences.length === 0 && selectedFunctions.length === 0 && !editingEntry}
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
                      {editingDateId === entry.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="datetime-local"
                            value={editDateValue}
                            onChange={(e) => setEditDateValue(e.target.value)}
                            className="h-6 text-xs w-auto"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              if (editDateValue) {
                                updateABCEntry(entry.id, { timestamp: new Date(editDateValue) });
                              }
                              setEditingDateId(null);
                            }}
                          >
                            <Check className="w-3 h-3 text-primary" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => setEditingDateId(null)}
                          >
                            <X className="w-3 h-3 text-muted-foreground" />
                          </Button>
                        </div>
                      ) : (
                        <button
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            const d = new Date(entry.timestamp);
                            setEditDateValue(format(d, "yyyy-MM-dd'T'HH:mm"));
                            setEditingDateId(entry.id);
                          }}
                          title="Click to edit date/time"
                        >
                          <CalendarIcon className="w-3 h-3" />
                          {format(new Date(entry.timestamp), 'MMM d, h:mm a')}
                        </button>
                      )}
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
                          onClick={() => setDeleteConfirm(entry.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="font-medium text-antecedent block">A</span>
                        <span className="text-foreground">
                          {entry.antecedents && entry.antecedents.length > 1 
                            ? entry.antecedents.join(', ')
                            : entry.antecedent}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-behavior block">B</span>
                        <span className="text-foreground">{entry.behavior}</span>
                      </div>
                      <div>
                        <span className="font-medium text-consequence block">C</span>
                        <span className="text-foreground">
                          {entry.consequences && entry.consequences.length > 1 
                            ? entry.consequences.join(', ')
                            : entry.consequence}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {entry.frequencyCount > 1 && (
                        <Badge variant="secondary" className="text-xs">
                          ×{entry.frequencyCount}
                        </Badge>
                      )}
                      {entry.durationMinutes && entry.durationMinutes > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {entry.durationMinutes >= 1 
                            ? `${Math.round(entry.durationMinutes)}m` 
                            : `${Math.round(entry.durationMinutes * 60)}s`}
                        </Badge>
                      )}
                      {entry.isConcurrent && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          concurrent
                        </Badge>
                      )}
                      {entry.functions && entry.functions.map(f => (
                        <Badge key={f} variant="outline" className="text-xs">
                          {FUNCTION_OPTIONS.find(fo => fo.value === f)?.label || f}
                        </Badge>
                      ))}
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
        title="Delete ABC Entry"
        description="Are you sure you want to delete this ABC entry? It will be moved to the recovery trash for 20 minutes."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  );
}
