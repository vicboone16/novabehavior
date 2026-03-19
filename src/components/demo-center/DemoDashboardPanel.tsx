/**
 * Demo Dashboard — shows realistic KPIs, alerts, and cross-app metrics for the demo tenant.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, Siren,
  FileText, CreditCard, BarChart3, Globe, Shield, Activity
} from 'lucide-react';
import type { DemoDashboardMetric, DemoAlert } from '@/hooks/useDemoEcosystem';

const CATEGORY_ICONS: Record<string, any> = {
  clinical: Activity,
  billing: CreditCard,
  cross_app: Globe,
  compliance: Shield,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-orange-500/15 text-orange-700 dark:text-orange-400',
  medium: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  low: 'bg-muted text-muted-foreground',
};

interface Props {
  metrics: DemoDashboardMetric[];
  alerts: DemoAlert[];
}

export function DemoDashboardPanel({ metrics, alerts }: Props) {
  const categories = ['clinical', 'billing', 'cross_app', 'compliance'];
  const activeAlerts = alerts.filter(a => a.status === 'active');

  return (
    <div className="space-y-4">
      {/* Metrics by category */}
      {categories.map(cat => {
        const catMetrics = metrics.filter(m => m.metric_category === cat);
        if (catMetrics.length === 0) return null;
        const Icon = CATEGORY_ICONS[cat] || BarChart3;
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold capitalize">{cat.replace('_', ' ')}</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {catMetrics.map(m => {
                const TrendIcon = m.trend_direction === 'up' ? TrendingUp : m.trend_direction === 'down' ? TrendingDown : Minus;
                const trendColor = m.trend_direction === 'up'
                  ? (m.metric_key.includes('denied') || m.metric_key.includes('blocked') || m.metric_key.includes('alert') ? 'text-destructive' : 'text-emerald-600')
                  : m.trend_direction === 'down'
                    ? (m.metric_key.includes('completion') || m.metric_key.includes('compliance') ? 'text-destructive' : 'text-emerald-600')
                    : 'text-muted-foreground';
                return (
                  <Card key={m.id}>
                    <CardContent className="py-3 px-4">
                      <p className="text-[10px] text-muted-foreground mb-1 truncate">{m.metric_label}</p>
                      <div className="flex items-end gap-2">
                        <span className="text-2xl font-bold">
                          {m.metric_key.includes('revenue') || m.metric_key.includes('amount')
                            ? `$${m.metric_value.toLocaleString()}`
                            : m.metric_key.includes('rate') || m.metric_key.includes('compliance') || m.metric_key.includes('completion') || m.metric_key.includes('engagement')
                              ? `${m.metric_value}%`
                              : m.metric_value}
                        </span>
                        {m.trend_pct !== 0 && (
                          <div className={`flex items-center gap-0.5 text-[10px] ${trendColor} mb-0.5`}>
                            <TrendIcon className="w-3 h-3" />
                            {Math.abs(m.trend_pct || 0)}%
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <h3 className="text-sm font-semibold">Active Alerts ({activeAlerts.length})</h3>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {activeAlerts.map(a => (
              <Card key={a.id} className={a.severity === 'critical' ? 'border-destructive/30' : ''}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start gap-2">
                    {a.severity === 'critical' ? (
                      <Siren className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{a.title}</span>
                        <Badge className={`${SEVERITY_COLORS[a.severity]} text-[9px]`}>
                          {a.severity}
                        </Badge>
                        {a.source_app && a.source_app !== 'clinician_entered' && (
                          <Badge variant="outline" className="text-[9px]">
                            from {a.source_app.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </div>
                      {a.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
