import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GripVertical, Plus, Trash2, Check, X } from 'lucide-react';
import type { StrategyStep } from '@/hooks/useBehaviorStrategyLibrary';

interface Props {
  strategyId: string;
  steps: StrategyStep[];
  onSave: (step: Partial<StrategyStep> & { strategy_id: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function StrategyStepsEditor({ strategyId, steps, onSave, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState('');

  const startEdit = (step: StrategyStep) => {
    setEditingId(step.id);
    setEditText(step.step_description || '');
  };

  const handleSaveEdit = async (step: StrategyStep) => {
    await onSave({ id: step.id, strategy_id: strategyId, step_description: editText, step_number: step.step_number });
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!newText.trim()) return;
    const maxNum = steps.reduce((max, s) => Math.max(max, s.step_number || 0), 0);
    await onSave({ strategy_id: strategyId, step_description: newText.trim(), step_number: maxNum + 1 });
    setNewText('');
    setAdding(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Implementation Steps</h4>
        <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setAdding(true)}>
          <Plus className="h-3 w-3 mr-1" /> Add Step
        </Button>
      </div>

      <div className="space-y-1">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-1 group">
            <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground w-5 shrink-0">{step.step_number}.</span>
            {editingId === step.id ? (
              <>
                <Input value={editText} onChange={e => setEditText(e.target.value)} className="h-7 text-xs flex-1"
                  onKeyDown={e => e.key === 'Enter' && handleSaveEdit(step)} />
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleSaveEdit(step)}><Check className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
              </>
            ) : (
              <>
                <span className="text-xs flex-1 cursor-pointer hover:underline" onClick={() => startEdit(step)}>
                  {step.step_description || '(empty)'}
                </span>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => onDelete(step.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        ))}

        {adding && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground w-8 shrink-0">New:</span>
            <Input value={newText} onChange={e => setNewText(e.target.value)} className="h-7 text-xs flex-1"
              placeholder="Step description..." autoFocus onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={handleAdd}><Check className="h-3 w-3" /></Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setAdding(false); setNewText(''); }}><X className="h-3 w-3" /></Button>
          </div>
        )}
      </div>
    </div>
  );
}
