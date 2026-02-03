import { useState } from 'react';
import { AlertTriangle, Snowflake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

interface InsuranceHibernateDialogProps {
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function InsuranceHibernateDialog({
  studentId,
  open,
  onOpenChange,
  onComplete,
}: InsuranceHibernateDialogProps) {
  const [keepAlertsEnabled, setKeepAlertsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSwitchToSchoolBased = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({
          funding_mode: 'school_based',
          insurance_tracking_state: 'hibernated',
          insurance_alerts_background: keepAlertsEnabled,
        })
        .eq('id', studentId);

      if (error) throw error;

      toast.success('Switched to School-Based. Insurance data preserved.');
      onComplete();
    } catch (error: any) {
      console.error('Error switching to school-based:', error);
      toast.error('Failed to switch mode. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Snowflake className="w-5 h-5 text-blue-500" />
            Switch to School-Based?
          </DialogTitle>
          <DialogDescription className="pt-2">
            Switching to School-Based will hide insurance tracking (payers, authorizations, 
            and unit usage) for this client.
            <br /><br />
            <strong>No insurance data will be deleted.</strong> You can switch back to Insurance at any time.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
            <Checkbox 
              id="keep-alerts" 
              checked={keepAlertsEnabled} 
              onCheckedChange={(c) => setKeepAlertsEnabled(!!c)} 
            />
            <div>
              <Label htmlFor="keep-alerts" className="font-medium cursor-pointer">
                Keep insurance alerts enabled in the background
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                If enabled, you may still receive low-unit/expiration warnings even in School-Based mode.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSwitchToSchoolBased} disabled={isLoading}>
            {isLoading ? 'Switching...' : 'Switch to School-Based'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
