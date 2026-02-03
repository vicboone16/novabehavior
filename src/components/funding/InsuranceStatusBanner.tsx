import { AlertTriangle, Shield, Snowflake, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface InsuranceStatusBannerProps {
  fundingMode: 'school_based' | 'insurance';
  insuranceTrackingState: 'active' | 'incomplete' | 'hibernated' | null;
  onFinishSetup: () => void;
  onSwitchToSchoolBased: () => void;
  onReenableInsurance: () => void;
  className?: string;
}

export function InsuranceStatusBanner({
  fundingMode,
  insuranceTrackingState,
  onFinishSetup,
  onSwitchToSchoolBased,
  onReenableInsurance,
  className,
}: InsuranceStatusBannerProps) {
  // Insurance incomplete
  if (fundingMode === 'insurance' && insuranceTrackingState === 'incomplete') {
    return (
      <Alert variant="destructive" className={cn("border-amber-500 bg-amber-50 dark:bg-amber-950/30", className)}>
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 dark:text-amber-200">Insurance Setup Incomplete</AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          Add a payer and an active authorization to track units and avoid billing issues.
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={onFinishSetup}>
              <Settings className="w-4 h-4 mr-1" />
              Finish Insurance Setup
            </Button>
            <Button size="sm" variant="outline" onClick={onSwitchToSchoolBased}>
              Switch to School-Based
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Insurance hibernated (currently school-based but has insurance data)
  if (fundingMode === 'school_based' && insuranceTrackingState === 'hibernated') {
    return (
      <Alert className={cn("border-blue-300 bg-blue-50 dark:bg-blue-950/30", className)}>
        <Snowflake className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800 dark:text-blue-200">Insurance Tracking Paused</AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          Insurance tracking is currently off for this client. Your payer/authorization data is preserved.
          <div className="mt-3">
            <Button size="sm" onClick={onReenableInsurance}>
              <Shield className="w-4 h-4 mr-1" />
              Re-enable Insurance
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
