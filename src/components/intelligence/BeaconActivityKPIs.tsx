import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Gift, Siren, AlertTriangle, Target, BarChart3 } from 'lucide-react';
import { useBeaconTodayKPIs } from '@/hooks/useBeaconCoreData';
import { Loader2 } from 'lucide-react';

interface BeaconActivityKPIsProps {
  agencyId: string | null;
}

export function BeaconActivityKPIs({ agencyId }: BeaconActivityKPIsProps) {
  const { kpis, loading } = useBeaconTodayKPIs(agencyId);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Beacon KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className={kpis.pointsAwarded > 0 ? 'border-yellow-500/20' : ''}>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-xs">Points Awarded</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{kpis.pointsAwarded}</p>
          </CardContent>
        </Card>

        <Card className={kpis.pointsRedeemed > 0 ? 'border-pink-500/20' : ''}>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Gift className="w-4 h-4 text-pink-500" />
              <span className="text-xs">Redeemed Today</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{kpis.pointsRedeemed}</p>
            {kpis.rewardRedemptions > 0 && (
              <p className="text-[10px] text-muted-foreground">{kpis.rewardRedemptions} reward{kpis.rewardRedemptions !== 1 ? 's' : ''}</p>
            )}
          </CardContent>
        </Card>

        <Card className={kpis.maydayAlerts > 0 ? 'border-destructive/30' : ''}>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Siren className="w-4 h-4 text-destructive" />
              <span className="text-xs">Mayday Alerts</span>
            </div>
            <p className={`text-2xl font-bold ${kpis.maydayAlerts > 0 ? 'text-destructive' : 'text-foreground'}`}>
              {kpis.maydayAlerts}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="text-xs">Engagement</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {kpis.engagementPct != null ? `${kpis.engagementPct}%` : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Top Triggers */}
      {kpis.topTriggers.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Top Triggers Today
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0 pb-3 px-4">
            <div className="flex flex-wrap gap-2">
              {kpis.topTriggers.map((t, i) => (
                <Badge
                  key={t.trigger}
                  variant={i === 0 ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {t.trigger} ({t.count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
