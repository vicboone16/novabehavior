import { useState } from 'react';
import { Plus, Trash2, Layers, Calendar, Edit2, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { BehaviorGoal, PhaseChange } from '@/types/behavior';
import { useDataStore } from '@/store/dataStore';

interface PhaseChangeManagerProps {
  goal: BehaviorGoal;
  behaviorName: string;
}

const PHASE_TYPES: { value: PhaseChange['phaseType']; label: string; color: string }[] = [
  { value: 'baseline', label: 'Baseline', color: 'bg-slate-500' },
  { value: 'intervention', label: 'Intervention', color: 'bg-blue-500' },
  { value: 'generalization', label: 'Generalization', color: 'bg-purple-500' },
  { value: 'maintenance', label: 'Maintenance', color: 'bg-green-500' },
  { value: 'modification', label: 'Modification', color: 'bg-orange-500' },
  { value: 'custom', label: 'Custom', color: 'bg-gray-500' },
];

export function PhaseChangeManager({ goal, behaviorName }: PhaseChangeManagerProps) {
  const { updateBehaviorGoal } = useDataStore();
  const [open, setOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<PhaseChange | null>(null);
  
  // Form state
  const [phaseDate, setPhaseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [phaseLabel, setPhaseLabel] = useState('');
  const [phaseType, setPhaseType] = useState<PhaseChange['phaseType']>('intervention');
  const [phaseDescription, setPhaseDescription] = useState('');

  const phaseChanges = goal.phaseChanges || [];

  const resetForm = () => {
    setPhaseDate(format(new Date(), 'yyyy-MM-dd'));
    setPhaseLabel('');
    setPhaseType('intervention');
    setPhaseDescription('');
    setEditingPhase(null);
  };

  const handleSave = () => {
    if (!phaseLabel.trim()) {
      toast.error('Please enter a label for the phase change');
      return;
    }

    const [year, month, day] = phaseDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    if (editingPhase) {
      // Update existing phase
      const updatedPhases = phaseChanges.map(pc => 
        pc.id === editingPhase.id 
          ? { ...pc, date, label: phaseLabel.trim(), phaseType, description: phaseDescription.trim() || undefined }
          : pc
      );
      updateBehaviorGoal(goal.id, { phaseChanges: updatedPhases });
      toast.success('Phase change updated');
    } else {
      // Add new phase
      const newPhase: PhaseChange = {
        id: crypto.randomUUID(),
        date,
        label: phaseLabel.trim(),
        phaseType,
        description: phaseDescription.trim() || undefined,
      };
      updateBehaviorGoal(goal.id, { phaseChanges: [...phaseChanges, newPhase] });
      toast.success('Phase change added');
    }

    resetForm();
  };

  const handleEdit = (phase: PhaseChange) => {
    setEditingPhase(phase);
    setPhaseDate(format(new Date(phase.date), 'yyyy-MM-dd'));
    setPhaseLabel(phase.label);
    setPhaseType(phase.phaseType);
    setPhaseDescription(phase.description || '');
  };

  const handleDelete = (phaseId: string) => {
    const updatedPhases = phaseChanges.filter(pc => pc.id !== phaseId);
    updateBehaviorGoal(goal.id, { phaseChanges: updatedPhases });
    toast.success('Phase change deleted');
  };

  const getPhaseColor = (type: PhaseChange['phaseType']) => {
    return PHASE_TYPES.find(pt => pt.value === type)?.color || 'bg-gray-500';
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs">
          <Layers className="w-3 h-3" />
          Phases ({phaseChanges.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Phase Changes - {behaviorName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add/Edit Form */}
          <div className="bg-secondary/30 rounded-lg p-3 space-y-3">
            <h4 className="text-sm font-medium">
              {editingPhase ? 'Edit Phase Change' : 'Add Phase Change'}
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={phaseDate}
                  onChange={(e) => setPhaseDate(e.target.value)}
                  className="h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phase Type</Label>
                <Select value={phaseType} onValueChange={(v) => setPhaseType(v as PhaseChange['phaseType'])}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PHASE_TYPES.map(pt => (
                      <SelectItem key={pt.value} value={pt.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${pt.color}`} />
                          {pt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Label (shown on graph)</Label>
              <Input
                value={phaseLabel}
                onChange={(e) => setPhaseLabel(e.target.value)}
                placeholder="e.g., Started intervention, Changed reinforcer"
                className="h-8"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Description (optional)</Label>
              <Textarea
                value={phaseDescription}
                onChange={(e) => setPhaseDescription(e.target.value)}
                placeholder="Additional notes about this phase change..."
                rows={2}
                className="text-sm"
              />
            </div>

            <div className="flex gap-2">
              {editingPhase && (
                <Button variant="outline" size="sm" onClick={resetForm}>
                  <X className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
              )}
              <Button size="sm" onClick={handleSave} className="flex-1">
                {editingPhase ? <Save className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                {editingPhase ? 'Update' : 'Add Phase Change'}
              </Button>
            </div>
          </div>

          {/* Existing Phase Changes */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Current Phase Changes
            </h4>
            
            {phaseChanges.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No phase changes added yet. Add one above to mark transitions on graphs.
              </p>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {phaseChanges
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map(phase => (
                    <div 
                      key={phase.id} 
                      className="flex items-start justify-between p-2 bg-secondary/20 rounded-md"
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 mt-1.5 rounded-full ${getPhaseColor(phase.phaseType)}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{phase.label}</span>
                            <Badge variant="outline" className="text-xs">
                              {PHASE_TYPES.find(pt => pt.value === phase.phaseType)?.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(phase.date), 'MMM d, yyyy')}
                          </div>
                          {phase.description && (
                            <p className="text-xs text-muted-foreground mt-1">{phase.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => handleEdit(phase)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive"
                          onClick={() => handleDelete(phase.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
