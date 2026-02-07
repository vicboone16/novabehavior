import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProtocols } from '@/hooks/useProtocols';
import { CURRICULUM_SYSTEMS, DEFAULT_PROMPT_HIERARCHY, ProtocolStep } from '@/types/protocol';
import { toast } from 'sonner';

interface ProtocolTemplateBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProtocolTemplateBuilder({ open, onOpenChange }: ProtocolTemplateBuilderProps) {
  const { createTemplate } = useProtocols();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [curriculumSystem, setCurriculumSystem] = useState('');
  const [domain, setDomain] = useState('');
  const [dataCollectionMethod, setDataCollectionMethod] = useState('dtt');
  const [steps, setSteps] = useState<ProtocolStep[]>([
    { id: crypto.randomUUID(), order: 1, instruction: '' },
  ]);
  const [masteryPercent, setMasteryPercent] = useState('80');
  const [masterySessions, setMasterySessions] = useState('3');
  const [errorCorrection, setErrorCorrection] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');

  const addStep = () => {
    setSteps([...steps, { id: crypto.randomUUID(), order: steps.length + 1, instruction: '' }]);
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i + 1 })));
  };

  const updateStep = (id: string, field: keyof ProtocolStep, value: string) => {
    setSteps(steps.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Please enter a protocol title');
      return;
    }
    if (steps.every(s => !s.instruction.trim())) {
      toast.error('Please add at least one step with instructions');
      return;
    }

    createTemplate({
      title: title.trim(),
      description: description.trim() || null,
      curriculum_system: curriculumSystem || null,
      domain: domain || null,
      steps: steps.filter(s => s.instruction.trim()),
      materials_needed: [],
      prompt_hierarchy: DEFAULT_PROMPT_HIERARCHY,
      error_correction_procedure: errorCorrection || null,
      mastery_criteria: {
        percentCorrect: parseInt(masteryPercent) || 80,
        consecutiveSessions: parseInt(masterySessions) || 3,
      },
      data_collection_method: dataCollectionMethod,
      estimated_duration_minutes: estimatedDuration ? parseInt(estimatedDuration) : null,
      tags: [],
      is_template: true,
      status: 'active',
    });

    toast.success('Protocol template created');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Create Protocol Template</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Title *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Tacting Common Objects" />
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of the protocol..." rows={2} />
              </div>
              <div>
                <Label>Curriculum System</Label>
                <Select value={curriculumSystem} onValueChange={setCurriculumSystem}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {CURRICULUM_SYSTEMS.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Domain</Label>
                <Input value={domain} onChange={e => setDomain(e.target.value)} placeholder="e.g., Labeling" />
              </div>
              <div>
                <Label>Data Collection</Label>
                <Select value={dataCollectionMethod} onValueChange={setDataCollectionMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dtt">DTT</SelectItem>
                    <SelectItem value="net">NET</SelectItem>
                    <SelectItem value="task_analysis">Task Analysis</SelectItem>
                    <SelectItem value="probe">Probe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Est. Duration (min)</Label>
                <Input type="number" value={estimatedDuration} onChange={e => setEstimatedDuration(e.target.value)} placeholder="15" />
              </div>
            </div>

            {/* Steps */}
            <div>
              <Label className="text-base font-semibold">Teaching Steps</Label>
              <div className="space-y-2 mt-2">
                {steps.map((step) => (
                  <div key={step.id} className="flex items-start gap-2 p-2 border rounded-md">
                    <span className="text-sm font-mono text-muted-foreground mt-2 w-6">{step.order}.</span>
                    <div className="flex-1 space-y-1">
                      <Input
                        value={step.instruction}
                        onChange={e => updateStep(step.id, 'instruction', e.target.value)}
                        placeholder="Step instruction..."
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          value={step.materials || ''}
                          onChange={e => updateStep(step.id, 'materials', e.target.value)}
                          placeholder="Materials needed"
                          className="text-xs h-7"
                        />
                        <Input
                          value={step.promptLevel || ''}
                          onChange={e => updateStep(step.id, 'promptLevel', e.target.value)}
                          placeholder="Prompt level"
                          className="text-xs h-7"
                        />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeStep(step.id)} className="flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addStep} className="mt-2 gap-1">
                <Plus className="w-3 h-3" /> Add Step
              </Button>
            </div>

            {/* Mastery Criteria */}
            <div>
              <Label className="text-base font-semibold">Mastery Criteria</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <Label className="text-xs">Percent Correct</Label>
                  <Input type="number" value={masteryPercent} onChange={e => setMasteryPercent(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Consecutive Sessions</Label>
                  <Input type="number" value={masterySessions} onChange={e => setMasterySessions(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Error Correction */}
            <div>
              <Label>Error Correction Procedure</Label>
              <Textarea value={errorCorrection} onChange={e => setErrorCorrection(e.target.value)} placeholder="Describe the error correction procedure..." rows={2} />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Create Protocol</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
