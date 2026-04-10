import { useState, useEffect, useMemo } from 'react';
import { Merge, Loader2, ArrowRight, AlertTriangle } from 'lucide-react';
import { useDataStore } from '@/store/dataStore';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { clearStudentBehaviorNameMap, getStudentBehaviorNameMap } from '@/lib/behaviorNameResolver';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface BehaviorOption {
  id: string;
  name: string;
  dataCount: number;
  firstDate: string | null;
  lastDate: string | null;
}

interface StudentBehaviorMergeProps {
  studentId: string;
  studentName: string;
  onMerged?: () => void;
}

export function StudentBehaviorMerge({ studentId, studentName, onMerged }: StudentBehaviorMergeProps) {
  const [open, setOpen] = useState(false);
  const [behaviors, setBehaviors] = useState<BehaviorOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [primaryId, setPrimaryId] = useState('');
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set());
    setPrimaryId('');
    loadBehaviors();
  }, [open, studentId]);

  async function loadBehaviors() {
    setLoading(true);
    try {
      const [{ data: maps, error: mapsError }, { data: bsdRows, error: bsdError }, { data: aggRows, error: aggError }, resolvedNameMap] = await Promise.all([
        supabase
          .from('student_behavior_map')
          .select('behavior_entry_id, behavior_subtype, active')
          .eq('student_id', studentId),
        (supabase as any)
          .from('behavior_session_data')
          .select('behavior_id, frequency, data_state, sessions(started_at, start_time), created_at')
          .eq('student_id', studentId)
          .not('data_state', 'eq', 'no_data')
          .order('created_at', { ascending: true })
          .limit(2000),
        supabase
          .from('behavior_daily_aggregates')
          .select('behavior_id, behavior_name, service_date, total_count')
          .eq('student_id', studentId),
        getStudentBehaviorNameMap(studentId),
      ]);

      if (mapsError) throw mapsError;
      if (bsdError) throw bsdError;
      // aggError is non-critical — graph data is best-effort

      const mappedIds = (maps || [])
        .filter((m: any) => m.active !== false)
        .map((m: any) => m.behavior_entry_id)
        .filter(Boolean);

      const bsdData = (bsdRows || []) as any[];
      const bsdIds = bsdData.map((c: any) => c.behavior_id).filter(Boolean);

      // Include behavior_ids from daily aggregates so merge dialog matches the graph
      const aggData = (aggRows || []) as any[];
      const aggIds = aggData.map((r: any) => r.behavior_id).filter(Boolean);

      const allBehaviorIds = [...new Set([...mappedIds, ...bsdIds, ...aggIds])];

      // Build frequency sum + date range per behavior using session observation date
      const countMap = new Map<string, number>();
      const firstDateMap = new Map<string, string>();
      const lastDateMap = new Map<string, string>();
      bsdData.forEach((r: any) => {
        const id = r.behavior_id;
        // Sum actual frequency counts (not row count)
        const freq = r.data_state === 'observed_zero' ? 0 : (r.frequency ?? 1);
        countMap.set(id, (countMap.get(id) || 0) + freq);
        // Use session observation date, fall back to created_at
        const session = r.sessions;
        const obsDate = session?.started_at || session?.start_time || r.created_at;
        const date = obsDate ? obsDate.slice(0, 10) : null;
        if (date) {
          if (!firstDateMap.has(id) || date < firstDateMap.get(id)!) {
            firstDateMap.set(id, date);
          }
          if (!lastDateMap.has(id) || date > lastDateMap.get(id)!) {
            lastDateMap.set(id, date);
          }
        }
      });

      // Fill in counts + date ranges from aggregates for behaviors not covered by BSD query
      // (e.g. behaviors from sessions older than the 2000-row BSD limit)
      const aggCountMap = new Map<string, number>();
      const aggFirstDateMap = new Map<string, string>();
      const aggLastDateMap = new Map<string, string>();
      aggData.forEach((r: any) => {
        const id = r.behavior_id;
        const cnt = r.total_count ?? 0;
        aggCountMap.set(id, (aggCountMap.get(id) || 0) + cnt);
        const date = r.service_date ? String(r.service_date).slice(0, 10) : null;
        if (date) {
          if (!aggFirstDateMap.has(id) || date < aggFirstDateMap.get(id)!) aggFirstDateMap.set(id, date);
          if (!aggLastDateMap.has(id) || date > aggLastDateMap.get(id)!) aggLastDateMap.set(id, date);
        }
      });

      // Get names from behaviors table
      const { data: behaviorDefs } = allBehaviorIds.length > 0
        ? await supabase.from('behaviors').select('id, name').in('id', allBehaviorIds)
        : { data: [] };

      const nameMap = new Map<string, string>();
      (behaviorDefs || []).forEach(b => {
        if (b?.id && b?.name?.trim() && !UUID_RE.test(b.name.trim())) {
          nameMap.set(b.id, b.name.trim());
        }
      });
      // Overlay resolved names
      resolvedNameMap.forEach((name, id) => {
        if (id && name?.trim() && !UUID_RE.test(name.trim()) && !nameMap.has(id)) {
          nameMap.set(id, name.trim());
        }
      });
      // Overlay subtype names from map
      (maps || []).forEach(m => {
        if (m.behavior_entry_id && m.behavior_subtype?.trim() && !UUID_RE.test(m.behavior_subtype.trim()) && !nameMap.has(m.behavior_entry_id)) {
          nameMap.set(m.behavior_entry_id, m.behavior_subtype.trim());
        }
      });
      // Overlay behavior_name stored in aggregates as last-resort fallback
      aggData.forEach((r: any) => {
        if (r.behavior_id && r.behavior_name?.trim() && !UUID_RE.test(r.behavior_name.trim()) && !nameMap.has(r.behavior_id)) {
          nameMap.set(r.behavior_id, r.behavior_name.trim());
        }
      });

      const options: BehaviorOption[] = allBehaviorIds.map(id => {
        // Use BSD-derived counts when available (more accurate); fall back to agg counts
        const dataCount = countMap.has(id) ? (countMap.get(id) || 0) : (aggCountMap.get(id) || 0);
        const firstDate = firstDateMap.get(id) || aggFirstDateMap.get(id) || null;
        const lastDate = lastDateMap.get(id) || aggLastDateMap.get(id) || null;
        return {
          id,
          name: nameMap.get(id) || `Unlinked Behavior (${id.slice(0, 8)})`,
          dataCount,
          firstDate,
          lastDate,
        };
      });

      options.sort((a, b) => a.name.localeCompare(b.name));
      setBehaviors(options);
    } catch (err) {
      console.error('Failed to load behaviors for merge:', err);
      toast.error('Failed to load behaviors');
    } finally {
      setLoading(false);
    }
  }

  function toggleBehavior(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (primaryId === id) setPrimaryId('');
      } else {
        next.add(id);
        if (next.size === 1 || !primaryId) setPrimaryId(id);
      }
      return next;
    });
  }

  async function handleMerge() {
    if (selectedIds.size < 2 || !primaryId) return;
    const sourceIds = [...selectedIds].filter(id => id !== primaryId);

    setMerging(true);
    try {
      let totalMoved = 0;
      for (const sourceId of sourceIds) {
        const { data, error } = await supabase.rpc('merge_student_behavior' as any, {
          p_student_id: studentId,
          p_source_behavior_id: sourceId,
          p_target_behavior_id: primaryId,
        });
        if (error) throw error;
        totalMoved += (data as any)?.bsd_moved || 0;
      }

      // Collapse any duplicate rows that now share the same session + target behavior
      await (supabase as any).rpc('deduplicate_behavior_session_data', { p_student_id: studentId });

      // Rebuild daily aggregates so Avg/Day and trend data reflect the consolidated state
      await (supabase as any).rpc('rebuild_behavior_daily_aggregates', { p_student_id: studentId })
        .catch(() => { /* non-critical — aggregates will rebuild on next trigger */ });

      // Remove merged-away behaviors from the Zustand store so they stop appearing in the list
      const removeBehavior = useDataStore.getState().removeBehavior;
      sourceIds.forEach(sourceId => {
        try { removeBehavior(studentId, sourceId); } catch { /* ignore if already missing */ }
      });

      clearStudentBehaviorNameMap(studentId);
      const primaryName = behaviors.find(b => b.id === primaryId)?.name || 'target behavior';
      toast.success(`Merged ${sourceIds.length} behavior(s) into "${primaryName}" (${totalMoved} events consolidated)`);
      window.dispatchEvent(new CustomEvent('behavior-data-edited', { detail: { studentId } }));
      setOpen(false);
      onMerged?.();
    } catch (err: any) {
      toast.error(`Merge failed: ${err.message || err}`);
    } finally {
      setMerging(false);
    }
  }

  // Auto-detect behaviors with identical normalized names (likely duplicates)
  const suggestedDuplicateGroups = useMemo(() => {
    const normalize = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const grouped = new Map<string, BehaviorOption[]>();
    behaviors.forEach(b => {
      if (b.name.startsWith('Unlinked Behavior')) return;
      const key = normalize(b.name);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(b);
    });
    return Array.from(grouped.values()).filter(group => group.length >= 2);
  }, [behaviors]);

  function selectDuplicateGroup(group: BehaviorOption[]) {
    const ids = new Set(group.map(b => b.id));
    setSelectedIds(ids);
    // Default primary = the one with the most data
    const best = [...group].sort((a, b) => b.dataCount - a.dataCount)[0];
    setPrimaryId(best.id);
  }

  const selectedBehaviors = behaviors.filter(b => selectedIds.has(b.id));
  const totalDataPoints = selectedBehaviors.reduce((s, b) => s + b.dataCount, 0);
  const primaryBehavior = behaviors.find(b => b.id === primaryId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Merge className="h-4 w-4 mr-1" />
          Merge Behaviors
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Merge Student Behaviors</DialogTitle>
          <DialogDescription>
            Select 2+ behaviors for <strong>{studentName}</strong> to merge. All data will be consolidated into the primary behavior.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading behaviors…</span>
          </div>
        ) : behaviors.length < 2 ? (
          <p className="text-sm text-muted-foreground py-4">This student needs at least 2 behaviors to merge.</p>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            {/* Suggested duplicate groups */}
            {suggestedDuplicateGroups.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Detected Duplicates — click to auto-select for merge:
                </p>
                {suggestedDuplicateGroups.map((group, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectDuplicateGroup(group)}
                    className="w-full text-left text-xs p-2 rounded-md border border-amber-300 bg-amber-50 hover:bg-amber-100 transition-colors"
                  >
                    <span className="font-medium text-amber-800">{group[0].name}</span>
                    <span className="text-amber-600 ml-1">
                      ({group.length} copies — {group.reduce((s, b) => s + b.dataCount, 0)} total events)
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Behavior checklist */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Select behaviors to merge ({selectedIds.size} selected)
              </p>
              {behaviors.map(b => (
                <label
                  key={b.id}
                  className={`flex items-start gap-3 p-2.5 rounded-md border cursor-pointer transition-colors ${
                    selectedIds.has(b.id) ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                  }`}
                >
                  <Checkbox
                    checked={selectedIds.has(b.id)}
                    onCheckedChange={() => toggleBehavior(b.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{b.name}</span>
                      {b.id === primaryId && (
                        <Badge variant="default" className="text-[10px] shrink-0">Primary</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                      <span>{b.dataCount} total events</span>
                      {b.firstDate && b.lastDate && (
                        <span>{b.firstDate} → {b.lastDate}</span>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {/* Primary selector */}
            {selectedIds.size >= 2 && (
              <div className="space-y-2 pt-2 border-t">
                <label className="text-xs font-medium text-muted-foreground">
                  Keep as primary (all data merges into this one):
                </label>
                <Select value={primaryId} onValueChange={setPrimaryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select primary behavior…" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedBehaviors.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} ({b.dataCount} entries)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Preview */}
            {selectedIds.size >= 2 && primaryId && (
              <Alert>
                <AlertDescription className="text-xs space-y-1">
                  <div className="font-medium">Merge preview:</div>
                  {selectedBehaviors.filter(b => b.id !== primaryId).map(b => (
                    <div key={b.id} className="flex items-center gap-1">
                      <span className="text-destructive">{b.name}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span className="text-primary font-medium">{primaryBehavior?.name}</span>
                    </div>
                  ))}
                  <div className="pt-1 text-muted-foreground">
                    {totalDataPoints} total events will be consolidated. Source behaviors will be deactivated. This cannot be undone.
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter className="pt-2 border-t">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={selectedIds.size < 2 || !primaryId || merging}
            onClick={handleMerge}
          >
            {merging ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Merging…
              </>
            ) : (
              <>
                <Merge className="w-4 h-4 mr-1" /> Merge {selectedIds.size > 0 ? selectedIds.size : ''} Behaviors
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
