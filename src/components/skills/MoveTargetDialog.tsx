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
import type { SkillProgram } from '@/types/skillPrograms';

interface MoveTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetId: string;
  targetName: string;
  currentProgramId: string;
  programs: SkillProgram[];
  onSuccess: () => void;
}

export function MoveTargetDialog({
  open,
  onOpenChange,
  targetId,
  targetName,
  currentProgramId,
  programs,
  onSuccess,
}: MoveTargetDialogProps) {
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [loading, setLoading] = useState(false);

  const availablePrograms = programs.filter(p => p.id !== currentProgramId);

  const handleMove = async () => {
    if (!selectedProgramId) return;
    setLoading(true);

    const { error } = await supabase
      .from('skill_targets')
      .update({ program_id: selectedProgramId } as any)
      .eq('id', targetId);

    setLoading(false);
    if (error) {
      toast.error('Failed to move target');
      console.error(error);
    } else {
      toast.success(`Moved "${targetName}" to new program`);
      onOpenChange(false);
      setSelectedProgramId('');
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Move Target to Program</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="text-sm">
            <span className="text-muted-foreground">Target:</span>{' '}
            <span className="font-medium">{targetName}</span>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Destination Program</label>
            <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a program..." />
              </SelectTrigger>
              <SelectContent>
                {availablePrograms.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.domain?.name ? `${p.domain.name} › ` : ''}{p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleMove} disabled={!selectedProgramId || loading}>
            {loading ? 'Moving...' : 'Move Target'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
