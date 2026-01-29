import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Clock, Save } from 'lucide-react';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';

export function SessionTimeoutWarning() {
  const { showWarning, remainingSeconds, extendSession, forceSave, performEmergencySave } = useSessionTimeout();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStayLoggedIn = async () => {
    await forceSave();
    extendSession();
  };

  const handleLogoutNow = async () => {
    await performEmergencySave();
    // The timeout handler will take care of the rest
  };

  return (
    <AlertDialog open={showWarning}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
            <Clock className="w-5 h-5" />
            Session Timeout Warning
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Your session will expire in{' '}
              <span className="font-bold text-foreground text-lg">
                {formatTime(remainingSeconds)}
              </span>{' '}
              due to inactivity.
            </p>
            <p className="text-sm">
              Your data will be automatically saved before logout. Click "Stay Logged In" to continue your session.
            </p>
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <Save className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-300">
                Auto-save is enabled - your data is protected
              </span>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleLogoutNow}
            className="w-full sm:w-auto"
          >
            Save & Logout Now
          </Button>
          <Button
            onClick={handleStayLoggedIn}
            className="w-full sm:w-auto"
          >
            Stay Logged In
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
