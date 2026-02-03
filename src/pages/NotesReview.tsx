import { SupervisorReviewDashboard } from '@/components/admin/SupervisorReviewDashboard';
import { ClipboardCheck } from 'lucide-react';

export default function NotesReview() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6" />
            Notes Review
          </h1>
          <p className="text-sm text-muted-foreground">
            Review and approve clinical session notes
          </p>
        </div>
      </div>

      <SupervisorReviewDashboard />
    </div>
  );
}
