import { AlertTriangle, TrendingUp, TrendingDown, AlertCircle, Zap, Link2, Activity, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { InsightBadge, InsightBadgeType } from './types';

const BADGE_CONFIG: Record<InsightBadgeType, { icon: React.ElementType; variant: 'destructive' | 'secondary' | 'default'; color: string }> = {
  spike: { icon: Zap, variant: 'destructive', color: '' },
  worsening: { icon: TrendingUp, variant: 'destructive', color: '' },
  improving: { icon: TrendingDown, variant: 'default', color: 'bg-green-500/10 text-green-700 border-green-500/30' },
  missing_data: { icon: AlertCircle, variant: 'secondary', color: '' },
  escalation: { icon: AlertTriangle, variant: 'destructive', color: '' },
  co_occurring: { icon: Link2, variant: 'secondary', color: '' },
  high_variability: { icon: Activity, variant: 'secondary', color: '' },
  stable_reduction: { icon: Shield, variant: 'default', color: 'bg-green-500/10 text-green-700 border-green-500/30' },
  priority: { icon: AlertTriangle, variant: 'destructive', color: '' },
};

interface InsightBadgesProps {
  badges: InsightBadge[];
}

export function InsightBadgesRow({ badges }: InsightBadgesProps) {
  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b, i) => {
        const cfg = BADGE_CONFIG[b.type];
        const Icon = cfg.icon;
        return (
          <Badge
            key={i}
            variant={cfg.variant}
            className={`text-[10px] gap-1 ${cfg.color}`}
          >
            <Icon className="w-3 h-3" />
            {b.label}
          </Badge>
        );
      })}
    </div>
  );
}
