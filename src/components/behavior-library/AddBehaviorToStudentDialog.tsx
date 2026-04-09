import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDataStore } from '@/store/dataStore';
import { useToast } from '@/hooks/use-toast';
import type { BehaviorDefinition, DataCollectionMethod } from '@/types/behavior';

interface AddBehaviorToStudentDialogProps {
  behavior: BehaviorDefinition | null;
  isOpen: boolean;
  onClose: () => void;
}

const METHOD_OPTIONS: { value: DataCollectionMethod; label: string }[] = [
  { value: 'frequency', label: 'Frequency' },
  { value: 'duration', label: 'Duration' },
  { value: 'interval', label: 'Interval' },
  { value: 'abc', label: 'ABC' },
  { value: 'latency', label: 'Latency' },
];

export function AddBehaviorToStudentDialog({ behavior, isOpen, onClose }: AddBehaviorToStudentDialogProps) {
  const { toast } = useToast();
  const students = useDataStore((s) => s.students);
  const addBehaviorWithMethods = useDataStore((s) => s.addBehaviorWithMethods);

  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [selectedMethods, setSelectedMethods] = useState<DataCollectionMethod[]>(['frequency']);
  const [isAdding, setIsAdding] = useState(false);

  const activeStudents = students.filter((s) => !s.isArchived);

  useEffect(() => {
    if (isOpen) {
      setSelectedStudentIds([]);
      setSelectedMethods(['frequency']);
    }
  }, [isOpen]);

  const handleAdd = () => {
    if (!behavior || selectedStudentIds.length === 0 || selectedMethods.length === 0) return;

    setIsAdding(true);
    try {
      for (const studentId of selectedStudentIds) {
        // Check if student already has this behavior
        const student = students.find((s) => s.id === studentId);
        const alreadyHas = student?.behaviors.some(
          (b) => b.name.toLowerCase().trim() === behavior.name.toLowerCase().trim()
        );
        if (!alreadyHas) {
          addBehaviorWithMethods(studentId, behavior.name, selectedMethods, {
            operationalDefinition: behavior.operationalDefinition,
            category: behavior.category,
            baseBehaviorId: behavior.id,
          });
        }
      }

      toast({
        title: 'Behavior added',
        description: `"${behavior.name}" added to ${selectedStudentIds.length} student(s).`,
      });
      onClose();
    } catch {
      toast({ title: 'Error adding behavior', variant: 'destructive' });
    } finally {
      setIsAdding(false);
    }
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const toggleMethod = (method: DataCollectionMethod) => {
    setSelectedMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  if (!behavior) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Behavior to Students</DialogTitle>
        </DialogHeader>

        {/* Behavior info */}
        <div className="p-3 bg-muted rounded-lg">
          <p className="font-medium text-sm">{behavior.name}</p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {behavior.operationalDefinition}
          </p>
        </div>

        {/* Data collection methods */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Data Collection Methods</Label>
          <div className="flex flex-wrap gap-2">
            {METHOD_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={selectedMethods.includes(opt.value)}
                  onCheckedChange={() => toggleMethod(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {/* Student list */}
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0 border rounded-lg p-2">
          {activeStudents.length === 0 ? (
            <p className="text-muted-foreground text-center py-4 text-sm">No active students</p>
          ) : (
            activeStudents.map((student) => {
              const alreadyHas = student.behaviors.some(
                (b) => b.name.toLowerCase().trim() === behavior.name.toLowerCase().trim()
              );
              return (
                <label
                  key={student.id}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${
                    alreadyHas ? 'opacity-50' : 'hover:bg-muted/50'
                  }`}
                >
                  <Checkbox
                    checked={selectedStudentIds.includes(student.id)}
                    onCheckedChange={() => toggleStudent(student.id)}
                    disabled={alreadyHas}
                  />
                  <span className="text-sm flex-1">{student.displayName || student.name}</span>
                  {alreadyHas && (
                    <span className="text-xs text-muted-foreground">Already assigned</span>
                  )}
                </label>
              );
            })
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={selectedStudentIds.length === 0 || selectedMethods.length === 0 || isAdding}
            onClick={handleAdd}
          >
            {isAdding ? 'Adding...' : `Add to ${selectedStudentIds.length} Student(s)`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
