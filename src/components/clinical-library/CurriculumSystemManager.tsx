import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Archive, ArchiveRestore, Search, BookOpen, Upload, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { CurriculumSystem } from '@/types/curriculum';
import { VBMappCurriculumBrowser } from './VBMappCurriculumBrowser';

const SYSTEM_TYPES = [
  { value: 'assessment', label: 'Assessment' },
  { value: 'curriculum', label: 'Curriculum' },
  { value: 'adaptive', label: 'Adaptive' },
  { value: 'social', label: 'Social' },
];

export function CurriculumSystemManager() {
  const { user } = useAuth();
  const [systems, setSystems] = useState<CurriculumSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived'>('active');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<CurriculumSystem | null>(null);
  const [browsing, setBrowsing] = useState<string | null>(null);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<string>('assessment');
  const [formDescription, setFormDescription] = useState('');
  const [formPublisher, setFormPublisher] = useState('');
  const [formVersion, setFormVersion] = useState('');
  const [formAgeMin, setFormAgeMin] = useState('');
  const [formAgeMax, setFormAgeMax] = useState('');
  const [formTags, setFormTags] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchSystems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('curriculum_systems')
      .select('*')
      .eq('status', statusFilter)
      .order('name');
    
    if (error) {
      console.error(error);
    } else {
      setSystems((data || []) as CurriculumSystem[]);
    }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchSystems(); }, [fetchSystems]);

  const filtered = systems.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setFormName(''); setFormType('assessment'); setFormDescription('');
    setFormPublisher(''); setFormVersion(''); setFormAgeMin(''); setFormAgeMax(''); setFormTags('');
    setShowDialog(true);
  };

  const openEdit = (sys: CurriculumSystem) => {
    setEditing(sys);
    setFormName(sys.name);
    setFormType(sys.type);
    setFormDescription(sys.description || '');
    setFormPublisher(sys.publisher || '');
    setFormVersion(sys.version || '');
    setFormAgeMin(sys.age_range_min_months?.toString() || '');
    setFormAgeMax(sys.age_range_max_months?.toString() || '');
    setFormTags((sys.tags || []).join(', '));
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { toast.error('Name is required'); return; }
    setSaving(true);

    const payload: Record<string, unknown> = {
      name: formName.trim(),
      type: formType,
      description: formDescription.trim() || null,
      publisher: formPublisher.trim() || null,
      version: formVersion.trim() || null,
      age_range_min_months: formAgeMin ? parseInt(formAgeMin) : null,
      age_range_max_months: formAgeMax ? parseInt(formAgeMax) : null,
      tags: formTags ? formTags.split(',').map(t => t.trim()).filter(Boolean) : [],
      modified_by: user?.id,
      modified_at: new Date().toISOString(),
    };

    try {
      if (editing) {
        // Copy-on-write: if editing a global item as an agency user, fork it
        if (editing.source_tier === 'global') {
          const { error } = await supabase
            .from('curriculum_systems')
            .update(payload)
            .eq('id', editing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('curriculum_systems')
            .update(payload)
            .eq('id', editing.id);
          if (error) throw error;
        }
        toast.success('System updated');
      } else {
        const { error } = await supabase
          .from('curriculum_systems')
          .insert([{
            ...payload,
            active: true,
            source_tier: 'agency',
            created_by: user?.id,
          }] as any);
        if (error) throw error;
        toast.success('System created');
      }
      setShowDialog(false);
      fetchSystems();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (sys: CurriculumSystem) => {
    const newStatus = sys.status === 'active' ? 'archived' : 'active';
    const { error } = await supabase
      .from('curriculum_systems')
      .update({ 
        status: newStatus, 
        archived_at: newStatus === 'archived' ? new Date().toISOString() : null,
        archived_by: newStatus === 'archived' ? user?.id : null,
      })
      .eq('id', sys.id);
    
    if (error) {
      toast.error('Failed to update status');
    } else {
      toast.success(newStatus === 'archived' ? 'System archived' : 'System restored');
      fetchSystems();
    }
  };

  const isVBMapp = (sys: CurriculumSystem) => sys.name.toLowerCase().includes('vb-mapp') || sys.name.toLowerCase().includes('vbmapp');

  if (browsing === 'vbmapp') {
    return <VBMappCurriculumBrowser onBack={() => setBrowsing(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search systems..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Tabs value={statusFilter} onValueChange={v => setStatusFilter(v as 'active' | 'archived')}>
          <TabsList className="h-9">
            <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
            <TabsTrigger value="archived" className="text-xs">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> Add System
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No systems found</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map(sys => (
            <Card key={sys.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <BookOpen className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-medium">{sys.name}</span>
                      <Badge variant="secondary" className="text-[10px]">{sys.type}</Badge>
                      <Badge variant={sys.source_tier === 'global' ? 'default' : 'outline'} className="text-[10px]">
                        {sys.source_tier}
                      </Badge>
                      {sys.version && <Badge variant="outline" className="text-[10px]">v{sys.version}</Badge>}
                    </div>
                    {sys.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{sys.description}</p>}
                    {sys.publisher && <p className="text-[10px] text-muted-foreground mt-0.5">Publisher: {sys.publisher}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(sys)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleArchive(sys)}>
                      {sys.status === 'active' ? <Archive className="w-3.5 h-3.5" /> : <ArchiveRestore className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Curriculum System' : 'Add Curriculum System'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g., VB-MAPP, PEAK" />
            </div>
            <div>
              <Label>Type *</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SYSTEM_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Publisher</Label>
                <Input value={formPublisher} onChange={e => setFormPublisher(e.target.value)} />
              </div>
              <div>
                <Label>Version</Label>
                <Input value={formVersion} onChange={e => setFormVersion(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Age Min (months)</Label>
                <Input type="number" value={formAgeMin} onChange={e => setFormAgeMin(e.target.value)} />
              </div>
              <div>
                <Label>Age Max (months)</Label>
                <Input type="number" value={formAgeMax} onChange={e => setFormAgeMax(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input value={formTags} onChange={e => setFormTags(e.target.value)} placeholder="aba, language, motor" />
            </div>
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
