import { useState } from 'react';
import {
  Pause, Play, CheckCircle, XCircle, Copy, RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTargetLifecycle } from '@/hooks/useTargetLifecycle';
import {
  type TargetLifecycleStatus,
  type TargetClosedReason,
  type LifecycleAction,
  LIFECYCLE_STATUS_LABELS,
  CLOSED_REASON_LABELS,
  getAvailableActions,
} from '@/types/targetLifecycle';
import { PHASE_LABELS, type TargetPhase } from '@/types/criteriaEngine';

interface TargetLifecycleActionsProps {
  targetId: string;
  currentStatus: TargetLifecycleStatus;
  currentPhase?: string;
  onActionComplete?: () => void;
}

export function TargetLifecycleActions({
  targetId,
  currentStatus,
  currentPhase,
  onActionComplete,
}: TargetLifecycleActionsProps) {
  const lifecycle = useTargetLifecycle(targetId);
  const [activeDialog, setActiveDialog] = useState<LifecycleAction | null>(null);
  const [holdReason, setHoldReason] = useState('');
  const [closeReason, setCloseReason] = useState<TargetClosedReason>('mastered');
  const [discontinueReason, setDiscontinueReason] = useState('');
  const [reopenPhase, setReopenPhase] = useState<string>(currentPhase || 'acquisition');
  const [replaceName, setReplaceName] = useState('');

  const availableActions = getAvailableActions(currentStatus);

  const handleAction = async () => {
    let success = false;
    switch (activeDialog) {
      case 'hold':
        success = await lifecycle.holdTarget(holdReason);
        break;
      case 'reinstate':
        success = await lifecycle.reinstateTarget();
        break;
      case 'close':
        success = await lifecycle.closeTarget(closeReason);
        break;
      case 'reopen':
        success = await lifecycle.reopenTarget(reopenPhase);
        break;
      case 'discontinue':
        success = await lifecycle.discontinueTarget(discontinueReason);
        break;
      case 'replace':
        const result = await lifecycle.replaceTarget(replaceName || undefined);
        success = !!result;
        break;
    }
    if (success) {
      setActiveDialog(null);
      resetForm();
      onActionComplete?.();
    }
  };

  const resetForm = () => {
    setHoldReason('');
    setCloseReason('mastered');
    setDiscontinueReason('');
    setReopenPhase(currentPhase || 'acquisition');
    setReplaceName('');
  };

  const actionIcons: Partial<Record<LifecycleAction, React.ReactNode>> = {
    hold: <Pause className="w-3.5 h-3.5 mr-2" />,
    reinstate: <Play className="w-3.5 h-3.5 mr-2" />,
    close: <CheckCircle className="w-3.5 h-3.5 mr-2" />,
    reopen: <RotateCcw className="w-3.5 h-3.5 mr-2" />,
    discontinue: <XCircle className="w-3.5 h-3.5 mr-2" />,
    replace: <Copy className="w-3.5 h-3.5 mr-2" />,
  };

  const actionLabels: Partial<Record<LifecycleAction, string>> = {
    hold: 'Hold Target',
    reinstate: 'Reinstate Target',
    close: 'Close Target',
    reopen: 'Reopen Target',
    discontinue: 'Discontinue Target',
    replace: 'Replace Target',
  };

  const statusVariant = currentStatus === 'active' ? 'default' 
    : currentStatus === 'on_hold' ? 'secondary' 
    : 'outline';

  return (
    <>
      <div className="flex items-center gap-2">
        <Badge variant={statusVariant} className="text-[10px]">
          {LIFECYCLE_STATUS_LABELS[currentStatus]}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {availableActions.map((action, i) => (
              <div key={action}>
                {i > 0 && (action === 'discontinue' || action === 'replace') && (
                  <DropdownMenuSeparator />
                )}
                <DropdownMenuItem onClick={() => setActiveDialog(action)}>
                  {actionIcons[action]}
                  {actionLabels[action]}
                </DropdownMenuItem>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Hold Dialog */}
      <Dialog open={activeDialog === 'hold'} onOpenChange={o => !o && setActiveDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hold Target</DialogTitle>
            <DialogDescription>
              Pausing this target will disable data collection. You can reinstate it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Reason (optional)</Label>
              <Textarea
                placeholder="e.g., Student temporarily unavailable"
                value={holdReason}
                onChange={e => setHoldReason(e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setActiveDialog(null)}>Cancel</Button>
            <Button size="sm" onClick={handleAction} disabled={lifecycle.loading}>
              <Pause className="w-3.5 h-3.5 mr-1" /> Hold Target
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reinstate Dialog */}
      <Dialog open={activeDialog === 'reinstate'} onOpenChange={o => !o && setActiveDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reinstate Target</DialogTitle>
            <DialogDescription>
              Resume data collection on this target. It will return to its previous phase.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setActiveDialog(null)}>Cancel</Button>
            <Button size="sm" onClick={handleAction} disabled={lifecycle.loading}>
              <Play className="w-3.5 h-3.5 mr-1" /> Reinstate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Dialog */}
      <Dialog open={activeDialog === 'close'} onOpenChange={o => !o && setActiveDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Close Target</DialogTitle>
            <DialogDescription>
              Mark this target as completed. Historical data will be preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Reason</Label>
              <Select value={closeReason} onValueChange={v => setCloseReason(v as TargetClosedReason)}>
                <SelectTrigger className="h-8 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mastered">Mastered</SelectItem>
                  <SelectItem value="generalized">Generalized</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setActiveDialog(null)}>Cancel</Button>
            <Button size="sm" onClick={handleAction} disabled={lifecycle.loading}>
              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Close Target
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen Dialog */}
      <Dialog open={activeDialog === 'reopen'} onOpenChange={o => !o && setActiveDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reopen Target</DialogTitle>
            <DialogDescription>
              Resume work on this closed target. Choose the phase to restart in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Restart Phase</Label>
              <Select value={reopenPhase} onValueChange={setReopenPhase}>
                <SelectTrigger className="h-8 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PHASE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setActiveDialog(null)}>Cancel</Button>
            <Button size="sm" onClick={handleAction} disabled={lifecycle.loading}>
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reopen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discontinue Dialog */}
      <Dialog open={activeDialog === 'discontinue'} onOpenChange={o => !o && setActiveDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Discontinue Target</DialogTitle>
            <DialogDescription>
              Stop this target permanently without mastery. Data will be preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Reason</Label>
              <Textarea
                placeholder="e.g., Not clinically appropriate, parent withdrew consent"
                value={discontinueReason}
                onChange={e => setDiscontinueReason(e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setActiveDialog(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={handleAction} disabled={lifecycle.loading}>
              <XCircle className="w-3.5 h-3.5 mr-1" /> Discontinue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replace Dialog */}
      <Dialog open={activeDialog === 'replace'} onOpenChange={o => !o && setActiveDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Replace Target</DialogTitle>
            <DialogDescription>
              Create a new version. The current target will be closed as "replaced" and all data preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">New Target Name (optional)</Label>
              <Input
                placeholder="Leave blank to auto-name"
                value={replaceName}
                onChange={e => setReplaceName(e.target.value)}
                className="h-8 mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setActiveDialog(null)}>Cancel</Button>
            <Button size="sm" onClick={handleAction} disabled={lifecycle.loading}>
              <Copy className="w-3.5 h-3.5 mr-1" /> Replace & Create v2
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
