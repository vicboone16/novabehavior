import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { X, Plus, AlertTriangle } from 'lucide-react';
import { StrategyStepsEditor } from './StrategyStepsEditor';
import type { BehaviorStrategy, StrategyStep } from '@/hooks/useBehaviorStrategyLibrary';

const GROUPS = [
  'differential_reinforcement', 'antecedent_interventions', 'functional_communication_training',
  'regulation_supports', 'crisis_prevention', 'prompting_and_fading',
  'self_management', 'maintenance_generalization', 'caregiver_generalization',
];
const EVIDENCE = ['strong', 'moderate', 'emerging', 'expert_consensus'];
const FUNCTIONS = ['attention', 'escape', 'access', 'sensory', 'multiple', 'unknown'];
const ESCALATIONS = ['low', 'moderate', 'high', 'crisis'];
const ENVIRONMENTS = ['classroom', 'home', 'community', 'clinic', 'playground', 'virtual'];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<BehaviorStrategy> & { id?: string }) => Promise<void>;
  strategy?: BehaviorStrategy | null;
  steps: StrategyStep[];
  onSaveStep: (step: Partial<StrategyStep> & { strategy_id: string }) => Promise<void>;
  onDeleteStep: (id: string) => Promise<void>;
}

function RepeatableList({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('');
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium">{label}</label>
      <div className="flex flex-wrap gap-1">
        {items.map((item, i) => (
          <Badge key={i} variant="secondary" className="text-xs gap-1">
            {item}
            <X className="h-3 w-3 cursor-pointer" onClick={() => onChange(items.filter((_, j) => j !== i))} />
          </Badge>
        ))}
      </div>
      <div className="flex gap-1">
        <Input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Add item..." className="h-7 text-xs" />
        <Button size="sm" variant="outline" className="h-7" onClick={() => { if (draft.trim()) { onChange([...items, draft.trim()]); setDraft(''); } }}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function MultiSelectPills({ label, options, selected, onToggle }: {
  label: string; options: string[]; selected: string[]; onToggle: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium">{label}</label>
      <div className="flex flex-wrap gap-1">
        {options.map(opt => (
          <Badge key={opt} variant={selected.includes(opt) ? 'default' : 'outline'}
            className="text-[10px] cursor-pointer capitalize"
            onClick={() => onToggle(opt)}>
            {opt.replace(/_/g, ' ')}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function StrategyForm({ open, onClose, onSave, strategy, steps, onSaveStep, onDeleteStep }: Props) {
  const [form, setForm] = useState<Partial<BehaviorStrategy>>({});
  const [keyEdited, setKeyEdited] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(strategy ? { ...strategy } : {
        strategy_name: '', strategy_key: '', strategy_group: null, category: null,
        description: null, evidence_level: null, function_targets: [], escalation_levels: [],
        environments: [], teacher_quick_version: null, family_version: null,
        data_to_collect: [], fidelity_tips: [], staff_scripts: [],
        implementation_notes: null, contraindications: null, sort_order: null,
      });
      setKeyEdited(false);
    }
  }, [open, strategy]);

  const set = (key: string, val: any) => setForm(prev => ({ ...prev, [key]: val }));
  const toggleArray = (key: string, val: string) => {
    const arr = (form[key as keyof BehaviorStrategy] as string[]) || [];
    set(key, arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
  };

  const toStringArray = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(String);
    return [];
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({ ...form, id: strategy?.id });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>{strategy ? 'Edit Strategy' : 'New Strategy'}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="px-4 pb-4 max-h-[70vh]">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium">Strategy Name *</label>
                <Input value={form.strategy_name || ''} onChange={e => set('strategy_name', e.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium">Strategy Key *</label>
                <Input value={form.strategy_key || ''} onChange={e => { set('strategy_key', e.target.value); if (strategy) setKeyEdited(true); }} className="h-8 text-sm" />
                {keyEdited && strategy && (
                  <p className="text-[10px] text-amber-600 flex items-center gap-1 mt-0.5">
                    <AlertTriangle className="h-3 w-3" /> Changing the key may affect links
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium">Strategy Group</label>
                <Select value={form.strategy_group || ''} onValueChange={v => set('strategy_group', v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select group..." /></SelectTrigger>
                  <SelectContent>
                    {GROUPS.map(g => <SelectItem key={g} value={g} className="capitalize text-xs">{g.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">Category</label>
                <Input value={form.category || ''} onChange={e => set('category', e.target.value)} className="h-8 text-sm" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium">Evidence Level</label>
              <Select value={form.evidence_level || ''} onValueChange={v => set('evidence_level', v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select level..." /></SelectTrigger>
                <SelectContent>
                  {EVIDENCE.map(e => <SelectItem key={e} value={e} className="capitalize text-xs">{e.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium">Description</label>
              <Textarea value={form.description || ''} onChange={e => set('description', e.target.value)} rows={3} className="text-sm" />
            </div>

            <Separator />

            <MultiSelectPills label="Function Targets" options={FUNCTIONS} selected={(form.function_targets || []) as string[]} onToggle={v => toggleArray('function_targets', v)} />
            <MultiSelectPills label="Escalation Levels" options={ESCALATIONS} selected={(form.escalation_levels || []) as string[]} onToggle={v => toggleArray('escalation_levels', v)} />
            <MultiSelectPills label="Environments" options={ENVIRONMENTS} selected={(form.environments || []) as string[]} onToggle={v => toggleArray('environments', v)} />

            <Separator />

            <div>
              <label className="text-xs font-medium">Teacher Quick Version</label>
              <Textarea value={form.teacher_quick_version || ''} onChange={e => set('teacher_quick_version', e.target.value)} rows={2} className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium">Family Version</label>
              <Textarea value={form.family_version || ''} onChange={e => set('family_version', e.target.value)} rows={2} className="text-sm" />
            </div>

            <Separator />

            <RepeatableList label="Data to Collect" items={toStringArray(form.data_to_collect)} onChange={v => set('data_to_collect', v)} />
            <RepeatableList label="Fidelity Tips" items={toStringArray(form.fidelity_tips)} onChange={v => set('fidelity_tips', v)} />
            <RepeatableList label="Staff Scripts" items={toStringArray(form.staff_scripts)} onChange={v => set('staff_scripts', v)} />

            <Separator />

            <div>
              <label className="text-xs font-medium">Implementation Notes</label>
              <Textarea value={form.implementation_notes || ''} onChange={e => set('implementation_notes', e.target.value)} rows={2} className="text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium">Contraindications</label>
              <Textarea value={form.contraindications || ''} onChange={e => set('contraindications', e.target.value)} rows={2} className="text-sm" />
            </div>

            {/* Steps editor (only in edit mode for existing strategies) */}
            {strategy?.id && (
              <>
                <Separator />
                <StrategyStepsEditor strategyId={strategy.id} steps={steps} onSave={onSaveStep} onDelete={onDeleteStep} />
              </>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="p-4 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !form.strategy_name?.trim()}>
            {saving ? 'Saving...' : strategy ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
