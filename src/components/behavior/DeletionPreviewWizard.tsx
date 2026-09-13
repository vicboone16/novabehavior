import { useMemo, useState } from 'react';
import { Trash2, AlertTriangle, ChevronRight, ChevronLeft, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useDataStore } from '@/store/dataStore';
import type { Behavior } from '@/types/behavior';

interface DeletionPreviewWizardProps {
  studentId: string;
  behavior: Behavior;
  trigger?: React.ReactNode;
}

export function DeletionPreviewWizard({ studentId, behavior, trigger }: DeletionPreviewWizardProps) {
  const { sessions, frequencyEntries, durationEntries, removeBehavior, archiveBehavior } = useDataStore();
  const [step, setStep] = useState<'preview' | 'confirm'>('preview');
  const [open, setOpen] = useState(false);

  const impact = useMemo(() => {
    const sessionCount = sessions.filter((s) =>
      s.frequencyEntries.some((e) => e.behaviorId === behavior.id) ||
      s.durationEntries.some((e) => e.behaviorId === behavior.id) ||
      s.intervalEntries.some((e) => e.behaviorId === behavior.id) ||
      s.abcEntries.some((e) => e.behaviorId === behavior.id)
    ).length;

    const freqCount = frequencyEntries.filter((e) => e.behaviorId === behavior.id).length;
    const durCount = durationEntries.filter((e) => e.behaviorId === behavior.id).length;

    return { sessionCount, freqCount, durCount };
  }, [behavior.id, sessions, frequencyEntries, durationEntries]);

  const hasData = impact.sessionCount > 0 || impact.freqCount > 0 || impact.durCount > 0;

  const handleArchive = () => {
    archiveBehavior(studentId, behavior.id);
    setOpen(false);
    setStep('preview');
  };

  const handleDelete = () => {
    removeBehavior(studentId, behavior.id);
    setOpen(false);
    setStep('preview');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setStep('preview'); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="h-6 px-2 gap-1 text-[10px] text-destructive hover:text-destructive">
            <Trash2 className="w-3 h-3" />
            Delete
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Trash2 className="w-4 h-4 text-destructive" />
            {step === 'preview' ? 'Delete Preview' : 'Confirm Deletion'}
          </DialogTitle>
        </DialogHeader>

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-sm font-semibold">{behavior.name}</p>
              {behavior.category && (
                <p className="text-xs text-muted-foreground">{behavior.category}</p>
              )}
            </div>

            {hasData ? (
              <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 space-y-2">
                <div className="flex items-center gap-2 text-yellow-800 text-sm font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  Data will be affected
                </div>
                <ul className="text-xs text-yellow-800 space-y-1 ml-6">
                  {impact.sessionCount > 0 && <li>{impact.sessionCount} session(s) contain this behavior</li>}
                  {impact.freqCount > 0 && <li>{impact.freqCount} frequency log entries</li>}
                  {impact.durCount > 0 && <li>{impact.durCount} duration entries</li>}
                </ul>
                <p className="text-xs text-yellow-700 mt-1">
                  Session data entries are not deleted — behavior will show as "Unknown behavior" in old reports.
                  Consider <strong>archiving</strong> instead to preserve history.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
                No session data recorded for this behavior. Safe to delete.
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              {hasData && (
                <Button variant="outline" className="gap-2" onClick={handleArchive}>
                  <Archive className="w-4 h-4" />
                  Archive instead (recommended)
                </Button>
              )}
              <Button
                variant="ghost"
                className="gap-2 text-destructive hover:text-destructive"
                onClick={() => setStep('confirm')}
              >
                <ChevronRight className="w-4 h-4" />
                {hasData ? 'Delete anyway' : 'Delete'}
              </Button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 space-y-2">
              <p className="text-sm font-semibold text-destructive">
                Permanently delete "{behavior.name}"?
              </p>
              <p className="text-xs text-muted-foreground">
                This removes the behavior from the student's profile. Historic session entries will show
                "Unknown behavior" in reports. This cannot be undone.
              </p>
              {hasData && (
                <div className="flex flex-wrap gap-1 mt-2">
                  <Badge variant="destructive" className="text-[10px]">{impact.sessionCount} sessions affected</Badge>
                  {impact.freqCount > 0 && <Badge variant="outline" className="text-[10px]">{impact.freqCount} freq entries</Badge>}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="gap-1" onClick={() => setStep('preview')}>
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </Button>
              <Button variant="destructive" className="flex-1 gap-2" onClick={handleDelete}>
                <Trash2 className="w-4 h-4" />
                Confirm delete
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
