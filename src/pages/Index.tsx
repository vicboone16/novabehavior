import { SessionTimer } from '@/components/SessionTimer';
import { DataSummary } from '@/components/DataSummary';
import { StudentSelector } from '@/components/StudentSelector';
import { BehaviorManager } from '@/components/BehaviorManager';
import { SessionDataReview } from '@/components/SessionDataReview';
import { BehaviorTrendCharts } from '@/components/BehaviorTrendCharts';
import { SessionReportGenerator } from '@/components/SessionReportGenerator';
import { BehaviorGoalsManager } from '@/components/BehaviorGoalsManager';
import { ScatterplotAnalysis } from '@/components/ScatterplotAnalysis';
import { DataExportManager } from '@/components/DataExportManager';
import { TrashRecovery } from '@/components/TrashRecovery';
import { LocalDataCloudSync } from '@/components/LocalDataCloudSync';
import { SessionWorkspace } from '@/components/session-workspace/SessionWorkspace';

const Index = () => {
  return (
    <div className="space-y-4">
      {/* Quick Tools Bar */}
      <div className="flex gap-1 md:gap-2 items-center overflow-x-auto scrollbar-hide pb-1">
        <LocalDataCloudSync />
        <TrashRecovery />
        <BehaviorGoalsManager />
        <ScatterplotAnalysis />
        <BehaviorTrendCharts />
        <DataExportManager />
        <SessionReportGenerator />
        <SessionDataReview />
        <BehaviorManager />
      </div>

      {/* Session Timer & Summary */}
      <div className="grid md:grid-cols-2 gap-3">
        <SessionTimer />
        <DataSummary />
      </div>

      {/* Student Selector */}
      <StudentSelector />

      {/* Unified Data Collection Workspace (Grid / List / Split + Focus) */}
      <SessionWorkspace />
    </div>
  );
};

export default Index;
