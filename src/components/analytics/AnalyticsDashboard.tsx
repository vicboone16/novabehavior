import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RevenueCards } from './RevenueCards';
import { UtilizationCharts } from './UtilizationCharts';
import { ProductivityTable } from './ProductivityTable';
import { OutcomesSummary } from './OutcomesSummary';

interface AnalyticsDashboardProps {
  dateRange: {
    from: Date;
    to: Date;
  };
  filters: {
    staffId: string | null;
    payerId: string | null;
  };
  view: 'overview' | 'revenue' | 'utilization' | 'productivity';
}

export function AnalyticsDashboard({ dateRange, filters, view }: AnalyticsDashboardProps) {
  if (view === 'overview') {
    return (
      <div className="space-y-6">
        <RevenueCards dateRange={dateRange} />
        <div className="grid gap-6 md:grid-cols-2">
          <UtilizationCharts dateRange={dateRange} compact />
          <OutcomesSummary dateRange={dateRange} compact />
        </div>
        <ProductivityTable dateRange={dateRange} limit={5} />
      </div>
    );
  }

  if (view === 'revenue') {
    return (
      <div className="space-y-6">
        <RevenueCards dateRange={dateRange} expanded />
      </div>
    );
  }

  if (view === 'utilization') {
    return (
      <div className="space-y-6">
        <UtilizationCharts dateRange={dateRange} />
      </div>
    );
  }

  if (view === 'productivity') {
    return (
      <div className="space-y-6">
        <ProductivityTable dateRange={dateRange} />
      </div>
    );
  }

  return null;
}
