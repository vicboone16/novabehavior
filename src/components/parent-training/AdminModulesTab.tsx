import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Edit2, Archive, Eye, Layers } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ParentTrainingModule } from '@/types/parentTraining';

interface Props {
  modules: ParentTrainingModule[];
  isLoading: boolean;
  onRefresh: () => void;
  onCreate: (mod: Partial<ParentTrainingModule>) => Promise<any>;
  onUpdate: (id: string, updates: Partial<ParentTrainingModule>) => Promise<void>;
  onManageVersions: (moduleId: string) => void;
}

export function AdminModulesTab({ modules, isLoading, onRefresh, onCreate, onUpdate, onManageVersions }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [editModule, setEditModule] = useState<ParentTrainingModule | null>(null);
  const [form, setForm] = useState({ title: '', short_description: '', est_minutes: 15, skill_tags: '', scope: 'agency' });

  useEffect(() => { onRefresh(); }, [onRefresh]);

  const resetForm = () => setForm({ title: '', short_description: '', est_minutes: 15, skill_tags: '', scope: 'agency' });

  const handleSave = async () => {
    try {
      const payload: any = {
        title: form.title,
        short_description: form.short_description || null,
        est_minutes: form.est_minutes,
        skill_tags: form.skill_tags ? form.skill_tags.split(',').map(t => t.trim()) : [],
        scope: form.scope,
      };
      if (editModule) {
        await onUpdate(editModule.module_id, payload);
      } else {
        await onCreate(payload);
      }
      setShowCreate(false);
      setEditModule(null);
      resetForm();
      onRefresh();
    } catch {}
  };

  const openEdit = (mod: ParentTrainingModule) => {
    setEditModule(mod);
    setForm({
      title: mod.title,
      short_description: mod.short_description || '',
      est_minutes: mod.est_minutes,
      skill_tags: mod.skill_tags.join(', '),
      scope: mod.scope,
    });
    setShowCreate(true);
  };

  const toggleStatus = async (mod: ParentTrainingModule) => {
    await onUpdate(mod.module_id, { status: mod.status === 'active' ? 'archived' : 'active' } as any);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">Training Modules</h2>
        <Button onClick={() => { resetForm(); setEditModule(null); setShowCreate(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> New Module
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Est. Min</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : modules.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No modules yet. Create one to get started.</TableCell></TableRow>
              ) : modules.map(mod => (
                <TableRow key={mod.module_id}>
                  <TableCell className="font-medium">{mod.title}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{mod.scope}</Badge></TableCell>
                  <TableCell>{mod.est_minutes}m</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {mod.skill_tags.slice(0, 3).map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                      {mod.skill_tags.length > 3 && <Badge variant="secondary" className="text-xs">+{mod.skill_tags.length - 3}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={mod.status === 'active' ? 'default' : 'secondary'}>{mod.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(mod)} title="Edit"><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => onManageVersions(mod.module_id)} title="Versions"><Layers className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => toggleStatus(mod)} title={mod.status === 'active' ? 'Archive' : 'Activate'}>
                      {mod.status === 'active' ? <Archive className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={v => { setShowCreate(v); if (!v) setEditModule(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editModule ? 'Edit Module' : 'Create Module'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={form.short_description} onChange={e => setForm(f => ({ ...f, short_description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Est. Minutes</Label><Input type="number" value={form.est_minutes} onChange={e => setForm(f => ({ ...f, est_minutes: parseInt(e.target.value) || 0 }))} /></div>
              <div>
                <Label>Scope</Label>
                <Select value={form.scope} onValueChange={v => setForm(f => ({ ...f, scope: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System (all agencies)</SelectItem>
                    <SelectItem value="agency">Agency only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Tags (comma-separated)</Label><Input value={form.skill_tags} onChange={e => setForm(f => ({ ...f, skill_tags: e.target.value }))} placeholder="e.g. reinforcement, prompting" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowCreate(false); setEditModule(null); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.title.trim()}>{editModule ? 'Save Changes' : 'Create'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
