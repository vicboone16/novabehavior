import { useState } from 'react';
import { Target, BookOpen, Lightbulb, BarChart3, Clock, FileText, Settings2, ClipboardCheck, Activity, Columns3 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
import type { SkillsSubTab } from '@/types/curriculum';
import type { ProgrammingMode } from '@/components/programming/ProgrammingModule';

type ExtendedSkillsTab = SkillsSubTab | 'progress' | 'context' | 'iep' | 'review' | 'settings';

interface SkillsTabContainerProps {
  studentId: string;
  studentName: string;
  isAdmin?: boolean;
  mode?: ProgrammingMode;
  onModeChange?: (mode: ProgrammingMode) => void;
}

export function SkillsTabContainer({ studentId, studentName, isAdmin = false, mode, onModeChange }: SkillsTabContainerProps) {
  const [activeTab, setActiveTab] = useState<ExtendedSkillsTab>('targets');
  const { fundingMode, isLoading: fundingLoading } = useFundingMode(studentId);
  
  const showIEPTab = fundingMode === 'school_based';

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ExtendedSkillsTab)}>
        <div className="flex items-center gap-2 w-full">
          {/* Programming label */}
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0">Programming</span>
          
          <TabsList className="flex flex-1 justify-center flex-wrap gap-1 h-auto p-1">
            <TabsTrigger value="targets" className="flex items-center gap-1 text-xs px-2">
              <Target className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Targets</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-1 text-xs px-2">
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Progress</span>
            </TabsTrigger>
            <TabsTrigger value="curriculum" className="flex items-center gap-1 text-xs px-2">
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Curriculum</span>
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center gap-1 text-xs px-2">
              <Lightbulb className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Recommend</span>
            </TabsTrigger>
            <TabsTrigger value="review" className="flex items-center gap-1 text-xs px-2">
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Review</span>
            </TabsTrigger>
            <TabsTrigger value="context" className="flex items-center gap-1 text-xs px-2">
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Context</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1 text-xs px-2">
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
            {showIEPTab && (
              <TabsTrigger value="iep" className="flex items-center gap-1 text-xs px-2">
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">IEP</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Skills / Behaviors / Both toggle on the right */}
          {mode && onModeChange && (
            <ToggleGroup 
              type="single" 
              value={mode} 
              onValueChange={(v) => v && onModeChange(v as ProgrammingMode)}
              className="bg-muted rounded-lg p-0.5 shrink-0"
            >
              <ToggleGroupItem value="skills" className="gap-1 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm px-2">
                <Target className="w-3 h-3" />
                Skills
              </ToggleGroupItem>
              <ToggleGroupItem value="behaviors" className="gap-1 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm px-2">
                <Activity className="w-3 h-3" />
                Behaviors
              </ToggleGroupItem>
              <ToggleGroupItem value="both" className="gap-1 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm px-2">
                <Columns3 className="w-3 h-3" />
                Both
              </ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>

        <TabsContent value="targets" className="mt-4">
          <TargetsSubTab studentId={studentId} studentName={studentName} />
        </TabsContent>

        <TabsContent value="progress" className="mt-4">
          <SkillProgressReports studentId={studentId} studentName={studentName} />
        </TabsContent>

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

        <TabsContent value="settings" className="mt-4">
          <div className="space-y-6">
            <CriteriaSettingsPanel scope="student" scopeId={studentId} title="Student Criteria Overrides" />
            <PromptSetManager scope="student" scopeId={studentId} title="Student Prompt Sets" />
            <AutomationSettingsPanel scope="student" scopeId={studentId} title="Student Automation" />
          </div>
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
