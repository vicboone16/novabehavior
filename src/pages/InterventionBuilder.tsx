import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, Trash2, Archive, Copy, Link2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBehaviorLibraryData, BxStrategy } from '@/hooks/useBehaviorLibraryData';
import { toast } from 'sonner';

const FUNCTION_OPTIONS = ['attention', 'escape', 'tangible', 'automatic', 'multiple', 'unknown'];
const SETTING_OPTIONS = ['classroom', 'home', 'community', 'clinic'];
const TIER_OPTIONS = ['Tier 1', 'Tier 2', 'Tier 3'];
const GRADE_OPTIONS = ['PreK', 'K-2', '3-5', '6-8', '9-12', 'Adult'];
const ROLE_OPTIONS = ['BCBA', 'teacher', 'aide', 'parent'];
const STRATEGY_TYPES = ['antecedent', 'teaching', 'reinforcement', 'differential_reinforcement', 'extinction', 'environmental', 'self_management', 'crisis'];
const RISK_LEVELS = ['low', 'medium', 'high', 'crisis'];

function TagInput({ label, tags, setTags, options }: { label: string; tags: string[]; setTags: (t: string[]) => void; options: string[] }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-1 mt-1 mb-1">
        {tags.map(t => (
          <Badge key={t} variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => setTags(tags.filter(x => x !== t))}>
            {t} <X className="w-3 h-3" />
          </Badge>
        ))}
      </div>
      <Select onValueChange={v => { if (!tags.includes(v)) setTags([...tags, v]); }}>
        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={`Add ${label.toLowerCase()}`} /></SelectTrigger>
        <SelectContent>{options.filter(o => !tags.includes(o)).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function ArrayInput({ label, items, setItems, placeholder }: { label: string; items: string[]; setItems: (i: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('');
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="space-y-1 mt-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="text-xs flex-1 bg-muted px-2 py-1 rounded">{i + 1}. {item}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setItems(items.filter((_, j) => j !== i))}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
        <div className="flex gap-1">
          <Input value={input} onChange={e => setInput(e.target.value)} placeholder={placeholder || 'Add item...'} className="h-8 text-xs"
            onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { setItems([...items, input.trim()]); setInput(''); e.preventDefault(); } }} />
          <Button size="sm" variant="outline" className="h-8" onClick={() => { if (input.trim()) { setItems([...items, input.trim()]); setInput(''); } }}>
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

const emptyStrategy: Partial<BxStrategy> = {
  strategy_name: '',
  strategy_code: '',
  strategy_type: [],
  risk_level: 'low',
  requires_bcba: false,
  implementation_steps: [],
  staff_script: '',
  materials: [],
  fidelity_checklist: [],
  data_targets: [],
  contraindications: [],
  status: 'active',
  short_description: '',
  full_description: '',
  function_tags: [],
  setting_tags: [],
  tier_tags: [],
  grade_band_tags: [],
  role_tags: [],
  crisis_relevance: false,
  family_version: '',
  teacher_quick_version: '',
};

export default function InterventionBuilder() {
  const navigate = useNavigate();
  const data = useBehaviorLibraryData();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<BxStrategy>>({ ...emptyStrategy });
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkType, setLinkType] = useState<'problem' | 'goal' | 'objective'>('problem');

  useEffect(() => { data.fetchAll(); }, []);

  const handleSelectStrategy = (s: BxStrategy) => {
    setSelectedId(s.id);
    setForm({ ...s });
  };

  const handleNew = () => {
    setSelectedId(null);
    setForm({ ...emptyStrategy });
  };

  const handleSave = async () => {
    if (!form.strategy_name?.trim()) { toast.error('Strategy name is required'); return; }
    await data.saveStrategy(selectedId ? { ...form, id: selectedId } : form);
    if (!selectedId) handleNew();
  };

  const handleDuplicate = async () => {
    if (!selectedId) return;
    await data.duplicateStrategy(selectedId);
    handleNew();
  };

  const handleArchive = async () => {
    if (!selectedId) return;
    await data.archiveStrategy(selectedId);
    handleNew();
  };

  const update = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const activeStrategies = data.strategies.filter(s => s.status === 'active');

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
              <div>
                <h1 className="text-lg font-bold text-foreground">Intervention Builder</h1>
                <p className="text-xs text-muted-foreground">Create and edit strategies for the clinical library</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleNew} className="gap-1"><Plus className="w-3.5 h-3.5" /> New</Button>
              {selectedId && <Button variant="outline" size="sm" onClick={handleDuplicate} className="gap-1"><Copy className="w-3.5 h-3.5" /> Duplicate</Button>}
              {selectedId && <Button variant="outline" size="sm" onClick={handleArchive} className="gap-1 text-destructive"><Archive className="w-3.5 h-3.5" /> Archive</Button>}
              <Button size="sm" onClick={handleSave} className="gap-1"><Save className="w-3.5 h-3.5" /> Save</Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container py-6 flex gap-6">
        {/* LEFT: Strategy List */}
        <div className="w-72 shrink-0 hidden lg:block">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Strategies ({activeStrategies.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="p-2 space-y-1">
                  {activeStrategies.map(s => (
                    <button key={s.id} onClick={() => handleSelectStrategy(s)}
                      className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-muted transition-colors ${selectedId === s.id ? 'bg-primary/10 text-primary font-medium' : ''}`}>
                      {s.strategy_name}
                      {s.crisis_relevance && <Badge variant="destructive" className="text-[9px] ml-1">Crisis</Badge>}
                    </button>
                  ))}
                  {activeStrategies.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No strategies yet</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Editor */}
        <div className="flex-1 min-w-0">
          <Tabs defaultValue="basics">
            <TabsList className="mb-4">
              <TabsTrigger value="basics">Basics</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="tags">Tags & Filters</TabsTrigger>
              <TabsTrigger value="links">Links</TabsTrigger>
              <TabsTrigger value="variants">Variants</TabsTrigger>
            </TabsList>

            {/* BASICS */}
            <TabsContent value="basics">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label>Strategy Name *</Label><Input value={form.strategy_name || ''} onChange={e => update('strategy_name', e.target.value)} /></div>
                    <div><Label>Strategy Code</Label><Input value={form.strategy_code || ''} onChange={e => update('strategy_code', e.target.value)} placeholder="Auto-generated if empty" /></div>
                  </div>
                  <div><Label>Short Description</Label><Textarea value={form.short_description || ''} onChange={e => update('short_description', e.target.value)} rows={2} /></div>
                  <div><Label>Full Description</Label><Textarea value={form.full_description || ''} onChange={e => update('full_description', e.target.value)} rows={4} /></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Risk Level</Label>
                      <Select value={form.risk_level || 'low'} onValueChange={v => update('risk_level', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{RISK_LEVELS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select value={form.status || 'active'} onValueChange={v => update('status', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="deprecated">Deprecated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex items-center gap-2">
                        <Switch checked={form.requires_bcba ?? false} onCheckedChange={v => update('requires_bcba', v)} />
                        <Label className="text-sm">Requires BCBA</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={form.crisis_relevance ?? false} onCheckedChange={v => update('crisis_relevance', v)} />
                        <Label className="text-sm">Crisis Relevant</Label>
                      </div>
                    </div>
                  </div>
                  <TagInput label="Strategy Types" tags={form.strategy_type || []} setTags={v => update('strategy_type', v)} options={STRATEGY_TYPES} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* CONTENT */}
            <TabsContent value="content">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <ArrayInput label="Implementation Steps" items={form.implementation_steps || []} setItems={v => update('implementation_steps', v)} placeholder="Add step..." />
                  <Separator />
                  <div><Label>Staff Script</Label><Textarea value={form.staff_script || ''} onChange={e => update('staff_script', e.target.value)} rows={4} placeholder="Script for staff to follow..." /></div>
                  <Separator />
                  <ArrayInput label="Materials Needed" items={form.materials || []} setItems={v => update('materials', v)} placeholder="Add material..." />
                  <ArrayInput label="Fidelity Checklist" items={form.fidelity_checklist || []} setItems={v => update('fidelity_checklist', v)} placeholder="Add checklist item..." />
                  <ArrayInput label="Data Collection Targets" items={form.data_targets || []} setItems={v => update('data_targets', v)} placeholder="Add data target..." />
                  <ArrayInput label="Contraindications" items={form.contraindications || []} setItems={v => update('contraindications', v)} placeholder="Add contraindication..." />
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAGS */}
            <TabsContent value="tags">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TagInput label="Function of Behavior" tags={form.function_tags || []} setTags={v => update('function_tags', v)} options={FUNCTION_OPTIONS} />
                    <TagInput label="Setting" tags={form.setting_tags || []} setTags={v => update('setting_tags', v)} options={SETTING_OPTIONS} />
                    <TagInput label="MTSS Tier" tags={form.tier_tags || []} setTags={v => update('tier_tags', v)} options={TIER_OPTIONS} />
                    <TagInput label="Grade Band" tags={form.grade_band_tags || []} setTags={v => update('grade_band_tags', v)} options={GRADE_OPTIONS} />
                    <TagInput label="Role Relevance" tags={form.role_tags || []} setTags={v => update('role_tags', v)} options={ROLE_OPTIONS} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* LINKS */}
            <TabsContent value="links">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  {selectedId ? (
                    <>
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Linked Objectives ({data.getLinkedObjectivesForStrategy(selectedId).length})</h3>
                        <div className="flex flex-wrap gap-1">
                          {data.getLinkedObjectivesForStrategy(selectedId).map((o: any) => <Badge key={o.id} variant="outline">{o.objective_title}</Badge>)}
                          {data.getLinkedObjectivesForStrategy(selectedId).length === 0 && <p className="text-xs text-muted-foreground">No linked objectives</p>}
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Linked Goals ({data.getLinkedGoalsForStrategy(selectedId).length})</h3>
                        <div className="flex flex-wrap gap-1">
                          {data.getLinkedGoalsForStrategy(selectedId).map((g: any) => <Badge key={g.id} variant="outline">{g.goal_title}</Badge>)}
                          {data.getLinkedGoalsForStrategy(selectedId).length === 0 && <p className="text-xs text-muted-foreground">No linked goals</p>}
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Linked Problems ({data.getLinkedProblemsForStrategy(selectedId).length})</h3>
                        <div className="flex flex-wrap gap-1">
                          {data.getLinkedProblemsForStrategy(selectedId).map((p: any) => <Badge key={p.id} variant="outline">{p.title}</Badge>)}
                          {data.getLinkedProblemsForStrategy(selectedId).length === 0 && <p className="text-xs text-muted-foreground">No linked problems</p>}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowLinkDialog(true)}><Link2 className="w-3.5 h-3.5" /> Manage Links</Button>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Save the strategy first to manage links</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* VARIANTS */}
            <TabsContent value="variants">
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div><Label>Family/Home Version</Label><Textarea value={form.family_version || ''} onChange={e => update('family_version', e.target.value)} rows={4} placeholder="Adapted version for family/home use..." /></div>
                  <Separator />
                  <div><Label>Teacher Quick-Use Version</Label><Textarea value={form.teacher_quick_version || ''} onChange={e => update('teacher_quick_version', e.target.value)} rows={4} placeholder="Simplified version for teachers..." /></div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Link Management Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Link to {linkType}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={linkType} onValueChange={v => setLinkType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="problem">Problem</SelectItem>
                <SelectItem value="goal">Goal</SelectItem>
                <SelectItem value="objective">Objective</SelectItem>
              </SelectContent>
            </Select>
            <ScrollArea className="h-[300px]">
              <div className="space-y-1">
                {linkType === 'objective' && data.objectives.map(o => {
                  const isLinked = data.objectiveStrategyLinks.some((l: any) => l.objective_id === o.id && l.strategy_id === selectedId);
                  return (
                    <button key={o.id} className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-muted ${isLinked ? 'bg-primary/10' : ''}`}
                      onClick={async () => {
                        if (isLinked) {
                          const link = data.objectiveStrategyLinks.find((l: any) => l.objective_id === o.id && l.strategy_id === selectedId);
                          if (link) await data.removeLink('bx_objective_strategy_links', link.id);
                        } else {
                          await data.addLink('bx_objective_strategy_links', { objective_id: o.id, strategy_id: selectedId });
                        }
                      }}>
                      {isLinked ? '✓ ' : ''}{o.objective_title}
                    </button>
                  );
                })}
                {linkType === 'goal' && data.goals.map(g => (
                  <div key={g.id} className="px-3 py-2 text-sm">{g.goal_title} <span className="text-xs text-muted-foreground">(link via objectives)</span></div>
                ))}
                {linkType === 'problem' && data.problems.map(p => (
                  <div key={p.id} className="px-3 py-2 text-sm">{p.title} <span className="text-xs text-muted-foreground">(link via objectives)</span></div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
