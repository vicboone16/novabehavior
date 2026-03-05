import { DollarSign, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function BillingOverviewWidget() {
  // Placeholder - will be wired to billing pipeline data
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-xs text-muted-foreground">Needs Review</p>
          <p className="text-xl font-bold text-foreground">—</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-xs text-muted-foreground">Ready for Claim</p>
          <p className="text-xl font-bold text-foreground">—</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-xs text-muted-foreground">Submitted</p>
          <p className="text-xl font-bold text-foreground">—</p>
        </div>
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-xs text-muted-foreground">Revenue MTD</p>
          <p className="text-xl font-bold text-foreground">—</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Billing pipeline data will appear here once sessions are finalized
      </p>
    </div>
  );
}
