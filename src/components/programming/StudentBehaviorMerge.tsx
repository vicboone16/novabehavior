import { useState, useEffect } from 'react';
import { Merge } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface BehaviorOption {
  id: string;
  name: string;
  dataCount: number;
}

interface StudentBehaviorMergeProps {
  studentId: string;
  studentName: string;
  onMerged?: () => void;
}

export function StudentBehaviorMerge({ studentId, studentName, onMerged }: StudentBehaviorMergeProps) {
  const [open, setOpen] = useState(false);
  const [behaviors, setBehaviors] = useState<BehaviorOption[]>([]);
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (!open) return;
    loadBehaviors();
  }, [open, studentId]);

  async function loadBehaviors() {
    setLoading(true);
    try {
      const [{ data: maps, error: mapsError }, { data: counts, error: countsError }, resolvedNameMap] = await Promise.all([
        supabase
          .from('student_behavior_map')
          .select('behavior_entry_id, behavior_subtype, active')
          .eq('student_id', studentId),
        supabase
          .from('behavior_session_data')
          .select('behavior_id')
          .eq('student_id', studentId),
        getStudentBehaviorNameMap(studentId),
      ]);

      if (mapsError) throw mapsError;
      if (countsError) throw countsError;

      const mappedIds = (maps || [])
        .filter(m => m.active !== false)
        .map(m => m.behavior_entry_id)
        .filter(Boolean);

      const countedIds = (counts || []).map(c => c.behavior_id).filter(Boolean);
      const allBehaviorIds = [...new Set([...mappedIds, ...countedIds])];

      const { data: behaviorDefs, error: defsError } = allBehaviorIds.length > 0
        ? await supabase.from('behaviors').select('id, name').in('id', allBehaviorIds)
        : { data: [], error: null };

      if (defsError) throw defsError;

      const nameMap = new Map<string, string>();
      (behaviorDefs || []).forEach(b => {
        if (b?.id && b?.name?.trim()) nameMap.set(b.id, b.name.trim());
      });
      resolvedNameMap.forEach((name, id) => {
        if (id && name?.trim() && !nameMap.has(id)) {
          nameMap.set(id, name.trim());
        }
      });

      const subtypeMap = new Map<string, string>();
      (maps || []).forEach(m => {
        if (m.behavior_entry_id && m.behavior_subtype?.trim() && !subtypeMap.has(m.behavior_entry_id)) {
          subtypeMap.set(m.behavior_entry_id, m.behavior_subtype.trim());
        }
      });

      const countMap = new Map<string, number>();
      (counts || []).forEach(c => {
        countMap.set(c.behavior_id, (countMap.get(c.behavior_id) || 0) + 1);
      });

      const options: BehaviorOption[] = allBehaviorIds.map(id => ({
        id,
        name: nameMap.get(id) || subtypeMap.get(id) || `Unlinked Behavior (${id.slice(0, 8)})`,
        dataCount: countMap.get(id) || 0,
      }));

      options.sort((a, b) => a.name.localeCompare(b.name));
      setBehaviors(options);
    } catch (err) {
      console.error('Failed to load behaviors for merge:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleMerge() {
    if (!sourceId || !targetId || sourceId === targetId) return;
    setMerging(true);
    try {
      const { data, error } = await supabase.rpc('merge_student_behavior' as any, {
        p_student_id: studentId,
        p_source_behavior_id: sourceId,
        p_target_behavior_id: targetId,
      });
      if (error) throw error;
      const result = data as any;
      clearStudentBehaviorNameMap(studentId);
      toast.success(
        `Merged "${result.source_name}" → "${result.target_name}" (${result.bsd_moved} data points moved)`
      );
      window.dispatchEvent(new CustomEvent('behavior-data-edited', { detail: { studentId } }));
      setOpen(false);
      setSourceId('');
      setTargetId('');
      onMerged?.();
    } catch (err: any) {
      toast.error(`Merge failed: ${err.message || err}`);
    } finally {
      setMerging(false);
    }
  }

  const sourceBehavior = behaviors.find(b => b.id === sourceId);
  const targetBehavior = behaviors.find(b => b.id === targetId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Merge className="h-4 w-4 mr-1" />
          Merge Behaviors
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Merge Student Behaviors</DialogTitle>
          <DialogDescription>
            Merge two behaviors for <strong>{studentName}</strong>. All data from the source behavior will be moved to the target. This does not affect the global behavior bank.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground py-4">Loading behaviors…</p>
        ) : behaviors.length < 2 ? (
          <p className="text-sm text-muted-foreground py-4">This student needs at least 2 behaviors to merge.</p>
        ) : (
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Source (will be removed)</label>
              <Select value={sourceId} onValueChange={setSourceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select behavior to merge from…" />
                </SelectTrigger>
                <SelectContent>
                  {behaviors.filter(b => b.id !== targetId).map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.dataCount} entries)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Target (will keep)</label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select behavior to merge into…" />
                </SelectTrigger>
                <SelectContent>
                  {behaviors.filter(b => b.id !== sourceId).map(b => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.dataCount} entries)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {sourceId && targetId && sourceId !== targetId && (
              <Alert>
                <AlertDescription>
                  <strong>{sourceBehavior?.dataCount || 0}</strong> data entries from "{sourceBehavior?.name}" will be moved to "{targetBehavior?.name}". The source behavior will be deactivated. This cannot be undone.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={!sourceId || !targetId || sourceId === targetId || merging}
            onClick={handleMerge}
          >
            {merging ? 'Merging…' : 'Merge'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
