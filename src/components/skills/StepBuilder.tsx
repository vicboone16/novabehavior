import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface StepDraft {
  step_number: number;
  step_label: string;
  step_notes?: string;
}

interface StepBuilderProps {
  steps: StepDraft[];
  onChange: (steps: StepDraft[]) => void;
}

export function StepBuilder({ steps, onChange }: StepBuilderProps) {
  const [quickCount, setQuickCount] = useState('');

  const addStep = () => {
    const next = steps.length + 1;
    onChange([...steps, { step_number: next, step_label: '', step_notes: '' }]);
  };

  const removeStep = (idx: number) => {
    const updated = steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step_number: i + 1 }));
    onChange(updated);
  };

  const updateStep = (idx: number, field: keyof StepDraft, value: string | number) => {
    onChange(steps.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const handleQuickCreate = () => {
    const n = parseInt(quickCount);
    if (!n || n < 1 || n > 50) return;
    const newSteps: StepDraft[] = Array.from({ length: n }, (_, i) => ({
      step_number: i + 1,
      step_label: '',
      step_notes: '',
    }));
    onChange(newSteps);
    setQuickCount('');
  };

  const moveStep = (from: number, to: number) => {
    if (to < 0 || to >= steps.length) return;
    const updated = [...steps];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    onChange(updated.map((s, i) => ({ ...s, step_number: i + 1 })));
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Task Analysis Steps</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              max={50}
              value={quickCount}
              onChange={e => setQuickCount(e.target.value)}
              placeholder="# steps"
              className="w-20 h-7 text-xs"
            />
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleQuickCreate} disabled={!quickCount}>
              Quick Create
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No steps defined. Add steps or use Quick Create.
          </p>
        )}

        {steps.map((step, idx) => (
          <div key={idx} className="flex items-center gap-2 group">
            <div className="flex flex-col gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 opacity-0 group-hover:opacity-100"
                onClick={() => moveStep(idx, idx - 1)}
                disabled={idx === 0}
              >
                <span className="text-[10px]">▲</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 opacity-0 group-hover:opacity-100"
                onClick={() => moveStep(idx, idx + 1)}
                disabled={idx === steps.length - 1}
              >
                <span className="text-[10px]">▼</span>
              </Button>
            </div>
            <span className="text-xs text-muted-foreground w-8 shrink-0 text-right">
              {step.step_number}.
            </span>
            <Input
              value={step.step_label}
              onChange={e => updateStep(idx, 'step_label', e.target.value)}
              placeholder={`Step ${step.step_number} description`}
              className="text-sm flex-1"
            />
            <Input
              value={step.step_notes || ''}
              onChange={e => updateStep(idx, 'step_notes', e.target.value)}
              placeholder="Notes (optional)"
              className="text-xs w-32 hidden md:block"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
              onClick={() => removeStep(idx)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}

        <Button variant="outline" size="sm" onClick={addStep} className="w-full mt-2">
          <Plus className="w-3 h-3 mr-1" /> Add Step
        </Button>
      </CardContent>
    </Card>
  );
}
