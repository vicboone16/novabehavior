import { useState, useEffect } from 'react';
import { Target, Activity, Columns3, Loader2 } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { SkillsTabContainer } from '@/components/skills/SkillsTabContainer';
import { BehaviorsSuite } from './BehaviorsSuite';
import { BothModeView } from './BothModeView';
import { BehaviorInsightsModule } from './behavior-insights/BehaviorInsightsModule';
import { ProgrammingIntelligenceBanner } from './ProgrammingIntelligenceBanner';

export type ProgrammingMode = 'skills' | 'behaviors' | 'both';

interface ProgrammingModuleProps {
  studentId: string;
  studentName: string;
  isAdmin?: boolean;
  defaultMode?: ProgrammingMode;
}

/**
 * ProgrammingModule defers rendering its heavy children by one frame.
 * This prevents the "Maximum update depth exceeded" crash (React #185)
 * caused by dozens of bare useDataStore() selectors in the subtree
 * firing cascading re-renders during Zustand store hydration.
 */
export function ProgrammingModule({
  studentId,
  studentName,
  isAdmin = false,
  defaultMode = 'both'
}: ProgrammingModuleProps) {
  const [mode, setMode] = useState<ProgrammingMode>(defaultMode);
  const [ready, setReady] = useState(false);

  // Defer heavy subtree mount by one frame so the store settles first
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="space-y-3">
      {/* Programming Intelligence — ALWAYS visible across all modes */}
      {ready && <ProgrammingIntelligenceBanner studentId={studentId} />}

      {!ready ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Mode toggle — single location, top of module */}
          <div className="flex items-center justify-end">
            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={(v) => v && setMode(v as ProgrammingMode)}
              className="bg-muted rounded-lg p-0.5"
            >
              <ToggleGroupItem value="skills" className="gap-1 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm px-3 h-7">
                <Target className="w-3 h-3" />
                Skills
              </ToggleGroupItem>
              <ToggleGroupItem value="behaviors" className="gap-1 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm px-3 h-7">
                <Activity className="w-3 h-3" />
                Behaviors
              </ToggleGroupItem>
              <ToggleGroupItem value="both" className="gap-1 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm px-3 h-7">
                <Columns3 className="w-3 h-3" />
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

          {/* Behavior Intelligence — visible for behaviors and both modes */}
          {(mode === 'behaviors' || mode === 'both') && (
            <BehaviorInsightsModule studentId={studentId} studentName={studentName} />
          )}
        </>
      )}
    </div>
  );
}
