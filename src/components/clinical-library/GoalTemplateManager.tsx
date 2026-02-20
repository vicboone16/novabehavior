import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Archive, ArchiveRestore, Search, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { OrgGoalTemplate, Domain } from '@/types/curriculum';

export function GoalTemplateManager() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<OrgGoalTemplate[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived'>('active');
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<OrgGoalTemplate | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDomainId, setFormDomainId] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formMastery, setFormMastery] = useState('');
  const [formPrompting, setFormPrompting] = useState('');
  const [formDataType, setFormDataType] = useState('discrete_trial');
  const [formTags, setFormTags] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('org_goal_templates')
      .select('*, domain:domains(*)')
      .eq('status', statusFilter)
      .order('title');
    setTemplates((data || []) as OrgGoalTemplate[]);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);
  useEffect(() => {
    supabase.from('domains').select('*').eq('status', 'active').order('name')
      .then(({ data }) => setDomains((data || []) as Domain[]));
  }, []);

  const filtered = templates.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    (t.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditing(null);
    setFormTitle(''); setFormDomainId(''); setFormDescription('');
    setFormMastery(''); setFormPrompting(''); setFormDataType('discrete_trial'); setFormTags('');
    setShowDialog(true);
  };

  const openEdit = (t: OrgGoalTemplate) => {
    setEditing(t);
    setFormTitle(t.title); setFormDomainId(t.domain_id || '');
    setFormDescription(t.description || ''); setFormMastery(t.mastery_criteria || '');
    setFormPrompting(t.prompting_notes || ''); setFormDataType(t.data_collection_type);
    setFormTags((t.tags || []).join(', '));
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    const payload: Record<string, unknown> = {
      title: formTitle.trim(),
      domain_id: formDomainId || null,
      description: formDescription.trim() || null,
      mastery_criteria: formMastery.trim() || null,
      prompting_notes: formPrompting.trim() || null,
      data_collection_type: formDataType,
      tags: formTags ? formTags.split(',').map(t => t.trim()).filter(Boolean) : [],
      modified_by: user?.id,
      modified_at: new Date().toISOString(),
    };
    try {
      if (editing) {
        const { error } = await supabase.from('org_goal_templates').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Template updated');
      } else {
        const { error } = await supabase.from('org_goal_templates').insert([{
          ...payload, source_tier: 'agency', created_by: user?.id, active: true,
        }] as any);
        if (error) throw error;
        toast.success('Template created');
      }
      setShowDialog(false);
      fetchTemplates();
    } catch (err: any) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleArchive = async (t: OrgGoalTemplate) => {
    const newStatus = t.status === 'active' ? 'archived' : 'active';
    const { error } = await supabase.from('org_goal_templates').update({ status: newStatus }).eq('id', t.id);
    if (!error) { toast.success(newStatus === 'archived' ? 'Archived' : 'Restored'); fetchTemplates(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Tabs value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
          <TabsList className="h-9">
            <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
            <TabsTrigger value="archived" className="text-xs">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Add Template</Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No templates found</CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map(t => (
            <Card key={t.id}>
              <CardContent className="p-3 flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Target className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-medium text-sm">{t.title}</span>
                    {t.domain && <Badge variant="secondary" className="text-[10px]">{t.domain.name}</Badge>}
                    <Badge variant="outline" className="text-[10px]">{t.data_collection_type}</Badge>
                    <Badge variant={t.source_tier === 'global' ? 'default' : 'outline'} className="text-[10px]">{t.source_tier}</Badge>
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>}
                  {t.mastery_criteria && <p className="text-[10px] text-muted-foreground mt-0.5">Mastery: {t.mastery_criteria}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(t)}><Edit2 className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleArchive(t)}>
                    {t.status === 'active' ? <Archive className="w-3.5 h-3.5" /> : <ArchiveRestore className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Goal Template' : 'Add Goal Template'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title *</Label><Input value={formTitle} onChange={e => setFormTitle(e.target.value)} /></div>
            <div>
              <Label>Domain</Label>
              <Select value={formDomainId} onValueChange={setFormDomainId}>
                <SelectTrigger><SelectValue placeholder="Select domain" /></SelectTrigger>
                <SelectContent>{domains.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={2} /></div>
            <div><Label>Mastery Criteria</Label><Input value={formMastery} onChange={e => setFormMastery(e.target.value)} /></div>
            <div><Label>Prompting Notes</Label><Textarea value={formPrompting} onChange={e => setFormPrompting(e.target.value)} rows={2} /></div>
            <div>
              <Label>Data Collection Type</Label>
              <Select value={formDataType} onValueChange={setFormDataType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="discrete_trial">Discrete Trial</SelectItem>
                  <SelectItem value="frequency">Frequency</SelectItem>
                  <SelectItem value="duration">Duration</SelectItem>
                  <SelectItem value="task_analysis">Task Analysis</SelectItem>
                  <SelectItem value="probe">Probe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Tags (comma-separated)</Label><Input value={formTags} onChange={e => setFormTags(e.target.value)} /></div>
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
