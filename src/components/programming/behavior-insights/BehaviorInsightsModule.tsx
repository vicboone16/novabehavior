import { useState, useRef } from 'react';
import { BarChart3, Settings2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { InsightsControlBar } from './InsightsControlBar';
import { ActiveFilterChips } from './ActiveFilterChips';
import { SummaryCardsRow } from './SummaryCardsRow';
import { InsightBadgesRow } from './InsightBadges';
import { SmartGraphPanel } from './SmartGraphPanel';
import { IntelligentTable } from './IntelligentTable';
import { BehaviorBreakdownSummary } from './BehaviorBreakdownSummary';
import { ClinicalSummaryEditor } from './ClinicalSummaryEditor';
import { TeacherPrintPreview } from './TeacherPrintPreview';
import { ExportCenter } from './ExportCenter';
import { SummaryTemplateBuilder } from './SummaryTemplateBuilder';
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
  const [printOpen, setPrintOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

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
              Behavior Intelligence
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
            onPrint={() => setPrintOpen(true)}
            onExport={() => setExportOpen(true)}
          />

          {/* Active Filter Chips */}
          <ActiveFilterChips
            filters={filters}
            onChange={setFilters}
            behaviorCount={behaviors.length}
          />

          {/* Template Builder Trigger */}
          <div className="flex justify-end">
            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={() => setTemplateOpen(true)}>
              <Settings2 className="w-3 h-3" /> Summary Template
            </Button>
          </div>

          {/* Summary Cards — unified header with all KPIs */}
          <SummaryCardsRow
            {...kpis}
            behaviorCount={behaviors.length}
            avgPerDay={
              kpis.daysWithData > 0
                ? Math.round((kpis.totalIncidents / kpis.daysWithData) * 10) / 10
                : 0
            }
            avgPerSession={summaryRows.length > 0
              ? Math.round(summaryRows.reduce((s, r) => s + r.avgPerSession, 0) / summaryRows.length * 10) / 10
              : 0
            }
            abcEntries={kpis.abcEntries}
            intervalOccurrence={kpis.intervalOccurrence}
          />

          {/* Insight Badges */}
          <InsightBadgesRow badges={insights} />

          {/* Smart Graph — ref for export pipeline */}
          <div ref={chartRef}>
            <SmartGraphPanel
              chartData={chartData}
              behaviorNames={activeBehaviorNames}
              viewMode={filters.viewMode}
              recommendedView={recommendedView}
            />
          </div>

          {/* Intelligent Table — with expandable behavior rows */}
          <IntelligentTable rows={summaryRows} studentId={studentId} />

          {/* Behavior Breakdown Summary */}
          <BehaviorBreakdownSummary rows={summaryRows} studentName={studentName} />

          {/* Clinical Summary Editor */}
          <ClinicalSummaryEditor rows={summaryRows} studentName={studentName} />
        </CollapsibleContent>
      </Collapsible>

      {/* Modals / Drawers */}
      <ExportCenter
        open={exportOpen}
        onOpenChange={setExportOpen}
        summaryRows={summaryRows}
        studentName={studentName}
        studentId={studentId}
        dateRange={dateRange}
        chartRef={chartRef}
      />

      <TeacherPrintPreview
        open={printOpen}
        onOpenChange={setPrintOpen}
        studentName={studentName}
        dateRange={dateRange}
        rows={summaryRows}
      />

      <SummaryTemplateBuilder
        open={templateOpen}
        onOpenChange={setTemplateOpen}
      />
    </div>
  );
}
