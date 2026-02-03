import { useState } from 'react';
import { Building2, Shield, AlertTriangle, Snowflake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { InsuranceSetupWizard } from './InsuranceSetupWizard';
import { InsuranceHibernateDialog } from './InsuranceHibernateDialog';
import { InsuranceRestoreDialog } from './InsuranceRestoreDialog';
import { cn } from '@/lib/utils';

export type FundingMode = 'school_based' | 'insurance';
export type InsuranceTrackingState = 'active' | 'incomplete' | 'hibernated' | null;

interface FundingModeToggleProps {
  studentId: string;
  currentMode: FundingMode;
  insuranceTrackingState?: InsuranceTrackingState;
  onModeChange: (mode: FundingMode) => void;
  hasActivePayer?: boolean;
  hasActiveAuth?: boolean;
  className?: string;
}

export function FundingModeToggle({
  studentId,
  currentMode,
  insuranceTrackingState,
  onModeChange,
  hasActivePayer = false,
  hasActiveAuth = false,
  className,
}: FundingModeToggleProps) {
  const [showHibernateDialog, setShowHibernateDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showInsuranceWizard, setShowInsuranceWizard] = useState(false);

  const isInsuranceReady = hasActivePayer && hasActiveAuth;
  const isHibernated = insuranceTrackingState === 'hibernated';

  const handleModeClick = (mode: FundingMode) => {
    if (mode === currentMode) return;

    if (mode === 'school_based') {
      // Switching to school-based: show hibernate confirmation
      setShowHibernateDialog(true);
    } else {
      // Switching to insurance
      if (isHibernated) {
        // Has existing data - show restore dialog
        setShowRestoreDialog(true);
      } else {
        // No existing data - show full wizard
        setShowInsuranceWizard(true);
      }
    }
  };

  const handleHibernateComplete = () => {
    setShowHibernateDialog(false);
    onModeChange('school_based');
  };

  const handleRestoreComplete = () => {
    setShowRestoreDialog(false);
    onModeChange('insurance');
  };

  const handleWizardComplete = () => {
    setShowInsuranceWizard(false);
    onModeChange('insurance');
  };

  const handleRunWizardFromRestore = () => {
    setShowRestoreDialog(false);
    setShowInsuranceWizard(true);
  };

  return (
    <>
      <div className={cn("flex flex-col gap-1", className)}>
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-muted-foreground mr-2">Funding:</span>
          <div className="inline-flex rounded-lg bg-muted p-0.5">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-3 text-xs rounded-md transition-all",
                currentMode === 'school_based' 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => handleModeClick('school_based')}
            >
              <Building2 className="w-3.5 h-3.5 mr-1.5" />
              School-Based
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-3 text-xs rounded-md transition-all",
                currentMode === 'insurance' 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => handleModeClick('insurance')}
            >
              <Shield className="w-3.5 h-3.5 mr-1.5" />
              Insurance
            </Button>
          </div>

          {/* Status badges */}
          {currentMode === 'insurance' && !isInsuranceReady && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-400 ml-2">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Setup Incomplete
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {!hasActivePayer && !hasActiveAuth 
                    ? "Add a payer and authorization to complete setup"
                    : !hasActivePayer 
                    ? "Add at least one active payer"
                    : "Add at least one active authorization"}
                </p>
              </TooltipContent>
            </Tooltip>
          )}

          {currentMode === 'school_based' && isHibernated && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-400 ml-2">
                  <Snowflake className="w-3 h-3 mr-1" />
                  Insurance Paused
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>Insurance data is preserved. Click Insurance to restore.</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <p className="text-xs text-muted-foreground pl-1">
          {currentMode === 'school_based' 
            ? "No payer/authorization tracking required." 
            : "Payer + authorization tracking enabled."}
        </p>
      </div>

      {/* Hibernate Dialog (Insurance → School-Based) */}
      <InsuranceHibernateDialog
        studentId={studentId}
        open={showHibernateDialog}
        onOpenChange={setShowHibernateDialog}
        onComplete={handleHibernateComplete}
      />

      {/* Restore Dialog (School-Based → Insurance with existing data) */}
      <InsuranceRestoreDialog
        studentId={studentId}
        open={showRestoreDialog}
        onOpenChange={setShowRestoreDialog}
        onComplete={handleRestoreComplete}
        onRunWizard={handleRunWizardFromRestore}
      />

      {/* Insurance Setup Wizard */}
      {showInsuranceWizard && (
        <InsuranceSetupWizard
          studentId={studentId}
          open={showInsuranceWizard}
          onComplete={handleWizardComplete}
          onCancel={() => setShowInsuranceWizard(false)}
        />
      )}
    </>
  );
}
