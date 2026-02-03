import { useState, useEffect } from 'react';
import { Shield, Loader2, RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface InsuranceRestoreDialogProps {
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  onRunWizard: () => void;
}

interface ExistingData {
  hasActivePayer: boolean;
  hasActiveAuth: boolean;
  payerName?: string;
  authNumber?: string;
}

export function InsuranceRestoreDialog({
  studentId,
  open,
  onOpenChange,
  onComplete,
  onRunWizard,
}: InsuranceRestoreDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [existingData, setExistingData] = useState<ExistingData | null>(null);
  const [restoreOption, setRestoreOption] = useState('restore');
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (open) {
      checkExistingData();
    }
  }, [open, studentId]);

  const checkExistingData = async () => {
    setIsLoading(true);
    try {
      // Check for active payer
      const { data: payers } = await supabase
        .from('client_payers')
        .select('id, payer:payers(name)')
        .eq('student_id', studentId)
        .eq('is_active', true)
        .limit(1);

      // Check for active authorization
      const today = new Date().toISOString().split('T')[0];
      const { data: auths } = await supabase
        .from('authorizations')
        .select('id, auth_number')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .gte('end_date', today)
        .limit(1);

      const hasActivePayer = (payers?.length ?? 0) > 0;
      const hasActiveAuth = (auths?.length ?? 0) > 0;

      setExistingData({
        hasActivePayer,
        hasActiveAuth,
        payerName: payers?.[0]?.payer?.name,
        authNumber: auths?.[0]?.auth_number,
      });
    } catch (error) {
      console.error('Error checking existing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    if (restoreOption === 'wizard') {
      onOpenChange(false);
      onRunWizard();
      return;
    }

    setIsRestoring(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({
          funding_mode: 'insurance',
          insurance_tracking_state: 'active',
        })
        .eq('id', studentId);

      if (error) throw error;

      toast.success('Insurance tracking restored.');
      onComplete();
    } catch (error: any) {
      console.error('Error restoring insurance:', error);
      toast.error('Failed to restore. Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };

  const canQuickRestore = existingData?.hasActivePayer && existingData?.hasActiveAuth;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Re-enable Insurance Tracking
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : canQuickRestore ? (
          <>
            <DialogDescription className="pt-2">
              We found existing payer/authorization data for this client. How would you like to proceed?
            </DialogDescription>

            <div className="py-4">
              <RadioGroup value={restoreOption} onValueChange={setRestoreOption} className="space-y-3">
                <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
                  <RadioGroupItem value="restore" id="restore" className="mt-0.5" />
                  <div>
                    <Label htmlFor="restore" className="font-medium cursor-pointer flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Restore existing insurance setup (recommended)
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Payer: {existingData?.payerName}<br />
                      Auth #: {existingData?.authNumber}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded-lg">
                  <RadioGroupItem value="wizard" id="wizard" className="mt-0.5" />
                  <div>
                    <Label htmlFor="wizard" className="font-medium cursor-pointer flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Run setup wizard to update payer/authorization
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Start fresh or modify existing insurance settings.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </>
        ) : (
          <DialogDescription className="pt-2">
            No active authorization was found for this client. Please run the setup wizard to configure 
            payer and authorization details.
          </DialogDescription>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isRestoring}>
            Cancel
          </Button>
          {canQuickRestore ? (
            <Button onClick={handleRestore} disabled={isRestoring}>
              {isRestoring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Restoring...
                </>
              ) : restoreOption === 'restore' ? (
                'Restore'
              ) : (
                'Run Wizard'
              )}
            </Button>
          ) : (
            <Button onClick={onRunWizard}>
              Run Setup Wizard
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
