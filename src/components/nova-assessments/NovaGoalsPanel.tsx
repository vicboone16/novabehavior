import { useState, useMemo, useCallback } from 'react';
import {
  Target, Shield, BookOpen, Plus, Edit3, Copy, CheckCircle2,
  XCircle, Loader2, ChevronDown, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useInstanceGoals,
  useGenerateInstanceGoals,
  useUpdateInstanceGoal,
  useAddCustomGoal,
  useDuplicateGoal,
  InstanceGeneratedGoal,
} from '@/hooks/useNovaAssessments';

interface Props {
  sessionId: string;
  assessmentSlug: string;
}

const TYPE_ICONS: Record<string, any> = {
  aba_goal: Shield,
  iep_goal: Target,
  bip_goal: BookOpen,
};

const TYPE_LABELS: Record<string, string> = {
  aba_goal: 'ABA Goal',
  iep_goal: 'IEP Goal',
  bip_goal: 'BIP Goal',
};

export function NovaGoalsPanel({ sessionId, assessmentSlug }: Props) {
  const { data: goals, isLoading } = useInstanceGoals(sessionId);
  const generateGoals = useGenerateInstanceGoals();
  const updateGoal = useUpdateInstanceGoal();
  const addCustom = useAddCustomGoal();
  const duplicateGoal = useDuplicateGoal();

  const [editingGoal, setEditingGoal] = useState<InstanceGeneratedGoal | null>(null);
  const [editFields, setEditFields] = useState({ title: '', goal_text: '', measurable_text: '', mastery_criteria: '' });
  const [addOpen, setAddOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', goal_text: '', goal_type: 'aba_goal', goal_domain: '', measurable_text: '', mastery_criteria: '' });
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['aba_goal', 'iep_goal', 'bip_goal']));

  const grouped = useMemo(() => {
    if (!goals) return new Map<string, InstanceGeneratedGoal[]>();
    const map = new Map<string, InstanceGeneratedGoal[]>();
    goals.forEach(g => {
      const list = map.get(g.goal_type) || [];
      list.push(g);
      map.set(g.goal_type, list);
    });
    return map;
  }, [goals]);

  const selectedCount = useMemo(() => goals?.filter(g => g.is_selected).length || 0, [goals]);

  const handleGenerate = useCallback(() => {
    generateGoals.mutate({ sessionId, assessmentSlug });
  }, [generateGoals, sessionId, assessmentSlug]);

  const handleToggleSelect = useCallback((goal: InstanceGeneratedGoal) => {
    updateGoal.mutate({ id: goal.id, sessionId, updates: { is_selected: !goal.is_selected } });
  }, [updateGoal, sessionId]);

  const handleStartEdit = useCallback((goal: InstanceGeneratedGoal) => {
    setEditingGoal(goal);
    setEditFields({
      title: goal.title,
      goal_text: goal.goal_text,
      measurable_text: goal.measurable_text || '',
      mastery_criteria: goal.mastery_criteria || '',
    });
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingGoal) return;
    updateGoal.mutate({
      id: editingGoal.id,
      sessionId,
      updates: {
        title: editFields.title,
        goal_text: editFields.goal_text,
        measurable_text: editFields.measurable_text || null,
        mastery_criteria: editFields.mastery_criteria || null,
      },
    });
    setEditingGoal(null);
  }, [editingGoal, editFields, updateGoal, sessionId]);

  const handleDuplicate = useCallback((goal: InstanceGeneratedGoal) => {
    duplicateGoal.mutate({ goal });
  }, [duplicateGoal]);

  const handleAddCustom = useCallback(() => {
    addCustom.mutate({
      sessionId,
      goalType: newGoal.goal_type,
      goalDomain: newGoal.goal_domain,
      title: newGoal.title,
      goalText: newGoal.goal_text,
      measurableText: newGoal.measurable_text,
      masteryCriteria: newGoal.mastery_criteria,
    });
    setAddOpen(false);
    setNewGoal({ title: '', goal_text: '', goal_type: 'aba_goal', goal_domain: '', measurable_text: '', mastery_criteria: '' });
  }, [addCustom, sessionId, newGoal]);

  const toggleType = (type: string) => {
    setExpandedTypes(prev => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4" />
              Generated Goals
            </CardTitle>
            <CardDescription className="text-xs">
              {selectedCount} selected for report • {goals?.length || 0} total
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={handleGenerate} disabled={generateGoals.isPending}>
              {generateGoals.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Target className="w-3 h-3 mr-1" />}
              Generate Goals
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setAddOpen(true)}>
              <Plus className="w-3 h-3 mr-1" /> Add Custom
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : !goals || goals.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No goals generated yet. Click "Generate Goals" to create suggestions from assessment results.
          </p>
        ) : (
          <ScrollArea className="max-h-[600px]">
            <div className="space-y-3 pr-2">
              {['aba_goal', 'iep_goal', 'bip_goal'].map(type => {
                const typeGoals = grouped.get(type);
                if (!typeGoals || typeGoals.length === 0) return null;
                const Icon = TYPE_ICONS[type] || Target;
                const isExpanded = expandedTypes.has(type);

                return (
                  <Collapsible key={type} open={isExpanded} onOpenChange={() => toggleType(type)}>
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-2 cursor-pointer hover:bg-muted/30 rounded p-2 transition-colors">
                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        <Icon className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-medium">{TYPE_LABELS[type] || type}</span>
                        <Badge variant="secondary" className="text-[10px] ml-auto">{typeGoals.length}</Badge>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="space-y-2 pl-4 mt-1">
                        {typeGoals.map(goal => (
                          <div key={goal.id} className={`p-3 rounded-lg border space-y-2 ${goal.is_selected ? 'bg-primary/5 border-primary/20' : 'opacity-60'}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm font-medium">{goal.title}</span>
                                {goal.is_custom && <Badge variant="outline" className="text-[10px]">Custom</Badge>}
                              </div>
                              <div className="flex items-center gap-1">
                                <Switch checked={goal.is_selected} onCheckedChange={() => handleToggleSelect(goal)} />
                              </div>
                            </div>
                            <p className="text-xs leading-relaxed">{goal.goal_text}</p>
                            {goal.measurable_text && (
                              <p className="text-[10px] text-muted-foreground"><strong>Measurable:</strong> {goal.measurable_text}</p>
                            )}
                            {goal.mastery_criteria && (
                              <p className="text-[10px] text-muted-foreground"><strong>Mastery:</strong> {goal.mastery_criteria}</p>
                            )}
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => handleStartEdit(goal)}>
                                <Edit3 className="w-3 h-3 mr-1" /> Edit
                              </Button>
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => handleDuplicate(goal)}>
                                <Copy className="w-3 h-3 mr-1" /> Duplicate
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={!!editingGoal} onOpenChange={open => !open && setEditingGoal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-sm">Edit Goal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Title</Label>
              <Input value={editFields.title} onChange={e => setEditFields(p => ({ ...p, title: e.target.value }))} className="text-sm" />
            </div>
            <div>
              <Label className="text-xs">Goal Text</Label>
              <Textarea value={editFields.goal_text} onChange={e => setEditFields(p => ({ ...p, goal_text: e.target.value }))} rows={4} className="text-sm" />
            </div>
            <div>
              <Label className="text-xs">Measurable Text</Label>
              <Input value={editFields.measurable_text} onChange={e => setEditFields(p => ({ ...p, measurable_text: e.target.value }))} className="text-sm" />
            </div>
            <div>
              <Label className="text-xs">Mastery Criteria</Label>
              <Input value={editFields.mastery_criteria} onChange={e => setEditFields(p => ({ ...p, mastery_criteria: e.target.value }))} className="text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditingGoal(null)}>Cancel</Button>
            <Button size="sm" onClick={handleSaveEdit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Custom Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="text-sm">Add Custom Goal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title" value={newGoal.title} onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))} className="text-sm" />
            <Textarea placeholder="Goal text..." value={newGoal.goal_text} onChange={e => setNewGoal(p => ({ ...p, goal_text: e.target.value }))} rows={4} className="text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <Select value={newGoal.goal_type} onValueChange={v => setNewGoal(p => ({ ...p, goal_type: v }))}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aba_goal">ABA Goal</SelectItem>
                  <SelectItem value="iep_goal">IEP Goal</SelectItem>
                  <SelectItem value="bip_goal">BIP Goal</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Domain" value={newGoal.goal_domain} onChange={e => setNewGoal(p => ({ ...p, goal_domain: e.target.value }))} className="text-sm" />
            </div>
            <Input placeholder="Measurable text (optional)" value={newGoal.measurable_text} onChange={e => setNewGoal(p => ({ ...p, measurable_text: e.target.value }))} className="text-sm" />
            <Input placeholder="Mastery criteria (optional)" value={newGoal.mastery_criteria} onChange={e => setNewGoal(p => ({ ...p, mastery_criteria: e.target.value }))} className="text-sm" />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAddCustom} disabled={!newGoal.title || !newGoal.goal_text}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
