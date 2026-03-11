import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Archive, ArchiveRestore, Search, BookOpen, ExternalLink, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { CurriculumSystem } from '@/types/curriculum';
import { VBMappCurriculumBrowser } from './VBMappCurriculumBrowser';
import { CollectionBrowser } from './CollectionBrowser';

const SYSTEM_TYPES = [
  { value: 'assessment', label: 'Assessment' },
  { value: 'curriculum', label: 'Curriculum' },
  { value: 'adaptive', label: 'Adaptive' },
  { value: 'social', label: 'Social' },
];

interface ClinicalCollection {
  id: string;
  key: string;
  title: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  domain_count?: number;
  goal_count?: number;
}

export function CurriculumSystemManager() {
  const { user } = useAuth();
  const [systems, setSystems] = useState<CurriculumSystem[]>([]);
  const [collections, setCollections] = useState<ClinicalCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived'>('active');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<CurriculumSystem | null>(null);
  const [browsingVbmapp, setBrowsingVbmapp] = useState(false);
  const [browsingCollection, setBrowsingCollection] = useState<ClinicalCollection | null>(null);

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

  const fetchCollections = useCallback(async () => {
    const [{ data: cols }, { data: domainCounts }, { data: goalCounts }] = await Promise.all([
      supabase.from('clinical_curricula_collections').select('*').eq('is_active', true).order('sort_order'),
      supabase.rpc('exec_sql', { sql: "SELECT collection_id, COUNT(*)::int as cnt FROM clinical_curricula_domains GROUP BY collection_id" }).catch(() => ({ data: null })),
      supabase.rpc('exec_sql', { sql: "SELECT d.collection_id, COUNT(g.id)::int as cnt FROM clinical_curricula_goals g JOIN clinical_curricula_domains d ON g.domain_id = d.id WHERE g.is_active GROUP BY d.collection_id" }).catch(() => ({ data: null })),
    ]);

    if (cols) {
      // Try to get counts via separate queries if RPC not available
      const collsWithCounts = (cols as any[]).map(c => ({ ...c, domain_count: 0, goal_count: 0 }));

      // Fetch counts separately
      const { data: dCounts } = await supabase
        .from('clinical_curricula_domains')
        .select('collection_id');
      const { data: gData } = await supabase
        .from('clinical_curricula_goals')
        .select('domain_id')
        .eq('is_active', true);
      const { data: dAll } = await supabase
        .from('clinical_curricula_domains')
        .select('id, collection_id');

      if (dCounts && dAll) {
        const domainCountMap = new Map<string, number>();
        dCounts.forEach((d: any) => {
          domainCountMap.set(d.collection_id, (domainCountMap.get(d.collection_id) || 0) + 1);
        });

        const domainToCollection = new Map<string, string>();
        dAll.forEach((d: any) => domainToCollection.set(d.id, d.collection_id));

        const goalCountMap = new Map<string, number>();
        if (gData) {
          gData.forEach((g: any) => {
            const colId = domainToCollection.get(g.domain_id);
            if (colId) goalCountMap.set(colId, (goalCountMap.get(colId) || 0) + 1);
          });
        }

        collsWithCounts.forEach(c => {
          c.domain_count = domainCountMap.get(c.id) || 0;
          c.goal_count = goalCountMap.get(c.id) || 0;
        });
      }

      setCollections(collsWithCounts as ClinicalCollection[]);
    }
  }, []);

  useEffect(() => { fetchSystems(); fetchCollections(); }, [fetchSystems, fetchCollections]);

  const filtered = systems.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const filteredCollections = collections.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(search.toLowerCase())
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
        const { error } = await supabase
          .from('curriculum_systems')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
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

  // Browsing views
  if (browsingVbmapp) {
    return <VBMappCurriculumBrowser onBack={() => setBrowsingVbmapp(false)} />;
  }

  if (browsingCollection) {
    return (
      <CollectionBrowser
        collectionId={browsingCollection.id}
        collectionTitle={browsingCollection.title}
        onBack={() => { setBrowsingCollection(null); fetchCollections(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
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

      {/* Clinical Collections Section */}
      {filteredCollections.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Clinical Collections</h3>
            <Badge variant="secondary" className="text-[10px]">{filteredCollections.length}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCollections.map(col => (
              <Card
                key={col.id}
                className="cursor-pointer hover:shadow-md hover:border-primary/40 transition-all group"
                onClick={() => {
                  if (col.key === 'vbmapp') {
                    setBrowsingVbmapp(true);
                  } else {
                    setBrowsingCollection(col);
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-medium text-sm">{col.title}</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {col.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{col.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{col.domain_count || 0} domains</Badge>
                    <Badge variant="secondary" className="text-[10px]">{col.goal_count || 0} goals</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Curriculum Systems Section */}
      {(filtered.length > 0 || loading) && (
        <>
          {filteredCollections.length > 0 && <Separator />}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Curriculum Systems</h3>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No systems found</CardContent></Card>
            ) : (
              <div className="grid gap-3">
                {filtered.map(sys => (
                  <Card
                    key={sys.id}
                    className={`hover:shadow-sm transition-shadow ${isVBMapp(sys) ? 'cursor-pointer ring-1 ring-primary/20 hover:ring-primary/40' : ''}`}
                    onClick={() => isVBMapp(sys) && setBrowsingVbmapp(true)}
                  >
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
                            {isVBMapp(sys) && <Badge variant="default" className="text-[10px] gap-1"><ExternalLink className="w-2.5 h-2.5" />Browse</Badge>}
                          </div>
                          {sys.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{sys.description}</p>}
                          {sys.publisher && <p className="text-[10px] text-muted-foreground mt-0.5">Publisher: {sys.publisher}</p>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2" onClick={e => e.stopPropagation()}>
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
          </div>
        </>
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