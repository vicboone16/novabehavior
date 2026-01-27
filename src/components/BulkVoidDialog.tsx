import { useState } from 'react';
import { Ban, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { IntervalEntry } from '@/types/behavior';
import { toast } from 'sonner';

interface BulkVoidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalIntervals: number;
  onApply: (startInterval: number, endInterval: number, reason: IntervalEntry['voidReason'], customReason?: string) => void;
  onClear: (startInterval: number, endInterval: number) => void;
}

const VOID_REASONS: { value: IntervalEntry['voidReason']; label: string }[] = [
  { value: 'late_arrival', label: 'Late Arrival' },
  { value: 'early_departure', label: 'Early Departure' },
  { value: 'not_present', label: 'Not Present' },
  { value: 'fire_drill', label: 'Fire Drill' },
  { value: 'break', label: 'Break' },
  { value: 'transition', label: 'Transition' },
  { value: 'other', label: 'Other' },
];

export function BulkVoidDialog({
  open,
  onOpenChange,
  totalIntervals,
  onApply,
  onClear,
}: BulkVoidDialogProps) {
  const [startInterval, setStartInterval] = useState('1');
  const [endInterval, setEndInterval] = useState('1');
  const [reason, setReason] = useState<IntervalEntry['voidReason']>('not_present');
  const [customReason, setCustomReason] = useState('');
  const [action, setAction] = useState<'void' | 'clear'>('void');

  const handleApply = () => {
    const start = parseInt(startInterval) - 1; // Convert to 0-indexed
    const end = parseInt(endInterval) - 1;

    if (isNaN(start) || isNaN(end) || start < 0 || end >= totalIntervals || start > end) {
      toast.error('Invalid interval range');
      return;
    }

    if (action === 'void') {
      onApply(start, end, reason, reason === 'other' ? customReason : undefined);
      toast.success(`Voided intervals ${startInterval} to ${endInterval}`);
    } else {
      onClear(start, end);
      toast.success(`Restored intervals ${startInterval} to ${endInterval}`);
    }

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setStartInterval('1');
    setEndInterval('1');
    setReason('not_present');
    setCustomReason('');
    setAction('void');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="w-5 h-5" />
            Bulk Void/Restore Intervals
          </DialogTitle>
          <DialogDescription>
            Void or restore a range of intervals at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Action Type */}
          <div className="space-y-2">
            <Label>Action</Label>
            <Select value={action} onValueChange={(v) => setAction(v as 'void' | 'clear')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="void">Void Intervals (Mark N/A)</SelectItem>
                <SelectItem value="clear">Restore Intervals</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Interval Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-interval">Start Interval</Label>
              <Input
                id="start-interval"
                type="number"
                min="1"
                max={totalIntervals}
                value={startInterval}
                onChange={(e) => setStartInterval(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-interval">End Interval</Label>
              <Input
                id="end-interval"
                type="number"
                min="1"
                max={totalIntervals}
                value={endInterval}
                onChange={(e) => setEndInterval(e.target.value)}
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Total intervals: {totalIntervals}. Range: 1 to {totalIntervals}
          </p>

          {/* Void Reason (only for void action) */}
          {action === 'void' && (
            <>
              <div className="space-y-2">
                <Label>Reason for Voiding</Label>
                <Select value={reason} onValueChange={(v) => setReason(v as IntervalEntry['voidReason'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOID_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value!}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {reason === 'other' && (
                <div className="space-y-2">
                  <Label htmlFor="custom-reason">Custom Reason</Label>
                  <Input
                    id="custom-reason"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Enter custom reason..."
                  />
                </div>
              )}
            </>
          )}

          {action === 'void' && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Voided intervals will not be counted in percentage calculations.</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleApply}
            variant={action === 'void' ? 'destructive' : 'default'}
          >
            {action === 'void' ? 'Void Intervals' : 'Restore Intervals'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
