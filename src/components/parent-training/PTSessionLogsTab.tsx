import React, { useEffect, useState, useMemo } from 'react';
import { SearchablePersonPicker } from '@/components/ui/searchable-person-picker';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import type { ParentTrainingModule } from '@/types/parentTraining';
import type { PTSessionLog } from '@/hooks/useParentTrainingAdmin';
import { useProfileNameResolver } from '@/hooks/useProfileNameResolver';

interface Props {
  sessionLogs: PTSessionLog[];
  modules: ParentTrainingModule[];
  isLoading: boolean;
  onRefresh: () => void;
  onCreate: (log: Partial<PTSessionLog>) => Promise<any>;
}

export function PTSessionLogsTab({ sessionLogs, modules, isLoading, onRefresh, onCreate }: Props) {
  const parentIds = useMemo(() => sessionLogs.map(l => l.parent_user_id).filter(Boolean), [sessionLogs]);
  const { getName } = useProfileNameResolver(parentIds);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    parent_user_id: '', client_id: '', session_date: new Date().toISOString().slice(0, 10),
    service_code: '97156', duration_minutes: '60', module_id: '',
    caregiver_response: '', session_summary: '', homework_assigned: '', next_steps: '',
  });

  useEffect(() => { onRefresh(); }, [onRefresh]);

  const handleCreate = async () => {
    try {
      await onCreate({
        parent_user_id: form.parent_user_id,
        client_id: form.client_id,
        session_date: form.session_date,
        service_code: form.service_code,
        duration_minutes: parseInt(form.duration_minutes) || 60,
        module_id: form.module_id || null,
        caregiver_response: form.caregiver_response || null,
        session_summary: form.session_summary || null,
        homework_assigned: form.homework_assigned || null,
        next_steps: form.next_steps || null,
      } as any);
      setShowCreate(false);
      onRefresh();
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">Session Logs (97156)</h2>
        <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="w-4 h-4" /> Log Session</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Date</TableHead><TableHead>Code</TableHead><TableHead>Duration</TableHead><TableHead>Module</TableHead><TableHead>Caregiver</TableHead><TableHead>Summary</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                : sessionLogs.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No session logs yet.</TableCell></TableRow>
                : sessionLogs.map(l => (
                  <TableRow key={l.session_log_id}>
                    <TableCell className="font-medium">{format(new Date(l.session_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell><Badge variant="outline">{l.service_code}</Badge></TableCell>
                    <TableCell>{l.duration_minutes}m</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{l.module_title || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{getName(l.parent_user_id) || l.parent_user_id.slice(0, 8) + '…'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">{l.session_summary || '—'}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Log Parent Training Session</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Caregiver</Label><SearchablePersonPicker type="profile" value={form.parent_user_id} onChange={v => setForm(f => ({ ...f, parent_user_id: v }))} placeholder="Select caregiver…" /></div>
              <div><Label>Learner</Label><SearchablePersonPicker type="student" value={form.client_id} onChange={v => setForm(f => ({ ...f, client_id: v }))} placeholder="Select learner…" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Date</Label><Input type="date" value={form.session_date} onChange={e => setForm(f => ({ ...f, session_date: e.target.value }))} /></div>
              <div><Label>Service Code</Label><Input value={form.service_code} onChange={e => setForm(f => ({ ...f, service_code: e.target.value }))} /></div>
              <div><Label>Duration (min)</Label><Input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} /></div>
            </div>
            <div><Label>Module (optional)</Label>
              <Select value={form.module_id} onValueChange={v => setForm(f => ({ ...f, module_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select module…" /></SelectTrigger>
                <SelectContent>{modules.map(m => <SelectItem key={m.module_id} value={m.module_id}>{m.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Caregiver Response</Label><Textarea value={form.caregiver_response} onChange={e => setForm(f => ({ ...f, caregiver_response: e.target.value }))} placeholder="How did the caregiver respond to the training?" /></div>
            <div><Label>Session Summary</Label><Textarea value={form.session_summary} onChange={e => setForm(f => ({ ...f, session_summary: e.target.value }))} placeholder="Clinical summary of the session…" /></div>
            <div><Label>Homework Assigned</Label><Textarea value={form.homework_assigned} onChange={e => setForm(f => ({ ...f, homework_assigned: e.target.value }))} placeholder="What was assigned for home practice?" /></div>
            <div><Label>Next Steps</Label><Textarea value={form.next_steps} onChange={e => setForm(f => ({ ...f, next_steps: e.target.value }))} placeholder="Plans for next session…" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!form.parent_user_id || !form.client_id || !form.session_date}>Save Session Log</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
