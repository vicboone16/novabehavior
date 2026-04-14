import { Target, Activity } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { SkillsTabContainer } from '@/components/skills/SkillsTabContainer';
import { BehaviorsSuite } from './BehaviorsSuite';

interface BothModeViewProps {
  studentId: string;
  studentName: string;
  isAdmin?: boolean;
}

export function BothModeView({ studentId, studentName, isAdmin = false }: BothModeViewProps) {
  return (
    <div className="space-y-6">
      {/* Skills section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Skills</h3>
          <Separator className="flex-1" />
        </div>
        <SkillsTabContainer
          studentId={studentId}
          studentName={studentName}
          isAdmin={isAdmin}
        />
      </div>

      {/* Behaviors section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Behaviors</h3>
          <Separator className="flex-1" />
        </div>
        <BehaviorsSuite
          studentId={studentId}
          studentName={studentName}
        />
      </div>
    </div>
  );
}
