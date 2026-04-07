/**
 * BehaviorDataEditor
 * 
 * Full CRUD editor for all behavior_session_data records.
 * Fetches directly from DB, allows editing date/frequency/duration/notes,
 * and syncs changes back to both DB and local Zustand store for graph refresh.
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import {
  Database, Search, Pencil, Trash2, Save, X, RefreshCw,
  ChevronDown, ChevronUp, Filter, ArrowUpDown, Calendar,
  TrendingUp, Clock, AlertCircle, Check, Loader2, type LucideIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDataStore } from '@/store/dataStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface BehaviorSessionRow {
  id: string;
  session_id: string;
  student_id: string;
  behavior_id: string;
  frequency: number | null;
  duration_seconds: number | null;
  latency_seconds: number | null;
  observation_minutes: number | null;
  data_state: string;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by_ai: boolean;
  // Joined session data
  session_started_at?: string | null;
  session_start_time?: string | null;
}

interface BehaviorDataEditorProps {
  studentId: string;
  studentName: string;
  triggerLabel?: string;
  TriggerIcon?: LucideIcon;
}

type SortField = 'date' | 'behavior' | 'frequency' | 'duration';
type SortDir = 'asc' | 'desc';

export function BehaviorDataEditor({
  studentId,
  studentName,
  triggerLabel = 'Edit All Data',
  TriggerIcon = Database,
}: BehaviorDataEditorProps) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<BehaviorSessionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Filters
  const [searchText, setSearchText] = useState('');
  const [filterBehavior, setFilterBehavior] = useState('all');
  const [filterDataType, setFilterDataType] = useState<'all' | 'frequency' | 'duration'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [groupByDate, setGroupByDate] = useState(true);

  // Edit state
  const [editingRow, setEditingRow] = useState<BehaviorSessionRow | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editFrequency, setEditFrequency] = useState<number | null>(null);
  const [editDuration, setEditDuration] = useState<number | null>(null);
  const [editLatency, setEditLatency] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editDataState, setEditDataState] = useState('measured');

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<BehaviorSessionRow | null>(null);

  const students = useDataStore(s => s.students);
  const student = students.find(s => s.id === studentId);

  const behaviorMap = useMemo(() => {
    const map = new Map<string, string>();
    if (student) {
      for (const b of student.behaviors) {
        map.set(b.id, b.name);
      }
    }
    return map;
  }, [student]);

  const getBehaviorName = useCallback((id: string) => {
    return behaviorMap.get(id) || `Unknown (${id.slice(0, 8)})`;
  }, [behaviorMap]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Use LEFT join (no !inner) so records without sessions still appear
      const { data, error } = await supabase
        .from('behavior_session_data')
        .select('id, session_id, student_id, behavior_id, frequency, duration_seconds, latency_seconds, observation_minutes, data_state, notes, created_at, updated_at, created_by_ai, sessions(started_at, start_time)')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback without join
        const { data: fallback, error: fallbackErr } = await supabase
          .from('behavior_session_data')
          .select('id, session_id, student_id, behavior_id, frequency, duration_seconds, latency_seconds, observation_minutes, data_state, notes, created_at, updated_at, created_by_ai')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false });

        if (fallbackErr) throw fallbackErr;
        setRows((fallback || []).map(r => ({ ...r, session_started_at: null, session_start_time: null })));
        return;
      }

      setRows((data || []).map((r: any) => ({
        ...r,
        session_started_at: r.sessions?.started_at || null,
        session_start_time: r.sessions?.start_time || null,
      })));
    } catch (err) {
      console.error('[BehaviorDataEditor] Fetch failed:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  const getObservationDate = (row: BehaviorSessionRow): string => {
    return row.session_started_at || row.session_start_time || row.created_at || new Date().toISOString();
  };

  // Filtered + sorted rows
  const displayRows = useMemo(() => {
    let filtered = rows;

    if (filterBehavior !== 'all') {
      filtered = filtered.filter(r => r.behavior_id === filterBehavior);
    }
    if (filterDataType === 'frequency') {
      filtered = filtered.filter(r => r.frequency != null);
    } else if (filterDataType === 'duration') {
      filtered = filtered.filter(r => r.duration_seconds != null && r.duration_seconds > 0);
    }
    if (filterDateFrom) {
      const from = startOfDay(new Date(filterDateFrom + 'T00:00:00'));
      filtered = filtered.filter(r => new Date(getObservationDate(r)) >= from);
    }
    if (filterDateTo) {
      const to = endOfDay(new Date(filterDateTo + 'T23:59:59'));
      filtered = filtered.filter(r => new Date(getObservationDate(r)) <= to);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      filtered = filtered.filter(r => {
        const name = getBehaviorName(r.behavior_id).toLowerCase();
        const notes = (r.notes || '').toLowerCase();
        const dateStr = format(parseISO(getObservationDate(r)), 'MMM d, yyyy').toLowerCase();
        return name.includes(q) || notes.includes(q) || dateStr.includes(q);
      });
    }

    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date':
          cmp = new Date(getObservationDate(a)).getTime() - new Date(getObservationDate(b)).getTime();
          break;
        case 'behavior':
          cmp = getBehaviorName(a.behavior_id).localeCompare(getBehaviorName(b.behavior_id));
          break;
        case 'frequency':
          cmp = (a.frequency || 0) - (b.frequency || 0);
          break;
        case 'duration':
          cmp = (a.duration_seconds || 0) - (b.duration_seconds || 0);
          break;
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return sorted;
  }, [rows, filterBehavior, filterDataType, filterDateFrom, filterDateTo, searchText, sortField, sortDir, getBehaviorName]);

  // Group rows by date
  const groupedByDate = useMemo(() => {
    if (!groupByDate) return null;
    const groups = new Map<string, BehaviorSessionRow[]>();
    for (const row of displayRows) {
      const dateKey = format(parseISO(getObservationDate(row)), 'yyyy-MM-dd');
      if (!groups.has(dateKey)) groups.set(dateKey, []);
      groups.get(dateKey)!.push(row);
    }
    // Sort date keys descending
    const sorted = Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    return sorted;
  }, [displayRows, groupByDate]);

  const uniqueBehaviors = useMemo(() => {
    const ids = new Set(rows.map(r => r.behavior_id));
    return Array.from(ids).map(id => ({ id, name: getBehaviorName(id) })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, getBehaviorName]);

  const startEdit = (row: BehaviorSessionRow) => {
    setEditingRow(row);
    const obsDate = getObservationDate(row);
    setEditDate(format(parseISO(obsDate), 'yyyy-MM-dd'));
    setEditFrequency(row.frequency);
    setEditDuration(row.duration_seconds);
    setEditLatency(row.latency_seconds);
    setEditNotes(row.notes || '');
    setEditDataState(row.data_state || 'measured');
  };

  const handleSaveEdit = async () => {
    if (!editingRow) return;
    setSaving(true);

    try {
      const updates: Record<string, any> = {
        frequency: editFrequency,
        duration_seconds: editDuration,
        latency_seconds: editLatency,
        notes: editNotes || null,
        data_state: editDataState,
        updated_at: new Date().toISOString(),
      };

      const newObservationDate = new Date(editDate + 'T12:00:00Z').toISOString();

      const { error } = await supabase
        .from('behavior_session_data')
        .update(updates)
        .eq('id', editingRow.id);

      if (error) throw error;

      if (editingRow.session_id) {
        await supabase
          .from('sessions')
          .update({ started_at: newObservationDate, start_time: newObservationDate })
          .eq('id', editingRow.session_id);
      }

      setRows(prev => prev.map(r =>
        r.id === editingRow.id
          ? { ...r, ...updates, session_started_at: newObservationDate, session_start_time: newObservationDate }
          : r
      ));

      refreshLocalStore();
      toast.success('Data updated successfully — graphs will refresh');
      setEditingRow(null);
    } catch (err: any) {
      console.error('[BehaviorDataEditor] Save failed:', err);
      toast.error('Failed to save: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('behavior_session_data')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw error;

      setRows(prev => prev.filter(r => r.id !== deleteTarget.id));
      refreshLocalStore();
      toast.success('Entry deleted — graphs will refresh');
      setDeleteTarget(null);
    } catch (err: any) {
      console.error('[BehaviorDataEditor] Delete failed:', err);
      toast.error('Failed to delete: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const refreshLocalStore = useCallback(() => {
    const state = useDataStore.getState();
    const cleanedFreq = state.frequencyEntries.filter(
      e => !(e.id.startsWith('bsd-') && e.studentId === studentId)
    );
    const cleanedDur = state.durationEntries.filter(
      e => !(e.id.startsWith('bsd-dur-') && e.studentId === studentId)
    );
    useDataStore.setState({
      frequencyEntries: cleanedFreq,
      durationEntries: cleanedDur,
    } as any);

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('behavior-data-edited', { detail: { studentId } }));
    }, 200);
  }, [studentId]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const renderRow = (row: BehaviorSessionRow) => {
    const obsDate = getObservationDate(row);
    return (
      <div
        key={row.id}
        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
      >
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs font-medium">
              {getBehaviorName(row.behavior_id)}
            </Badge>
            {!groupByDate && (
              <span className="text-xs text-muted-foreground">
                {format(parseISO(obsDate), 'MMM d, yyyy')}
              </span>
            )}
            {row.data_state !== 'measured' && (
              <Badge variant="secondary" className="text-xs">{row.data_state}</Badge>
            )}
            {row.created_by_ai && (
              <Badge variant="secondary" className="text-xs">AI</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm">
            {row.frequency != null && (
              <span className="flex items-center gap-1 font-medium">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                {row.frequency} count
              </span>
            )}
            {row.duration_seconds != null && row.duration_seconds > 0 && (
              <span className="flex items-center gap-1 font-medium">
                <Clock className="w-3.5 h-3.5 text-primary" />
                {formatDuration(row.duration_seconds)}
              </span>
            )}
            {row.latency_seconds != null && row.latency_seconds > 0 && (
              <span className="text-xs text-muted-foreground">
                Latency: {formatDuration(row.latency_seconds)}
              </span>
            )}
          </div>
          {row.notes && (
            <p className="text-xs text-muted-foreground truncate max-w-[400px]">
              {row.notes}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => startEdit(row)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            onClick={() => setDeleteTarget(row)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <TriggerIcon className="w-4 h-4" />
        {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Behavior Data Editor — {studentName}
            </DialogTitle>
            <DialogDescription>
              View, edit, and delete all recorded behavior data. Changes automatically update graphs.
            </DialogDescription>
          </DialogHeader>

          {/* Toolbar */}
          <div className="flex flex-wrap gap-2 pb-3 border-b shrink-0">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search behaviors, notes, or dates..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={filterBehavior} onValueChange={setFilterBehavior}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="All Behaviors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Behaviors</SelectItem>
                {uniqueBehaviors.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDataType} onValueChange={(v: any) => setFilterDataType(v)}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="frequency">Frequency</SelectItem>
                <SelectItem value="duration">Duration</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading} className="h-9 px-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Badge variant="secondary" className="h-9 px-3 flex items-center">
              {displayRows.length} records
            </Badge>
          </div>

          {/* Date range filters */}
          <div className="flex flex-wrap items-center gap-2 pb-2 border-b shrink-0">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">From:</span>
            <Input
              type="date"
              value={filterDateFrom}
              onChange={e => setFilterDateFrom(e.target.value)}
              className="h-8 w-[140px] text-xs"
            />
            <span className="text-xs text-muted-foreground">To:</span>
            <Input
              type="date"
              value={filterDateTo}
              onChange={e => setFilterDateTo(e.target.value)}
              className="h-8 w-[140px] text-xs"
            />
            {(filterDateFrom || filterDateTo) && (
              <Button variant="ghost" size="sm" className="h-8 text-xs px-2" onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }}>
                <X className="w-3 h-3 mr-1" /> Clear
              </Button>
            )}
            <div className="ml-auto">
              <Button
                variant={groupByDate ? 'secondary' : 'ghost'}
                size="sm"
                className="h-8 text-xs px-2 gap-1"
                onClick={() => setGroupByDate(!groupByDate)}
              >
                <Calendar className="w-3 h-3" />
                Group by Date
              </Button>
            </div>
          </div>

          {/* Sort bar */}
          <div className="flex gap-1 text-xs shrink-0">
            {(['date', 'behavior', 'frequency', 'duration'] as SortField[]).map(field => (
              <Button
                key={field}
                variant={sortField === field ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs px-2 gap-1"
                onClick={() => toggleSort(field)}
              >
                {field === 'date' && <Calendar className="w-3 h-3" />}
                {field === 'behavior' && <TrendingUp className="w-3 h-3" />}
                {field === 'frequency' && <TrendingUp className="w-3 h-3" />}
                {field === 'duration' && <Clock className="w-3 h-3" />}
                {field.charAt(0).toUpperCase() + field.slice(1)}
                {sortField === field && (
                  <ArrowUpDown className="w-3 h-3" />
                )}
              </Button>
            ))}
          </div>

          {/* Data list - scrollable */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : displayRows.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Database className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>No data records found</p>
              </div>
            ) : groupByDate && groupedByDate ? (
              <div className="space-y-4 py-2 pr-2">
                {groupedByDate.map(([dateKey, dateRows]) => (
                  <div key={dateKey}>
                    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-1.5 px-2 mb-1.5 border-b">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm">
                          {format(parseISO(dateKey), 'EEEE, MMMM d, yyyy')}
                        </span>
                        <Badge variant="outline" className="text-xs ml-auto">
                          {dateRows.length} {dateRows.length === 1 ? 'entry' : 'entries'}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1.5 pl-2">
                      {dateRows.map(renderRow)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1.5 py-2 pr-2">
                {displayRows.map(renderRow)}
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - scrollable */}
      <Dialog open={!!editingRow} onOpenChange={o => !o && setEditingRow(null)}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4" />
              Edit Data Entry
            </DialogTitle>
          </DialogHeader>

          {editingRow && (
            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
              <div className="space-y-2">
                <Label>Behavior</Label>
                <Input value={getBehaviorName(editingRow.behavior_id)} disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label>Observation Date</Label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={e => setEditDate(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Frequency Count</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editFrequency ?? ''}
                    onChange={e => setEditFrequency(e.target.value === '' ? null : parseInt(e.target.value))}
                    placeholder="—"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Duration (seconds)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={editDuration ?? ''}
                    onChange={e => setEditDuration(e.target.value === '' ? null : parseFloat(e.target.value))}
                    placeholder="—"
                  />
                  {editDuration != null && editDuration > 0 && (
                    <p className="text-xs text-muted-foreground">{formatDuration(editDuration)}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Latency (seconds)</Label>
                <Input
                  type="number"
                  min="0"
                  value={editLatency ?? ''}
                  onChange={e => setEditLatency(e.target.value === '' ? null : parseFloat(e.target.value))}
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <Label>Data State</Label>
                <Select value={editDataState} onValueChange={setEditDataState}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="measured">Measured</SelectItem>
                    <SelectItem value="estimated">Estimated</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="not_collected">Not Collected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Optional notes..."
                  rows={2}
                />
              </div>
            </div>
          )}

          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setEditingRow(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={o => !o && setDeleteTarget(null)}
        title="Delete Data Entry"
        description={
          deleteTarget
            ? `Delete ${getBehaviorName(deleteTarget.behavior_id)} data from ${format(parseISO(getObservationDate(deleteTarget)), 'MMM d, yyyy')}? This cannot be undone and will update all graphs.`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </>
  );
}
