import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, BookOpen, ArrowLeft, GitCompare, Save, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAgencyContext } from '@/hooks/useAgencyContext';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const CATEGORIES = [
  { value: 'program', label: 'Program Templates' },
  { value: 'goal_bundle', label: 'Goal Bundles' },
  { value: 'intervention_bundle', label: 'Intervention Bundles' },
  { value: 'assessment_goal_map', label: 'Assessment-to-Goal Maps' },
  { value: 'behavior_support_kit', label: 'Behavior Support Kits' },
];

interface ProgramTemplate {
  id: string;
  agency_id: string | null;
  created_by: string;
  title: string;
  description: string | null;
  category: string;
  domain: string | null;
  target_population: string | null;
  age_range: string | null;
  status: string;
  visibility: string | null;
  scope: string | null;
  version_no: number;
  tags: string[] | null;
  created_at: string;
}

interface LiveProgram {
  id: string;
  template_id: string | null;
  student_id: string | null;
  title: string;
  is_active: boolean;
  progress_status: string;
  assigned_at: string;
}

export function ProgramTemplatesPanel() {
  const { user } = useAuth();
  const { currentAgency } = useAgencyContext();
  const [templates, setTemplates] = useState<ProgramTemplate[]>([]);
  const [livePrograms, setLivePrograms] = useState<LiveProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'templates' | 'live' | 'compare'>('templates');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ProgramTemplate | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  // Create form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('program');
  const [formDomain, setFormDomain] = useState('');
  const [formPopulation, setFormPopulation] = useState('');
  const [formAgeRange, setFormAgeRange] = useState('');
  const [formVisibility, setFormVisibility] = useState('private');
  const [formPromptGuidance, setFormPromptGuidance] = useState('');
  const [formReinforcementGuidance, setFormReinforcementGuidance] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase.from('program_templates').select('*').order('created_at', { ascending: false });
    setTemplates((data as unknown as ProgramTemplate[]) || []);
  }, []);

  const fetchLivePrograms = useCallback(async () => {
    if (!currentAgency?.id) return;
    const { data } = await supabase.from('live_programs').select('*').eq('agency_id', currentAgency.id).order('assigned_at', { ascending: false });
    setLivePrograms((data as unknown as LiveProgram[]) || []);
  }, [currentAgency?.id]);

  useEffect(() => {
    Promise.all([fetchTemplates(), fetchLivePrograms()]).then(() => setLoading(false));
  }, [fetchTemplates, fetchLivePrograms]);

  const handleCreateTemplate = async () => {
    if (!formTitle.trim() || !user) return;
    const { error } = await supabase.from('program_templates').insert({
      agency_id: currentAgency?.id || null,
      created_by: user.id,
      title: formTitle.trim(),
      description: formDesc.trim(),
      category: formCategory,
      domain: formDomain || null,
      target_population: formPopulation || null,
      age_range: formAgeRange || null,
      scope: formVisibility,
      status: 'draft',
      prompt_guidance: formPromptGuidance || null,
      reinforcement_guidance: formReinforcementGuidance || null,
      implementation_notes: formNotes || null,
    } as any);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Template created' });
      setShowCreate(false);
      resetForm();
      fetchTemplates();
    }
  };

  const handleCloneToClient = async (template: ProgramTemplate) => {
    if (!currentAgency?.id || !user) return;
    const { error } = await supabase.from('live_programs').insert({
      template_id: template.id,
      agency_id: currentAgency.id,
      assigned_by: user.id,
      title: template.title,
      description: template.description || '',
      domain: template.domain,
      progress_status: 'not_started',
    } as any);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Live program created from template' });
      fetchLivePrograms();
    }
  };

  const handleSaveAsTemplate = async (lp: LiveProgram) => {
    if (!user) return;
    const { error } = await supabase.from('program_templates').insert({
      agency_id: currentAgency?.id || null,
      created_by: user.id,
      title: `${lp.title} (Copy)`,
      category: 'program',
      scope: 'private',
      status: 'draft',
    } as any);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Saved as new template' });
      fetchTemplates();
    }
  };

  const resetForm = () => {
    setFormTitle(''); setFormDesc(''); setFormCategory('program');
    setFormDomain(''); setFormPopulation(''); setFormAgeRange('');
    setFormVisibility('private'); setFormPromptGuidance('');
    setFormReinforcementGuidance(''); setFormNotes('');
  };

  const filtered = templates.filter(t => {
    const matchesSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
    const matchesCat = catFilter === 'all' || t.category === catFilter;
    return matchesSearch && matchesCat;
  });

  const statusColor = (s: string) => {
    if (s === 'published') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (s === 'archived') return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
    return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Program Templates</h2>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Template
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="h-9 bg-transparent border-none">
          <TabsTrigger value="templates" className="gap-1 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <BookOpen className="w-3.5 h-3.5" /> Templates
          </TabsTrigger>
          <TabsTrigger value="live" className="gap-1 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <Copy className="w-3.5 h-3.5" /> Live Programs
          </TabsTrigger>
          <TabsTrigger value="compare" className="gap-1 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
            <GitCompare className="w-3.5 h-3.5" /> Compare
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === 'templates' && (
        <>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="py-12 text-center">
              <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold mb-1">No templates yet</h3>
              <p className="text-sm text-muted-foreground">Create your first program template.</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {filtered.map(t => (
                <Card key={t.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.title}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <Badge variant="outline" className="text-[10px]">
                            {CATEGORIES.find(c => c.value === t.category)?.label || t.category}
                          </Badge>
                          <Badge variant="secondary" className={`text-[10px] ${statusColor(t.status)}`}>{t.status}</Badge>
                          {t.domain && <Badge variant="outline" className="text-[10px]">{t.domain}</Badge>}
                          <span className="text-[10px] text-muted-foreground">v{t.version_no}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => handleCloneToClient(t)}>
                        <Copy className="w-3 h-3" /> Assign
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'live' && (
        <div className="space-y-2">
          {livePrograms.length === 0 ? (
            <Card><CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No live programs assigned yet.</p>
            </CardContent></Card>
          ) : livePrograms.map(lp => (
            <Card key={lp.id}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{lp.title}</p>
                    <div className="flex gap-1.5 mt-1">
                      <Badge variant={lp.is_active ? 'default' : 'secondary'} className="text-[10px]">
                        {lp.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">{lp.progress_status.replace(/_/g, ' ')}</Badge>
                      {lp.template_id && <Badge variant="outline" className="text-[10px]">From template</Badge>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => handleSaveAsTemplate(lp)}>
                    <Save className="w-3 h-3" /> Save as Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'compare' && (
        <Card><CardContent className="py-12 text-center">
          <GitCompare className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-semibold mb-1">Compare to Template</h3>
          <p className="text-sm text-muted-foreground">Select a live program to compare against its source template. Differences in objectives, mastery criteria, and strategies will be highlighted.</p>
        </CardContent></Card>
      )}

      {/* Create Template Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Program Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Visibility</Label>
                <Select value={formVisibility} onValueChange={setFormVisibility}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="organization">Organization</SelectItem>
                    <SelectItem value="platform">Platform / Global</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Title *</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={3} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Domain</Label>
                <Input value={formDomain} onChange={(e) => setFormDomain(e.target.value)} className="h-9" placeholder="e.g. Social" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Population</Label>
                <Input value={formPopulation} onChange={(e) => setFormPopulation(e.target.value)} className="h-9" placeholder="e.g. ASD" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Age Range</Label>
                <Input value={formAgeRange} onChange={(e) => setFormAgeRange(e.target.value)} className="h-9" placeholder="e.g. 3-8" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Prompt Guidance</Label>
              <Textarea value={formPromptGuidance} onChange={(e) => setFormPromptGuidance(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reinforcement Guidance</Label>
              <Textarea value={formReinforcementGuidance} onChange={(e) => setFormReinforcementGuidance(e.target.value)} rows={2} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Implementation Notes</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreateTemplate} disabled={!formTitle.trim()}>Create Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
