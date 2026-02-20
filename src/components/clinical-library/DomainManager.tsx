import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Archive, ArchiveRestore, Search, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Domain } from '@/types/curriculum';

export function DomainManager() {
  const { user } = useAuth();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived'>('active');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Domain | null>(null);
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOrder, setFormOrder] = useState('0');
  const [saving, setSaving] = useState(false);

  const fetchDomains = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('domains')
      .select('*')
      .eq('status', statusFilter)
      .order('display_order');
    if (!error) setDomains((data || []) as Domain[]);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchDomains(); }, [fetchDomains]);

  const filtered = domains.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(domains.map(d => d.category).filter(Boolean))] as string[];

  const openCreate = () => {
    setEditing(null);
    setFormName(''); setFormCategory(''); setFormDescription(''); setFormOrder('0');
    setShowDialog(true);
  };

  const openEdit = (d: Domain) => {
    setEditing(d);
    setFormName(d.name); setFormCategory(d.category || '');
    setFormDescription(d.description || ''); setFormOrder(d.display_order.toString());
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    const payload: Record<string, unknown> = {
      name: formName.trim(),
      category: formCategory.trim() || null,
      description: formDescription.trim() || null,
      display_order: parseInt(formOrder) || 0,
      modified_by: user?.id,
      modified_at: new Date().toISOString(),
    };
    try {
      if (editing) {
        const { error } = await supabase.from('domains').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Domain updated');
      } else {
        const { error } = await supabase.from('domains').insert([{
          ...payload, source_tier: 'agency', created_by: user?.id,
        }] as any);
        if (error) throw error;
        toast.success('Domain created');
      }
      setShowDialog(false);
      fetchDomains();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleArchive = async (d: Domain) => {
    const newStatus = d.status === 'active' ? 'archived' : 'active';
    const { error } = await supabase.from('domains').update({ status: newStatus }).eq('id', d.id);
    if (error) toast.error('Failed'); else { toast.success(newStatus === 'archived' ? 'Archived' : 'Restored'); fetchDomains(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search domains..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Tabs value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
          <TabsList className="h-9">
            <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
            <TabsTrigger value="archived" className="text-xs">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Add Domain</Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No domains found</CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map(d => (
            <Card key={d.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                  <Layers className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-medium text-sm">{d.name}</span>
                  {d.category && <Badge variant="secondary" className="text-[10px]">{d.category}</Badge>}
                  <Badge variant={d.source_tier === 'global' ? 'default' : 'outline'} className="text-[10px]">{d.source_tier}</Badge>
                  {d.description && <span className="text-xs text-muted-foreground truncate max-w-[200px]">{d.description}</span>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(d)}><Edit2 className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleArchive(d)}>
                    {d.status === 'active' ? <Archive className="w-3.5 h-3.5" /> : <ArchiveRestore className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Edit Domain' : 'Add Domain'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name *</Label><Input value={formName} onChange={e => setFormName(e.target.value)} /></div>
            <div><Label>Category</Label><Input value={formCategory} onChange={e => setFormCategory(e.target.value)} placeholder="e.g., Language, Motor, Social" list="domain-categories" />
              <datalist id="domain-categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
            </div>
            <div><Label>Description</Label><Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={2} /></div>
            <div><Label>Display Order</Label><Input type="number" value={formOrder} onChange={e => setFormOrder(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
