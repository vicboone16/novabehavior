import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Archive, ArchiveRestore, Search, FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { CurriculumItem, CurriculumSystem, Domain } from '@/types/curriculum';

export function CurriculumItemManager() {
  const { user } = useAuth();
  const [items, setItems] = useState<CurriculumItem[]>([]);
  const [systems, setSystems] = useState<CurriculumSystem[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSystem, setSelectedSystem] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived'>('active');
  const [showDialog, setShowDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editing, setEditing] = useState<CurriculumItem | null>(null);
  const [importText, setImportText] = useState('');
  const [importSystemId, setImportSystemId] = useState('');

  // Form
  const [formTitle, setFormTitle] = useState('');
  const [formSystemId, setFormSystemId] = useState('');
  const [formDomainId, setFormDomainId] = useState('');
  const [formLevel, setFormLevel] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formMastery, setFormMastery] = useState('');
  const [formTeachingNotes, setFormTeachingNotes] = useState('');
  const [formKeywords, setFormKeywords] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('curriculum_systems').select('*').eq('status', 'active').order('name')
      .then(({ data }) => setSystems((data || []) as CurriculumSystem[]));
    supabase.from('program_domains').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => setDomains((data || []).map((d: any) => ({ id: d.id, name: d.name, display_order: d.sort_order, status: 'active' })) as Domain[]));
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('curriculum_items')
      .select('*, domain:domains(*)')
      .eq('status', statusFilter)
      .order('display_order')
      .limit(200);
    if (selectedSystem !== 'all') query = query.eq('curriculum_system_id', selectedSystem);
    const { data } = await query;
    setItems((data || []) as CurriculumItem[]);
    setLoading(false);
  }, [statusFilter, selectedSystem]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filtered = items.filter(i =>
    i.title.toLowerCase().includes(search.toLowerCase()) ||
    (i.code || '').toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setFormTitle(''); setFormSystemId(selectedSystem !== 'all' ? selectedSystem : '');
    setFormDomainId(''); setFormLevel(''); setFormCode('');
    setFormDescription(''); setFormMastery(''); setFormTeachingNotes(''); setFormKeywords('');
    setShowDialog(true);
  };

  const openEdit = (item: CurriculumItem) => {
    setEditing(item);
    setFormTitle(item.title); setFormSystemId(item.curriculum_system_id);
    setFormDomainId(item.domain_id || ''); setFormLevel(item.level || '');
    setFormCode(item.code || ''); setFormDescription(item.description || '');
    setFormMastery(item.mastery_criteria || ''); setFormTeachingNotes(item.teaching_notes || '');
    setFormKeywords((item.keywords || []).join(', '));
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !formSystemId) { toast.error('Title and system are required'); return; }
    setSaving(true);
    const payload: Record<string, unknown> = {
      title: formTitle.trim(),
      curriculum_system_id: formSystemId,
      domain_id: formDomainId || null,
      level: formLevel.trim() || null,
      code: formCode.trim() || null,
      description: formDescription.trim() || null,
      mastery_criteria: formMastery.trim() || null,
      teaching_notes: formTeachingNotes.trim() || null,
      keywords: formKeywords ? formKeywords.split(',').map(k => k.trim()).filter(Boolean) : [],
      modified_by: user?.id,
      modified_at: new Date().toISOString(),
    };
    try {
      if (editing) {
        const { error } = await supabase.from('curriculum_items').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Item updated');
      } else {
        const { error } = await supabase.from('curriculum_items').insert([{
          ...payload, active: true, source_tier: 'agency', display_order: items.length,
        }] as any);
        if (error) throw error;
        toast.success('Item created');
      }
      setShowDialog(false);
      fetchItems();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleArchive = async (item: CurriculumItem) => {
    const newStatus = item.status === 'active' ? 'archived' : 'active';
    const { error } = await supabase.from('curriculum_items').update({ status: newStatus }).eq('id', item.id);
    if (!error) { toast.success(newStatus === 'archived' ? 'Archived' : 'Restored'); fetchItems(); }
  };

  const handleBulkImport = async () => {
    if (!importText.trim() || !importSystemId) { toast.error('Select system and paste data'); return; }
    setSaving(true);
    try {
      const lines = importText.trim().split('\n').filter(Boolean);
      const inserts = lines.map((line, idx) => {
        const parts = line.split('\t');
        return {
          curriculum_system_id: importSystemId,
          title: parts[0]?.trim() || line.trim(),
          code: parts[1]?.trim() || null,
          level: parts[2]?.trim() || null,
          description: parts[3]?.trim() || null,
          display_order: idx,
          active: true,
          source_tier: 'agency' as const,
          status: 'active' as const,
        };
      });
      const { error } = await supabase.from('curriculum_items').insert(inserts as any);
      if (error) throw error;
      toast.success(`Imported ${inserts.length} items`);
      setShowImportDialog(false);
      setImportText('');
      fetchItems();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={selectedSystem} onValueChange={setSelectedSystem}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Systems" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Systems</SelectItem>
            {systems.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Tabs value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
          <TabsList className="h-9">
            <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
            <TabsTrigger value="archived" className="text-xs">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowImportDialog(true)}>
            <Upload className="w-4 h-4 mr-1" /> Import
          </Button>
          <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Add Item</Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} items shown (max 200)</p>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No items found</CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map(item => (
            <Card key={item.id}>
              <CardContent className="p-3 flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                    {item.code && <span className="text-xs font-mono text-muted-foreground">{item.code}</span>}
                    <span className="font-medium text-sm">{item.title}</span>
                    {item.level && <Badge variant="outline" className="text-[10px]">L{item.level}</Badge>}
                    {item.domain && <Badge variant="secondary" className="text-[10px]">{item.domain.name}</Badge>}
                  </div>
                  {item.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.description}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(item)}><Edit2 className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleArchive(item)}>
                    {item.status === 'active' ? <Archive className="w-3.5 h-3.5" /> : <ArchiveRestore className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Item' : 'Add Item'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={formTitle} onChange={e => setFormTitle(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>System *</Label>
                <Select value={formSystemId} onValueChange={setFormSystemId}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{systems.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Domain</Label>
                <Select value={formDomainId} onValueChange={setFormDomainId}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{domains.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Level</Label><Input value={formLevel} onChange={e => setFormLevel(e.target.value)} placeholder="e.g., 1, 2, 3" /></div>
              <div><Label>Code</Label><Input value={formCode} onChange={e => setFormCode(e.target.value)} placeholder="e.g., MAND-1" /></div>
            </div>
            <div><Label>Description</Label><Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={2} /></div>
            <div><Label>Mastery Criteria</Label><Input value={formMastery} onChange={e => setFormMastery(e.target.value)} /></div>
            <div><Label>Teaching Notes</Label><Textarea value={formTeachingNotes} onChange={e => setFormTeachingNotes(e.target.value)} rows={2} /></div>
            <div><Label>Keywords (comma-separated)</Label><Input value={formKeywords} onChange={e => setFormKeywords(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Import Items</DialogTitle>
            <DialogDescription>Paste tab-separated data: Title, Code, Level, Description (one item per line)</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Target System *</Label>
              <Select value={importSystemId} onValueChange={setImportSystemId}>
                <SelectTrigger><SelectValue placeholder="Select system" /></SelectTrigger>
                <SelectContent>{systems.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data</Label>
              <Textarea value={importText} onChange={e => setImportText(e.target.value)} rows={8} placeholder="Mand 1&#9;MAND-1&#9;1&#9;Spontaneous requests" className="font-mono text-xs" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>Cancel</Button>
            <Button onClick={handleBulkImport} disabled={saving}>{saving ? 'Importing...' : 'Import'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
