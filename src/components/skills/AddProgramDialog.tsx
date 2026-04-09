import { useState, useEffect } from 'react';
import { Plus, Trash2, Info, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
import { useDomains } from '@/hooks/useCurriculum';
import { useProgramDomains, useProgramSubdomains } from '@/hooks/useProgramDomains';
import { useSkillPrograms, useSkillProgramActions } from '@/hooks/useSkillPrograms';
import { CanonicalLibraryBrowser } from '@/components/programs/CanonicalLibraryBrowser';
import {
  SKILL_METHOD_LABELS,
  PROGRAM_STATUS_LABELS,
  type SkillMethod,
  type ProgramStatus,
  type SkillProgram,
} from '@/types/skillPrograms';

interface AddProgramDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  editingProgram?: SkillProgram | null;
  onSuccess: () => void;
}

interface TargetDraft {
  name: string;
  operational_definition: string;
  mastery_criteria: string;
}

export function AddProgramDialog({
  open,
  onOpenChange,
  studentId,
  editingProgram,
  onSuccess,
}: AddProgramDialogProps) {
  const { domains } = useDomains();
  const { programs } = useSkillPrograms(studentId);
  const { addProgram, updateProgram } = useSkillProgramActions(studentId, onSuccess);

  const [step, setStep] = useState<'library' | 'form'>('library');
  const [domainId, setDomainId] = useState('');
  const [programName, setProgramName] = useState('');
  const [existingProgramId, setExistingProgramId] = useState('');
  const [method, setMethod] = useState<SkillMethod>('discrete_trial');
  const [status, setStatus] = useState<ProgramStatus>('baseline');
  const [statusDate, setStatusDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [masteryCriteria, setMasteryCriteria] = useState('');
  const [notes, setNotes] = useState('');
  const [promptCountsAsCorrect, setPromptCountsAsCorrect] = useState<boolean | null>(null);
  const [targets, setTargets] = useState<TargetDraft[]>([{ name: '', operational_definition: '', mastery_criteria: '' }]);
  const [taSteps, setTaSteps] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Canonical library data for domain resolution
  const { data: canonicalDomains = [] } = useProgramDomains();

  // Filter programs by selected domain
  const domainPrograms = programs.filter(p => p.domain_id === domainId);

  useEffect(() => {
    if (editingProgram) {
      setDomainId(editingProgram.top_level_domain_id || editingProgram.domain_id || '');
      setProgramName(editingProgram.name);
      setMethod(editingProgram.method as SkillMethod);
      setStatus(editingProgram.status as ProgramStatus);
      setStatusDate(editingProgram.status_effective_date);
      setDescription(editingProgram.description || '');
      setMasteryCriteria(editingProgram.default_mastery_criteria || '');
      setNotes(editingProgram.notes || '');
      setPromptCountsAsCorrect(editingProgram.prompt_counts_as_correct ?? null);
      setTargets([{ name: '', operational_definition: '', mastery_criteria: '' }]);
    } else {
      resetForm();
    }
  }, [editingProgram, open]);

  const resetForm = () => {
    setDomainId('');
    setProgramName('');
    setExistingProgramId('');
    setMethod('discrete_trial');
    setStatus('baseline');
    setStatusDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setMasteryCriteria('');
    setNotes('');
    setPromptCountsAsCorrect(null);
    setTargets([{ name: '', operational_definition: '', mastery_criteria: '' }]);
    setTaSteps([]);
  };

  const addTargetRow = () => {
    setTargets(prev => [...prev, { name: '', operational_definition: '', mastery_criteria: '' }]);
  };

  const removeTargetRow = (idx: number) => {
    setTargets(prev => prev.filter((_, i) => i !== idx));
  };

  const updateTargetRow = (idx: number, field: keyof TargetDraft, value: string) => {
    setTargets(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const handleSubmit = async () => {
    const finalName = existingProgramId
      ? programs.find(p => p.id === existingProgramId)?.name || programName
      : programName;

    if (!finalName.trim() || !domainId) return;

    setSaving(true);
    try {
      if (editingProgram) {
        await updateProgram(editingProgram.id, {
          name: programName,
          top_level_domain_id: domainId || null,
          method,
          status,
          status_effective_date: statusDate,
          description: description || null,
          default_mastery_criteria: masteryCriteria || null,
          notes: notes || null,
          prompt_counts_as_correct: promptCountsAsCorrect,
        } as any);
      } else {
        const validTargets = targets.filter(t => t.name.trim());
        await addProgram({
          name: finalName.trim(),
          domain_id: domainId || null,
          method,
          status,
          status_effective_date: statusDate,
          description: description || undefined,
          default_mastery_criteria: masteryCriteria || undefined,
          notes: notes || undefined,
          prompt_counts_as_correct: promptCountsAsCorrect,
          targets: validTargets.length > 0 ? validTargets : undefined,
        });
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const showTASetup = method === 'task_analysis';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingProgram ? 'Edit Program' : 'Add Skill Program + Targets'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Step A: Program Setup */}
          <div className="space-y-4 border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Program Setup
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Domain *</Label>
                <Select value={domainId} onValueChange={(v) => { setDomainId(v); setExistingProgramId(''); }}>
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
                <Label>Program / Skill Area *</Label>
                {!editingProgram && domainPrograms.length > 0 ? (
                  <Select
                    value={existingProgramId || '__new__'}
                    onValueChange={(v) => {
                      if (v === '__new__') {
                        setExistingProgramId('');
                      } else {
                        setExistingProgramId(v);
                        const p = programs.find(pr => pr.id === v);
                        if (p) {
                          setProgramName(p.name);
                          setMethod(p.method as SkillMethod);
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select or create" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__new__">+ Create new program</SelectItem>
                      {domainPrograms.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={programName}
                    onChange={e => setProgramName(e.target.value)}
                    placeholder="e.g., Manding, Tacting, Coping"
                  />
                )}
                {!existingProgramId && !editingProgram && domainPrograms.length > 0 && (
                  <Input
                    value={programName}
                    onChange={e => setProgramName(e.target.value)}
                    placeholder="New program name"
                    className="mt-1"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Method</Label>
                <Select value={method} onValueChange={v => setMethod(v as SkillMethod)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SKILL_METHOD_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={v => setStatus(v as ProgramStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROGRAM_STATUS_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Effective Date</Label>
                <Input
                  type="date"
                  value={statusDate}
                  onChange={e => setStatusDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Default Mastery Criteria</Label>
              <Input
                value={masteryCriteria}
                onChange={e => setMasteryCriteria(e.target.value)}
                placeholder="e.g., 80% across 3 consecutive sessions"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Program description..."
                rows={2}
              />
            </div>

            {/* Prompt Correctness Setting */}
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Prompted = Correct?</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[280px]">
                    <p className="text-xs">When enabled, prompted responses are counted as correct in reports and mastery calculations. When disabled, only independent responses count as correct. This can be overridden per target.</p>
                  </TooltipContent>
                </Tooltip>
                <span className="text-xs text-muted-foreground">
                  {promptCountsAsCorrect === null ? '(Inherits from student)' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {promptCountsAsCorrect !== null && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground"
                    onClick={() => setPromptCountsAsCorrect(null)}
                  >
                    Reset
                  </Button>
                )}
                <Switch
                  checked={promptCountsAsCorrect ?? false}
                  onCheckedChange={(checked) => setPromptCountsAsCorrect(checked)}
                />
              </div>
            </div>
          </div>

          {/* Step B: Targets */}
          {!existingProgramId && (
            <div className="space-y-4 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Targets
                </h3>
                <Button variant="outline" size="sm" onClick={addTargetRow}>
                  <Plus className="w-3 h-3 mr-1" /> Add Target
                </Button>
              </div>

              {targets.map((target, idx) => (
                <div key={idx} className="space-y-2 border-b pb-3 last:border-b-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground w-6">#{idx + 1}</span>
                    <Input
                      value={target.name}
                      onChange={e => updateTargetRow(idx, 'name', e.target.value)}
                      placeholder="Target name"
                      className="flex-1"
                    />
                    {targets.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeTargetRow(idx)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <div className="ml-8 grid grid-cols-2 gap-2">
                    <Input
                      value={target.operational_definition}
                      onChange={e => updateTargetRow(idx, 'operational_definition', e.target.value)}
                      placeholder="Operational definition"
                      className="text-sm"
                    />
                    <Input
                      value={target.mastery_criteria}
                      onChange={e => updateTargetRow(idx, 'mastery_criteria', e.target.value)}
                      placeholder="Mastery criteria (optional)"
                      className="text-sm"
                    />
                  </div>

                  {/* Task Analysis Steps */}
                  {showTASetup && idx === 0 && (
                    <div className="ml-8 mt-2 space-y-2 bg-muted/50 rounded p-3">
                      <Label className="text-xs">Task Analysis Steps</Label>
                      {taSteps.map((step, si) => (
                        <div key={si} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-8">Step {si + 1}</span>
                          <Input
                            value={step}
                            onChange={e => {
                              const updated = [...taSteps];
                              updated[si] = e.target.value;
                              setTaSteps(updated);
                            }}
                            placeholder="Step description"
                            className="text-sm"
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setTaSteps(prev => prev.filter((_, i) => i !== si))}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => setTaSteps(prev => [...prev, ''])}>
                        <Plus className="w-3 h-3 mr-1" /> Add Step
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || (!programName.trim() && !existingProgramId) || !domainId}
          >
            {editingProgram ? 'Save Changes' : existingProgramId ? 'Add Targets to Program' : 'Create Program + Targets'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
