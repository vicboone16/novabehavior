import { useState } from 'react';
import { Target, BarChart3, Settings2, BookOpen, Lightbulb, ClipboardCheck, FileText, Clock } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TargetsSubTab } from './TargetsSubTab';
import { CurriculumSubTab } from './CurriculumSubTab';
import { RecommendationsSubTab } from './RecommendationsSubTab';
import { SkillProgressReports } from './SkillProgressReports';
import { ReviewQueue } from './ReviewQueue';
import { CriteriaSettingsPanel } from './CriteriaSettingsPanel';
import { PromptSetManager } from './PromptSetManager';
import { AutomationSettingsPanel } from './AutomationSettingsPanel';
import { TOILog } from '@/components/toi/TOILog';
import { IEPGoalsManager } from '@/components/iep/IEPGoalsManager';
import { ServiceMinutesReconciliation } from '@/components/iep/ServiceMinutesReconciliation';
import { AccommodationsManager } from '@/components/iep/AccommodationsManager';
import { StudentIEPSupportsView } from '@/components/iep-supports';
import { useFundingMode } from '@/hooks/useFundingMode';

// Primary tabs shown in the tab bar
type PrimaryTab = 'programs' | 'progress' | 'settings';
// Secondary tabs accessible from the "More" overflow
type SecondaryTab = 'curriculum' | 'recommendations' | 'review' | 'context' | 'iep';
type ActiveTab = PrimaryTab | SecondaryTab;

interface SkillsTabContainerProps {
  studentId: string;
  studentName: string;
  isAdmin?: boolean;
}

export function SkillsTabContainer({ studentId, studentName, isAdmin = false }: SkillsTabContainerProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('programs');
  const { fundingMode } = useFundingMode(studentId);

  const showIEPTab = fundingMode === 'school_based';

  const secondaryLabel: Record<SecondaryTab, string> = {
    curriculum: 'Curriculum Library',
    recommendations: 'AI Recommendations',
    review: 'Review Queue',
    context: 'Context Log',
    iep: 'IEP Goals',
  };

  const isSecondaryActive = (activeTab as string) in secondaryLabel;

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)}>
        <div className="flex items-center gap-2">
          <TabsList className="h-9 p-1">
            <TabsTrigger value="programs" className="flex items-center gap-1.5 text-xs px-3">
              <Target className="w-3.5 h-3.5" />
              Programs
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-1.5 text-xs px-3">
              <BarChart3 className="w-3.5 h-3.5" />
              Progress
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1.5 text-xs px-3">
              <Settings2 className="w-3.5 h-3.5" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* More overflow — secondary tabs */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={isSecondaryActive ? 'secondary' : 'ghost'}
                size="sm"
                className="h-9 text-xs gap-1 px-3"
              >
                More
                <span className="text-muted-foreground">▾</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setActiveTab('curriculum')}>
                <BookOpen className="w-4 h-4 mr-2" />
                Curriculum Library
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('recommendations')}>
                <Lightbulb className="w-4 h-4 mr-2" />
                AI Recommendations
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('review')}>
                <ClipboardCheck className="w-4 h-4 mr-2" />
                Review Queue
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActiveTab('context')}>
                <Clock className="w-4 h-4 mr-2" />
                Context Log
              </DropdownMenuItem>
              {showIEPTab && (
                <DropdownMenuItem onClick={() => setActiveTab('iep')}>
                  <FileText className="w-4 h-4 mr-2" />
                  IEP Goals
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Show active secondary tab label as a breadcrumb */}
          {isSecondaryActive && (
            <span className="text-xs text-muted-foreground">
              / {secondaryLabel[activeTab as SecondaryTab]}
            </span>
          )}
        </div>

        {/* Primary tab content */}
        <TabsContent value="programs" className="mt-4">
          <TargetsSubTab studentId={studentId} studentName={studentName} />
        </TabsContent>

        <TabsContent value="progress" className="mt-4">
          <SkillProgressReports studentId={studentId} studentName={studentName} />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <div className="space-y-6">
            <CriteriaSettingsPanel scope="student" scopeId={studentId} title="Mastery Criteria" />
            <PromptSetManager scope="student" scopeId={studentId} title="Prompt Levels" />
            <AutomationSettingsPanel scope="student" scopeId={studentId} title="Automation" />
          </div>
        </TabsContent>

        {/* Secondary tab content — shown when selected from More menu */}
        <TabsContent value="curriculum" className="mt-4">
          <CurriculumSubTab studentId={studentId} studentName={studentName} />
        </TabsContent>

        <TabsContent value="recommendations" className="mt-4">
          <RecommendationsSubTab studentId={studentId} studentName={studentName} />
        </TabsContent>

        <TabsContent value="review" className="mt-4">
          <ReviewQueue studentId={studentId} />
        </TabsContent>

        <TabsContent value="context" className="mt-4">
          <TOILog studentId={studentId} studentName={studentName} isAdmin={isAdmin} />
        </TabsContent>

        {showIEPTab && (
          <TabsContent value="iep" className="mt-4 space-y-6">
            <StudentIEPSupportsView
              studentId={studentId}
              studentName={studentName}
              isSchoolBased={true}
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
