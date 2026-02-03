import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import type { IEPItemType, IEPStudentStatus } from '@/types/iepLibrary';

interface AddCustomSupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (
    title: string,
    description: string,
    itemType: IEPItemType,
    status: IEPStudentStatus
  ) => void;
}

export function AddCustomSupportDialog({
  open,
  onOpenChange,
  onAdd
}: AddCustomSupportDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [itemType, setItemType] = useState<IEPItemType>('accommodation');
  const [status, setStatus] = useState<IEPStudentStatus>('considering');
  const [saveToLibrary, setSaveToLibrary] = useState(false);

  const handleSubmit = () => {
    if (!title.trim()) return;

    onAdd(title, description, itemType, status);
    
    // Reset form
    setTitle('');
    setDescription('');
    setItemType('accommodation');
    setStatus('considering');
    setSaveToLibrary(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Custom Support</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Support Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Visual timer for task completion"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what this support is and how it helps the student..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <RadioGroup
              value={itemType}
              onValueChange={(v) => setItemType(v as IEPItemType)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="accommodation" id="accommodation" />
                <Label htmlFor="accommodation" className="font-normal cursor-pointer">
                  Accommodation
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="modification" id="modification" />
                <Label htmlFor="modification" className="font-normal cursor-pointer">
                  Modification
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              Accommodations provide access without changing standards. 
              Modifications alter content, expectations, or grading.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Initial Status</Label>
            <RadioGroup
              value={status}
              onValueChange={(v) => setStatus(v as IEPStudentStatus)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existing" id="status-existing" />
                <Label htmlFor="status-existing" className="font-normal cursor-pointer">
                  Existing (Already in IEP/504)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="considering" id="status-considering" />
                <Label htmlFor="status-considering" className="font-normal cursor-pointer">
                  Considering (Proposed)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="save-to-library"
              checked={saveToLibrary}
              onCheckedChange={(checked) => setSaveToLibrary(checked === true)}
            />
            <Label htmlFor="save-to-library" className="font-normal cursor-pointer">
              Also save to global library for reuse
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            Add Support
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
