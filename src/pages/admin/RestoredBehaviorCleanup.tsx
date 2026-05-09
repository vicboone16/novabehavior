import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Wrench, Merge, Pencil, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { clearStudentBehaviorNameMap } from '@/lib/behaviorNameResolver';
import { useDataStore } from '@/store/dataStore';
import { toast } from 'sonner';
import { format } from 'date-fns';

/**
 * Restored Behavior Cleanup
 * --------------------------------
 * After a prior data-restoration step left orphan behaviors named
 * "Restored Behavior <hex>", clinicians need a way to either:
 *   (1) Rename the behavior to its real clinical label, OR
 *   (2) Merge it into one of the student's existing canonical behaviors
 *       (e.g. consolidate two duplicates).
 *
 * Both actions preserve the original collection date by relying on
 * `merge_student_behavior_v2` (which migrates aggregates with date-aware
 * collision handling) and `fn_rebuild_student_behavior_daily_aggregates`
 * for a final integrity sweep.
 */

interface RestoredBehaviorRow {
  behavior_id: string;
  display_label: string;
  student_id: string;
  student_name: string;
  total_freq: number;
  bsd_rows: number;
  first_date: string | null;
  last_date: string | null;
}

interface StudentBehaviorOption {
  behavior_id: string;
  name: string;
  total_freq: number;
}

const RESTORED_PREFIX = 'Restored Behavior';

function mergeHistoricalFrequencyEntries(entries: any[] = [], sourceBehaviorId: string, targetBehaviorId: string) {
  const merged = new Map<string, any>();

  for (const entry of entries) {
    const behaviorId = entry?.behaviorId === sourceBehaviorId ? targetBehaviorId : entry?.behaviorId;
    const timestamp = entry?.timestamp ? new Date(entry.timestamp).toISOString() : null;
    const observationDurationMinutes = entry?.observationDurationMinutes ?? null;
    const key = `${behaviorId || ''}::${timestamp || ''}::${observationDurationMinutes ?? ''}`;
    const existing = merged.get(key);

    if (existing) {
      existing.count = Number(existing.count || 0) + Number(entry?.count || 0);
      continue;
    }

    merged.set(key, {
      ...entry,
      behaviorId,
      ...(timestamp ? { timestamp } : {}),
    });
  }

  return Array.from(merged.values());
}

function mergeHistoricalDurationEntries(entries: any[] = [], sourceBehaviorId: string, targetBehaviorId: string) {
  const merged = new Map<string, any>();

  for (const entry of entries) {
    const behaviorId = entry?.behaviorId === sourceBehaviorId ? targetBehaviorId : entry?.behaviorId;
    const timestamp = entry?.timestamp ? new Date(entry.timestamp).toISOString() : null;
    const key = `${behaviorId || ''}::${timestamp || ''}`;
    const existing = merged.get(key);

    if (existing) {
      existing.durationSeconds = Number(existing.durationSeconds || 0) + Number(entry?.durationSeconds || 0);
      continue;
    }

    merged.set(key, {
      ...entry,
      behaviorId,
      ...(timestamp ? { timestamp } : {}),
    });
  }

  return Array.from(merged.values());
}

function syncLocalBehaviorRename(behaviorId: string, newName: string) {
  useDataStore.setState((state: any) => ({
    students: state.students.map((student: any) => ({
      ...student,
      behaviors: student.behaviors.map((behavior: any) =>
        behavior.id === behaviorId ? { ...behavior, name: newName } : behavior
      ),
    })),
  }));
}

function syncLocalBehaviorMerge(studentId: string, sourceBehaviorId: string, targetBehaviorId: string) {
  useDataStore.setState((state: any) => ({
    students: state.students.map((student: any) =>
      student.id === studentId
        ? {
            ...student,
            behaviors: student.behaviors.filter((behavior: any) => behavior.id !== sourceBehaviorId),
            historicalData: student.historicalData
              ? {
                  ...student.historicalData,
                  frequencyEntries: mergeHistoricalFrequencyEntries(
                    student.historicalData.frequencyEntries || [],
                    sourceBehaviorId,
                    targetBehaviorId,
                  ),
                  durationEntries: mergeHistoricalDurationEntries(
                    student.historicalData.durationEntries || [],
                    sourceBehaviorId,
                    targetBehaviorId,
                  ),
                }
              : student.historicalData,
          }
        : student
    ),
    frequencyEntries: state.frequencyEntries.map((entry: any) =>
      entry.studentId === studentId && entry.behaviorId === sourceBehaviorId
        ? { ...entry, behaviorId: targetBehaviorId }
        : entry
    ),
    durationEntries: state.durationEntries.map((entry: any) =>
      entry.studentId === studentId && entry.behaviorId === sourceBehaviorId
        ? { ...entry, behaviorId: targetBehaviorId }
        : entry
    ),
  }));
}

async function persistStudentMergeCleanup(studentId: string, sourceBehaviorId: string, targetBehaviorId: string) {
  const { data: studentRow, error } = await supabase
    .from('students')
    .select('behaviors, historical_data')
    .eq('id', studentId)
    .single();

  if (error) throw error;

  const behaviors = Array.isArray(studentRow?.behaviors)
    ? studentRow.behaviors.filter((behavior: any) => behavior?.id !== sourceBehaviorId)
    : [];

  const historicalData = (studentRow?.historical_data as any) || {};
  const updatedHistoricalData = {
    frequencyEntries: mergeHistoricalFrequencyEntries(
      historicalData.frequencyEntries || [],
      sourceBehaviorId,
      targetBehaviorId,
    ),
    durationEntries: mergeHistoricalDurationEntries(
      historicalData.durationEntries || [],
      sourceBehaviorId,
      targetBehaviorId,
    ),
  };

  const { error: updateError } = await supabase
    .from('students')
    .update({
      behaviors: behaviors as any,
      historical_data: updatedHistoricalData as any,
      updated_at: new Date().toISOString(),
    })
    .eq('id', studentId);

  if (updateError) throw updateError;
}

export default function RestoredBehaviorCleanup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RestoredBehaviorRow[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'with_data'>('with_data');

  // Dialogs
  const [renameRow, setRenameRow] = useState<RestoredBehaviorRow | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  const [mergeRow, setMergeRow] = useState<RestoredBehaviorRow | null>(null);
  const [mergeTargetOptions, setMergeTargetOptions] = useState<StudentBehaviorOption[]>([]);
  const [mergeTargetId, setMergeTargetId] = useState<string>('');
  const [mergeLoading, setMergeLoading] = useState(false);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    loadRestored();
  }, []);

  async function loadRestored() {
    setLoading(true);
    try {
      // Step 1: pull every behavior literally named "Restored Behavior xxxx"
      const { data: behaviors, error: bErr } = await supabase
        .from('behaviors')
        .select('id, name')
        .ilike('name', `${RESTORED_PREFIX}%`);
      if (bErr) throw bErr;

      const behaviorIds = (behaviors || []).map((b: any) => b.id);
      if (behaviorIds.length === 0) {
        setRows([]);
        return;
      }

      // Step 2: aggregate BSD rows per (student_id, behavior_id) directly
      const { data: bsd, error: bsdErr } = await (supabase as any)
        .from('behavior_session_data')
        .select('student_id, behavior_id, frequency, created_at')
        .in('behavior_id', behaviorIds);
      if (bsdErr) throw bsdErr;

      const byPair = new Map<string, RestoredBehaviorRow>();
      const studentIds = new Set<string>();
      for (const r of (bsd || []) as any[]) {
        if (!r.student_id || !r.behavior_id) continue;
        studentIds.add(r.student_id);
        const key = `${r.student_id}:${r.behavior_id}`;
        const dateStr: string | null = r.created_at ? r.created_at.slice(0, 10) : null;
        const existing = byPair.get(key);
        if (existing) {
          existing.total_freq += Number(r.frequency || 0);
          existing.bsd_rows += 1;
          if (dateStr) {
            if (!existing.first_date || dateStr < existing.first_date) existing.first_date = dateStr;
            if (!existing.last_date || dateStr > existing.last_date) existing.last_date = dateStr;
          }
        } else {
          const beh = (behaviors || []).find((b: any) => b.id === r.behavior_id);
          byPair.set(key, {
            behavior_id: r.behavior_id,
            display_label: beh?.name || `${RESTORED_PREFIX} ${r.behavior_id.slice(0, 8)}`,
            student_id: r.student_id,
            student_name: r.student_id.slice(0, 8),
            total_freq: Number(r.frequency || 0),
            bsd_rows: 1,
            first_date: dateStr,
            last_date: dateStr,
          });
        }
      }

      // Step 3: hydrate student names
      const ids = Array.from(studentIds);
      if (ids.length > 0) {
        const { data: students } = await supabase
          .from('students')
          .select('id, first_name, last_name')
          .in('id', ids);
        const nameMap = new Map<string, string>();
        (students || []).forEach((s: any) => {
          const nm = [s.first_name, s.last_name].filter(Boolean).join(' ').trim();
          nameMap.set(s.id, nm || s.id.slice(0, 8));
        });
        byPair.forEach((row) => {
          row.student_name = nameMap.get(row.student_id) || row.student_id.slice(0, 8);
        });
      }

      // Step 4: also include behaviors with NO bsd rows (orphaned restores) so user can rename
      const seen = new Set([...byPair.keys()].map((k) => k.split(':')[1]));
      for (const b of behaviors || []) {
        if (!seen.has(b.id)) {
          byPair.set(`orphan:${b.id}`, {
            behavior_id: b.id,
            display_label: b.name,
            student_id: '',
            student_name: '— no student data —',
            total_freq: 0,
            bsd_rows: 0,
            first_date: null,
            last_date: null,
          });
        }
      }

      const list = Array.from(byPair.values()).sort(
        (a, b) => b.total_freq - a.total_freq || a.student_name.localeCompare(b.student_name)
      );
      setRows(list);
    } catch (err: any) {
      console.error('[RestoredCleanup] load failed', err);
      toast.error(`Failed to load: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === 'with_data' && r.bsd_rows === 0) return false;
      if (!q) return true;
      return (
        r.display_label.toLowerCase().includes(q) ||
        r.student_name.toLowerCase().includes(q) ||
        r.behavior_id.toLowerCase().includes(q)
      );
    });
  }, [rows, search, filter]);

  // ─── Rename ────────────────────────────────────────────────────────────────
  function openRename(row: RestoredBehaviorRow) {
    setRenameRow(row);
    setRenameValue('');
  }
  async function handleRename() {
    if (!renameRow || !renameValue.trim()) return;
    setRenaming(true);
    try {
      const newName = renameValue.trim();
      const { error } = await supabase
        .from('behaviors')
        .update({ name: newName, updated_at: new Date().toISOString() })
        .eq('id', renameRow.behavior_id);
      if (error) throw error;

      // Refresh aggregates so the chart label flips immediately for this student.
      if (renameRow.student_id) {
        await (supabase as any).rpc('fn_rebuild_student_behavior_daily_aggregates', {
          p_student_id: renameRow.student_id,
        });
        clearStudentBehaviorNameMap(renameRow.student_id);
        window.dispatchEvent(new CustomEvent('behavior-data-edited', { detail: { studentId: renameRow.student_id } }));
      }

      syncLocalBehaviorRename(renameRow.behavior_id, newName);

      toast.success(`Renamed to "${newName}"`);
      setRenameRow(null);
      await loadRestored();
    } catch (err: any) {
      toast.error(`Rename failed: ${err.message || err}`);
    } finally {
      setRenaming(false);
    }
  }

  // ─── Merge ─────────────────────────────────────────────────────────────────
  async function openMerge(row: RestoredBehaviorRow) {
    setMergeRow(row);
    setMergeTargetId('');
    setMergeTargetOptions([]);
    if (!row.student_id) return;
    setMergeLoading(true);
    try {
      // Pull this student's other behaviors that are NOT also "Restored Behavior xxxx"
      // and have at least one BSD row, ranked by total frequency.
      const { data: maps } = await supabase
        .from('student_behavior_map')
        .select('behavior_entry_id, behavior_subtype, active')
        .eq('student_id', row.student_id);
      const candidateIds = (maps || [])
        .filter((m: any) => m.active !== false && m.behavior_entry_id && m.behavior_entry_id !== row.behavior_id)
        .map((m: any) => m.behavior_entry_id);

      // Also include behaviors that have BSD data for this student even if not in the map
      const { data: bsdCounts } = await (supabase as any)
        .from('behavior_session_data')
        .select('behavior_id, frequency')
        .eq('student_id', row.student_id);
      const freqMap = new Map<string, number>();
      (bsdCounts || []).forEach((r: any) => {
        if (!r.behavior_id || r.behavior_id === row.behavior_id) return;
        freqMap.set(r.behavior_id, (freqMap.get(r.behavior_id) || 0) + Number(r.frequency || 0));
      });
      candidateIds.forEach((id: string) => {
        if (!freqMap.has(id)) freqMap.set(id, 0);
      });

      const ids = Array.from(freqMap.keys());
      if (ids.length === 0) {
        setMergeTargetOptions([]);
        return;
      }
      const { data: behaviorDefs } = await supabase
        .from('behaviors')
        .select('id, name')
        .in('id', ids);
      const options: StudentBehaviorOption[] = (behaviorDefs || [])
        .map((b: any) => ({
          behavior_id: b.id,
          name: b.name?.startsWith(RESTORED_PREFIX)
            ? `${b.name} (also a restored behavior)`
            : (b.name || b.id.slice(0, 8)),
          total_freq: freqMap.get(b.id) || 0,
        }))
        .sort((a, b) => {
          // Prefer non-restored canonical behaviors first
          const aRestored = a.name.includes('Restored Behavior') ? 1 : 0;
          const bRestored = b.name.includes('Restored Behavior') ? 1 : 0;
          if (aRestored !== bRestored) return aRestored - bRestored;
          return b.total_freq - a.total_freq;
        });
      setMergeTargetOptions(options);
    } catch (err: any) {
      toast.error(`Failed to load merge targets: ${err.message || err}`);
    } finally {
      setMergeLoading(false);
    }
  }

  async function handleMerge() {
    if (!mergeRow || !mergeTargetId) return;
    setMerging(true);
    try {
      const { data, error } = await (supabase as any).rpc('merge_student_behavior_v2', {
        p_student_id: mergeRow.student_id,
        p_source_behavior_id: mergeRow.behavior_id,
        p_target_behavior_id: mergeTargetId,
        p_mode: 'delete',
      });
      if (error) throw error;

      // Final integrity sweep — recompute aggregates for this student so the chart
      // is in lockstep with BSD (defends against any pre-existing stale rows).
      await (supabase as any).rpc('fn_rebuild_student_behavior_daily_aggregates', {
        p_student_id: mergeRow.student_id,
      });

      await persistStudentMergeCleanup(mergeRow.student_id, mergeRow.behavior_id, mergeTargetId);
      syncLocalBehaviorMerge(mergeRow.student_id, mergeRow.behavior_id, mergeTargetId);
      clearStudentBehaviorNameMap(mergeRow.student_id);
      window.dispatchEvent(new CustomEvent('behavior-merged', {
        detail: { studentId: mergeRow.student_id, removedIds: [mergeRow.behavior_id], targetId: mergeTargetId },
      }));
      window.dispatchEvent(new CustomEvent('behavior-data-edited', { detail: { studentId: mergeRow.student_id } }));

      const moved = (data as any)?.bsd_moved ?? 0;
      const merged = (data as any)?.aggregates_merged_on_collision ?? 0;
      const renamed = (data as any)?.aggregates_renamed ?? 0;
      toast.success(
        `Merged. ${moved} session row(s) moved · ${renamed} chart row(s) relabeled · ${merged} merged on shared dates.`
      );
      setMergeRow(null);
      await loadRestored();
    } catch (err: any) {
      toast.error(`Merge failed: ${err.message || err}`);
    } finally {
      setMerging(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-bold flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-primary" />
                  Restored Behavior Cleanup
                </h1>
                <p className="text-xs text-muted-foreground">
                  Rename or merge behaviors named "Restored Behavior xxxx" — original collection dates are preserved.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={loadRestored} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Reload
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-4">
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="text-xs">
            These rows are real student data with their original dates intact in <code>behavior_session_data</code>.
            Renaming updates the label everywhere; merging consolidates this row into another behavior the student
            already has, summing daily totals on shared dates.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base">Behaviors needing cleanup</CardTitle>
                <CardDescription>
                  {loading ? 'Loading…' : `${visibleRows.length} of ${rows.length} restored behaviors`}
                </CardDescription>
              </div>
              <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
                <TabsList>
                  <TabsTrigger value="with_data">With data</TabsTrigger>
                  <TabsTrigger value="all">All</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <Input
              placeholder="Search by behavior label, student name, or ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading restored behaviors…
              </div>
            ) : visibleRows.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No restored behaviors match your filters.
              </div>
            ) : (
              <div className="divide-y">
                {visibleRows.map((row) => (
                  <div
                    key={`${row.student_id || 'orphan'}:${row.behavior_id}`}
                    className="flex flex-col md:flex-row md:items-center gap-3 p-4 hover:bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{row.display_label}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {row.behavior_id.slice(0, 8)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                        <span>
                          Student: <span className="font-medium text-foreground">{row.student_name}</span>
                        </span>
                        <span>
                          Total: <span className="font-medium text-foreground">{row.total_freq}</span>
                        </span>
                        <span>{row.bsd_rows} session row(s)</span>
                        {row.first_date && row.last_date && (
                          <span>
                            {format(new Date(row.first_date), 'MMM d, yyyy')}
                            {row.first_date !== row.last_date && ` → ${format(new Date(row.last_date), 'MMM d, yyyy')}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => openRename(row)}>
                        <Pencil className="w-3.5 h-3.5 mr-1" />
                        Rename
                      </Button>
                      {row.student_id && row.bsd_rows > 0 && (
                        <Button variant="default" size="sm" onClick={() => openMerge(row)}>
                          <Merge className="w-3.5 h-3.5 mr-1" />
                          Merge into existing
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Rename dialog */}
      <Dialog open={!!renameRow} onOpenChange={(o) => !o && setRenameRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename behavior</DialogTitle>
            <DialogDescription>
              Set the real clinical label. This updates the behavior everywhere it appears and refreshes this
              student's chart immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <div className="text-xs text-muted-foreground">
              Currently: <span className="font-medium text-foreground">{renameRow?.display_label}</span>
            </div>
            <Input
              autoFocus
              placeholder="e.g. Verbal Aggression, Tantrum, Elopement…"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameValue.trim()) handleRename();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameRow(null)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!renameValue.trim() || renaming}>
              {renaming ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Pencil className="w-4 h-4 mr-1" />}
              Save name
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Merge dialog */}
      <Dialog open={!!mergeRow} onOpenChange={(o) => !o && setMergeRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge into an existing behavior</DialogTitle>
            <DialogDescription>
              All session data and chart rollups for <strong>{mergeRow?.display_label}</strong> will be moved into
              the chosen behavior. <strong>Original collection dates are preserved</strong> — totals from shared
              dates are summed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="text-xs text-muted-foreground space-y-1">
              <div>
                Student: <span className="font-medium text-foreground">{mergeRow?.student_name}</span>
              </div>
              <div>
                Source: <span className="font-medium text-foreground">{mergeRow?.display_label}</span> ·{' '}
                {mergeRow?.total_freq} total · {mergeRow?.bsd_rows} session row(s)
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Merge into:</label>
              {mergeLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading this student's other behaviors…
                </div>
              ) : mergeTargetOptions.length === 0 ? (
                <Alert>
                  <AlertDescription className="text-xs">
                    This student has no other behaviors to merge into. Use Rename instead, or add the canonical
                    behavior to the student first.
                  </AlertDescription>
                </Alert>
              ) : (
                <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose target behavior…" />
                  </SelectTrigger>
                  <SelectContent>
                    {mergeTargetOptions.map((opt) => (
                      <SelectItem key={opt.behavior_id} value={opt.behavior_id}>
                        {opt.name} {opt.total_freq > 0 && `(${opt.total_freq})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeRow(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleMerge}
              disabled={!mergeTargetId || merging || mergeTargetOptions.length === 0}
            >
              {merging ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Merge className="w-4 h-4 mr-1" />}
              Merge & preserve dates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
