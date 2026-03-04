import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDomains, useTargetActions } from '@/hooks/useCurriculum';
import type { StudentTarget } from '@/types/curriculum';

interface AddTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  editingTarget: StudentTarget | null;
  onSuccess: () => void;
}

const DATA_COLLECTION_TYPES = [
  { value: 'discrete_trial', label: 'Discrete Trial (DTT)' },
  { value: 'frequency', label: 'Frequency' },
  { value: 'duration', label: 'Duration' },
  { value: 'latency', label: 'Latency' },
  { value: 'interval', label: 'Interval Recording' },
  { value: 'task_analysis', label: 'Task Analysis' },
  { value: 'probe', label: 'Probe/Cold Probe' },
];

const PRIORITIES = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export function AddTargetDialog({ 
  open, 
  onOpenChange, 
  studentId, 
  editingTarget, 
  onSuccess 
}: AddTargetDialogProps) {
  const { domains } = useDomains();
  const { addTarget, updateTarget } = useTargetActions(studentId, onSuccess);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    mastery_criteria: '',
    domain_id: '',
    data_collection_type: 'discrete_trial',
    priority: 'medium',
    notes_for_staff: '',
  });
  const [saving, setSaving] = useState(false);
  const [allowUnassigned, setAllowUnassigned] = useState(false);
  const [confirmUnassigned, setConfirmUnassigned] = useState(false);

  useEffect(() => {
    if (editingTarget) {
      setFormData({
        title: editingTarget.title,
        description: editingTarget.description || '',
        mastery_criteria: editingTarget.mastery_criteria || '',
        domain_id: editingTarget.domain_id || '',
        data_collection_type: editingTarget.data_collection_type,
        priority: editingTarget.priority,
        notes_for_staff: editingTarget.notes_for_staff || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        mastery_criteria: '',
        domain_id: '',
        data_collection_type: 'discrete_trial',
        priority: 'medium',
        notes_for_staff: '',
      });
      setAllowUnassigned(false);
      setConfirmUnassigned(false);
    }
  }, [editingTarget, open]);

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;

    setSaving(true);
    try {
      if (editingTarget) {
        await updateTarget(editingTarget.id, {
          ...formData,
          priority: formData.priority as 'high' | 'medium' | 'low',
          domain_id: formData.domain_id || null,
          customized: editingTarget.source_id ? true : editingTarget.customized,
        });
      } else {
        await addTarget({
          ...formData,
          priority: formData.priority as 'high' | 'medium' | 'low',
          domain_id: formData.domain_id || null,
          source_type: 'custom',
        });
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  // Domain acts as program grouping; if no domain selected, it's "unassigned"
  const isDomainSelected = !!formData.domain_id;
  const canSubmitUnassigned = allowUnassigned && confirmUnassigned;
  const canSubmit = formData.title.trim() && (isDomainSelected || canSubmitUnassigned);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editingTarget ? 'Edit Target' : 'Create Custom Target'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Target Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Mand for preferred items"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Domain (required) *</Label>
              <Select 
                value={formData.domain_id} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, domain_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select domain" />
                </SelectTrigger>
                <SelectContent>
                  {domains.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data Collection</Label>
              <Select 
                value={formData.data_collection_type} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, data_collection_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATA_COLLECTION_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Unassigned target warning */}
          {!isDomainSelected && !editingTarget && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive">Unassigned target (Inbox)</p>
                  <p className="text-xs text-muted-foreground">
                    Targets without a domain/program are not recommended. They won't appear in skill acquisition groupings.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between pl-6">
                <Label className="text-xs">Allow unassigned target</Label>
                <Switch
                  checked={allowUnassigned}
                  onCheckedChange={v => { setAllowUnassigned(v); if (!v) setConfirmUnassigned(false); }}
                  className="scale-90"
                />
              </div>
              {allowUnassigned && (
                <div className="flex items-start gap-2 pl-6">
                  <Checkbox
                    id="confirm-unassigned"
                    checked={confirmUnassigned}
                    onCheckedChange={v => setConfirmUnassigned(!!v)}
                  />
                  <Label htmlFor="confirm-unassigned" className="text-xs text-muted-foreground cursor-pointer">
                    I understand this target will not appear under a program
                  </Label>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select 
              value={formData.priority} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, priority: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Operational definition of the skill..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mastery">Mastery Criteria</Label>
            <Input
              id="mastery"
              value={formData.mastery_criteria}
              onChange={(e) => setFormData(prev => ({ ...prev, mastery_criteria: e.target.value }))}
              placeholder="e.g., 80% correct across 3 consecutive sessions"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes for Staff</Label>
            <Textarea
              id="notes"
              value={formData.notes_for_staff}
              onChange={(e) => setFormData(prev => ({ ...prev, notes_for_staff: e.target.value }))}
              placeholder="Teaching procedures, materials needed, etc."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
            {editingTarget ? 'Save Changes' : 'Create Target'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
