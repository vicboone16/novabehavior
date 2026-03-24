import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import type { ParentTrainingAssignment, ParentTrainingModule } from '@/types/parentTraining';
import { useProfileNameResolver, useClientNameResolver } from '@/hooks/useProfileNameResolver';

interface Props {
  assignments: ParentTrainingAssignment[];
  modules: ParentTrainingModule[];
  isLoading: boolean;
  onRefresh: () => void;
  onCreate: (a: Partial<ParentTrainingAssignment>) => Promise<any>;
  onUpdate: (id: string, updates: Partial<ParentTrainingAssignment>) => Promise<void>;
}

export function AdminAssignmentsTab({ assignments, modules, isLoading, onRefresh, onCreate, onUpdate }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ module_id: '', parent_user_id: '', client_id: '', module_version_id: '', due_at: '' });

  useEffect(() => { onRefresh(); }, [onRefresh]);

  const parentIds = useMemo(() => assignments.map(a => a.parent_user_id).filter(Boolean), [assignments]);
  const clientIds = useMemo(() => assignments.map(a => a.client_id).filter(Boolean), [assignments]);
  const { getName: getParentName } = useProfileNameResolver(parentIds);
  const { getName: getClientName } = useClientNameResolver(clientIds);

  const handleCreate = async () => {
    try {
      await onCreate({
        module_id: form.module_id,
        module_version_id: form.module_version_id || form.module_id, // fallback
        parent_user_id: form.parent_user_id,
        client_id: form.client_id,
        due_at: form.due_at || null,
      } as any);
      setShowCreate(false);
      setForm({ module_id: '', parent_user_id: '', client_id: '', module_version_id: '', due_at: '' });
      onRefresh();
    } catch {}
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'overdue': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">Module Assignments</h2>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Assign Module
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Parent User ID</TableHead>
                <TableHead>Learner ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Assigned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : assignments.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No assignments yet.</TableCell></TableRow>
              ) : assignments.map(a => (
                <TableRow key={a.assignment_id}>
                  <TableCell className="font-medium">{a.module_title || a.module_id.slice(0, 8)}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{a.parent_user_id.slice(0, 8)}…</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{a.client_id.slice(0, 8)}…</TableCell>
                  <TableCell><Badge variant={statusColor(a.status) as any}>{a.status}</Badge></TableCell>
                  <TableCell>{a.due_at ? format(new Date(a.due_at), 'MMM d, yyyy') : '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{format(new Date(a.created_at), 'MMM d')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Module to Parent</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Module</Label>
              <Select value={form.module_id} onValueChange={v => setForm(f => ({ ...f, module_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select module…" /></SelectTrigger>
                <SelectContent>
                  {modules.filter(m => m.status === 'active').map(m => (
                    <SelectItem key={m.module_id} value={m.module_id}>{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Parent User ID</Label><Input value={form.parent_user_id} onChange={e => setForm(f => ({ ...f, parent_user_id: e.target.value }))} placeholder="UUID of parent user" /></div>
            <div><Label>Learner / Client ID</Label><Input value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} placeholder="UUID of learner" /></div>
            <div><Label>Due Date (optional)</Label><Input type="date" value={form.due_at} onChange={e => setForm(f => ({ ...f, due_at: e.target.value }))} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!form.module_id || !form.parent_user_id || !form.client_id}>Assign</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
