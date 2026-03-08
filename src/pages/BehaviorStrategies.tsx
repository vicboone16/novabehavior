import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Search, Plus, Sparkles, ChevronDown, Loader2, BookOpen, LayoutGrid } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useBehaviorStrategyLibrary, BehaviorStrategy } from '@/hooks/useBehaviorStrategyLibrary';
import { StrategyCard } from '@/components/behavior-strategies/StrategyCard';
import { StrategyFilters, StrategyFilterState, emptyFilters } from '@/components/behavior-strategies/StrategyFilters';
import { StrategyDetailDrawer } from '@/components/behavior-strategies/StrategyDetailDrawer';
import { SuggestStrategiesDialog } from '@/components/behavior-strategies/SuggestStrategiesDialog';
import { StrategyForm } from '@/components/behavior-strategies/StrategyForm';

export default function BehaviorStrategies() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const canEdit = ['super_admin', 'admin'].includes(userRole || '');

  const {
    strategies, isLoading, getStepsForStrategy, getTrainingLinksForStrategy,
    saveStrategy, archiveStrategy, saveStep, deleteStep, recommendStrategies,
  } = useBehaviorStrategyLibrary();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<StrategyFilterState>(emptyFilters);
  const [tab, setTab] = useState('all');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<BehaviorStrategy | null>(null);

  // Derived data
  const availableGroups = useMemo(() => [...new Set(strategies.map(s => s.strategy_group).filter(Boolean))] as string[], [strategies]);
  const availableCategories = useMemo(() => [...new Set(strategies.map(s => s.category).filter(Boolean))] as string[], [strategies]);

  const filtered = useMemo(() => {
    let list = strategies;

    // Archive filter
    if (!filters.showArchived) {
      list = list.filter(s => !s.strategy_name.startsWith('[ARCHIVED]'));
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.strategy_name.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (s.teacher_quick_version || '').toLowerCase().includes(q) ||
        (s.strategy_group || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q)
      );
    }

    // Multi-select filters
    if (filters.functionTargets.length) list = list.filter(s => s.function_targets?.some(f => filters.functionTargets.includes(f)));
    if (filters.strategyGroups.length) list = list.filter(s => s.strategy_group && filters.strategyGroups.includes(s.strategy_group));
    if (filters.categories.length) list = list.filter(s => s.category && filters.categories.includes(s.category));
    if (filters.evidenceLevels.length) list = list.filter(s => s.evidence_level && filters.evidenceLevels.includes(s.evidence_level));
    if (filters.escalationLevels.length) list = list.filter(s => s.escalation_levels?.some(e => filters.escalationLevels.includes(e)));
    if (filters.environments.length) list = list.filter(s => s.environments?.some(e => filters.environments.includes(e)));
    if (filters.hasTraining === true) list = list.filter(s => (s.training_link_count ?? 0) > 0);

    return list;
  }, [strategies, search, filters]);

  // Tab-specific groupings
  const byGroup = useMemo(() => {
    const groups: Record<string, BehaviorStrategy[]> = {};
    filtered.forEach(s => {
      const g = s.strategy_group || 'ungrouped';
      (groups[g] = groups[g] || []).push(s);
    });
    return groups;
  }, [filtered]);

  const byFunction = useMemo(() => {
    const funcs: Record<string, BehaviorStrategy[]> = { attention: [], escape: [], access: [], sensory: [] };
    filtered.forEach(s => {
      (s.function_targets || []).forEach(f => {
        if (funcs[f]) funcs[f].push(s);
      });
    });
    return funcs;
  }, [filtered]);

  const trainingOnly = useMemo(() => filtered.filter(s => (s.training_link_count ?? 0) > 0), [filtered]);

  const archivedOnly = useMemo(() => strategies.filter(s => s.strategy_name.startsWith('[ARCHIVED]')), [strategies]);

  const detailStrategy = detailId ? strategies.find(s => s.id === detailId) || null : null;

  const openEdit = (s?: BehaviorStrategy) => {
    setEditingStrategy(s || null);
    setFormOpen(true);
  };

  const renderGrid = (list: BehaviorStrategy[]) => {
    if (list.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <LayoutGrid className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No strategies match your filters</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => { setFilters(emptyFilters); setSearch(''); }}>
            Clear all filters
          </Button>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {list.map(s => (
          <StrategyCard key={s.id} strategy={s} canEdit={canEdit}
            onView={() => setDetailId(s.id)}
            onEdit={canEdit ? () => openEdit(s) : undefined}
            onArchive={canEdit ? () => archiveStrategy(s.id) : undefined}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="container py-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Behavior Strategy Library</h1>
        <p className="text-sm text-muted-foreground">Search, filter, and apply evidence-based interventions across NovaTrack workflows.</p>
      </div>

      {/* Actions bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search strategies..." className="pl-8 h-9" />
        </div>
        <StrategyFilters filters={filters} onChange={setFilters} availableGroups={availableGroups} availableCategories={availableCategories} canViewArchived={canEdit} />
        <Button variant="outline" size="sm" onClick={() => setSuggestOpen(true)}>
          <Sparkles className="h-4 w-4 mr-1" /> Suggest
        </Button>
        {canEdit && (
          <Button size="sm" onClick={() => openEdit()}>
            <Plus className="h-4 w-4 mr-1" /> New Strategy
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all">All ({filtered.length})</TabsTrigger>
            <TabsTrigger value="group">By Group</TabsTrigger>
            <TabsTrigger value="function">By Function</TabsTrigger>
            <TabsTrigger value="training">Training Linked</TabsTrigger>
            {canEdit && <TabsTrigger value="archived">Archived ({archivedOnly.length})</TabsTrigger>}
          </TabsList>

          <TabsContent value="all" className="mt-4">
            {renderGrid(filtered)}
          </TabsContent>

          <TabsContent value="group" className="mt-4 space-y-3">
            {Object.entries(byGroup).map(([group, items]) => (
              <Collapsible key={group} defaultOpen>
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 hover:bg-muted/50 rounded-md px-2">
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
                  <span className="text-sm font-semibold capitalize">{group.replace(/_/g, ' ')}</span>
                  <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-6 pt-2">
                  {renderGrid(items)}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </TabsContent>

          <TabsContent value="function" className="mt-4 space-y-3">
            {Object.entries(byFunction).map(([fn, items]) => (
              <Collapsible key={fn} defaultOpen>
                <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 hover:bg-muted/50 rounded-md px-2">
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold capitalize">{fn}</span>
                  <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-6 pt-2">
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-4">No strategies target this function</p>
                  ) : renderGrid(items)}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </TabsContent>

          <TabsContent value="training" className="mt-4">
            {trainingOnly.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No strategies with linked training modules</p>
              </div>
            ) : renderGrid(trainingOnly)}
          </TabsContent>

          {canEdit && (
            <TabsContent value="archived" className="mt-4">
              {archivedOnly.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-16">No archived strategies</p>
              ) : renderGrid(archivedOnly)}
            </TabsContent>
          )}
        </Tabs>
      )}

      {/* Detail Drawer */}
      <StrategyDetailDrawer
        strategy={detailStrategy}
        steps={detailId ? getStepsForStrategy(detailId) : []}
        trainingLinks={detailId ? getTrainingLinksForStrategy(detailId) : []}
        canEdit={canEdit}
        open={!!detailId}
        onClose={() => setDetailId(null)}
        onEdit={canEdit ? () => { if (detailStrategy) { setDetailId(null); openEdit(detailStrategy); } } : undefined}
        onArchive={canEdit ? () => { if (detailId) { archiveStrategy(detailId); setDetailId(null); } } : undefined}
      />

      {/* Suggest Dialog */}
      <SuggestStrategiesDialog
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        onRecommend={recommendStrategies}
        strategies={strategies}
        onViewStrategy={(id) => { setSuggestOpen(false); setDetailId(id); }}
      />

      {/* Edit/Create Form */}
      <StrategyForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingStrategy(null); }}
        onSave={saveStrategy}
        strategy={editingStrategy}
        steps={editingStrategy ? getStepsForStrategy(editingStrategy.id) : []}
        onSaveStep={saveStep}
        onDeleteStep={deleteStep}
      />
    </div>
  );
}
