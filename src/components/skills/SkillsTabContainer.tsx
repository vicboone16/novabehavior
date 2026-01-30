import { useState } from 'react';
import { Target, BookOpen, Lightbulb, BarChart3 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TargetsSubTab } from './TargetsSubTab';
import { CurriculumSubTab } from './CurriculumSubTab';
import { RecommendationsSubTab } from './RecommendationsSubTab';
import { SkillProgressReports } from './SkillProgressReports';
import type { SkillsSubTab } from '@/types/curriculum';

type ExtendedSkillsTab = SkillsSubTab | 'progress';

interface SkillsTabContainerProps {
  studentId: string;
  studentName: string;
}

export function SkillsTabContainer({ studentId, studentName }: SkillsTabContainerProps) {
  const [activeTab, setActiveTab] = useState<ExtendedSkillsTab>('targets');

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ExtendedSkillsTab)}>
        <TabsList className="grid w-full grid-cols-4 max-w-lg">
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
      </Tabs>
    </div>
  );
}
