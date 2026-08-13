import { useEffect, useMemo, useState, ReactNode } from 'react';
import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface GuardedDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Name the user must retype exactly, e.g. the client's full name */
  subjectName: string;
  /** Total number of records that will be removed */
  recordCount: number;
  title?: string;
  /** Rendered inside step 1 — the exact preview of what will be removed */
  preview: ReactNode;
  /** Short bulleted list of impact lines shown above the typed confirmation */
  impactSummary?: string[];
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
}

/**
 * Two-step destructive confirmation:
 *   Step 1 — review the exact records that will be removed.
 *   Step 2 — retype the subject name, the record count, and the word DELETE.
 *
 * Reusable for any client-scoped deletion in the system.
 */
export function GuardedDeleteDialog({
  open,
  onOpenChange,
  subjectName,
  recordCount,
  title = 'Delete records',
  preview,
  impactSummary = [],
  busy = false,
  onConfirm,
}: GuardedDeleteDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [nameInput, setNameInput] = useState('');
  const [countInput, setCountInput] = useState('');
  const [wordInput, setWordInput] = useState('');

  useEffect(() => {
    if (open) {
      setStep(1);
      setNameInput('');
      setCountInput('');
      setWordInput('');
    }
  }, [open]);

  const nameOk = nameInput.trim() === subjectName.trim();
  const countOk = countInput.trim() === String(recordCount);
  const wordOk = wordInput.trim() === 'DELETE';
  const canDelete = nameOk && countOk && wordOk && recordCount > 0 && !busy;

  const stepLabel = useMemo(
    () => (step === 1 ? 'Step 1 of 2 — Review' : 'Step 2 of 2 — Confirm'),
    [step],
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-destructive" />
            {title}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {stepLabel}
            </Badge>
            <span>
              {recordCount} record{recordCount === 1 ? '' : 's'} for{' '}
              <strong className="text-foreground">{subjectName}</strong>
            </span>
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <>
            <ScrollArea className="max-h-[55vh] pr-3">
              <div className="space-y-4">{preview}</div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={recordCount === 0}
                onClick={() => setStep(2)}
              >
                Continue to confirmation
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="w-4 h-4" />
                This permanently removes data and cannot be undone.
              </div>
              {impactSummary.length > 0 && (
                <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-0.5">
                  {impactSummary.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-3 py-1">
              <div className="space-y-1.5">
                <Label htmlFor="gd-name" className="text-xs">
                  Type the client name exactly:{' '}
                  <span className="font-mono text-foreground">{subjectName}</span>
                </Label>
                <Input
                  id="gd-name"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  autoFocus
                  aria-invalid={!!nameInput && !nameOk}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gd-count" className="text-xs">
                  Type the number of records:{' '}
                  <span className="font-mono text-foreground">{recordCount}</span>
                </Label>
                <Input
                  id="gd-count"
                  inputMode="numeric"
                  value={countInput}
                  onChange={(e) => setCountInput(e.target.value)}
                  aria-invalid={!!countInput && !countOk}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gd-word" className="text-xs">
                  Type <span className="font-mono text-foreground">DELETE</span> to
                  unlock
                </Label>
                <Input
                  id="gd-word"
                  value={wordInput}
                  onChange={(e) => setWordInput(e.target.value)}
                  aria-invalid={!!wordInput && !wordOk}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)} disabled={busy}>
                Back to preview
              </Button>
              <Button
                variant="destructive"
                disabled={!canDelete}
                onClick={() => onConfirm()}
              >
                {busy && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                Permanently delete {recordCount}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
