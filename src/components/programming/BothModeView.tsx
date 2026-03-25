import { useState } from 'react';
import { Target, Activity, Plus, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SkillsTabContainer } from '@/components/skills/SkillsTabContainer';
import { BehaviorsSuite } from './BehaviorsSuite';
import { ProgrammingIntelligenceBanner } from './ProgrammingIntelligenceBanner';
import { useDataStore } from '@/store/dataStore';
import { useShallow } from 'zustand/react/shallow';
import { useStudentBopsPrograms } from '@/hooks/useBopsData';
import { cn } from '@/lib/utils';

type DetailView = 'skills' | 'behaviors';

interface BothModeViewProps {
  studentId: string;
  studentName: string;
  isAdmin?: boolean;
}

export function BothModeView({ studentId, studentName, isAdmin = false }: BothModeViewProps) {
  const [detailView, setDetailView] = useState<DetailView>('skills');

  const students = useDataStore(useShallow((state) => state.students));
  const student = students.find(s => s.id === studentId);
  const { data: bopsPrograms } = useStudentBopsPrograms(studentId);
  const bopsCount = bopsPrograms?.length || 0;

  if (!student) return null;

  const skillCount = (student.skillTargets || []).length + bopsCount;
  const behaviorCount = student.behaviors.length;

  return (
    <div className="space-y-3 overflow-y-auto">
      {/* Unified Intelligence Banner */}
      <ProgrammingIntelligenceBanner studentId={studentId} />

      {/* Compact summary bar + view toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDetailView('skills')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              detailView === 'skills'
                ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <Target className="w-4 h-4" />
            <span>{skillCount} Targets</span>
          </button>
          <button
            onClick={() => setDetailView('behaviors')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              detailView === 'behaviors'
                ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                : 'text-muted-foreground hover:bg-muted'
            )}
          >
            <Activity className="w-4 h-4" />
            <span>{behaviorCount} Behaviors</span>
          </button>
          {bopsCount > 0 && (
            <Badge variant="outline" className="text-xs gap-1">
              <Shield className="w-3 h-3" />
              {bopsCount} BOPS
            </Badge>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setDetailView('skills')}>
              <Target className="w-4 h-4 mr-2" />
              View Skill Targets
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDetailView('behaviors')}>
              <Activity className="w-4 h-4 mr-2" />
              View Behaviors
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {detailView === 'skills' ? (
        <SkillsTabContainer
          studentId={studentId}
          studentName={studentName}
          isAdmin={isAdmin}
        />
      ) : (
        <BehaviorsSuite
          studentId={studentId}
          studentName={studentName}
        />
      )}
    </div>
  );
}
