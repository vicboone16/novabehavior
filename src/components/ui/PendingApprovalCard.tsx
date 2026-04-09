import { Info, ArrowRight, Mail, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface PendingApprovalCardProps {
  itemType: string; // e.g. "supervision log", "report", "session note"
  submittedAt?: string | Date | null;
  pendingWith?: string | null; // supervisor name
  onViewDetails?: () => void;
  onSendReminder?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
}

export function PendingApprovalCard({
  itemType,
  submittedAt,
  pendingWith,
  onViewDetails,
  onSendReminder,
  onContinue,
  continueLabel = 'Continue to next',
}: PendingApprovalCardProps) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            This {itemType} is awaiting supervisor approval.
          </p>
          <div className="text-xs text-muted-foreground space-y-0.5">
            {pendingWith && (
              <p>Pending with: <span className="font-medium text-foreground">{pendingWith}</span></p>
            )}
            {submittedAt && (
              <p>Submitted: {format(new Date(submittedAt), 'MMM d, yyyy · h:mm a')}</p>
            )}
          </div>
        </div>
      </div>

      <div className="pl-7 space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">What you can do:</p>
        <div className="flex flex-wrap gap-2">
          {onSendReminder && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={onSendReminder}>
              <Mail className="w-3 h-3" /> Send Reminder
            </Button>
          )}
          {onViewDetails && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={onViewDetails}>
              <FileText className="w-3 h-3" /> View Details
            </Button>
          )}
          {onContinue && (
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={onContinue}>
              <ArrowRight className="w-3 h-3" /> {continueLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
