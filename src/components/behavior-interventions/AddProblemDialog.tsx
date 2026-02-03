import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useBxLibraryActions } from '@/hooks/useBehaviorInterventions';
import { BX_DOMAINS, type FunctionTag, type RiskLevel } from '@/types/behaviorIntervention';

const FUNCTION_OPTIONS: FunctionTag[] = ['escape', 'attention', 'tangible', 'automatic', 'multiple', 'unknown'];
const RISK_OPTIONS: RiskLevel[] = ['low', 'medium', 'high', 'crisis'];

interface AddProblemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddProblemDialog({ open, onOpenChange, onSuccess }: AddProblemDialogProps) {
  const { createProblem } = useBxLibraryActions();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    problem_code: '',
    title: '',
    domain: 'behavior_compliance_self_management',
    definition: '',
    risk_level: 'medium' as RiskLevel,
    function_tags: [] as FunctionTag[],
    examples: '',
    trigger_tags: '',
    contraindications: '',
  });

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;

    setSaving(true);
    try {
      const code = formData.problem_code.trim() || `bx-${Date.now().toString().slice(-4)}`;
      
      await createProblem({
        problem_code: code,
        title: formData.title.trim(),
        domain: formData.domain,
        definition: formData.definition.trim() || undefined,
        risk_level: formData.risk_level,
        function_tags: formData.function_tags,
        examples: formData.examples ? formData.examples.split('\n').filter(e => e.trim()) : [],
        trigger_tags: formData.trigger_tags ? formData.trigger_tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        contraindications: formData.contraindications ? formData.contraindications.split('\n').filter(c => c.trim()) : [],
        source_origin: 'user_custom',
        status: 'active',
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating problem:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      problem_code: '',
      title: '',
      domain: 'behavior_compliance_self_management',
      definition: '',
      risk_level: 'medium',
      function_tags: [],
      examples: '',
      trigger_tags: '',
      contraindications: '',
    });
  };

  const toggleFunction = (fn: FunctionTag) => {
    setFormData(prev => ({
      ...prev,
      function_tags: prev.function_tags.includes(fn)
        ? prev.function_tags.filter(f => f !== fn)
        : [...prev.function_tags, fn]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Presenting Problem</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Problem Code</Label>
              <Input
                id="code"
                value={formData.problem_code}
                onChange={(e) => setFormData(prev => ({ ...prev, problem_code: e.target.value }))}
                placeholder="bx-001 (auto-generated)"
              />
            </div>
            <div className="space-y-2">
              <Label>Risk Level</Label>
              <Select 
                value={formData.risk_level} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, risk_level: v as RiskLevel }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RISK_OPTIONS.map(r => (
                    <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Noncompliance with Adult Requests"
            />
          </div>

          <div className="space-y-2">
            <Label>Domain</Label>
            <Select 
              value={formData.domain} 
              onValueChange={(v) => setFormData(prev => ({ ...prev, domain: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BX_DOMAINS.map(d => (
                  <SelectItem key={d.domain} value={d.domain}>
                    {d.labels[0]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="definition">Definition</Label>
            <Textarea
              id="definition"
              value={formData.definition}
              onChange={(e) => setFormData(prev => ({ ...prev, definition: e.target.value }))}
              placeholder="Operational definition of the behavior..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Function Tags</Label>
            <div className="flex flex-wrap gap-2">
              {FUNCTION_OPTIONS.map(fn => (
                <Badge
                  key={fn}
                  variant={formData.function_tags.includes(fn) ? "default" : "outline"}
                  className="cursor-pointer capitalize"
                  onClick={() => toggleFunction(fn)}
                >
                  {fn}
                  {formData.function_tags.includes(fn) && (
                    <X className="w-3 h-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="examples">Examples (one per line)</Label>
            <Textarea
              id="examples"
              value={formData.examples}
              onChange={(e) => setFormData(prev => ({ ...prev, examples: e.target.value }))}
              placeholder="Refusing to complete worksheets&#10;Walking away when given an instruction"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="triggers">Trigger Tags (comma-separated)</Label>
            <Input
              id="triggers"
              value={formData.trigger_tags}
              onChange={(e) => setFormData(prev => ({ ...prev, trigger_tags: e.target.value }))}
              placeholder="demands, transitions, novel tasks"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contraindications">Contraindications (one per line)</Label>
            <Textarea
              id="contraindications"
              value={formData.contraindications}
              onChange={(e) => setFormData(prev => ({ ...prev, contraindications: e.target.value }))}
              placeholder="Do not use extinction if behavior is maintained by automatic reinforcement"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.title.trim() || saving}>
            {saving ? 'Creating...' : 'Create Problem'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
