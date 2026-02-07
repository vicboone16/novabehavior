import { useState } from 'react';
import { Car, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface MileageTrackerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MileageTracker({ open, onOpenChange }: MileageTrackerProps) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [mileage, setMileage] = useState('');
  const [driveMinutes, setDriveMinutes] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (!mileage || !driveMinutes) {
      toast.error('Please enter mileage and drive time');
      return;
    }
    toast.success(`Logged ${mileage} miles, ${driveMinutes} min drive time`);
    onOpenChange(false);
    setStartLocation('');
    setEndLocation('');
    setMileage('');
    setDriveMinutes('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="w-5 h-5" />
            Log Drive Time & Mileage
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>From</Label>
              <Input placeholder="Starting location" value={startLocation} onChange={e => setStartLocation(e.target.value)} />
            </div>
            <div>
              <Label>To</Label>
              <Input placeholder="Destination" value={endLocation} onChange={e => setEndLocation(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Mileage</Label>
              <Input type="number" placeholder="Miles" value={mileage} onChange={e => setMileage(e.target.value)} />
            </div>
            <div>
              <Label>Drive Time (min)</Label>
              <Input type="number" placeholder="Minutes" value={driveMinutes} onChange={e => setDriveMinutes(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea placeholder="Optional notes..." value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} className="gap-2">
            <Plus className="w-4 h-4" /> Log Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
