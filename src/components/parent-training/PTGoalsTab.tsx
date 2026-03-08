import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit2, TrendingUp, Star } from 'lucide-react';
import type { PTGoalAssignment, PTCustomGoal, PTAssignmentDashboard } from '@/hooks/useParentTrainingAdmin';

interface Props {
  goalAssignments: PTGoalAssignment[];
  customGoals: PTCustomGoal[];
  assignments: PTAssignmentDashboard[];
  isLoading: boolean;
  onRefreshGoalAssignments: (assignmentId?: string) => void;
  onRefreshCustomGoals: () => void;
  onUpdateGoalAssignment: (id: string, updates: Partial<PTGoalAssignment>) => Promise<void>;
  onAddCustomGoal: (params: any) => Promise<any>;
  onLogGoalData: (goalAssignmentId: string, value?: number, textValue?: string, notes?: string) => Promise<any>;
  onPromoteGoal: (customGoalId: string, moduleId: string, goalKey: string) => Promise<any>;
}

export function PTGoalsTab({ goalAssignments, customGoals, assignments, isLoading, onRefreshGoalAssignments, onRefreshCustomGoals, onUpdateGoalAssignment, onAddCustomGoal, onLogGoalData, onPromoteGoal }: Props) {
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [showEdit, setShowEdit] = useState<PTGoalAssignment | null>(null);
  const [showLog, setShowLog] = useState<string | null>(null);
  const [showPromote, setShowPromote] = useState<PTCustomGoal | null>(null);
  const [customForm, setCustomForm] = useState({ assignment_id: '', title: '', description: '', measurement_method: 'frequency', unit: 'occurrences', baseline_text: '', target_text: '', baseline_value: '', target_value: '', mastery_criteria: '', save_as_library_candidate: false });
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [logForm, setLogForm] = useState({ value: '', text_value: '', notes: '' });
  const [promoteKey, setPromoteKey] = useState('');
  const [promoteModuleId, setPromoteModuleId] = useState('');

  useEffect(() => { onRefreshGoalAssignments(); onRefreshCustomGoals(); }, [onRefreshGoalAssignments, onRefreshCustomGoals]);

  const handleAddCustom = async () => {
    try {
      await onAddCustomGoal({ ...customForm, baseline_value: customForm.baseline_value ? Number(customForm.baseline_value) : undefined, target_value: customForm.target_value ? Number(customForm.target_value) : undefined });
      setShowAddCustom(false);
      onRefreshGoalAssignments();
    } catch {}
  };

  const handleSaveEdit = async () => {
    if (!showEdit) return;
    try {
      await onUpdateGoalAssignment(showEdit.goal_assignment_id, editForm);
      setShowEdit(null);
      onRefreshGoalAssignments();
    } catch {}
  };

  const handleLogData = async () => {
    if (!showLog) return;
    try {
      await onLogGoalData(showLog, logForm.value ? Number(logForm.value) : undefined, logForm.text_value || undefined, logForm.notes || undefined);
      setShowLog(null);
      setLogForm({ value: '', text_value: '', notes: '' });
      onRefreshGoalAssignments();
    } catch {}
  };

  const handlePromote = async () => {
    if (!showPromote) return;
    try {
      await onPromoteGoal(showPromote.custom_goal_id, promoteModuleId, promoteKey);
      setShowPromote(null);
      onRefreshCustomGoals();
    } catch {}
  };

  const sourceLabel = (s: string) => {
    if (s === 'library') return 'Library Goal';
    if (s === 'custom') return 'Custom Case Goal';
    return 'Modified';
  };

  const sourceBadgeVariant = (s: string) => s === 'library' ? 'default' : s === 'custom' ? 'secondary' : 'outline';

  const candidates = customGoals.filter(cg => cg.is_library_candidate && !cg.promoted_to_goal_id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">Case Goals</h2>
        <Button onClick={() => { setCustomForm({ assignment_id: '', title: '', description: '', measurement_method: 'frequency', unit: 'occurrences', baseline_text: '', target_text: '', baseline_value: '', target_value: '', mastery_criteria: '', save_as_library_candidate: false }); setShowAddCustom(true); }} className="gap-2"><Plus className="w-4 h-4" /> Add Custom Goal</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Title</TableHead><TableHead>Module</TableHead><TableHead>Source</TableHead><TableHead>Baseline</TableHead><TableHead>Current</TableHead><TableHead>Target</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                : goalAssignments.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No goals assigned yet.</TableCell></TableRow>
                : goalAssignments.map(ga => (
                  <TableRow key={ga.goal_assignment_id}>
                    <TableCell className="font-medium text-sm">{ga.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{ga.module_title || '—'}</TableCell>
                    <TableCell><Badge variant={sourceBadgeVariant(ga.goal_source) as any} className="text-xs">{sourceLabel(ga.goal_source)}</Badge></TableCell>
                    <TableCell className="text-xs">{ga.baseline_value ?? ga.baseline_text ?? '—'}</TableCell>
                    <TableCell className="text-sm font-semibold">{ga.current_value ?? '—'}</TableCell>
                    <TableCell className="text-xs">{ga.target_value ?? ga.target_text ?? '—'}</TableCell>
                    <TableCell><Badge variant={ga.status === 'active' ? 'default' : 'secondary'} className="text-xs">{ga.status}</Badge></TableCell>
                    <TableCell className="space-x-1">
                      <Button variant="ghost" size="icon" title="Log Progress" onClick={() => { setShowLog(ga.goal_assignment_id); setLogForm({ value: '', text_value: '', notes: '' }); }}><TrendingUp className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" title="Edit" onClick={() => { setShowEdit(ga); setEditForm({ title: ga.title, description: ga.description || '', measurement_method: ga.measurement_method, unit: ga.unit, baseline_value: ga.baseline_value ?? '', target_value: ga.target_value ?? '', baseline_text: ga.baseline_text || '', target_text: ga.target_text || '', mastery_criteria: ga.mastery_criteria || '', notes: ga.notes || '', target_date: ga.target_date || '' }); }}><Edit2 className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Library Candidates */}
      {candidates.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Star className="w-4 h-4" /> Library Candidates ({candidates.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Module</TableHead><TableHead>Method</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {candidates.map(cg => (
                  <TableRow key={cg.custom_goal_id}>
                    <TableCell className="font-medium text-sm">{cg.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{cg.module_title || '—'}</TableCell>
                    <TableCell className="text-xs">{cg.measurement_method}</TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => { setShowPromote(cg); setPromoteKey(''); setPromoteModuleId(cg.module_id || ''); }}>Promote to Library</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add Custom Goal Dialog */}
      <Dialog open={showAddCustom} onOpenChange={setShowAddCustom}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Custom Case Goal</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <div><Label>Assignment</Label>
              <Select value={customForm.assignment_id} onValueChange={v => setCustomForm(f => ({ ...f, assignment_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select assignment…" /></SelectTrigger>
                <SelectContent>{assignments.map(a => <SelectItem key={a.assignment_id} value={a.assignment_id}>{a.module_title || 'Module'} — {a.parent_user_id.slice(0, 8)}…</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Title</Label><Input value={customForm.title} onChange={e => setCustomForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={customForm.description} onChange={e => setCustomForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Measurement</Label><Select value={customForm.measurement_method} onValueChange={v => setCustomForm(f => ({ ...f, measurement_method: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="frequency">Frequency</SelectItem><SelectItem value="duration">Duration</SelectItem><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="rating">Rating</SelectItem><SelectItem value="yes_no">Yes/No</SelectItem></SelectContent></Select></div>
              <div><Label>Unit</Label><Input value={customForm.unit} onChange={e => setCustomForm(f => ({ ...f, unit: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Baseline Value</Label><Input type="number" value={customForm.baseline_value} onChange={e => setCustomForm(f => ({ ...f, baseline_value: e.target.value }))} /></div>
              <div><Label>Target Value</Label><Input type="number" value={customForm.target_value} onChange={e => setCustomForm(f => ({ ...f, target_value: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Baseline Text</Label><Input value={customForm.baseline_text} onChange={e => setCustomForm(f => ({ ...f, baseline_text: e.target.value }))} /></div>
              <div><Label>Target Text</Label><Input value={customForm.target_text} onChange={e => setCustomForm(f => ({ ...f, target_text: e.target.value }))} /></div>
            </div>
            <div><Label>Mastery Criteria</Label><Input value={customForm.mastery_criteria} onChange={e => setCustomForm(f => ({ ...f, mastery_criteria: e.target.value }))} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={customForm.save_as_library_candidate} onCheckedChange={v => setCustomForm(f => ({ ...f, save_as_library_candidate: v }))} />
              <Label>Save as library candidate</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddCustom(false)}>Cancel</Button>
              <Button onClick={handleAddCustom} disabled={!customForm.assignment_id || !customForm.title.trim()}>Add Goal</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Goal Assignment Dialog */}
      <Dialog open={!!showEdit} onOpenChange={v => { if (!v) setShowEdit(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Goal Assignment</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <div><Label>Title</Label><Input value={editForm.title || ''} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={editForm.description || ''} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Measurement</Label><Select value={editForm.measurement_method || 'frequency'} onValueChange={v => setEditForm(f => ({ ...f, measurement_method: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="frequency">Frequency</SelectItem><SelectItem value="duration">Duration</SelectItem><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="rating">Rating</SelectItem><SelectItem value="yes_no">Yes/No</SelectItem></SelectContent></Select></div>
              <div><Label>Unit</Label><Input value={editForm.unit || ''} onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Baseline</Label><Input type="number" value={editForm.baseline_value ?? ''} onChange={e => setEditForm(f => ({ ...f, baseline_value: e.target.value ? Number(e.target.value) : null }))} /></div>
              <div><Label>Target</Label><Input type="number" value={editForm.target_value ?? ''} onChange={e => setEditForm(f => ({ ...f, target_value: e.target.value ? Number(e.target.value) : null }))} /></div>
              <div><Label>Target Date</Label><Input type="date" value={editForm.target_date || ''} onChange={e => setEditForm(f => ({ ...f, target_date: e.target.value }))} /></div>
            </div>
            <div><Label>Mastery Criteria</Label><Input value={editForm.mastery_criteria || ''} onChange={e => setEditForm(f => ({ ...f, mastery_criteria: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea value={editForm.notes || ''} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowEdit(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Log Progress Dialog */}
      <Dialog open={!!showLog} onOpenChange={v => { if (!v) setShowLog(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Goal Progress</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Numeric Value</Label><Input type="number" value={logForm.value} onChange={e => setLogForm(f => ({ ...f, value: e.target.value }))} placeholder="e.g. 5" /></div>
            <div><Label>Text Value (optional)</Label><Input value={logForm.text_value} onChange={e => setLogForm(f => ({ ...f, text_value: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea value={logForm.notes} onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowLog(null)}>Cancel</Button>
              <Button onClick={handleLogData} disabled={!logForm.value && !logForm.text_value}>Log</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Promote Dialog */}
      <Dialog open={!!showPromote} onOpenChange={v => { if (!v) setShowPromote(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Promote to Library Goal</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Promoting "{showPromote?.title}" to the reusable curriculum library.</p>
            <div><Label>Module</Label>
              <Select value={promoteModuleId} onValueChange={setPromoteModuleId}>
                <SelectTrigger><SelectValue placeholder="Select module…" /></SelectTrigger>
                <SelectContent>{assignments.map(a => a.module_id).filter((v, i, a) => a.indexOf(v) === i).map(mid => <SelectItem key={mid} value={mid}>{assignments.find(a => a.module_id === mid)?.module_title || mid.slice(0, 8)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Goal Key (unique)</Label><Input value={promoteKey} onChange={e => setPromoteKey(e.target.value)} placeholder="e.g. custom_reinf_1" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPromote(null)}>Cancel</Button>
              <Button onClick={handlePromote} disabled={!promoteKey.trim() || !promoteModuleId}>Promote</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
