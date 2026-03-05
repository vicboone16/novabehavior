import { Activity } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function UtilizationWidget() {
  // Placeholder - will be wired to authorization utilization data
  return (
    <div className="space-y-3">
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Overall Auth Utilization</span>
            <span className="font-medium">—%</span>
          </div>
          <Progress value={0} className="h-2" />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-[10px] text-muted-foreground">On Track</p>
            <p className="text-lg font-bold text-emerald-500">—</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-[10px] text-muted-foreground">At Risk</p>
            <p className="text-lg font-bold text-orange-500">—</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-[10px] text-muted-foreground">Critical</p>
            <p className="text-lg font-bold text-destructive">—</p>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Authorization utilization data will populate from clinical tracking
      </p>
    </div>
  );
}
