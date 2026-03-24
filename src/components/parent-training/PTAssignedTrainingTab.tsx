import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, CheckCircle, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import type { ParentTrainingModule } from '@/types/parentTraining';
import type { PTAssignmentDashboard } from '@/hooks/useParentTrainingAdmin';
import { useProfileNameResolver, useClientNameResolver } from '@/hooks/useProfileNameResolver';

interface Props {
  assignments: PTAssignmentDashboard[];
  modules: ParentTrainingModule[];
  isLoading: boolean;
  onRefresh: () => void;
  onAssign: (moduleId: string, parentUserId: string, clientId: string, dueAt?: string) => Promise<any>;
  onUpdate: (id: string, updates: Record<string, any>) => Promise<void>;
}

export function PTAssignedTrainingTab({ assignments, modules, isLoading, onRefresh, onAssign, onUpdate }: Props) {
  const [showAssign, setShowAssign] = useState(false);
  const [form, setForm] = useState({ module_id: '', parent_user_id: '', client_id: '', due_at: '' });

  useEffect(() => { onRefresh(); }, [onRefresh]);

  const parentIds = useMemo(() => assignments.map(a => a.parent_user_id).filter(Boolean), [assignments]);
  const clientIds = useMemo(() => assignments.map(a => a.client_id).filter(Boolean), [assignments]);
  const { getName: getParentName } = useProfileNameResolver(parentIds);
  const { getName: getClientName } = useClientNameResolver(clientIds);

  const handleAssign = async () => {
    try {
      await onAssign(form.module_id, form.parent_user_id, form.client_id, form.due_at || undefined);
      setShowAssign(false);
      setForm({ module_id: '', parent_user_id: '', client_id: '', due_at: '' });
      onRefresh();
    } catch {}
  };

  const statusColor = (s: string) => {
    if (s === 'completed') return 'default';
    if (s === 'in_progress') return 'secondary';
    if (s === 'overdue') return 'destructive';
    return 'outline';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">Assigned Training</h2>
        <Button onClick={() => setShowAssign(true)} className="gap-2"><Plus className="w-4 h-4" /> Assign Module</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Module</TableHead><TableHead>Caregiver</TableHead><TableHead>Client</TableHead><TableHead>Goals</TableHead><TableHead>HW</TableHead><TableHead>Sessions</TableHead><TableHead>Status</TableHead><TableHead>Due</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                : assignments.length === 0 ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No assignments yet.</TableCell></TableRow>
                : assignments.map(a => (
                  <TableRow key={a.assignment_id}>
                    <TableCell className="font-medium">{a.module_title || 'Module'}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{a.parent_user_id.slice(0, 8)}…</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{a.client_id.slice(0, 8)}…</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{a.goal_count}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{a.homework_count}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{a.session_log_count}</Badge></TableCell>
                    <TableCell><Badge variant={statusColor(a.status) as any}>{a.status}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.due_at ? format(new Date(a.due_at), 'MMM d, yyyy') : '—'}</TableCell>
                    <TableCell className="space-x-1">
                      {a.status !== 'completed' && <Button variant="ghost" size="icon" title="Mark Complete" onClick={() => onUpdate(a.assignment_id, { status: 'completed' }).then(onRefresh)}><CheckCircle className="w-4 h-4" /></Button>}
                      {a.status === 'completed' && <Button variant="ghost" size="icon" title="Reopen" onClick={() => onUpdate(a.assignment_id, { status: 'assigned' }).then(onRefresh)}><RotateCcw className="w-4 h-4" /></Button>}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Module to Caregiver</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Module</Label>
              <Select value={form.module_id} onValueChange={v => setForm(f => ({ ...f, module_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select module…" /></SelectTrigger>
                <SelectContent>{modules.filter(m => m.status === 'active').map(m => <SelectItem key={m.module_id} value={m.module_id}>{m.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Caregiver User ID</Label><Input value={form.parent_user_id} onChange={e => setForm(f => ({ ...f, parent_user_id: e.target.value }))} placeholder="UUID" /></div>
            <div><Label>Client / Learner ID</Label><Input value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} placeholder="UUID" /></div>
            <div><Label>Due Date (optional)</Label><Input type="date" value={form.due_at} onChange={e => setForm(f => ({ ...f, due_at: e.target.value }))} /></div>
            <p className="text-xs text-muted-foreground">Library goals for this module will be auto-attached on assignment.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAssign(false)}>Cancel</Button>
              <Button onClick={handleAssign} disabled={!form.module_id || !form.parent_user_id || !form.client_id}>Assign</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
