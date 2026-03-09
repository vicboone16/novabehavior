import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, BookOpen, Target, Star, Plus, Edit2, CheckCircle2,
  ArrowUpCircle, Filter, FileText, Eye, EyeOff, ToggleLeft, ToggleRight,
  ChevronDown, Clock, TrendingUp, TrendingDown, Minus, Activity, Hash,
  Percent, BarChart3, Copy, XCircle, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const db = supabase as any;

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface PTModule {
  module_id: string;
  title: string;
  description: string | null;
  short_description: string | null;
  curriculum_source: string | null;
  display_order: number | null;
  order_index: number | null;
  is_active: boolean | null;
  visibility_scope: string | null;
  scope: string;
  status: string;
  category: string | null;
  audience: string | null;
  behavior_decoded_enabled: boolean | null;
  est_minutes: number | null;
  library_section: string | null;
  library_subsection: string | null;
  goal_count?: number;
}

interface PTGoal {
  goal_id: string;
  title: string;
  goal_title: string | null;
  description: string | null;
  goal_description: string | null;
  module_id: string | null;
  module_title?: string | null;
  measurement_method: string | null;
  unit: string | null;
  target_direction: string | null;
  mastery_rule_type: string | null;
  mastery_threshold: number | null;
  required_consecutive_sessions: number | null;
  lower_is_better: boolean | null;
  mastery_criteria: string | null;
  baseline_definition: string | null;
  target_definition: string | null;
  is_active: boolean | null;
  display_order: number | null;
  library_section: string | null;
  display_group: string | null;
}

interface PTCustomGoal {
  custom_goal_id: string;
  title: string;
  goal_title: string | null;
  goal_description: string | null;
  module_title?: string | null;
  client_id: string | null;
  caregiver_id: string | null;
  add_to_library: boolean | null;
  is_library_candidate: boolean | null;
  promoted_goal_id: string | null;
  promoted_to_goal_id: string | null;
  is_active: boolean | null;
  measurement_method: string | null;
  mastery_criteria: string | null;
  unit: string | null;
  baseline_definition: string | null;
  target_definition: string | null;
  created_at: string | null;
}

/* ------------------------------------------------------------------ */
/*  Data hooks                                                         */
/* ------------------------------------------------------------------ */
function useParentModules() {
  const [modules, setModules] = useState<PTModule[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [{ data: mods }, { data: counts }] = await Promise.all([
      db.from('parent_training_modules')
        .select('module_id, title, description, short_description, curriculum_source, display_order, order_index, is_active, visibility_scope, scope, status, category, audience, behavior_decoded_enabled, est_minutes, library_section, library_subsection')
        .order('display_order', { ascending: true, nullsFirst: false }),
      db.from('v_parent_training_module_goal_counts').select('module_id, goal_count'),
    ]);
    if (mods) {
      const cmap = new Map((counts || []).map((c: any) => [c.module_id, Number(c.goal_count) || 0]));
      setModules(mods.map((m: any) => ({ ...m, goal_count: cmap.get(m.module_id) ?? 0 })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { modules, loading, refresh };
}

function useParentGoals() {
  const [goals, setGoals] = useState<PTGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    // Fetch from base table to get smart-goal-engine fields, join module title
    const { data } = await db.from('parent_training_goals')
      .select('*, parent_training_modules(title)')
      .order('display_order', { ascending: true, nullsFirst: false });
    setGoals((data || []).map((g: any) => ({
      ...g,
      module_title: g.parent_training_modules?.title ?? null,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { goals, loading, refresh };
}

function useCustomGoals() {
  const [goals, setGoals] = useState<PTCustomGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data } = await db.from('v_parent_training_custom_goals')
      .select('*')
      .order('created_at', { ascending: false });
    setGoals((data as PTCustomGoal[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  return { goals, loading, refresh };
}

/* ------------------------------------------------------------------ */
/*  Shared sub-components                                              */
/* ------------------------------------------------------------------ */
function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="text-center py-20 text-muted-foreground">
      <Icon className="w-10 h-10 mx-auto mb-3 opacity-20" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean | null }) {
  return active === false
    ? <Badge variant="outline" className="text-muted-foreground border-border text-[10px] gap-0.5"><EyeOff className="w-2.5 h-2.5" />Inactive</Badge>
    : <Badge variant="outline" className="text-primary border-primary/30 text-[10px] gap-0.5"><Eye className="w-2.5 h-2.5" />Active</Badge>;
}

function DirectionIcon({ dir }: { dir: string | null }) {
  if (dir === 'increase') return <TrendingUp className="w-3 h-3 text-emerald-500" />;
  if (dir === 'decrease') return <TrendingDown className="w-3 h-3 text-destructive" />;
  if (dir === 'maintain') return <Minus className="w-3 h-3 text-muted-foreground" />;
  return null;
}

function MeasurementIcon({ method }: { method: string | null }) {
  if (method === 'frequency') return <Hash className="w-3 h-3" />;
  if (method === 'percentage') return <Percent className="w-3 h-3" />;
  if (method === 'rating_scale') return <BarChart3 className="w-3 h-3" />;
  if (method === 'duration') return <Clock className="w-3 h-3" />;
  return <Activity className="w-3 h-3" />;
}

function SmartGoalEngineBadges({ goal }: { goal: PTGoal }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
      {goal.measurement_method && (
        <Badge variant="secondary" className="text-[10px] gap-0.5 font-normal">
          <MeasurementIcon method={goal.measurement_method} />
          {goal.measurement_method.replace('_', ' ')}
        </Badge>
      )}
      {goal.target_direction && (
        <Badge variant="secondary" className="text-[10px] gap-0.5 font-normal">
          <DirectionIcon dir={goal.target_direction} />
          {goal.target_direction}
        </Badge>
      )}
      {goal.mastery_rule_type && (
        <Badge variant="outline" className="text-[10px] gap-0.5 font-normal">
          Mastery: {goal.mastery_rule_type.replace('_', ' ')}
        </Badge>
      )}
      {goal.mastery_threshold != null && (
        <Badge variant="outline" className="text-[10px] font-normal">
          Threshold: {goal.mastery_threshold}
        </Badge>
      )}
      {goal.required_consecutive_sessions != null && goal.required_consecutive_sessions > 0 && (
        <Badge variant="outline" className="text-[10px] font-normal">
          {goal.required_consecutive_sessions} consec. sessions
        </Badge>
      )}
      {goal.lower_is_better && (
        <Badge variant="outline" className="text-[10px] font-normal text-amber-600 border-amber-300">
          Lower is better
        </Badge>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Modules Tab                                                        */
/* ------------------------------------------------------------------ */
function ModulesTab({
  modules, loading, onEdit, onToggleActive
}: {
  modules: PTModule[]; loading: boolean;
  onEdit: (m: PTModule) => void;
  onToggleActive: (m: PTModule) => void;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('all');

  const sources = useMemo(() => {
    const s = new Set<string>();
    modules.forEach(m => { if (m.curriculum_source) s.add(m.curriculum_source); });
    return Array.from(s).sort();
  }, [modules]);

  const scopes = useMemo(() => {
    const s = new Set<string>();
    modules.forEach(m => { if (m.visibility_scope) s.add(m.visibility_scope); });
    return Array.from(s).sort();
  }, [modules]);

  const filtered = useMemo(() => {
    let list = modules;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(m => m.title.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q) || m.short_description?.toLowerCase().includes(q));
    }
    if (statusFilter === 'active') list = list.filter(m => m.is_active !== false);
    if (statusFilter === 'inactive') list = list.filter(m => m.is_active === false);
    if (sourceFilter !== 'all') list = list.filter(m => m.curriculum_source === sourceFilter);
    if (scopeFilter !== 'all') list = list.filter(m => m.visibility_scope === scopeFilter);
    return list;
  }, [modules, search, statusFilter, sourceFilter, scopeFilter]);

  if (loading) return <div className="text-center py-12 text-muted-foreground text-sm">Loading modules…</div>;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search modules…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        {sources.length > 0 && (
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {sources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {scopes.length > 0 && (
          <Select value={scopeFilter} onValueChange={setScopeFilter}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Scope" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scopes</SelectItem>
              {scopes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} module{filtered.length !== 1 ? 's' : ''}</p>

      {filtered.length === 0 ? (
        <EmptyState icon={BookOpen} message="No parent/caregiver modules available yet" />
      ) : (
        <div className="grid gap-3">
          {filtered.map(mod => (
            <Card key={mod.module_id} className="group hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(mod)}>
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen className="w-4 h-4 text-primary shrink-0" />
                      <h3 className="font-semibold text-sm text-foreground truncate">{mod.title}</h3>
                      {mod.behavior_decoded_enabled && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger><Sparkles className="w-3.5 h-3.5 text-amber-500" /></TooltipTrigger>
                            <TooltipContent><p className="text-xs">Behavior Decoded enabled</p></TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    {(mod.description || mod.short_description) && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{mod.description || mod.short_description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <StatusBadge active={mod.is_active} />
                      {mod.curriculum_source && <Badge variant="secondary" className="text-[10px]">{mod.curriculum_source}</Badge>}
                      {mod.visibility_scope && <Badge variant="outline" className="text-[10px]">{mod.visibility_scope}</Badge>}
                      {mod.category && <Badge variant="outline" className="text-[10px]">{mod.category}</Badge>}
                      <span className="text-[10px] text-muted-foreground font-medium">{mod.goal_count ?? 0} goals</span>
                      {mod.est_minutes != null && mod.est_minutes > 0 && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{mod.est_minutes}m</span>
                      )}
                      {mod.display_order != null && (
                        <span className="text-[10px] text-muted-foreground">#{mod.display_order}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onToggleActive(mod)}>
                            {mod.is_active !== false ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p className="text-xs">{mod.is_active !== false ? 'Deactivate' : 'Reactivate'}</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(mod)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
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
function GoalsTab({
  goals, loading, modules, onEdit, onToggleActive, onDuplicate
}: {
  goals: PTGoal[]; loading: boolean; modules: PTModule[];
  onEdit: (g: PTGoal) => void;
  onToggleActive: (g: PTGoal) => void;
  onDuplicate: (g: PTGoal) => void;
}) {
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [masteryFilter, setMasteryFilter] = useState('all');

  const moduleOptions = useMemo(() => {
    const s = new Set<string>();
    goals.forEach(g => { if (g.module_title) s.add(g.module_title); });
    return Array.from(s).sort();
  }, [goals]);

  const filtered = useMemo(() => {
    let list = goals;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(g => (g.goal_title || g.title).toLowerCase().includes(q) || g.description?.toLowerCase().includes(q) || g.goal_description?.toLowerCase().includes(q));
    }
    if (moduleFilter !== 'all') list = list.filter(g => g.module_title === moduleFilter);
    if (statusFilter === 'active') list = list.filter(g => g.is_active !== false);
    if (statusFilter === 'inactive') list = list.filter(g => g.is_active === false);
    if (masteryFilter !== 'all') list = list.filter(g => g.mastery_rule_type === masteryFilter);
    return list;
  }, [goals, search, moduleFilter, statusFilter, masteryFilter]);

  const masteryTypes = useMemo(() => {
    const s = new Set<string>();
    goals.forEach(g => { if (g.mastery_rule_type) s.add(g.mastery_rule_type); });
    return Array.from(s).sort();
  }, [goals]);

  if (loading) return <div className="text-center py-12 text-muted-foreground text-sm">Loading goals…</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search goals…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={moduleFilter} onValueChange={setModuleFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Module" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modules</SelectItem>
            {moduleOptions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        {masteryTypes.length > 0 && (
          <Select value={masteryFilter} onValueChange={setMasteryFilter}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Mastery" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Mastery</SelectItem>
              {masteryTypes.map(t => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} goal{filtered.length !== 1 ? 's' : ''}</p>

      {filtered.length === 0 ? (
        <EmptyState icon={Target} message="No parent library goals available yet" />
      ) : (
        <div className="grid gap-3">
          {filtered.map(goal => (
            <Card key={goal.goal_id} className="group hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(goal)}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <Target className="w-4 h-4 text-primary shrink-0" />
                      <h3 className="font-semibold text-sm text-foreground truncate">{goal.goal_title || goal.title}</h3>
                    </div>
                    {(goal.description || goal.goal_description) && (
                      <p className="text-xs text-muted-foreground line-clamp-2 ml-6">{goal.goal_description || goal.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5 ml-6">
                      <StatusBadge active={goal.is_active} />
                      {goal.module_title && <Badge variant="secondary" className="text-[10px]">{goal.module_title}</Badge>}
                      {goal.display_group && <Badge variant="outline" className="text-[10px]">{goal.display_group}</Badge>}
                    </div>
                    <div className="ml-6">
                      <SmartGoalEngineBadges goal={goal} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onToggleActive(goal)}>
                            {goal.is_active !== false ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p className="text-xs">{goal.is_active !== false ? 'Deactivate' : 'Reactivate'}</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDuplicate(goal)}>
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p className="text-xs">Duplicate goal</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(goal)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
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
function CandidatesTab({
  goals, loading, onPromote, onDismiss
}: {
  goals: PTCustomGoal[]; loading: boolean;
  onPromote: (g: PTCustomGoal) => void;
  onDismiss: (g: PTCustomGoal) => void;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('candidates');

  const filtered = useMemo(() => {
    let list = goals;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(g => (g.goal_title || g.title).toLowerCase().includes(q) || g.goal_description?.toLowerCase().includes(q));
    }
    if (filter === 'candidates') list = list.filter(g => (g.add_to_library || g.is_library_candidate) && !g.promoted_goal_id && !g.promoted_to_goal_id);
    if (filter === 'promoted') list = list.filter(g => g.promoted_goal_id || g.promoted_to_goal_id);
    if (filter === 'dismissed') list = list.filter(g => !g.add_to_library && !g.is_library_candidate && !g.promoted_goal_id && !g.promoted_to_goal_id);
    return list;
  }, [goals, search, filter]);

  if (loading) return <div className="text-center py-12 text-muted-foreground text-sm">Loading custom goals…</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search custom goals…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Filter" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Custom Goals</SelectItem>
            <SelectItem value="candidates">Library Candidates</SelectItem>
            <SelectItem value="promoted">Promoted</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} custom goal{filtered.length !== 1 ? 's' : ''}</p>

      {filtered.length === 0 ? (
        <EmptyState icon={Star} message="No custom caregiver goals pending review" />
      ) : (
        <div className="grid gap-3">
          {filtered.map(goal => {
            const isPromoted = !!(goal.promoted_goal_id || goal.promoted_to_goal_id);
            const isCandidate = (goal.add_to_library || goal.is_library_candidate) && !isPromoted;

            return (
              <Card key={goal.custom_goal_id} className="group hover:border-primary/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Star className={`w-4 h-4 shrink-0 ${isCandidate ? 'text-amber-500' : 'text-muted-foreground'}`} />
                        <h3 className="font-semibold text-sm text-foreground truncate">{goal.goal_title || goal.title}</h3>
                      </div>
                      {goal.goal_description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 ml-6">{goal.goal_description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2 ml-6">
                        {isPromoted ? (
                          <Badge variant="secondary" className="text-[10px] gap-0.5 text-emerald-600 border-emerald-200 bg-emerald-50">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Promoted
                          </Badge>
                        ) : isCandidate ? (
                          <Badge className="text-[10px] gap-0.5 bg-amber-500/90 hover:bg-amber-500">
                            <ArrowUpCircle className="w-2.5 h-2.5" /> Library Candidate
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Custom</Badge>
                        )}
                        {goal.module_title && <Badge variant="secondary" className="text-[10px]">{goal.module_title}</Badge>}
                        {goal.measurement_method && <Badge variant="outline" className="text-[10px]">{goal.measurement_method}</Badge>}
                        {goal.created_at && (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(goal.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isCandidate && (
                        <>
                          <Button size="sm" variant="default" className="gap-1 text-xs h-7" onClick={() => onPromote(goal)}>
                            <ArrowUpCircle className="w-3 h-3" /> Promote
                          </Button>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDismiss(goal)}>
                                  <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p className="text-xs">Dismiss from queue</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      )}
                    </div>
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
/*  Materials Tab (placeholder / future)                               */
/* ------------------------------------------------------------------ */
function MaterialsTab() {
  return <EmptyState icon={FileText} message="No parent materials available yet" />;
}

/* ------------------------------------------------------------------ */
/*  Module Edit Dialog                                                 */
/* ------------------------------------------------------------------ */
function ModuleEditDialog({ module, open, onClose, onSave }: {
  module: PTModule | null; open: boolean; onClose: () => void; onSave: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [curriculumSource, setCurriculumSource] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [visibilityScope, setVisibilityScope] = useState('');
  const [behaviorDecoded, setBehaviorDecoded] = useState(false);
  const [displayOrder, setDisplayOrder] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (module) {
      setTitle(module.title);
      setDescription(module.description || '');
      setCurriculumSource(module.curriculum_source || '');
      setIsActive(module.is_active !== false);
      setVisibilityScope(module.visibility_scope || '');
      setBehaviorDecoded(module.behavior_decoded_enabled === true);
      setDisplayOrder(module.display_order != null ? String(module.display_order) : '');
    } else {
      setTitle(''); setDescription(''); setCurriculumSource('');
      setIsActive(true); setVisibilityScope(''); setBehaviorDecoded(false); setDisplayOrder('');
    }
  }, [module, open]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const payload: any = {
        title,
        description: description || null,
        is_active: isActive,
        visibility_scope: visibilityScope || null,
        curriculum_source: curriculumSource || null,
        behavior_decoded_enabled: behaviorDecoded,
        display_order: displayOrder ? Number(displayOrder) : null,
      };
      if (module) {
        await db.from('parent_training_modules').update(payload).eq('module_id', module.module_id);
        toast.success('Module updated');
      } else {
        await db.from('parent_training_modules').insert(payload);
        toast.success('Module created');
      }
      onSave();
      onClose();
    } catch {
      toast.error('Failed to save module');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{module ? 'Edit Parent Module' : 'New Parent Module'}</DialogTitle>
          <DialogDescription>Manage caregiver-facing training module details</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Curriculum Source</Label><Input value={curriculumSource} onChange={e => setCurriculumSource(e.target.value)} placeholder="e.g. ABA, RBT" /></div>
            <div><Label>Display Order</Label><Input type="number" value={displayOrder} onChange={e => setDisplayOrder(e.target.value)} /></div>
          </div>
          <div>
            <Label>Visibility Scope</Label>
            <Select value={visibilityScope || '_default'} onValueChange={v => setVisibilityScope(v === '_default' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select scope" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_default">Default</SelectItem>
                <SelectItem value="agency">Agency</SelectItem>
                <SelectItem value="global">Global</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>Active</Label></div>
            <div className="flex items-center gap-2"><Switch checked={behaviorDecoded} onCheckedChange={setBehaviorDecoded} /><Label>Behavior Decoded</Label></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>{saving ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Goal Edit Dialog                                                   */
/* ------------------------------------------------------------------ */
function GoalEditDialog({ goal, modules, open, onClose, onSave, isNew }: {
  goal: PTGoal | null; modules: PTModule[]; open: boolean; onClose: () => void; onSave: () => void; isNew?: boolean;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [measurementMethod, setMeasurementMethod] = useState('');
  const [targetDirection, setTargetDirection] = useState('');
  const [masteryRuleType, setMasteryRuleType] = useState('');
  const [masteryThreshold, setMasteryThreshold] = useState('');
  const [consecutiveSessions, setConsecutiveSessions] = useState('');
  const [lowerIsBetter, setLowerIsBetter] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (goal && !isNew) {
      setTitle(goal.goal_title || goal.title);
      setDescription(goal.goal_description || goal.description || '');
      setModuleId(goal.module_id || '');
      setMeasurementMethod(goal.measurement_method || '');
      setTargetDirection(goal.target_direction || '');
      setMasteryRuleType(goal.mastery_rule_type || '');
      setMasteryThreshold(goal.mastery_threshold != null ? String(goal.mastery_threshold) : '');
      setConsecutiveSessions(goal.required_consecutive_sessions != null ? String(goal.required_consecutive_sessions) : '');
      setLowerIsBetter(goal.lower_is_better === true);
      setIsActive(goal.is_active !== false);
    } else if (isNew) {
      setTitle(''); setDescription(''); setModuleId(''); setMeasurementMethod('');
      setTargetDirection(''); setMasteryRuleType(''); setMasteryThreshold('');
      setConsecutiveSessions(''); setLowerIsBetter(false); setIsActive(true);
    }
  }, [goal, isNew, open]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const payload: any = {
        title,
        goal_title: title,
        description: description || null,
        goal_description: description || null,
        module_id: moduleId || null,
        measurement_method: measurementMethod || null,
        target_direction: targetDirection || null,
        mastery_rule_type: masteryRuleType || null,
        mastery_threshold: masteryThreshold ? Number(masteryThreshold) : null,
        required_consecutive_sessions: consecutiveSessions ? Number(consecutiveSessions) : null,
        lower_is_better: lowerIsBetter,
        is_active: isActive,
      };
      if (goal && !isNew) {
        await db.from('parent_training_goals').update(payload).eq('goal_id', goal.goal_id);
        toast.success('Goal updated');
      } else {
        payload.goal_key = `goal_${Date.now()}`;
        await db.from('parent_training_goals').insert(payload);
        toast.success('Goal created');
      }
      onSave();
      onClose();
    } catch {
      toast.error('Failed to save goal');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isNew ? 'New Parent Goal' : 'Edit Parent Goal'}</DialogTitle>
          <DialogDescription>Configure clinically-structured caregiver training goal</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} /></div>
          <div>
            <Label>Module</Label>
            <Select value={moduleId || '_none'} onValueChange={v => setModuleId(v === '_none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select module" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">No module</SelectItem>
                {modules.map(m => <SelectItem key={m.module_id} value={m.module_id}>{m.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Separator />
          <p className="text-xs font-semibold text-foreground">Smart Goal Engine Settings</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Measurement Method</Label>
              <Select value={measurementMethod || '_none'} onValueChange={v => setMeasurementMethod(v === '_none' ? '' : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Not set</SelectItem>
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
              <Select value={targetDirection || '_none'} onValueChange={v => setTargetDirection(v === '_none' ? '' : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Not set</SelectItem>
                  <SelectItem value="increase">Increase</SelectItem>
                  <SelectItem value="decrease">Decrease</SelectItem>
                  <SelectItem value="maintain">Maintain</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Mastery Rule Type</Label>
              <Select value={masteryRuleType || '_none'} onValueChange={v => setMasteryRuleType(v === '_none' ? '' : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Not set</SelectItem>
                  <SelectItem value="consecutive">Consecutive</SelectItem>
                  <SelectItem value="cumulative">Cumulative</SelectItem>
                  <SelectItem value="threshold">Threshold</SelectItem>
                  <SelectItem value="trend">Trend</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Mastery Threshold</Label><Input type="number" value={masteryThreshold} onChange={e => setMasteryThreshold(e.target.value)} placeholder="e.g. 80" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Required Consecutive Sessions</Label><Input type="number" value={consecutiveSessions} onChange={e => setConsecutiveSessions(e.target.value)} placeholder="e.g. 3" /></div>
            <div className="flex items-end pb-1">
              <div className="flex items-center gap-2"><Switch checked={lowerIsBetter} onCheckedChange={setLowerIsBetter} /><Label>Lower is better</Label></div>
            </div>
          </div>
          <Separator />
          <div className="flex items-center gap-2"><Switch checked={isActive} onCheckedChange={setIsActive} /><Label>Active</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>{saving ? 'Saving…' : 'Save'}</Button>
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
  const [isNewGoal, setIsNewGoal] = useState(false);

  // Module toggle
  const handleToggleModule = async (mod: PTModule) => {
    const newActive = mod.is_active === false;
    await db.from('parent_training_modules').update({ is_active: newActive }).eq('module_id', mod.module_id);
    toast.success(newActive ? 'Module activated' : 'Module deactivated');
    refreshModules();
  };

  // Goal toggle
  const handleToggleGoal = async (goal: PTGoal) => {
    const newActive = goal.is_active === false;
    await db.from('parent_training_goals').update({ is_active: newActive }).eq('goal_id', goal.goal_id);
    toast.success(newActive ? 'Goal activated' : 'Goal deactivated');
    refreshGoals();
  };

  // Goal duplicate
  const handleDuplicateGoal = async (goal: PTGoal) => {
    try {
      await db.from('parent_training_goals').insert({
        title: `${goal.goal_title || goal.title} (copy)`,
        goal_title: `${goal.goal_title || goal.title} (copy)`,
        goal_key: `dup_${Date.now()}`,
        module_id: goal.module_id,
        description: goal.description,
        goal_description: goal.goal_description,
        measurement_method: goal.measurement_method,
        target_direction: goal.target_direction,
        mastery_rule_type: goal.mastery_rule_type,
        mastery_threshold: goal.mastery_threshold,
        required_consecutive_sessions: goal.required_consecutive_sessions,
        lower_is_better: goal.lower_is_better,
        is_active: true,
      });
      toast.success('Goal duplicated');
      refreshGoals();
    } catch { toast.error('Failed to duplicate goal'); }
  };

  // Promote custom goal
  const handlePromote = async (goal: PTCustomGoal) => {
    try {
      const { data: newGoal, error } = await db.from('parent_training_goals').insert({
        title: goal.goal_title || goal.title,
        goal_title: goal.goal_title || goal.title,
        goal_key: `promoted_${goal.custom_goal_id}`,
        measurement_method: goal.measurement_method,
        mastery_criteria: goal.mastery_criteria,
        is_active: true,
      }).select('goal_id').single();
      if (error) throw error;
      await db.from('parent_training_custom_goals').update({ promoted_to_goal_id: newGoal.goal_id, promoted_goal_id: newGoal.goal_id }).eq('custom_goal_id', goal.custom_goal_id);
      toast.success('Custom goal promoted to library');
      refreshGoals();
      refreshCustom();
    } catch { toast.error('Failed to promote goal'); }
  };

  // Dismiss custom goal
  const handleDismiss = async (goal: PTCustomGoal) => {
    try {
      await db.from('parent_training_custom_goals').update({ add_to_library: false, is_library_candidate: false }).eq('custom_goal_id', goal.custom_goal_id);
      toast.success('Goal dismissed from candidate queue');
      refreshCustom();
    } catch { toast.error('Failed to dismiss goal'); }
  };

  const candidateCount = customGoals.filter(g => (g.add_to_library || g.is_library_candidate) && !g.promoted_goal_id && !g.promoted_to_goal_id).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Parent & Caregiver Curriculum
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage caregiver-facing training modules, structured goals, and curriculum content — separate from student clinical programming
          </p>
        </div>
        <div className="flex items-center gap-2">
          {subTab === 'modules' && (
            <Button size="sm" className="gap-1" onClick={() => { setEditModule(null); setShowModuleDialog(true); }}>
              <Plus className="w-3.5 h-3.5" /> New Module
            </Button>
          )}
          {subTab === 'goals' && (
            <Button size="sm" className="gap-1" onClick={() => { setEditGoal(null); setIsNewGoal(true); setShowGoalDialog(true); }}>
              <Plus className="w-3.5 h-3.5" /> New Goal
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Sub-tabs */}
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="bg-muted/50">
          <TabsTrigger value="modules" className="gap-1.5 text-xs">
            <BookOpen className="w-3.5 h-3.5" /> Modules
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{modules.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="goals" className="gap-1.5 text-xs">
            <Target className="w-3.5 h-3.5" /> Goals
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5">{goals.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="candidates" className="gap-1.5 text-xs">
            <Star className="w-3.5 h-3.5" /> Candidates
            {candidateCount > 0 && (
              <Badge className="ml-1 text-[10px] px-1.5 bg-amber-500/90">{candidateCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="materials" className="gap-1.5 text-xs">
            <FileText className="w-3.5 h-3.5" /> Materials
          </TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="mt-4">
          <ModulesTab modules={modules} loading={modulesLoading} onEdit={m => { setEditModule(m); setShowModuleDialog(true); }} onToggleActive={handleToggleModule} />
        </TabsContent>
        <TabsContent value="goals" className="mt-4">
          <GoalsTab goals={goals} loading={goalsLoading} modules={modules} onEdit={g => { setEditGoal(g); setIsNewGoal(false); setShowGoalDialog(true); }} onToggleActive={handleToggleGoal} onDuplicate={handleDuplicateGoal} />
        </TabsContent>
        <TabsContent value="candidates" className="mt-4">
          <CandidatesTab goals={customGoals} loading={customLoading} onPromote={handlePromote} onDismiss={handleDismiss} />
        </TabsContent>
        <TabsContent value="materials" className="mt-4">
          <MaterialsTab />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ModuleEditDialog module={editModule} open={showModuleDialog} onClose={() => setShowModuleDialog(false)} onSave={refreshModules} />
      <GoalEditDialog goal={editGoal} modules={modules} open={showGoalDialog} onClose={() => setShowGoalDialog(false)} onSave={refreshGoals} isNew={isNewGoal} />
    </div>
  );
}
