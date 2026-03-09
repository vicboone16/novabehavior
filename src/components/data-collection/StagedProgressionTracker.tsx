import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Layers, Plus, Check, ChevronRight, ArrowRight,
  Target, ListChecks, StepForward, TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { useProgressionGroups, type ProgressionGroup } from '@/hooks/useProgressionGroups';

interface StagedProgressionTrackerProps {
  studentId: string;
  studentName?: string;
  targetId?: string;
}

export function StagedProgressionTracker({ studentId, studentName, targetId }: StagedProgressionTrackerProps) {
  const {
    groups, steps, summaries, loading,
    loadGroups, loadSteps, loadSummaries,
    createGroup, addStep, markStepMastered,
  } = useProgressionGroups(studentId);

  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState<string>('target_sequence');
  const [showAddStep, setShowAddStep] = useState(false);
  const [newStepLabel, setNewStepLabel] = useState('');
  const [newStepCriterion, setNewStepCriterion] = useState('');
  const [newStepUnit, setNewStepUnit] = useState('');
  const [tab, setTab] = useState<string>('target_sequence');

  useEffect(() => {
    loadGroups();
    loadSummaries();
  }, [loadGroups, loadSummaries]);

  useEffect(() => {
    if (selectedGroupId) loadSteps(selectedGroupId);
  }, [selectedGroupId, loadSteps]);

  const filteredGroups = groups.filter(g => g.progression_type === tab);
  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    const group = await createGroup({
      group_name: newGroupName.trim(),
      progression_type: newGroupType,
      target_id: targetId || undefined,
    });
    if (group) {
      setSelectedGroupId(group.id);
      setShowCreate(false);
      setNewGroupName('');
      toast.success('Progression group created');
    }
  };

  const handleAddStep = async () => {
    if (!newStepLabel.trim() || !selectedGroupId) return;
    await addStep({
      group_id: selectedGroupId,
      step_order: steps.length + 1,
      step_label: newStepLabel.trim(),
      step_type: tab,
      criterion_value: newStepCriterion ? parseFloat(newStepCriterion) : undefined,
      criterion_unit: newStepUnit || undefined,
    });
    await loadSteps(selectedGroupId);
    setShowAddStep(false);
    setNewStepLabel('');
    setNewStepCriterion('');
    toast.success('Step added');
  };

  const handleMasterStep = async (stepId: string) => {
    if (!selectedGroupId) return;
    await markStepMastered(stepId, selectedGroupId);
    toast.success('Step mastered!');
    loadSummaries();
  };

  const typeLabels: Record<string, string> = {
    target_sequence: 'Target Sequence',
    task_analysis: 'Task Analysis',
    benchmark: 'Benchmark',
    changing_criterion: 'Changing Criterion',
  };

  const typeIcons: Record<string, React.ReactNode> = {
    target_sequence: <Target className="w-3 h-3" />,
    task_analysis: <ListChecks className="w-3 h-3" />,
    benchmark: <StepForward className="w-3 h-3" />,
    changing_criterion: <TrendingUp className="w-3 h-3" />,
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Staged Progression
            </CardTitle>
            <CardDescription className="text-xs">
              Track progress through target sequences, task analyses, and benchmarks
              {studentName && ` — ${studentName}`}
            </CardDescription>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                <Plus className="w-3 h-3" /> New Group
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-base">New Progression Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Group Name *</Label>
                  <Input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="e.g., Manding progression" className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Progression Type</Label>
                  <Select value={newGroupType} onValueChange={setNewGroupType}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="target_sequence">Target Sequence</SelectItem>
                      <SelectItem value="task_analysis">Task Analysis</SelectItem>
                      <SelectItem value="benchmark">Benchmark</SelectItem>
                      <SelectItem value="changing_criterion">Changing Criterion</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" className="w-full text-xs" onClick={handleCreateGroup}>Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="target_sequence" className="text-[10px] gap-1">
              <Target className="w-3 h-3" /> Targets
            </TabsTrigger>
            <TabsTrigger value="task_analysis" className="text-[10px] gap-1">
              <ListChecks className="w-3 h-3" /> Task Analysis
            </TabsTrigger>
            <TabsTrigger value="benchmark" className="text-[10px] gap-1">
              <StepForward className="w-3 h-3" /> Benchmarks
            </TabsTrigger>
            <TabsTrigger value="changing_criterion" className="text-[10px] gap-1">
              <TrendingUp className="w-3 h-3" /> Criterion
            </TabsTrigger>
          </TabsList>

          {['target_sequence', 'task_analysis', 'benchmark', 'changing_criterion'].map(type => (
            <TabsContent key={type} value={type} className="mt-3 space-y-3">
              {/* Group selector */}
              <div className="flex gap-2 items-center">
                <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                  <SelectTrigger className="h-8 text-xs flex-1">
                    <SelectValue placeholder={`Select ${typeLabels[type]} group...`} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredGroups.map(g => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.group_name} ({g.current_step}/{g.total_steps})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Summaries */}
              {!selectedGroupId && summaries.filter(s => s.progression_type === type).length > 0 && (
                <div className="space-y-2">
                  {summaries.filter(s => s.progression_type === type).map(s => (
                    <div
                      key={s.group_id}
                      className="p-2 rounded border border-border/50 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setSelectedGroupId(s.group_id)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">{s.group_name}</span>
                        <Badge
                          variant={s.progression_status === 'complete' ? 'default' : 'secondary'}
                          className="text-[10px]"
                        >
                          {s.mastered_steps}/{s.total_steps} mastered
                        </Badge>
                      </div>
                      <Progress value={s.percent_complete} className="h-1.5" />
                      <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                        <span>Current: {s.current_step_label || '—'}</span>
                        <span>Next: {s.next_step_label || '—'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Steps detail */}
              {selectedGroupId && selectedGroup?.progression_type === type && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {steps.filter(s => s.is_mastered).length}/{steps.length} steps mastered
                    </p>
                    <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={() => setShowAddStep(true)}>
                      <Plus className="w-2.5 h-2.5" /> Add Step
                    </Button>
                  </div>

                  <Progress
                    value={steps.length > 0 ? (steps.filter(s => s.is_mastered).length / steps.length) * 100 : 0}
                    className="h-2"
                  />

                  <div className="space-y-1">
                    {steps.map((step, i) => {
                      const isCurrent = !step.is_mastered && (i === 0 || steps[i - 1]?.is_mastered);
                      return (
                        <div
                          key={step.id}
                          className={`flex items-center gap-2 px-2 py-1.5 rounded border transition-colors ${
                            step.is_mastered
                              ? 'border-emerald-500/30 bg-emerald-500/5'
                              : isCurrent
                              ? 'border-primary/30 bg-primary/5'
                              : 'border-border/50 bg-card'
                          }`}
                        >
                          <span className="text-[10px] text-muted-foreground w-5">{step.step_order}</span>
                          <span className="text-xs flex-1">{step.step_label}</span>

                          {step.criterion_value != null && (
                            <Badge variant="outline" className="text-[10px]">
                              {step.criterion_value}{step.criterion_unit || ''}
                            </Badge>
                          )}

                          {step.is_mastered ? (
                            <Badge variant="default" className="text-[10px] bg-emerald-600">
                              <Check className="w-2.5 h-2.5 mr-0.5" /> Mastered
                            </Badge>
                          ) : isCurrent ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] gap-1 border-primary/30"
                              onClick={() => handleMasterStep(step.id)}
                            >
                              <ArrowRight className="w-2.5 h-2.5" /> Mark Mastered
                            </Button>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Pending
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {filteredGroups.length === 0 && !selectedGroupId && (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  No {typeLabels[type].toLowerCase()} groups yet. Create one to get started.
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Add step dialog */}
        <Dialog open={showAddStep} onOpenChange={setShowAddStep}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base">Add Step</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Step Label *</Label>
                <Input value={newStepLabel} onChange={e => setNewStepLabel(e.target.value)} placeholder="e.g., Request using 2-word phrases" className="h-8 text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Criterion Value</Label>
                  <Input type="number" value={newStepCriterion} onChange={e => setNewStepCriterion(e.target.value)} placeholder="e.g., 80" className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Unit</Label>
                  <Input value={newStepUnit} onChange={e => setNewStepUnit(e.target.value)} placeholder="e.g., %, min, s" className="h-8 text-xs" />
                </div>
              </div>
              <Button size="sm" className="w-full text-xs" onClick={handleAddStep}>Add Step</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
