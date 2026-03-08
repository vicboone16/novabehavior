import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit2, Archive, Eye, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { ParentTrainingModule } from '@/types/parentTraining';
import type { PTGoal } from '@/hooks/useParentTrainingAdmin';

interface Props {
  modules: ParentTrainingModule[];
  goals: PTGoal[];
  isLoading: boolean;
  onRefreshModules: () => void;
  onRefreshGoals: (moduleId?: string) => void;
  onCreateModule: (mod: Partial<ParentTrainingModule>) => Promise<any>;
  onUpdateModule: (id: string, updates: Partial<ParentTrainingModule>) => Promise<void>;
  onCreateGoal: (goal: Partial<PTGoal>) => Promise<any>;
  onUpdateGoal: (id: string, updates: Partial<PTGoal>) => Promise<void>;
}

export function PTCurriculumTab({ modules, goals, isLoading, onRefreshModules, onRefreshGoals, onCreateModule, onUpdateModule, onCreateGoal, onUpdateGoal }: Props) {
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [showModuleDialog, setShowModuleDialog] = useState(false);
  const [editModule, setEditModule] = useState<ParentTrainingModule | null>(null);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [goalModuleId, setGoalModuleId] = useState<string>('');
  const [moduleForm, setModuleForm] = useState({ title: '', short_description: '', est_minutes: 15, skill_tags: '', scope: 'agency' });
  const [goalForm, setGoalForm] = useState({ goal_key: '', title: '', description: '', measurement_method: 'frequency', unit: 'occurrences', default_baseline: '', default_target: '', mastery_criteria: '' });

  useEffect(() => { onRefreshModules(); onRefreshGoals(); }, [onRefreshModules, onRefreshGoals]);

  const toggleModule = (id: string) => {
    const next = expandedModule === id ? null : id;
    setExpandedModule(next);
    if (next) onRefreshGoals(next);
  };

  const handleSaveModule = async () => {
    try {
      const payload: any = { title: moduleForm.title, short_description: moduleForm.short_description || null, est_minutes: moduleForm.est_minutes, skill_tags: moduleForm.skill_tags ? moduleForm.skill_tags.split(',').map((t: string) => t.trim()) : [], scope: moduleForm.scope };
      if (editModule) await onUpdateModule(editModule.module_id, payload);
      else await onCreateModule(payload);
      setShowModuleDialog(false); setEditModule(null);
      onRefreshModules();
    } catch {}
  };

  const handleSaveGoal = async () => {
    try {
      await onCreateGoal({ ...goalForm, module_id: goalModuleId, description: goalForm.description || null, default_baseline: goalForm.default_baseline || null, default_target: goalForm.default_target || null, mastery_criteria: goalForm.mastery_criteria || null } as any);
      setShowGoalDialog(false);
      onRefreshGoals(goalModuleId);
    } catch {}
  };

  const openEditModule = (m: ParentTrainingModule) => {
    setEditModule(m);
    setModuleForm({ title: m.title, short_description: m.short_description || '', est_minutes: m.est_minutes, skill_tags: m.skill_tags.join(', '), scope: m.scope });
    setShowModuleDialog(true);
  };

  const moduleGoals = (moduleId: string) => goals.filter(g => g.module_id === moduleId);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">Curriculum Library</h2>
        <Button onClick={() => { setEditModule(null); setModuleForm({ title: '', short_description: '', est_minutes: 15, skill_tags: '', scope: 'agency' }); setShowModuleDialog(true); }} className="gap-2"><Plus className="w-4 h-4" /> New Module</Button>
      </div>

      <div className="space-y-3">
        {isLoading && modules.length === 0 ? <p className="text-center text-muted-foreground py-8">Loading…</p> : modules.length === 0 ? <p className="text-center text-muted-foreground py-8">No modules yet.</p> : modules.map(m => (
          <Collapsible key={m.module_id} open={expandedModule === m.module_id} onOpenChange={() => toggleModule(m.module_id)}>
            <Card>
              <CardContent className="py-3 px-4">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      {expandedModule === m.module_id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      <div>
                        <p className="font-medium text-foreground">{m.title}</p>
                        {m.short_description && <p className="text-xs text-muted-foreground line-clamp-1">{m.short_description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{moduleGoals(m.module_id).length} goals</Badge>
                      <Badge variant={m.status === 'active' ? 'default' : 'secondary'} className="text-xs">{m.status}</Badge>
                      <Badge variant="outline" className="text-xs capitalize">{m.scope}</Badge>
                      <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); openEditModule(m); }}><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); onUpdateModule(m.module_id, { status: m.status === 'active' ? 'archived' : 'active' } as any).then(() => onRefreshModules()); }}>
                        {m.status === 'active' ? <Archive className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-1"><Target className="w-4 h-4" /> Library Goals</h4>
                    <Button size="sm" variant="outline" onClick={() => { setGoalModuleId(m.module_id); setGoalForm({ goal_key: '', title: '', description: '', measurement_method: 'frequency', unit: 'occurrences', default_baseline: '', default_target: '', mastery_criteria: '' }); setShowGoalDialog(true); }} className="gap-1"><Plus className="w-3 h-3" /> Add Goal</Button>
                  </div>
                  {moduleGoals(m.module_id).length === 0 ? <p className="text-xs text-muted-foreground py-2">No goals defined for this module.</p> : (
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Title</TableHead><TableHead>Method</TableHead><TableHead>Baseline</TableHead><TableHead>Target</TableHead><TableHead>Mastery</TableHead><TableHead>Active</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {moduleGoals(m.module_id).map(g => (
                          <TableRow key={g.goal_id}>
                            <TableCell className="font-medium text-sm">{g.title}</TableCell>
                            <TableCell className="text-xs">{g.measurement_method}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{g.default_baseline || '—'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{g.default_target || '—'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{g.mastery_criteria || '—'}</TableCell>
                            <TableCell><Badge variant={g.is_active ? 'default' : 'secondary'} className="text-xs">{g.is_active ? 'Yes' : 'No'}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CollapsibleContent>
              </CardContent>
            </Card>
          </Collapsible>
        ))}
      </div>

      {/* Module Dialog */}
      <Dialog open={showModuleDialog} onOpenChange={v => { setShowModuleDialog(v); if (!v) setEditModule(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editModule ? 'Edit Module' : 'New Module'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={moduleForm.title} onChange={e => setModuleForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={moduleForm.short_description} onChange={e => setModuleForm(f => ({ ...f, short_description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Est. Minutes</Label><Input type="number" value={moduleForm.est_minutes} onChange={e => setModuleForm(f => ({ ...f, est_minutes: parseInt(e.target.value) || 0 }))} /></div>
              <div><Label>Scope</Label><Select value={moduleForm.scope} onValueChange={v => setModuleForm(f => ({ ...f, scope: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="system">System</SelectItem><SelectItem value="agency">Agency</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Tags</Label><Input value={moduleForm.skill_tags} onChange={e => setModuleForm(f => ({ ...f, skill_tags: e.target.value }))} placeholder="comma-separated" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowModuleDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveModule} disabled={!moduleForm.title.trim()}>{editModule ? 'Save' : 'Create'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Goal Dialog */}
      <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Library Goal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Goal Key (unique)</Label><Input value={goalForm.goal_key} onChange={e => setGoalForm(f => ({ ...f, goal_key: e.target.value }))} placeholder="e.g. reinf_schedule_1" /></div>
            <div><Label>Title</Label><Input value={goalForm.title} onChange={e => setGoalForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={goalForm.description} onChange={e => setGoalForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Measurement</Label><Select value={goalForm.measurement_method} onValueChange={v => setGoalForm(f => ({ ...f, measurement_method: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="frequency">Frequency</SelectItem><SelectItem value="duration">Duration</SelectItem><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="rating">Rating</SelectItem><SelectItem value="yes_no">Yes/No</SelectItem></SelectContent></Select></div>
              <div><Label>Unit</Label><Input value={goalForm.unit} onChange={e => setGoalForm(f => ({ ...f, unit: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Default Baseline</Label><Input value={goalForm.default_baseline} onChange={e => setGoalForm(f => ({ ...f, default_baseline: e.target.value }))} /></div>
              <div><Label>Default Target</Label><Input value={goalForm.default_target} onChange={e => setGoalForm(f => ({ ...f, default_target: e.target.value }))} /></div>
            </div>
            <div><Label>Mastery Criteria</Label><Input value={goalForm.mastery_criteria} onChange={e => setGoalForm(f => ({ ...f, mastery_criteria: e.target.value }))} placeholder="e.g. 80% across 3 sessions" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowGoalDialog(false)}>Cancel</Button>
              <Button onClick={handleSaveGoal} disabled={!goalForm.goal_key.trim() || !goalForm.title.trim()}>Create Goal</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
