import { useState } from 'react';
import { MoreVertical, Edit3, Archive, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useDataStore } from '@/store/dataStore';
import { toast } from 'sonner';

interface BehaviorActionsMenuProps {
  studentId: string;
  behaviorId: string;
  behaviorName: string;
  onChanged?: () => void;
}

type RenameScope = 'student' | 'global';
type ArchiveMode = 'archive' | 'delete';

export function BehaviorActionsMenu({
  studentId,
  behaviorId,
  behaviorName,
  onChanged,
}: BehaviorActionsMenuProps) {
  const updateBehaviorName = useDataStore((s) => s.updateBehaviorName);
  const removeBehavior = useDataStore((s) => s.removeBehavior);

  const [renameOpen, setRenameOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [newName, setNewName] = useState(behaviorName);
  const [scope, setScope] = useState<RenameScope>('student');

  const [archiveMode, setArchiveMode] = useState<ArchiveMode>('archive');
  const [reason, setReason] = useState('');

  const handleRename = async () => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === behaviorName) {
      setRenameOpen(false);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.rpc('rename_student_behavior', {
        p_behavior_id: behaviorId,
        p_student_id: studentId,
        p_new_name: trimmed,
        p_scope: scope,
      });
      if (error) throw error;

      // Update local Zustand cache so charts/lists refresh immediately
      updateBehaviorName(studentId, behaviorId, trimmed);

      toast.success(
        scope === 'global'
          ? `Renamed everywhere to "${trimmed}"`
          : `Renamed to "${trimmed}" for this student`
      );
      setRenameOpen(false);
      onChanged?.();
    } catch (err: any) {
      toast.error(err?.message || 'Rename failed');
    } finally {
      setBusy(false);
    }
  };

  const handleArchiveOrDelete = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.rpc('archive_student_behavior', {
        p_behavior_id: behaviorId,
        p_student_id: studentId,
        p_mode: archiveMode,
        p_reason: reason.trim() || undefined,
      });
      if (error) throw error;

      // Strip from local store so charts stop showing it
      removeBehavior(studentId, behaviorId);

      toast.success(
        archiveMode === 'delete'
          ? `"${behaviorName}" deleted (data purged)`
          : `"${behaviorName}" archived`
      );
      setArchiveOpen(false);
      onChanged?.();
    } catch (err: any) {
      toast.error(err?.message || `${archiveMode} failed`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            title="Behavior actions"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 z-[10000]">
          <DropdownMenuItem
            onClick={() => {
              setNewName(behaviorName);
              setScope('student');
              setRenameOpen(true);
            }}
          >
            <Edit3 className="w-3.5 h-3.5 mr-2" />
            Rename…
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setArchiveMode('archive');
              setReason('');
              setArchiveOpen(true);
            }}
          >
            <Archive className="w-3.5 h-3.5 mr-2" />
            Archive…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => {
              setArchiveMode('delete');
              setReason('');
              setArchiveOpen(true);
            }}
          >
            <Trash2 className="w-3.5 h-3.5 mr-2" />
            Delete permanently…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={(o) => !busy && setRenameOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rename behavior</DialogTitle>
            <DialogDescription>
              Choose whether this rename applies only to this student or
              propagates to every student tracking the same behavior.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="behavior-rename">New name</Label>
              <Input
                id="behavior-rename"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Scope</Label>
              <RadioGroup value={scope} onValueChange={(v) => setScope(v as RenameScope)}>
                <label className="flex items-start gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="student" id="scope-student" className="mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">This student only</div>
                    <div className="text-xs text-muted-foreground">
                      Other students keep the original name.
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="global" id="scope-global" className="mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">All students with this behavior</div>
                    <div className="text-xs text-muted-foreground">
                      Renames the canonical behavior across the agency.
                    </div>
                  </div>
                </label>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={busy || !newName.trim()}>
              {busy && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive / Delete confirmation */}
      <AlertDialog open={archiveOpen} onOpenChange={(o) => !busy && setArchiveOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {archiveMode === 'delete'
                ? `Delete "${behaviorName}" permanently?`
                : `Archive "${behaviorName}"?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {archiveMode === 'delete' ? (
                <>
                  This will permanently remove the behavior and{' '}
                  <strong>purge all associated data points</strong> (frequency,
                  duration, ABC, intervals). This cannot be undone.
                </>
              ) : (
                <>
                  The behavior will be hidden from active tracking and graphs,
                  but historical data is preserved and can be restored later.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="archive-reason" className="text-xs">
              Reason (optional)
            </Label>
            <Textarea
              id="archive-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Mastered, no longer relevant, duplicated…"
              rows={2}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleArchiveOrDelete();
              }}
              disabled={busy}
              className={
                archiveMode === 'delete'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
            >
              {busy && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
              {archiveMode === 'delete' ? 'Delete permanently' : 'Archive'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
