import { ClipboardList } from 'lucide-react';
import { StudentSelector } from '@/components/StudentSelector';
import { BehaviorManager } from '@/components/BehaviorManager';
import { CompactStudentCard } from '@/components/CompactStudentCard';
import { SessionTimer } from '@/components/SessionTimer';
import { DataSummary } from '@/components/DataSummary';
import { SyncedIntervalController } from '@/components/SyncedIntervalController';
import { SessionDataReview } from '@/components/SessionDataReview';
import { EnhancedABCPopup } from '@/components/EnhancedABCPopup';
import { BehaviorTrendCharts } from '@/components/BehaviorTrendCharts';
import { SessionReportGenerator } from '@/components/SessionReportGenerator';
import { BehaviorGoalsManager } from '@/components/BehaviorGoalsManager';
import { ScatterplotAnalysis } from '@/components/ScatterplotAnalysis';
import { NovelBehaviorRecorder } from '@/components/NovelBehaviorRecorder';
import { QuickABCCustomizer } from '@/components/QuickABCCustomizer';
import { SessionFocusMode } from '@/components/SessionFocusMode';
import { DataExportManager } from '@/components/DataExportManager';
import { TrashRecovery } from '@/components/TrashRecovery';
import { useDataStore } from '@/store/dataStore';
import { useDemoFilteredStudents } from '@/hooks/useDemoFilteredStudents';

const Index = () => {
  const { selectedStudentIds } = useDataStore();
  const students = useDemoFilteredStudents();
  const selectedStudents = students.filter(s => selectedStudentIds.includes(s.id) && !s.isArchived);

  // Check if any selected student has interval behaviors
  const hasIntervalBehaviors = selectedStudents.some(s => 
    s.behaviors.some(b => (b.methods || [b.type]).includes('interval'))
  );

  // Check if any selected student has ABC behaviors
  const hasABCBehaviors = selectedStudents.some(s => 
    s.behaviors.some(b => (b.methods || [b.type]).includes('abc'))
  );

  return (
    <div className="space-y-4">
      {/* Quick Tools Bar */}
      <div className="flex gap-1 md:gap-2 items-center overflow-x-auto scrollbar-hide pb-1">
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

      {/* Quick Actions Row */}
      <div className="flex flex-wrap gap-2 justify-center">
        <SessionFocusMode />
        <NovelBehaviorRecorder />
        {hasABCBehaviors && <EnhancedABCPopup />}
        {selectedStudentIds.length > 0 && <QuickABCCustomizer />}
      </div>

      {/* Synced Interval Controller */}
      {hasIntervalBehaviors && (
        <SyncedIntervalController />
      )}

      {/* Student Selector */}
      <StudentSelector />

      {/* Data Collection Grid */}
      {selectedStudents.length > 0 ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {selectedStudents.map(student => (
            <CompactStudentCard key={student.id} student={student} />
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <ClipboardList className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground mb-2">
            No Students Selected
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Add students above and select them to start collecting behavioral data. 
            Use "Manage Behaviors" to configure what data to track for each student.
          </p>
        </div>
      )}
    </div>
  );
};

export default Index;
