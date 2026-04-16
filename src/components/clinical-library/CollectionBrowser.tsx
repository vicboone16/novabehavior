import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Search, ChevronDown, ChevronUp, BookOpen, Target, ListChecks, Filter, Loader2, Plus, Pencil, Check, X, UserPlus, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface Domain {
  id: string;
  key: string;
  title: string;
  sort_order: number;
}

interface Goal {
  id: string;
  domain_id: string;
  key: string;
  title: string;
  clinical_goal: string | null;
  objective_text: string | null;
  vbmapp_domain: string | null;
  vbmapp_level: number | null;
  younger_examples: string[] | null;
  older_examples: string[] | null;
  benchmark_count: number;
  is_active: boolean;
  sort_order: number;
}

interface Benchmark {
  id: string;
  goal_id: string;
  benchmark_order: number;
  benchmark_text: string;
}

interface Props {
  collectionId: string;
  collectionTitle: string;
  onBack: () => void;
}

// Inline editable text field
function InlineEdit({ value, onSave, multiline, label, className }: {
  value: string;
  onSave: (val: string) => Promise<void>;
  multiline?: boolean;
  label?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (draft.trim() === value) { setEditing(false); return; }
    setSaving(true);
    try {
      await onSave(draft.trim());
      setEditing(false);
    } catch { /* toast handled upstream */ }
    finally { setSaving(false); }
  };

  if (!editing) {
    return (
      <span
        className={`group cursor-pointer inline-flex items-start gap-1 hover:bg-muted/50 rounded px-1 -mx-1 transition-colors ${className || ''}`}
        onClick={() => { setDraft(value); setEditing(true); }}
        title="Click to edit"
      >
        <span>{value || <span className="italic text-muted-foreground">Click to add {label || 'text'}</span>}</span>
        <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 transition-opacity" />
      </span>
    );
  }

  const Tag = multiline ? Textarea : Input;
  return (
    <div className="flex items-start gap-1 w-full">
      <Tag
        value={draft}
        onChange={(e: any) => setDraft(e.target.value)}
        className="text-xs min-h-0 h-auto"
        rows={multiline ? 2 : undefined}
        autoFocus
        onKeyDown={(e: any) => { if (!multiline && e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
      />
      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={save} disabled={saving}>
        <Check className="w-3.5 h-3.5 text-green-600" />
      </Button>
      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setEditing(false)}>
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

type AddToStudentLevel = 'domain' | 'goal' | 'objective' | 'benchmark';

interface SelectedLevel {
  type: AddToStudentLevel;
  id: string;
  label: string;
  domainTitle: string;
  goalTitle?: string;
  text?: string;
}

export function CollectionBrowser({ collectionId, collectionTitle, onBack }: Props) {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  const [domains, setDomains] = useState<Domain[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [benchmarks, setBenchmarks] = useState<Record<string, Benchmark[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [expandedBenchmarks, setExpandedBenchmarks] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState<string>('all');

  // Add goal dialog
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [addGoalDomainId, setAddGoalDomainId] = useState('');
  const [addGoalKey, setAddGoalKey] = useState('');
  const [addGoalTitle, setAddGoalTitle] = useState('');
  const [addGoalObjective, setAddGoalObjective] = useState('');
  const [addGoalClinicalGoal, setAddGoalClinicalGoal] = useState('');
  const [addGoalBenchmarks, setAddGoalBenchmarks] = useState('');
  const [saving, setSaving] = useState(false);

  // Add domain dialog
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [addDomainKey, setAddDomainKey] = useState('');
  const [addDomainTitle, setAddDomainTitle] = useState('');

  // Add benchmark inline
  const [addingBenchmarkGoalId, setAddingBenchmarkGoalId] = useState<string | null>(null);
  const [newBenchmarkText, setNewBenchmarkText] = useState('');

  // Add to student dialog
  const [showAddToStudent, setShowAddToStudent] = useState(false);
  const [selectedItems, setSelectedItems] = useState<SelectedLevel[]>([]);
  const [addDestination, setAddDestination] = useState<'skill_program' | 'behavior_goal'>('skill_program');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentResults, setStudentResults] = useState<{ id: string; first_name: string; last_name: string; display_name?: string }[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [addingToStudent, setAddingToStudent] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [domainRes, goalRes] = await Promise.all([
      supabase.from('clinical_curricula_domains').select('id, key, title, sort_order')
        .eq('collection_id', collectionId).order('sort_order'),
      supabase.from('clinical_curricula_goals').select('id, domain_id, key, title, clinical_goal, objective_text, vbmapp_domain, vbmapp_level, younger_examples, older_examples, benchmark_count, is_active, sort_order')
        .eq('is_active', true).order('sort_order'),
    ]);
    if (domainRes.error) { toast.error('Failed to load domains'); console.error(domainRes.error); }
    if (goalRes.error) { toast.error('Failed to load goals'); console.error(goalRes.error); }

    const domainIds = new Set((domainRes.data || []).map((d: any) => d.id));
    setDomains((domainRes.data || []) as Domain[]);
    setGoals(((goalRes.data || []) as Goal[]).filter(g => domainIds.has(g.domain_id)));
    setLoading(false);
  }, [collectionId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const loadBenchmarks = async (goalId: string) => {
    if (benchmarks[goalId]) {
      setExpandedBenchmarks(prev => {
        const next = new Set(prev);
        if (next.has(goalId)) next.delete(goalId); else next.add(goalId);
        return next;
      });
      return;
    }
    const { data, error } = await supabase
      .from('clinical_curricula_benchmarks')
      .select('id, goal_id, benchmark_order, benchmark_text')
      .eq('goal_id', goalId)
      .order('benchmark_order');
    if (error) { toast.error('Failed to load benchmarks'); return; }
    setBenchmarks(prev => ({ ...prev, [goalId]: (data || []) as Benchmark[] }));
    setExpandedBenchmarks(prev => new Set(prev).add(goalId));
  };

  const toggleDomain = (id: string) => {
    setExpandedDomains(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getFilteredGoals = (domainId: string) => {
    let filtered = goals.filter(g => g.domain_id === domainId);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(g =>
        g.title.toLowerCase().includes(q) ||
        g.clinical_goal?.toLowerCase().includes(q) ||
        g.objective_text?.toLowerCase().includes(q) ||
        g.key.toLowerCase().includes(q)
      );
    }
    return filtered;
  };

  const visibleDomains = domains.filter(d => {
    if (domainFilter !== 'all' && d.id !== domainFilter) return false;
    return getFilteredGoals(d.id).length > 0 || !search.trim();
  });

  // === Inline editing handlers ===
  const updateDomainTitle = async (domainId: string, newTitle: string) => {
    const { error } = await supabase.from('clinical_curricula_domains').update({ title: newTitle } as any).eq('id', domainId);
    if (error) { toast.error('Failed to update domain'); throw error; }
    toast.success('Domain updated');
    setDomains(prev => prev.map(d => d.id === domainId ? { ...d, title: newTitle } : d));
  };

  const updateGoalField = async (goalId: string, field: string, value: string) => {
    const { error } = await supabase.from('clinical_curricula_goals').update({ [field]: value || null } as any).eq('id', goalId);
    if (error) { toast.error(`Failed to update ${field}`); throw error; }
    toast.success('Updated');
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, [field]: value || null } : g));
  };

  const updateBenchmarkText = async (benchmarkId: string, goalId: string, newText: string) => {
    const { error } = await supabase.from('clinical_curricula_benchmarks').update({ benchmark_text: newText } as any).eq('id', benchmarkId);
    if (error) { toast.error('Failed to update benchmark'); throw error; }
    toast.success('Benchmark updated');
    setBenchmarks(prev => ({
      ...prev,
      [goalId]: (prev[goalId] || []).map(b => b.id === benchmarkId ? { ...b, benchmark_text: newText } : b),
    }));
  };

  const addBenchmark = async (goalId: string) => {
    if (!newBenchmarkText.trim()) return;
    const existing = benchmarks[goalId] || [];
    const nextOrder = existing.length > 0 ? Math.max(...existing.map(b => b.benchmark_order)) + 1 : 1;
    const { data, error } = await supabase
      .from('clinical_curricula_benchmarks')
      .insert({ goal_id: goalId, benchmark_order: nextOrder, benchmark_text: newBenchmarkText.trim() } as any)
      .select('id, goal_id, benchmark_order, benchmark_text')
      .single();
    if (error) { toast.error('Failed to add benchmark'); return; }
    setBenchmarks(prev => ({
      ...prev,
      [goalId]: [...(prev[goalId] || []), data as unknown as Benchmark],
    }));
    // Update benchmark_count on the goal
    await supabase.from('clinical_curricula_goals').update({ benchmark_count: nextOrder } as any).eq('id', goalId);
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, benchmark_count: nextOrder } : g));
    setNewBenchmarkText('');
    setAddingBenchmarkGoalId(null);
    toast.success('Benchmark added');
  };

  // === Add to student logic ===
  const toggleSelectItem = (item: SelectedLevel) => {
    setSelectedItems(prev => {
      const exists = prev.find(s => s.id === item.id && s.type === item.type);
      if (exists) return prev.filter(s => !(s.id === item.id && s.type === item.type));
      return [...prev, item];
    });
  };

  const isItemSelected = (type: AddToStudentLevel, id: string) =>
    selectedItems.some(s => s.type === type && s.id === id);

  const searchStudents = async (q: string) => {
    setStudentSearchQuery(q);
    if (q.length < 2) { setStudentResults([]); return; }
    setSearchingStudents(true);
    const { data } = await supabase.from('students')
      .select('id, first_name, last_name, display_name')
      .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(10);
    setStudentResults((data || []) as any);
    setSearchingStudents(false);
  };

  const handleAddToStudent = async () => {
    if (!selectedStudentId || selectedItems.length === 0) return;
    setAddingToStudent(true);
    try {
      if (addDestination === 'skill_program') {
        // Group by domain for program creation
        const domainGroups = new Map<string, SelectedLevel[]>();
        for (const item of selectedItems) {
          const key = item.domainTitle;
          if (!domainGroups.has(key)) domainGroups.set(key, []);
          domainGroups.get(key)!.push(item);
        }

        for (const [domainTitle, items] of domainGroups) {
          // Create or find a program for this domain
          const { data: existingProgram } = await supabase
            .from('skill_programs')
            .select('id')
            .eq('student_id', selectedStudentId)
            .eq('name', domainTitle)
            .maybeSingle();

          let programId: string;
          if (existingProgram) {
            programId = existingProgram.id;
          } else {
            const { data: newProg, error } = await supabase
              .from('skill_programs')
              .insert({
                student_id: selectedStudentId,
                name: domainTitle,
                method: 'discrete_trial',
                status: 'acquisition',
                status_effective_date: new Date().toISOString().split('T')[0],
                active: true,
              } as any)
              .select('id')
              .single();
            if (error) throw error;
            programId = newProg!.id;
          }

          // Add targets for each selected item
          const { data: existingTargets } = await supabase
            .from('skill_targets')
            .select('display_order')
            .eq('program_id', programId)
            .order('display_order', { ascending: false })
            .limit(1);

          let nextOrder = (existingTargets?.[0]?.display_order ?? 0) + 1;

          for (const item of items) {
            const targetName = item.type === 'domain' ? item.label
              : item.type === 'benchmark' ? item.text || item.label
              : item.label;

            await supabase.from('skill_targets').insert({
              program_id: programId,
              name: targetName,
              operational_definition: item.text || null,
              status: 'not_started',
              status_effective_date: new Date().toISOString().split('T')[0],
              phase: 'baseline',
              display_order: nextOrder++,
              active: true,
            } as any);
          }
        }
      } else {
        // Add as behavior goals (student_targets)
        for (const item of selectedItems) {
          await supabase.from('student_targets').insert({
            student_id: selectedStudentId,
            title: item.label,
            description: item.text || null,
            data_collection_type: 'frequency',
            priority: 'medium',
            status: 'active',
            source_type: 'custom',
            customized: false,
            date_added: new Date().toISOString().split('T')[0],
          } as any);
        }
      }

      toast.success(`Added ${selectedItems.length} item(s) to student`);
      setShowAddToStudent(false);
      setSelectedItems([]);
      setSelectedStudentId(null);
      setStudentSearchQuery('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add to student');
    } finally {
      setAddingToStudent(false);
    }
  };

  const openAddGoal = (domainId?: string) => {
    setAddGoalDomainId(domainId || (domains[0]?.id ?? ''));
    setAddGoalKey('');
    setAddGoalTitle('');
    setAddGoalObjective('');
    setAddGoalClinicalGoal('');
    setAddGoalBenchmarks('');
    setShowAddGoal(true);
  };

  const handleAddGoal = async () => {
    if (!addGoalTitle.trim() || !addGoalDomainId) {
      toast.error('Title and domain are required');
      return;
    }
    setSaving(true);
    try {
      const benchmarkLines = addGoalBenchmarks.split('\n').map(b => b.trim()).filter(Boolean);
      const { data: goalData, error: goalError } = await supabase
        .from('clinical_curricula_goals')
        .insert({
          domain_id: addGoalDomainId,
          key: addGoalKey.trim() || addGoalTitle.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 30),
          title: addGoalTitle.trim(),
          clinical_goal: addGoalClinicalGoal.trim() || null,
          objective_text: addGoalObjective.trim() || null,
          benchmark_count: benchmarkLines.length,
          is_active: true,
          sort_order: goals.filter(g => g.domain_id === addGoalDomainId).length + 1,
        } as any)
        .select('id')
        .single();
      if (goalError) throw goalError;

      if (benchmarkLines.length > 0 && goalData) {
        const benchmarkInserts = benchmarkLines.map((text, idx) => ({
          goal_id: goalData.id,
          benchmark_order: idx + 1,
          benchmark_text: text,
        }));
        const { error: bmError } = await supabase
          .from('clinical_curricula_benchmarks')
          .insert(benchmarkInserts as any);
        if (bmError) console.error('Benchmark insert error:', bmError);
      }

      toast.success('Goal added');
      setShowAddGoal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add goal');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDomain = async () => {
    if (!addDomainTitle.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('clinical_curricula_domains')
        .insert({
          collection_id: collectionId,
          key: addDomainKey.trim() || addDomainTitle.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 30),
          title: addDomainTitle.trim(),
          sort_order: domains.length + 1,
        } as any);
      if (error) throw error;
      toast.success('Domain added');
      setShowAddDomain(false);
      setAddDomainKey('');
      setAddDomainTitle('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add domain');
    } finally {
      setSaving(false);
    }
  };

  const getDomainTitle = (domainId: string) => domains.find(d => d.id === domainId)?.title || '';

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                {collectionTitle}
              </h2>
              <p className="text-xs text-muted-foreground">{domains.length} domains · {goals.length} goals</p>
            </div>
          </div>
          <div className="flex gap-2">
            {selectedItems.length > 0 && (
              <Button size="sm" variant="default" onClick={() => setShowAddToStudent(true)} className="gap-1.5">
                <UserPlus className="w-4 h-4" />
                Add {selectedItems.length} to Student
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowAddDomain(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Domain
            </Button>
            <Button size="sm" onClick={() => openAddGoal()}>
              <Plus className="w-4 h-4 mr-1" /> Add Goal
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search goals..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={domainFilter} onValueChange={setDomainFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="All Domains" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Domains</SelectItem>
              {domains.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(search || domainFilter !== 'all') && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setDomainFilter('all'); }}>
              Clear Filters
            </Button>
          )}
        </div>

        {/* Domain list */}
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading...
          </div>
        ) : visibleDomains.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No domains or goals found.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowAddDomain(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add First Domain
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {visibleDomains.map(domain => {
              const domainGoals = getFilteredGoals(domain.id);
              const isExpanded = expandedDomains.has(domain.id);
              return (
                <Collapsible key={domain.id} open={isExpanded} onOpenChange={() => toggleDomain(domain.id)}>
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardContent className="py-3 px-4 cursor-pointer hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                            <div className="flex items-center gap-2">
                              {/* Selectable domain checkbox */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div onClick={e => e.stopPropagation()}>
                                    <Checkbox
                                      checked={isItemSelected('domain', domain.id)}
                                      onCheckedChange={() => toggleSelectItem({
                                        type: 'domain',
                                        id: domain.id,
                                        label: domain.title,
                                        domainTitle: domain.title,
                                      })}
                                    />
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>Add domain to student</TooltipContent>
                              </Tooltip>
                              <div>
                                {isAdmin ? (
                                  <div onClick={e => e.stopPropagation()}>
                                    <InlineEdit
                                      value={domain.title}
                                      onSave={val => updateDomainTitle(domain.id, val)}
                                      label="domain name"
                                      className="font-semibold text-foreground"
                                    />
                                  </div>
                                ) : (
                                  <p className="font-semibold text-foreground">{domain.title}</p>
                                )}
                                <p className="text-xs text-muted-foreground">{domain.key}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">{domainGoals.length} goals</Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={e => { e.stopPropagation(); openAddGoal(domain.id); }}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 space-y-3">
                        {domainGoals.length === 0 ? (
                          <div className="text-center py-4">
                            <p className="text-xs text-muted-foreground">No goals in this domain yet.</p>
                            <Button variant="outline" size="sm" className="mt-2" onClick={() => openAddGoal(domain.id)}>
                              <Plus className="w-4 h-4 mr-1" /> Add Goal
                            </Button>
                          </div>
                        ) : domainGoals.map(goal => (
                          <Card key={goal.id} className="border-border/60 bg-muted/20">
                            <CardContent className="p-4 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Target className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                  {isAdmin ? (
                                    <InlineEdit
                                      value={goal.title}
                                      onSave={val => updateGoalField(goal.id, 'title', val)}
                                      label="goal title"
                                      className="font-medium text-sm text-foreground"
                                    />
                                  ) : (
                                    <span className="font-medium text-sm text-foreground">{goal.title}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <Badge variant="outline" className="text-[10px] font-mono">{goal.key}</Badge>
                                </div>
                              </div>

                              {/* Clinical Goal - editable for admin */}
                              <div className="pl-6">
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Clinical Goal</p>
                                <div className="flex items-start gap-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div>
                                        <Checkbox
                                          checked={isItemSelected('goal', goal.id)}
                                          onCheckedChange={() => toggleSelectItem({
                                            type: 'goal',
                                            id: goal.id,
                                            label: goal.title,
                                            domainTitle: getDomainTitle(goal.domain_id),
                                            text: goal.clinical_goal || undefined,
                                          })}
                                        />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>Add goal to student</TooltipContent>
                                  </Tooltip>
                                  {isAdmin ? (
                                    <InlineEdit
                                      value={goal.clinical_goal || ''}
                                      onSave={val => updateGoalField(goal.id, 'clinical_goal', val)}
                                      multiline
                                      label="clinical goal"
                                      className="text-xs text-foreground flex-1"
                                    />
                                  ) : (
                                    <p className="text-xs text-foreground">{goal.clinical_goal || '—'}</p>
                                  )}
                                </div>
                              </div>

                              {/* Objective - editable for admin */}
                              <div className="pl-6">
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Objective</p>
                                <div className="flex items-start gap-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div>
                                        <Checkbox
                                          checked={isItemSelected('objective', `${goal.id}-obj`)}
                                          onCheckedChange={() => toggleSelectItem({
                                            type: 'objective',
                                            id: `${goal.id}-obj`,
                                            label: `${goal.title} (Objective)`,
                                            domainTitle: getDomainTitle(goal.domain_id),
                                            text: goal.objective_text || undefined,
                                          })}
                                        />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>Add objective to student</TooltipContent>
                                  </Tooltip>
                                  {isAdmin ? (
                                    <InlineEdit
                                      value={goal.objective_text || ''}
                                      onSave={val => updateGoalField(goal.id, 'objective_text', val)}
                                      multiline
                                      label="objective"
                                      className="text-xs text-foreground flex-1"
                                    />
                                  ) : (
                                    <p className="text-xs text-foreground">{goal.objective_text || '—'}</p>
                                  )}
                                </div>
                              </div>

                              {/* Benchmarks toggle */}
                              <div className="pl-6 pt-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                                  onClick={() => loadBenchmarks(goal.id)}
                                >
                                  <ListChecks className="w-3.5 h-3.5" />
                                  {expandedBenchmarks.has(goal.id) ? 'Hide Benchmarks' : `Show Benchmarks${goal.benchmark_count ? ` (${goal.benchmark_count})` : ''}`}
                                </Button>
                                {expandedBenchmarks.has(goal.id) && benchmarks[goal.id] && (
                                  <div className="mt-2 space-y-1.5">
                                    {benchmarks[goal.id].length === 0 ? (
                                      <p className="text-xs text-muted-foreground italic">No benchmarks defined.</p>
                                    ) : benchmarks[goal.id].map(b => (
                                      <div key={b.id} className="flex items-start gap-2 text-xs rounded-md bg-background p-2 border border-border/50">
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="mt-0.5">
                                              <Checkbox
                                                checked={isItemSelected('benchmark', b.id)}
                                                onCheckedChange={() => toggleSelectItem({
                                                  type: 'benchmark',
                                                  id: b.id,
                                                  label: `${goal.title} - BM ${b.benchmark_order}`,
                                                  domainTitle: getDomainTitle(goal.domain_id),
                                                  goalTitle: goal.title,
                                                  text: b.benchmark_text,
                                                })}
                                              />
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent>Add benchmark to student</TooltipContent>
                                        </Tooltip>
                                        <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">{b.benchmark_order}</Badge>
                                        {isAdmin ? (
                                          <InlineEdit
                                            value={b.benchmark_text}
                                            onSave={val => updateBenchmarkText(b.id, goal.id, val)}
                                            label="benchmark"
                                            className="text-foreground flex-1"
                                          />
                                        ) : (
                                          <span className="text-foreground">{b.benchmark_text}</span>
                                        )}
                                      </div>
                                    ))}
                                    {/* Add benchmark button (admin) */}
                                    {isAdmin && (
                                      <div className="pt-1">
                                        {addingBenchmarkGoalId === goal.id ? (
                                          <div className="flex items-center gap-2">
                                            <Input
                                              value={newBenchmarkText}
                                              onChange={e => setNewBenchmarkText(e.target.value)}
                                              placeholder="New benchmark text..."
                                              className="text-xs h-8 flex-1"
                                              autoFocus
                                              onKeyDown={e => { if (e.key === 'Enter') addBenchmark(goal.id); if (e.key === 'Escape') setAddingBenchmarkGoalId(null); }}
                                            />
                                            <Button size="sm" className="h-8" onClick={() => addBenchmark(goal.id)}>Add</Button>
                                            <Button variant="ghost" size="sm" className="h-8" onClick={() => setAddingBenchmarkGoalId(null)}>Cancel</Button>
                                          </div>
                                        ) : (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs gap-1 text-muted-foreground"
                                            onClick={() => { setAddingBenchmarkGoalId(goal.id); setNewBenchmarkText(''); }}
                                          >
                                            <Plus className="w-3.5 h-3.5" /> Add Benchmark
                                          </Button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}

        {/* Add Goal Dialog */}
        <Dialog open={showAddGoal} onOpenChange={setShowAddGoal}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Domain *</Label>
                <Select value={addGoalDomainId} onValueChange={setAddGoalDomainId}>
                  <SelectTrigger><SelectValue placeholder="Select domain" /></SelectTrigger>
                  <SelectContent>
                    {domains.map(d => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Goal Code</Label>
                <Input value={addGoalKey} onChange={e => setAddGoalKey(e.target.value)} placeholder="e.g., ER-K2-007" />
              </div>
              <div>
                <Label>Title *</Label>
                <Input value={addGoalTitle} onChange={e => setAddGoalTitle(e.target.value)} placeholder="Short searchable title" />
              </div>
              <div>
                <Label>Clinical Goal</Label>
                <Textarea value={addGoalClinicalGoal} onChange={e => setAddGoalClinicalGoal(e.target.value)} rows={2} placeholder="Clinical goal statement" />
              </div>
              <div>
                <Label>Objective</Label>
                <Textarea value={addGoalObjective} onChange={e => setAddGoalObjective(e.target.value)} rows={2} placeholder="Measurable objective" />
              </div>
              <div>
                <Label>Benchmarks (one per line)</Label>
                <Textarea
                  value={addGoalBenchmarks}
                  onChange={e => setAddGoalBenchmarks(e.target.value)}
                  rows={5}
                  placeholder={"Uses skill with full prompt\nUses skill with partial prompt\nUses skill independently\nUses skill during frustration\nGeneralizes across settings"}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddGoal(false)}>Cancel</Button>
              <Button onClick={handleAddGoal} disabled={saving}>{saving ? 'Saving...' : 'Save Goal'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Domain Dialog */}
        <Dialog open={showAddDomain} onOpenChange={setShowAddDomain}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Domain</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Key</Label>
                <Input value={addDomainKey} onChange={e => setAddDomainKey(e.target.value)} placeholder="e.g., coping-strategies" />
              </div>
              <div>
                <Label>Title *</Label>
                <Input value={addDomainTitle} onChange={e => setAddDomainTitle(e.target.value)} placeholder="e.g., Coping Strategies" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDomain(false)}>Cancel</Button>
              <Button onClick={handleAddDomain} disabled={saving}>{saving ? 'Saving...' : 'Save Domain'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add to Student Dialog */}
        <Dialog open={showAddToStudent} onOpenChange={setShowAddToStudent}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add to Student</DialogTitle>
              <DialogDescription>
                Select a student and choose where to place the {selectedItems.length} selected item(s).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Selected items summary */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Selected Items</Label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {selectedItems.map(item => (
                    <div key={`${item.type}-${item.id}`} className="flex items-center gap-2 text-xs bg-muted/30 rounded px-2 py-1.5">
                      <Badge variant="outline" className="text-[9px] uppercase shrink-0">{item.type}</Badge>
                      <span className="truncate">{item.text || item.label}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 ml-auto shrink-0"
                        onClick={() => toggleSelectItem(item)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Destination */}
              <div>
                <Label>Destination</Label>
                <Select value={addDestination} onValueChange={v => setAddDestination(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skill_program">Skill Program (Domain → Program → Target)</SelectItem>
                    <SelectItem value="behavior_goal">Behavior Goal</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {addDestination === 'skill_program'
                    ? 'Items will be added as targets within a skill program grouped by domain. You can relocate them after adding.'
                    : 'Items will be added as individual behavior goals on the student profile.'}
                </p>
              </div>

              {/* Student search */}
              <div>
                <Label>Student</Label>
                <Input
                  placeholder="Search by name..."
                  value={studentSearchQuery}
                  onChange={e => searchStudents(e.target.value)}
                />
                {searchingStudents && <p className="text-xs text-muted-foreground mt-1">Searching...</p>}
                {studentResults.length > 0 && (
                  <div className="mt-2 border rounded-md divide-y max-h-40 overflow-y-auto">
                    {studentResults.map(s => (
                      <button
                        key={s.id}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors ${selectedStudentId === s.id ? 'bg-primary/10 text-primary font-medium' : ''}`}
                        onClick={() => setSelectedStudentId(s.id)}
                      >
                        {s.display_name || `${s.first_name} ${s.last_name}`}
                      </button>
                    ))}
                  </div>
                )}
                {selectedStudentId && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Student selected: {(() => { const s = studentResults.find(s => s.id === selectedStudentId); return s?.display_name || `${s?.first_name} ${s?.last_name}`; })()}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddToStudent(false)}>Cancel</Button>
              <Button
                onClick={handleAddToStudent}
                disabled={!selectedStudentId || selectedItems.length === 0 || addingToStudent}
              >
                {addingToStudent ? 'Adding...' : `Add ${selectedItems.length} Item(s)`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
