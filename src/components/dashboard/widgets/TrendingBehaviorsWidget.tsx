import { useAgencyContext } from '@/hooks/useAgencyContext';
import { useCICaseloadFeed } from '@/hooks/useClinicalIntelligence';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function TrendingBehaviorsWidget() {
  const { currentAgency } = useAgencyContext();
  const { rows, loading } = useCICaseloadFeed(currentAgency?.id || null);

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

  const worsening = rows.filter(r => r.trend_score > 5).sort((a, b) => b.trend_score - a.trend_score);
  const improving = rows.filter(r => r.trend_score < -5).sort((a, b) => a.trend_score - b.trend_score);

  if (worsening.length === 0 && improving.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">All clients are stable</p>;
  }

  return (
    <div className="space-y-4">
      {worsening.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-destructive" />
            <span className="text-xs font-semibold text-destructive uppercase tracking-wide">Trending Up (Worsening)</span>
          </div>
          <div className="space-y-1.5">
            {worsening.slice(0, 5).map(r => (
              <div key={r.client_id} className="flex items-center justify-between text-sm p-1.5 rounded hover:bg-destructive/5">
                <span className="truncate">{r.client_name}</span>
                <Badge variant="outline" className="text-destructive border-destructive/30 text-xs">+{r.trend_score.toFixed(0)}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
      {improving.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Trending Down (Improving)</span>
          </div>
          <div className="space-y-1.5">
            {improving.slice(0, 5).map(r => (
              <div key={r.client_id} className="flex items-center justify-between text-sm p-1.5 rounded hover:bg-emerald-500/5">
                <span className="truncate">{r.client_name}</span>
                <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 text-xs">{r.trend_score.toFixed(0)}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
