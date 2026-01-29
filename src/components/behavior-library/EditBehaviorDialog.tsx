import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { RotateCcw, Save } from 'lucide-react';
import { BehaviorDefinition, BEHAVIOR_CATEGORIES } from '@/types/behavior';

interface EditBehaviorDialogProps {
  behavior: BehaviorDefinition | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (behaviorId: string, definition: string, category?: string) => void;
  onReset?: (behaviorId: string) => void;
  isBuiltIn: boolean;
  isEdited: boolean;
  originalDefinition?: string;
}

export function EditBehaviorDialog({
  behavior,
  isOpen,
  onClose,
  onSave,
  onReset,
  isBuiltIn,
  isEdited,
  originalDefinition,
}: EditBehaviorDialogProps) {
  const [definition, setDefinition] = useState('');
  const [category, setCategory] = useState('Other');

  useEffect(() => {
    if (behavior) {
      setDefinition(behavior.operationalDefinition);
      setCategory(behavior.category);
    }
  }, [behavior]);

  const handleSave = () => {
    if (behavior && definition.trim()) {
      onSave(behavior.id, definition.trim(), category);
      onClose();
    }
  };

  const handleReset = () => {
    if (behavior && onReset) {
      onReset(behavior.id);
      if (originalDefinition) {
        setDefinition(originalDefinition);
      }
    }
  };

  if (!behavior) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Behavior Definition
            {isBuiltIn && <Badge variant="secondary">Built-in</Badge>}
            {isEdited && <Badge variant="outline">Edited</Badge>}
          </DialogTitle>
          <DialogDescription>
            {isBuiltIn 
              ? 'Editing this built-in behavior will update it for all new students. Existing student-specific definitions remain unchanged.'
              : 'Update the operational definition for this organization behavior.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Behavior Name</Label>
            <Input value={behavior.name} disabled className="bg-muted" />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
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
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              placeholder="Provide a clear, observable, and measurable definition..."
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              This definition will be used for all new students added with this behavior.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isBuiltIn && isEdited && onReset && (
            <Button variant="outline" onClick={handleReset} className="mr-auto">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Default
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!definition.trim()}>
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
