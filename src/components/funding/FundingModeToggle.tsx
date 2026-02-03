import { useState } from 'react';
import { Building2, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ConfirmDialog } from '@/components/ui/alert-dialog-confirm';
import { InsuranceSetupWizard } from './InsuranceSetupWizard';
import { cn } from '@/lib/utils';

export type FundingMode = 'school_based' | 'insurance';

interface FundingModeToggleProps {
  studentId: string;
  currentMode: FundingMode;
  onModeChange: (mode: FundingMode) => void;
  hasActivePayer?: boolean;
  hasActiveAuth?: boolean;
  className?: string;
}

export function FundingModeToggle({
  studentId,
  currentMode,
  onModeChange,
  hasActivePayer = false,
  hasActiveAuth = false,
  className,
}: FundingModeToggleProps) {
  const [showSwitchToSchoolConfirm, setShowSwitchToSchoolConfirm] = useState(false);
  const [showInsuranceWizard, setShowInsuranceWizard] = useState(false);
  const [pendingMode, setPendingMode] = useState<FundingMode | null>(null);

  const isInsuranceReady = hasActivePayer && hasActiveAuth;

  const handleModeClick = (mode: FundingMode) => {
    if (mode === currentMode) return;

    if (mode === 'school_based') {
      // Switching to school-based: show confirmation
      setPendingMode(mode);
      setShowSwitchToSchoolConfirm(true);
    } else {
      // Switching to insurance: show setup wizard
      setPendingMode(mode);
      setShowInsuranceWizard(true);
    }
  };

  const handleConfirmSchoolBased = () => {
    if (pendingMode) {
      onModeChange(pendingMode);
    }
    setShowSwitchToSchoolConfirm(false);
    setPendingMode(null);
  };

  const handleInsuranceSetupComplete = () => {
    if (pendingMode) {
      onModeChange(pendingMode);
    }
    setShowInsuranceWizard(false);
    setPendingMode(null);
  };

  const handleInsuranceWizardCancel = () => {
    setShowInsuranceWizard(false);
    setPendingMode(null);
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
        </div>

        <p className="text-xs text-muted-foreground pl-1">
          {currentMode === 'school_based' 
            ? "No payer/authorization tracking required." 
            : "Payer + authorization tracking enabled."}
        </p>
      </div>

      {/* Switch to School-Based Confirmation */}
      <ConfirmDialog
        open={showSwitchToSchoolConfirm}
        onOpenChange={setShowSwitchToSchoolConfirm}
        title="Switch to School-Based?"
        description="Switching to School-Based will hide insurance authorization tracking for this client. Existing payer/authorization data will be preserved but inactive for school-based workflows."
        confirmLabel="Switch to School-Based"
        cancelLabel="Cancel"
        onConfirm={handleConfirmSchoolBased}
      />

      {/* Insurance Setup Wizard */}
      {showInsuranceWizard && (
        <InsuranceSetupWizard
          studentId={studentId}
          open={showInsuranceWizard}
          onComplete={handleInsuranceSetupComplete}
          onCancel={handleInsuranceWizardCancel}
        />
      )}
    </>
  );
}
