import { AlertTriangle, Clock, AlertCircle, FileQuestion } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { InsuranceAlert } from '@/hooks/useInsuranceAlerts';
import { cn } from '@/lib/utils';

interface InsuranceAlertsListProps {
  alerts: InsuranceAlert[];
  onAlertAction?: (action: string, authorizationId?: string) => void;
  className?: string;
  compact?: boolean;
}

const ALERT_ICONS = {
  expiring: Clock,
  low_units: AlertTriangle,
  exhausted: AlertCircle,
  no_match: FileQuestion,
};

export function InsuranceAlertsList({
  alerts,
  onAlertAction,
  className,
  compact = false,
}: InsuranceAlertsListProps) {
  if (alerts.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {alerts.map(alert => {
        const Icon = ALERT_ICONS[alert.type];
        
        return (
          <Alert 
            key={alert.id}
            variant={alert.severity === 'error' ? 'destructive' : 'default'}
            className={cn(
              alert.severity === 'warning' && "border-amber-500 bg-amber-50 dark:bg-amber-950/30",
              compact && "py-2"
            )}
          >
            <Icon className={cn(
              "h-4 w-4",
              alert.severity === 'warning' && "text-amber-600"
            )} />
            <AlertTitle className={cn(
              compact && "text-sm",
              alert.severity === 'warning' && "text-amber-800 dark:text-amber-200"
            )}>
              {alert.title}
            </AlertTitle>
            <AlertDescription className={cn(
              "flex items-center justify-between gap-4",
              alert.severity === 'warning' && "text-amber-700 dark:text-amber-300"
            )}>
              <span className={compact ? "text-xs" : "text-sm"}>{alert.message}</span>
              {alert.ctaLabel && onAlertAction && (
                <Button 
                  size="sm" 
                  variant={alert.severity === 'error' ? 'destructive' : 'outline'}
                  className={cn(compact && "h-7 text-xs")}
                  onClick={() => onAlertAction(alert.ctaAction || '', alert.authorizationId)}
                >
                  {alert.ctaLabel}
                </Button>
              )}
            </AlertDescription>
          </Alert>
        );
      })}
    </div>
  );
}
