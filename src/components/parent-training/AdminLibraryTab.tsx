import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus, Edit2, Archive, Eye } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LIBRARY_ITEM_TYPES, type ParentTrainingLibraryItem } from '@/types/parentTraining';

interface Props {
  items: ParentTrainingLibraryItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onCreate: (item: Partial<ParentTrainingLibraryItem>) => Promise<any>;
  onUpdate: (id: string, updates: Partial<ParentTrainingLibraryItem>) => Promise<void>;
}

export function AdminLibraryTab({ items, isLoading, onRefresh, onCreate, onUpdate }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<ParentTrainingLibraryItem | null>(null);
  const [form, setForm] = useState({ title: '', summary: '', item_type: 'script', tags: '', body_text: '' });

  useEffect(() => { onRefresh(); }, [onRefresh]);

  const resetForm = () => setForm({ title: '', summary: '', item_type: 'script', tags: '', body_text: '' });

  const handleSave = async () => {
    try {
      const payload: any = {
        title: form.title,
        summary: form.summary || null,
        item_type: form.item_type,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [],
        body: { text: form.body_text },
      };
      if (editItem) {
        await onUpdate(editItem.item_id, payload);
      } else {
        await onCreate(payload);
      }
      setShowCreate(false);
      setEditItem(null);
      resetForm();
      onRefresh();
    } catch {}
  };

  const openEdit = (item: ParentTrainingLibraryItem) => {
    setEditItem(item);
    setForm({
      title: item.title,
      summary: item.summary || '',
      item_type: item.item_type,
      tags: item.tags.join(', '),
      body_text: (item.body as any)?.text || '',
    });
    setShowCreate(true);
  };

  const toggleStatus = async (item: ParentTrainingLibraryItem) => {
    await onUpdate(item.item_id, { status: item.status === 'active' ? 'archived' : 'active' } as any);
    onRefresh();
  };

  const typeLabel = (t: string) => LIBRARY_ITEM_TYPES.find(lt => lt.value === t)?.label || t;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-foreground">Training Library</h2>
        <Button onClick={() => { resetForm(); setEditItem(null); setShowCreate(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> New Item
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : items.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No library items yet.</TableCell></TableRow>
              ) : items.map(item => (
                <TableRow key={item.item_id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{item.title}</span>
                      {item.summary && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.summary}</p>}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{typeLabel(item.item_type)}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {item.tags.slice(0, 3).map(t => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={item.status === 'active' ? 'default' : 'secondary'}>{item.status}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Edit2 className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => toggleStatus(item)}>
                      {item.status === 'active' ? <Archive className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={v => { setShowCreate(v); if (!v) setEditItem(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editItem ? 'Edit Library Item' : 'New Library Item'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div><Label>Summary</Label><Input value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} /></div>
            <div>
              <Label>Type</Label>
              <Select value={form.item_type} onValueChange={v => setForm(f => ({ ...f, item_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LIBRARY_ITEM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Content</Label><Textarea rows={6} value={form.body_text} onChange={e => setForm(f => ({ ...f, body_text: e.target.value }))} placeholder="Enter the content text…" /></div>
            <div><Label>Tags (comma-separated)</Label><Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowCreate(false); setEditItem(null); }}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.title.trim()}>{editItem ? 'Save' : 'Create'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
