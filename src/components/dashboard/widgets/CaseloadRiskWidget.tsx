import { useAgencyContext } from '@/hooks/useAgencyContext';
import { useCICaseloadFeed } from '@/hooks/useClinicalIntelligence';
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

function getRiskColor(score: number) {
  if (score >= 75) return 'bg-destructive text-destructive-foreground';
  if (score >= 50) return 'bg-orange-500 text-white';
  if (score >= 25) return 'bg-yellow-500 text-white';
  return 'bg-emerald-500 text-white';
}

export function CaseloadRiskWidget() {
  const { currentAgency } = useAgencyContext();
  const { rows, loading } = useCICaseloadFeed(currentAgency?.id || null);

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground text-center py-4">No caseload data available</p>;

  const sorted = [...rows].sort((a, b) => b.risk_score - a.risk_score);

  return (
    <div className="space-y-2">
      {sorted.slice(0, 8).map(row => (
        <div key={row.client_id} className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2 min-w-0">
            <Badge className={`${getRiskColor(row.risk_score)} text-xs shrink-0`}>{row.risk_score}</Badge>
            <span className="text-sm truncate">{row.client_name}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {row.trend_score > 5 ? <TrendingUp className="w-3.5 h-3.5 text-destructive" /> :
             row.trend_score < -5 ? <TrendingDown className="w-3.5 h-3.5 text-emerald-500" /> :
             <Minus className="w-3.5 h-3.5 text-muted-foreground" />}
            {row.open_alert_count > 0 && (
              <Badge variant="destructive" className="text-[10px] px-1 h-4">{row.open_alert_count}</Badge>
            )}
          </div>
        </div>
      ))}
      {rows.length > 8 && <p className="text-xs text-muted-foreground text-center">+{rows.length - 8} more clients</p>}
    </div>
  );
}
