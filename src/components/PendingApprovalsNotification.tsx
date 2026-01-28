import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePendingApprovals } from '@/hooks/usePendingApprovals';
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
import { Users } from 'lucide-react';

export function PendingApprovalsNotification() {
  const navigate = useNavigate();
  const { pendingCount, isAdmin, loading, hasShownNotification, markNotificationShown } = usePendingApprovals();
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    if (!loading && isAdmin && pendingCount > 0 && !hasShownNotification) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setShowDialog(true);
        markNotificationShown();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, isAdmin, pendingCount, hasShownNotification, markNotificationShown]);

  if (!isAdmin || pendingCount === 0) return null;

  const handleViewPending = () => {
    setShowDialog(false);
    navigate('/admin?tab=pending');
  };

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-2">
            <Users className="w-6 h-6 text-amber-500" />
          </div>
          <AlertDialogTitle className="text-center">
            {pendingCount} User{pendingCount > 1 ? 's' : ''} Awaiting Approval
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            You have {pendingCount} new user{pendingCount > 1 ? 's' : ''} waiting for account approval. 
            Would you like to review them now?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-center gap-2">
          <AlertDialogCancel>Later</AlertDialogCancel>
          <AlertDialogAction onClick={handleViewPending}>
            Review Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
