/**
 * LeaveOrEndSessionDialog
 *
 * Shown when a staff member clicks "End Session" while other staff are
 * actively collecting data in the same session.
 *
 * Options:
 *   1. Leave Session  — stamps the current user's left_at, removes them from the
 *                       active session without ending it for others.
 *   2. End for Everyone — ends the session globally (prompts a confirmation).
 */
import { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { LogOut, Users, AlertTriangle } from 'lucide-react';
import { SessionParticipant } from '@/hooks/useSessionParticipants';

interface LeaveOrEndSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  otherParticipants: SessionParticipant[];
  onLeave: () => Promise<void>;
  onEndForEveryone: () => void;
}

function participantLabel(p: SessionParticipant) {
  return p.display_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Staff';
}

export function LeaveOrEndSessionDialog({
  open,
  onOpenChange,
  otherParticipants,
  onLeave,
  onEndForEveryone,
}: LeaveOrEndSessionDialogProps) {
  const [leaving, setLeaving] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const handleLeave = async () => {
    setLeaving(true);
    await onLeave();
    setLeaving(false);
    onOpenChange(false);
  };

  const handleEndForEveryone = () => {
    setConfirmEnd(false);
    onOpenChange(false);
    onEndForEveryone();
  };

  if (confirmEnd) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              End Session for Everyone?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will end the session for{' '}
              <strong>all {otherParticipants.length + 1} staff members</strong> currently collecting
              data. They will each be prompted to complete their notes.
              <div className="mt-3 space-y-1">
                {otherParticipants.map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-sm text-foreground">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    {participantLabel(p)}
                  </div>
                ))}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmEnd(false)}>Go Back</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleEndForEveryone}
            >
              Yes, End for Everyone
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Other Staff Are Still Active
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              <p className="mb-3">
                The following staff members are currently collecting data in this session:
              </p>
              <div className="space-y-1.5 mb-4">
                {otherParticipants.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm text-foreground"
                  >
                    <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium">{participantLabel(p)}</span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1 ml-auto">
                      Active
                    </Badge>
                  </div>
                ))}
              </div>
              <p className="text-sm">
                Would you like to <strong>leave this session</strong> (stop your own data
                collection) or <strong>end it for everyone</strong>?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="gap-2"
            onClick={handleLeave}
            disabled={leaving}
          >
            <LogOut className="w-4 h-4" />
            {leaving ? 'Leaving…' : 'Leave My Session'}
          </AlertDialogAction>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            onClick={() => setConfirmEnd(true)}
          >
            <AlertTriangle className="w-4 h-4" />
            End for Everyone
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
