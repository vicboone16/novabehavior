import { useState, useEffect } from 'react';
import { Merge, Loader2, ArrowRight } from 'lucide-react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { clearStudentBehaviorNameMap, getStudentBehaviorNameMap } from '@/lib/behaviorNameResolver';
import { useDataStore } from '@/store/dataStore';

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
      const [{ data: maps, error: mapsError }, { data: bsdRows, error: bsdError }, resolvedNameMap] = await Promise.all([
        supabase
          .from('student_behavior_map')
          .select('behavior_entry_id, behavior_subtype, active')
          .eq('student_id', studentId),
        (supabase as any)
          .from('behavior_session_data')
          .select('behavior_id, created_at')
          .eq('student_id', studentId)
          .order('created_at', { ascending: true }),
        getStudentBehaviorNameMap(studentId),
      ]);

      if (mapsError) throw mapsError;
      if (bsdError) throw bsdError;

      const mappedIds = (maps || [])
        .filter((m: any) => m.active !== false)
        .map((m: any) => m.behavior_entry_id)
        .filter(Boolean);

      const bsdData = (bsdRows || []) as any[];
      const bsdIds = bsdData.map((c: any) => c.behavior_id).filter(Boolean);
      const allBehaviorIds = [...new Set([...mappedIds, ...bsdIds])];

      // Build count + date range per behavior
      const countMap = new Map<string, number>();
      const firstDateMap = new Map<string, string>();
      const lastDateMap = new Map<string, string>();
      bsdData.forEach((r: any) => {
        const id = r.behavior_id;
        const date = r.created_at ? r.created_at.slice(0, 10) : null;
        countMap.set(id, (countMap.get(id) || 0) + 1);
        if (date) {
          if (!firstDateMap.has(id) || date < firstDateMap.get(id)!) {
            firstDateMap.set(id, date);
          }
          if (!lastDateMap.has(id) || date > lastDateMap.get(id)!) {
            lastDateMap.set(id, date);
          }
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

      const options: BehaviorOption[] = allBehaviorIds.map(id => ({
        id,
        name: nameMap.get(id) || `Unlinked Behavior (${id.slice(0, 8)})`,
        dataCount: countMap.get(id) || 0,
        firstDate: firstDateMap.get(id) || null,
        lastDate: lastDateMap.get(id) || null,
      }));

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

      clearStudentBehaviorNameMap(studentId);
      const primaryName = behaviors.find(b => b.id === primaryId)?.name || 'target behavior';
      toast.success(`Merged ${sourceIds.length} behavior(s) into "${primaryName}" (${totalMoved} data points moved)`);
      window.dispatchEvent(new CustomEvent('behavior-data-edited', { detail: { studentId } }));
      setOpen(false);
      onMerged?.();
    } catch (err: any) {
      toast.error(`Merge failed: ${err.message || err}`);
    } finally {
      setMerging(false);
    }
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
                      <span>{b.dataCount} data points</span>
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
                    {totalDataPoints} total data points will be consolidated. Source behaviors will be deactivated. This cannot be undone.
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
