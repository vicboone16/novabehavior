import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Domain } from '@/types/curriculum';

interface MoveProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  programId: string;
  programName: string;
  currentDomainId: string | null;
  domains: Domain[];
  onSuccess: () => void;
}

export function MoveProgramDialog({
  open,
  onOpenChange,
  programId,
  programName,
  currentDomainId,
  domains,
  onSuccess,
}: MoveProgramDialogProps) {
  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleMove = async () => {
    if (!selectedDomainId) return;
    setLoading(true);

    const domainValue = selectedDomainId === '__none__' ? null : selectedDomainId;

    const { error } = await supabase
      .from('skill_programs')
      .update({ domain_id: domainValue } as any)
      .eq('id', programId);

    setLoading(false);
    if (error) {
      toast.error('Failed to move program');
      console.error(error);
    } else {
      toast.success(`Moved "${programName}" to new domain`);
      onOpenChange(false);
      setSelectedDomainId('');
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move Program to Domain</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="text-sm">
            <span className="text-muted-foreground">Program:</span>{' '}
            <span className="font-medium">{programName}</span>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Destination Domain</label>
            <Select value={selectedDomainId} onValueChange={setSelectedDomainId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a domain..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No Domain (Unassigned)</SelectItem>
                {domains
                  .filter(d => d.id !== currentDomainId)
                  .map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleMove} disabled={!selectedDomainId || loading}>
            {loading ? 'Moving...' : 'Move Program'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
