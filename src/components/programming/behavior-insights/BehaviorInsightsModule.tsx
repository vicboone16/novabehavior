import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { InsightsControlBar } from './InsightsControlBar';
import { SummaryCardsRow } from './SummaryCardsRow';
import { InsightBadgesRow } from './InsightBadges';
import { SmartGraphPanel } from './SmartGraphPanel';
import { IntelligentTable } from './IntelligentTable';
import { BehaviorBreakdownSummary } from './BehaviorBreakdownSummary';
import { ExportCenter } from './ExportCenter';
import { useInsightsData } from './useInsightsData';
import { DEFAULT_FILTERS } from './types';
import type { InsightsFilters } from './types';

interface BehaviorInsightsModuleProps {
  studentId: string;
  studentName: string;
}

export function BehaviorInsightsModule({ studentId, studentName }: BehaviorInsightsModuleProps) {
  const [filters, setFilters] = useState<InsightsFilters>(DEFAULT_FILTERS);
  const [isOpen, setIsOpen] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);

  const {
    behaviors,
    summaryRows,
    kpis,
    insights,
    chartData,
    activeBehaviorNames,
    recommendedView,
    dateRange,
  } = useInsightsData(studentId, filters);

  return (
    <div className="space-y-3">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between h-auto py-2 px-3 hover:bg-muted/50">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <BarChart3 className="w-4 h-4 text-primary" />
              Behavior Insights & Reporting
            </span>
            <span className="text-[10px] text-muted-foreground">
              {isOpen ? 'Collapse' : 'Expand'}
            </span>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-3 mt-2">
          {/* Control Bar */}
          <InsightsControlBar
            filters={filters}
            onChange={setFilters}
            behaviors={behaviors.map(b => ({ id: b.id, name: b.name }))}
            onExport={() => setExportOpen(true)}
          />

          {/* Summary Cards */}
          <SummaryCardsRow {...kpis} />

          {/* Insight Badges */}
          <InsightBadgesRow badges={insights} />

          {/* Smart Graph */}
          <SmartGraphPanel
            chartData={chartData}
            behaviorNames={activeBehaviorNames}
            viewMode={filters.viewMode}
            recommendedView={recommendedView}
          />

          {/* Intelligent Table */}
          <IntelligentTable rows={summaryRows} />

          {/* Behavior Breakdown Summary */}
          <BehaviorBreakdownSummary rows={summaryRows} studentName={studentName} />
        </CollapsibleContent>
      </Collapsible>

      {/* Export Center */}
      <ExportCenter
        open={exportOpen}
        onOpenChange={setExportOpen}
        summaryRows={summaryRows}
        studentName={studentName}
        dateRange={dateRange}
      />
    </div>
  );
}
