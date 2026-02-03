import { useState } from 'react';
import { Target, BookOpen, Lightbulb, BarChart3, Clock, FileText } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TargetsSubTab } from './TargetsSubTab';
import { CurriculumSubTab } from './CurriculumSubTab';
import { RecommendationsSubTab } from './RecommendationsSubTab';
import { SkillProgressReports } from './SkillProgressReports';
import { TOILog } from '@/components/toi/TOILog';
import { IEPGoalsManager } from '@/components/iep/IEPGoalsManager';
import { ServiceMinutesReconciliation } from '@/components/iep/ServiceMinutesReconciliation';
import { AccommodationsManager } from '@/components/iep/AccommodationsManager';
import { StudentAccommodationsPanel } from '@/components/iep-library';
import { useFundingMode } from '@/hooks/useFundingMode';
import type { SkillsSubTab } from '@/types/curriculum';

type ExtendedSkillsTab = SkillsSubTab | 'progress' | 'context' | 'iep';

interface SkillsTabContainerProps {
  studentId: string;
  studentName: string;
  isAdmin?: boolean;
}

export function SkillsTabContainer({ studentId, studentName, isAdmin = false }: SkillsTabContainerProps) {
  const [activeTab, setActiveTab] = useState<ExtendedSkillsTab>('targets');
  const { fundingMode, isLoading: fundingLoading } = useFundingMode(studentId);
  
  // Show IEP tab only for school-based students
  const showIEPTab = fundingMode === 'school_based';

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ExtendedSkillsTab)}>
        <TabsList className={`grid w-full max-w-2xl ${showIEPTab ? 'grid-cols-6' : 'grid-cols-5'}`}>
          <TabsTrigger value="targets" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Targets</span>
          </TabsTrigger>
          <TabsTrigger value="curriculum" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Curriculum</span>
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            <span className="hidden sm:inline">Recommend</span>
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Progress</span>
          </TabsTrigger>
          <TabsTrigger value="context" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Context</span>
          </TabsTrigger>
          {showIEPTab && (
            <TabsTrigger value="iep" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">IEP</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="targets" className="mt-4">
          <TargetsSubTab studentId={studentId} studentName={studentName} />
        </TabsContent>

        <TabsContent value="curriculum" className="mt-4">
          <CurriculumSubTab studentId={studentId} studentName={studentName} />
        </TabsContent>

        <TabsContent value="recommendations" className="mt-4">
          <RecommendationsSubTab studentId={studentId} studentName={studentName} />
        </TabsContent>

        <TabsContent value="progress" className="mt-4">
          <SkillProgressReports studentId={studentId} studentName={studentName} />
        </TabsContent>

        <TabsContent value="context" className="mt-4">
          <TOILog studentId={studentId} studentName={studentName} isAdmin={isAdmin} />
        </TabsContent>

        {showIEPTab && (
          <TabsContent value="iep" className="mt-4 space-y-6">
            <StudentAccommodationsPanel 
              studentId={studentId} 
              studentName={studentName}
              showRecommendations={true}
            />
            <IEPGoalsManager clientId={studentId} />
            <AccommodationsManager clientId={studentId} />
            <ServiceMinutesReconciliation clientId={studentId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
