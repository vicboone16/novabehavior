/**
 * StatusBadge — semantic status badges using design tokens.
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type StatusVariant =
  | 'demo'
  | 'active'
  | 'pending'
  | 'reviewed'
  | 'draft'
  | 'signed'
  | 'expiring'
  | 'archived'
  | 'denied';

const VARIANT_STYLES: Record<StatusVariant, string> = {
  demo: 'bg-demo text-demo-foreground border-transparent',
  active: 'bg-success-soft text-success border-transparent',
  pending: 'bg-warning-soft text-warning border-transparent',
  reviewed: 'bg-info-soft text-info border-transparent',
  draft: 'bg-muted text-muted-foreground border-transparent',
  signed: 'bg-success-soft text-success border-transparent',
  expiring: 'bg-error-soft text-destructive border-transparent',
  archived: 'bg-muted text-muted-foreground border-transparent',
  denied: 'bg-error-soft text-destructive border-transparent',
};

interface StatusBadgeProps {
  variant: StatusVariant;
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] font-bold uppercase tracking-wide px-2 py-0.5',
        VARIANT_STYLES[variant],
        className
      )}
    >
      {children}
    </Badge>
  );
}
