import { useState } from 'react';
import { Target, Activity, Columns3 } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SkillsTabContainer } from '@/components/skills/SkillsTabContainer';
import { BehaviorsSuite } from './BehaviorsSuite';
import { BothModeView } from './BothModeView';
import { BehaviorInsightsModule } from './behavior-insights/BehaviorInsightsModule';
import { BehaviorsSuite } from './BehaviorsSuite';
import { BothModeView } from './BothModeView';

export type ProgrammingMode = 'skills' | 'behaviors' | 'both';

interface ProgrammingModuleProps {
  studentId: string;
  studentName: string;
  isAdmin?: boolean;
  defaultMode?: ProgrammingMode;
}

export function ProgrammingModule({ 
  studentId, 
  studentName, 
  isAdmin = false,
  defaultMode = 'both' 
}: ProgrammingModuleProps) {
  const [mode, setMode] = useState<ProgrammingMode>(defaultMode);

  return (
    <div className="space-y-3">
      {/* Compact header with toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Programming</h2>
        <ToggleGroup 
          type="single" 
          value={mode} 
          onValueChange={(v) => v && setMode(v as ProgrammingMode)}
          className="bg-muted rounded-lg p-0.5"
        >
          <ToggleGroupItem 
            value="skills" 
            className="gap-1.5 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm px-3"
          >
            <Target className="w-3.5 h-3.5" />
            Skills
          </ToggleGroupItem>
          <ToggleGroupItem 
            value="behaviors" 
            className="gap-1.5 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm px-3"
          >
            <Activity className="w-3.5 h-3.5" />
            Behaviors
          </ToggleGroupItem>
          <ToggleGroupItem 
            value="both" 
            className="gap-1.5 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm px-3"
          >
            <Columns3 className="w-3.5 h-3.5" />
            Both
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Content */}
      {mode === 'skills' && (
        <SkillsTabContainer 
          studentId={studentId} 
          studentName={studentName} 
          isAdmin={isAdmin} 
        />
      )}

      {mode === 'behaviors' && (
        <BehaviorsSuite 
          studentId={studentId} 
          studentName={studentName} 
        />
      )}

      {mode === 'both' && (
        <BothModeView 
          studentId={studentId} 
          studentName={studentName} 
          isAdmin={isAdmin} 
        />
      )}

      {/* Behavior Insights & Reporting Module */}
      <BehaviorInsightsModule studentId={studentId} studentName={studentName} />
    </div>
  );
}
