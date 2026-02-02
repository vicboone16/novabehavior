import { useState } from 'react';
import { Plus, Target, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { toast } from 'sonner';

interface AddTargetFromProbeProps {
  studentId: string;
  studentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const DATA_COLLECTION_TYPES = [
  { value: 'discrete_trial', label: 'Discrete Trial (DTT)' },
  { value: 'probe', label: 'Cold Probe' },
  { value: 'frequency', label: 'Frequency' },
  { value: 'duration', label: 'Duration' },
  { value: 'task_analysis', label: 'Task Analysis' },
];

const PRIORITIES = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

export function AddTargetFromProbe({
  studentId,
  studentName,
  open,
  onOpenChange,
  onSuccess,
}: AddTargetFromProbeProps) {
  const { domains } = useDomains();
  const { addTarget } = useTargetActions(studentId, onSuccess);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    mastery_criteria: '',
    domain_id: '',
    data_collection_type: 'probe',
    priority: 'medium',
    notes_for_staff: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a target title');
      return;
    }

    setSaving(true);
    try {
      await addTarget({
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        mastery_criteria: formData.mastery_criteria.trim() || null,
        domain_id: formData.domain_id || null,
        data_collection_type: formData.data_collection_type,
        priority: formData.priority as 'high' | 'medium' | 'low',
        notes_for_staff: formData.notes_for_staff.trim() || null,
        source_type: 'custom',
      });

      toast.success(`Target "${formData.title}" added successfully`);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        mastery_criteria: '',
        domain_id: '',
        data_collection_type: 'probe',
        priority: 'medium',
        notes_for_staff: '',
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding target:', error);
      toast.error('Failed to add target');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <DialogTitle>Add Skill Target</DialogTitle>
          </div>
          <DialogDescription>
            Add a new skill acquisition target for {studentName}. This will auto-populate on their student profile.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="target-title">Target Title *</Label>
            <Input
              id="target-title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Mand for preferred items"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Domain</Label>
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
            <Label htmlFor="target-description">Description</Label>
            <Textarea
              id="target-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Operational definition of the skill..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-mastery">Mastery Criteria</Label>
            <Input
              id="target-mastery"
              value={formData.mastery_criteria}
              onChange={(e) => setFormData(prev => ({ ...prev, mastery_criteria: e.target.value }))}
              placeholder="e.g., 80% correct across 3 consecutive sessions"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-notes">Notes for Staff</Label>
            <Textarea
              id="target-notes"
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
          <Button onClick={handleSubmit} disabled={!formData.title.trim() || saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Target
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
