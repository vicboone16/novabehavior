import { useState, useEffect, useMemo } from 'react';
import { Search, BookOpen, Target, Star, Plus, Eye, Edit2, CheckCircle2, ArrowUpCircle, XCircle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface PTModule {
  module_id: string;
  title: string;
  description: string | null;
  curriculum_source: string | null;
  display_order: number | null;
  is_active: boolean | null;
  visibility_scope: string | null;
  scope: string;
  status: string;
  goal_count?: number | null;
}

interface PTGoal {
  goal_id: string;
  title: string;
  goal_title: string | null;
  module_id: string | null;
  module_title?: string | null;
  measurement_method: string | null;
  target_direction: string | null;
  mastery_rule_type: string | null;
  mastery_threshold: number | null;
  is_active: boolean | null;
}

interface PTCustomGoal {
  custom_goal_id: string;
  title: string;
  goal_title: string | null;
  module_title?: string | null;
  add_to_library: boolean | null;
  promoted_goal_id: string | null;
  promoted_to_goal_id: string | null;
  is_active: boolean | null;
  measurement_method: string | null;
  mastery_criteria: string | null;
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */
function useParentModules() {
  const [modules, setModules] = useState<PTModule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    // Get modules with goal counts
    const { data: mods } = await (supabase.from as any)('v_parent_training_module_goal_counts')
      .select('*')
      .order('display_order', { ascending: true, nullsFirst: false });

    const { data: fullMods } = await supabase.from('parent_training_modules')
      .select('module_id, title, description, curriculum_source, display_order, is_active, visibility_scope, scope, status')
      .order('display_order', { ascending: true, nullsFirst: false });

    if (fullMods) {
      const countMap = new Map((mods || []).map((m: any) => [m.module_id, m.goal_count as number]));
      setModules(fullMods.map(m => ({ ...m, goal_count: (countMap.get(m.module_id) as number) ?? 0 })));
    }
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);
  return { modules, loading, refresh: fetch };
}

function useParentGoals() {
  const [goals, setGoals] = useState<PTGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    const { data } = await (supabase.from as any)('v_parent_training_goals')
      .select('*')
      .order('title', { ascending: true });
    setGoals((data as PTGoal[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);
  return { goals, loading, refresh: fetch };
}

function useCustomGoals() {
  const [goals, setGoals] = useState<PTCustomGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    const { data } = await (supabase.from as any)('v_parent_training_custom_goals')
      .select('*')
      .order('goal_title', { ascending: true, nullsFirst: false });
    setGoals((data as PTCustomGoal[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);
  return { goals, loading, refresh: fetch };
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="text-center py-16 text-muted-foreground">
      <Icon className="w-12 h-12 mx-auto mb-4 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean | null }) {
  return active === false
    ? <Badge variant="outline" className="text-muted-foreground border-border text-[10px]">Inactive</Badge>
    : <Badge variant="outline" className="text-primary border-primary/30 text-[10px]">Active</Badge>;
}

/* ------------------------------------------------------------------ */
/*  Modules Tab                                                        */
/* ------------------------------------------------------------------ */
function ModulesTab({ modules, loading, onEdit }: { modules: PTModule[]; loading: boolean; onEdit: (m: PTModule) => void }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    let list = modules;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(m => m.title.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q));
    }
    if (statusFilter === 'active') list = list.filter(m => m.is_active !== false);
    if (statusFilter === 'inactive') list = list.filter(m => m.is_active === false);
    return list;
  }, [modules, search, statusFilter]);

  if (loading) return <div className="text-center py-12 text-muted-foreground text-sm">Loading modules…</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search modules…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={BookOpen} message="No parent training modules found" />
      ) : (
        <div className="grid gap-3">
          {filtered.map(mod => (
            <Card key={mod.module_id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => onEdit(mod)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="w-4 h-4 text-primary shrink-0" />
                      <h3 className="font-semibold text-sm text-foreground truncate">{mod.title}</h3>
                    </div>
                    {mod.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{mod.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <StatusBadge active={mod.is_active} />
                      {mod.curriculum_source && (
                        <Badge variant="secondary" className="text-[10px]">{mod.curriculum_source}</Badge>
                      )}
                      {mod.visibility_scope && (
                        <Badge variant="outline" className="text-[10px]">{mod.visibility_scope}</Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">{mod.goal_count ?? 0} goals</span>
                      {mod.display_order != null && (
                        <span className="text-[10px] text-muted-foreground">Order: {mod.display_order}</span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={e => { e.stopPropagation(); onEdit(mod); }}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Goals Tab                                                          */
/* ------------------------------------------------------------------ */
function GoalsTab({ goals, loading, onEdit }: { goals: PTGoal[]; loading: boolean; onEdit: (g: PTGoal) => void }) {
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('all');

  const moduleOptions = useMemo(() => {
    const set = new Set<string>();
    goals.forEach(g => { if (g.module_title) set.add(g.module_title); });
    return Array.from(set).sort();
  }, [goals]);

  const filtered = useMemo(() => {
    let list = goals;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(g => (g.goal_title || g.title).toLowerCase().includes(q));
    }
    if (moduleFilter !== 'all') list = list.filter(g => g.module_title === moduleFilter);
    return list;
  }, [goals, search, moduleFilter]);

  if (loading) return <div className="text-center py-12 text-muted-foreground text-sm">Loading goals…</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search goals…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Module" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {moduleOptions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Target} message="No parent training goals found" />
      ) : (
        <div className="grid gap-3">
          {filtered.map(goal => (
            <Card key={goal.goal_id} className="hover:border-primary/30 transition-colors cursor-pointer" onClick={() => onEdit(goal)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-primary shrink-0" />
                      <h3 className="font-semibold text-sm text-foreground truncate">{goal.goal_title || goal.title}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <StatusBadge active={goal.is_active} />
                      {goal.module_title && (
                        <Badge variant="secondary" className="text-[10px]">{goal.module_title}</Badge>
                      )}
                      {goal.measurement_method && (
                        <Badge variant="outline" className="text-[10px]">{goal.measurement_method}</Badge>
                      )}
                      {goal.target_direction && (
                        <span className="text-[10px] text-muted-foreground">Direction: {goal.target_direction}</span>
                      )}
                      {goal.mastery_rule_type && (
                        <span className="text-[10px] text-muted-foreground">Mastery: {goal.mastery_rule_type}</span>
                      )}
                      {goal.mastery_threshold != null && (
                        <span className="text-[10px] text-muted-foreground">Threshold: {goal.mastery_threshold}</span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={e => { e.stopPropagation(); onEdit(goal); }}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Custom Goal Candidates Tab                                         */
/* ------------------------------------------------------------------ */
function CustomGoalCandidatesTab({ goals, loading, onPromote }: { goals: PTCustomGoal[]; loading: boolean; onPromote: (g: PTCustomGoal) => void }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    let list = goals;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(g => (g.goal_title || g.title).toLowerCase().includes(q));
    }
    if (filter === 'candidates') list = list.filter(g => g.add_to_library === true && !g.promoted_goal_id && !g.promoted_to_goal_id);
    if (filter === 'promoted') list = list.filter(g => g.promoted_goal_id || g.promoted_to_goal_id);
    return list;
  }, [goals, search, filter]);

  if (loading) return <div className="text-center py-12 text-muted-foreground text-sm">Loading custom goals…</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search custom goals…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Filter" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Custom Goals</SelectItem>
            <SelectItem value="candidates">Library Candidates</SelectItem>
            <SelectItem value="promoted">Promoted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Star} message="No custom goal candidates yet" />
      ) : (
        <div className="grid gap-3">
          {filtered.map(goal => {
            const isPromoted = !!(goal.promoted_goal_id || goal.promoted_to_goal_id);
            const isCandidate = goal.add_to_library === true && !isPromoted;

            return (
              <Card key={goal.custom_goal_id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Star className="w-4 h-4 text-amber-500 shrink-0" />
                        <h3 className="font-semibold text-sm text-foreground truncate">{goal.goal_title || goal.title}</h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {isPromoted ? (
                          <Badge variant="secondary" className="text-[10px]">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Promoted
                          </Badge>
                        ) : isCandidate ? (
                          <Badge variant="default" className="text-[10px]">
                            <ArrowUpCircle className="w-3 h-3 mr-1" /> Library Candidate
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Custom</Badge>
                        )}
                        {goal.module_title && (
                          <Badge variant="secondary" className="text-[10px]">{goal.module_title}</Badge>
                        )}
                        {goal.measurement_method && (
                          <Badge variant="outline" className="text-[10px]">{goal.measurement_method}</Badge>
                        )}
                      </div>
                    </div>
                    {isCandidate && (
                      <Button size="sm" variant="outline" className="shrink-0 gap-1 text-xs" onClick={() => onPromote(goal)}>
                        <ArrowUpCircle className="w-3.5 h-3.5" /> Promote
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Module Edit Dialog                                                 */
/* ------------------------------------------------------------------ */
function ModuleEditDialog({ module, open, onClose, onSave }: { module: PTModule | null; open: boolean; onClose: () => void; onSave: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [visibilityScope, setVisibilityScope] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (module) {
      setTitle(module.title);
      setDescription(module.description || '');
      setIsActive(module.is_active !== false);
      setVisibilityScope(module.visibility_scope || '');
    } else {
      setTitle('');
      setDescription('');
      setIsActive(true);
      setVisibilityScope('');
    }
  }, [module]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (module) {
        await supabase.from('parent_training_modules')
          .update({ title, description: description || null, is_active: isActive, visibility_scope: visibilityScope || null })
          .eq('module_id', module.module_id);
        toast.success('Module updated');
      } else {
        await supabase.from('parent_training_modules')
          .insert({ title, description: description || null, is_active: isActive, visibility_scope: visibilityScope || null });
        toast.success('Module created');
      }
      onSave();
      onClose();
    } catch {
      toast.error('Failed to save module');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{module ? 'Edit Module' : 'New Module'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
          <div>
            <Label>Visibility Scope</Label>
            <Select value={visibilityScope || 'default'} onValueChange={v => setVisibilityScope(v === 'default' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select scope" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="agency">Agency</SelectItem>
                <SelectItem value="global">Global</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Goal Edit Dialog                                                   */
/* ------------------------------------------------------------------ */
function GoalEditDialog({ goal, open, onClose, onSave }: { goal: PTGoal | null; open: boolean; onClose: () => void; onSave: () => void }) {
  const [title, setTitle] = useState('');
  const [measurementMethod, setMeasurementMethod] = useState('');
  const [targetDirection, setTargetDirection] = useState('');
  const [masteryThreshold, setMasteryThreshold] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (goal) {
      setTitle(goal.goal_title || goal.title);
      setMeasurementMethod(goal.measurement_method || '');
      setTargetDirection(goal.target_direction || '');
      setMasteryThreshold(goal.mastery_threshold != null ? String(goal.mastery_threshold) : '');
      setIsActive(goal.is_active !== false);
    }
  }, [goal]);

  const handleSave = async () => {
    if (!goal || !title.trim()) return;
    setSaving(true);
    try {
      await supabase.from('parent_training_goals')
        .update({
          title,
          goal_title: title,
          measurement_method: measurementMethod || null,
          target_direction: targetDirection || null,
          mastery_threshold: masteryThreshold ? Number(masteryThreshold) : null,
          is_active: isActive,
        })
        .eq('goal_id', goal.goal_id);
      toast.success('Goal updated');
      onSave();
      onClose();
    } catch {
      toast.error('Failed to save goal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Goal</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>Measurement Method</Label>
            <Select value={measurementMethod || 'none'} onValueChange={v => setMeasurementMethod(v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not set</SelectItem>
                <SelectItem value="frequency">Frequency</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="rating_scale">Rating Scale</SelectItem>
                <SelectItem value="yes_no">Yes / No</SelectItem>
                <SelectItem value="duration">Duration</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Target Direction</Label>
            <Select value={targetDirection || 'none'} onValueChange={v => setTargetDirection(v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not set</SelectItem>
                <SelectItem value="increase">Increase</SelectItem>
                <SelectItem value="decrease">Decrease</SelectItem>
                <SelectItem value="maintain">Maintain</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Mastery Threshold</Label>
            <Input type="number" value={masteryThreshold} onChange={e => setMasteryThreshold(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Active</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export function CaregiverCurriculumLibrary() {
  const [subTab, setSubTab] = useState('modules');

  const { modules, loading: modulesLoading, refresh: refreshModules } = useParentModules();
  const { goals, loading: goalsLoading, refresh: refreshGoals } = useParentGoals();
  const { goals: customGoals, loading: customLoading, refresh: refreshCustom } = useCustomGoals();

  // Dialogs
  const [editModule, setEditModule] = useState<PTModule | null>(null);
  const [showModuleDialog, setShowModuleDialog] = useState(false);
  const [editGoal, setEditGoal] = useState<PTGoal | null>(null);
  const [showGoalDialog, setShowGoalDialog] = useState(false);

  const handlePromote = async (goal: PTCustomGoal) => {
    try {
      // Create a new library goal from the custom goal
      const { data: newGoal, error } = await supabase.from('parent_training_goals').insert({
        title: goal.goal_title || goal.title,
        goal_title: goal.goal_title || goal.title,
        goal_key: `promoted_${goal.custom_goal_id}`,
        measurement_method: goal.measurement_method,
        mastery_criteria: goal.mastery_criteria,
        is_active: true,
      }).select('goal_id').single();

      if (error) throw error;

      // Mark the custom goal as promoted
      await supabase.from('parent_training_custom_goals')
        .update({ promoted_to_goal_id: newGoal.goal_id })
        .eq('custom_goal_id', goal.custom_goal_id);

      toast.success('Custom goal promoted to library');
      refreshGoals();
      refreshCustom();
    } catch (err) {
      console.error(err);
      toast.error('Failed to promote goal');
    }
  };

  const candidateCount = customGoals.filter(g => g.add_to_library === true && !g.promoted_goal_id && !g.promoted_to_goal_id).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">Parent & Caregiver Curriculum</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage caregiver-facing training modules, goals, and curriculum content
          </p>
        </div>
        <div className="flex items-center gap-2">
          {subTab === 'modules' && (
            <Button size="sm" className="gap-1" onClick={() => { setEditModule(null); setShowModuleDialog(true); }}>
              <Plus className="w-3.5 h-3.5" /> New Module
            </Button>
          )}
        </div>
      </div>

      <Separator />

      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="modules" className="gap-1.5 text-xs">
            <BookOpen className="w-3.5 h-3.5" /> Modules
          </TabsTrigger>
          <TabsTrigger value="goals" className="gap-1.5 text-xs">
            <Target className="w-3.5 h-3.5" /> Goals
          </TabsTrigger>
          <TabsTrigger value="candidates" className="gap-1.5 text-xs">
            <Star className="w-3.5 h-3.5" /> Candidates
            {candidateCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{candidateCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="mt-4">
          <ModulesTab
            modules={modules}
            loading={modulesLoading}
            onEdit={m => { setEditModule(m); setShowModuleDialog(true); }}
          />
        </TabsContent>

        <TabsContent value="goals" className="mt-4">
          <GoalsTab
            goals={goals}
            loading={goalsLoading}
            onEdit={g => { setEditGoal(g); setShowGoalDialog(true); }}
          />
        </TabsContent>

        <TabsContent value="candidates" className="mt-4">
          <CustomGoalCandidatesTab
            goals={customGoals}
            loading={customLoading}
            onPromote={handlePromote}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ModuleEditDialog
        module={editModule}
        open={showModuleDialog}
        onClose={() => setShowModuleDialog(false)}
        onSave={refreshModules}
      />
      <GoalEditDialog
        goal={editGoal}
        open={showGoalDialog}
        onClose={() => setShowGoalDialog(false)}
        onSave={refreshGoals}
      />
    </div>
  );
}
