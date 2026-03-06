import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAbaLibraryPlans } from '@/hooks/useAbaLibraryPlans';

interface PublishPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planItemId: string;
  planItemTitle: string;
}

export function PublishPlanDialog({ open, onOpenChange, planItemId, planItemTitle }: PublishPlanDialogProps) {
  const { publishItem } = useAbaLibraryPlans();
  const [targetPortal, setTargetPortal] = useState('both');
  const [dcMode, setDcMode] = useState('fyi');

  const handlePublish = () => {
    publishItem.mutate(
      { planItemId, targetPortal, dataCollectionMode: dcMode },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Publish Plan Item
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground">Publishing</Label>
            <p className="font-medium">{planItemTitle}</p>
          </div>

          <div>
            <Label>Send To</Label>
            <Select value={targetPortal} onValueChange={setTargetPortal}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Home & School</SelectItem>
                <SelectItem value="parent">Home Only</SelectItem>
                <SelectItem value="teacher">School Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Data Collection</Label>
            <RadioGroup value={dcMode} onValueChange={setDcMode} className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="fyi" id="fyi" />
                <Label htmlFor="fyi" className="font-normal">FYI only (no data collection)</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="optional" id="optional" />
                <Label htmlFor="optional" className="font-normal">Optional data collection</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="required" id="required" />
                <Label htmlFor="required" className="font-normal">Required data collection</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handlePublish} disabled={publishItem.isPending}>
            {publishItem.isPending ? 'Publishing...' : 'Publish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
