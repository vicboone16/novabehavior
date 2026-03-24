import { useState } from 'react';
import { Target, Activity, Plus, ChevronRight, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SkillsTabContainer } from '@/components/skills/SkillsTabContainer';
import { BehaviorsSuite } from './BehaviorsSuite';
import { BopsProgramsSection } from './BopsProgramsSection';
import { useDataStore } from '@/store/dataStore';
import { useStudentBopsPrograms } from '@/hooks/useBopsData';
import { cn } from '@/lib/utils';

type Selection = 
  | { type: 'skill'; id: string }
  | { type: 'behavior'; id: string }
  | null;

type DetailView = 'skills' | 'behaviors';

interface BothModeViewProps {
  studentId: string;
  studentName: string;
  isAdmin?: boolean;
}

export function BothModeView({ studentId, studentName, isAdmin = false }: BothModeViewProps) {
  const [detailView, setDetailView] = useState<DetailView>('skills');
  
  const { students } = useDataStore();
  const student = students.find(s => s.id === studentId);
  const { data: bopsPrograms } = useStudentBopsPrograms(studentId);
  const bopsCount = bopsPrograms?.length || 0;
  
  if (!student) return null;

  return (
    <div className="space-y-4 overflow-y-auto">
      {/* Combined Add Menu */}
      <div className="flex items-center justify-end">
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card 
          className={cn(
            "cursor-pointer transition-colors hover:bg-muted/50",
            detailView === 'skills' && "ring-2 ring-primary/50"
          )}
          onClick={() => setDetailView('skills')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Skill Targets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{(student.skillTargets || []).length + bopsCount}</p>
            <p className="text-xs text-muted-foreground">active targets</p>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-colors hover:bg-muted/50",
            detailView === 'behaviors' && "ring-2 ring-primary/50"
          )}
          onClick={() => setDetailView('behaviors')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Behaviors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{student.behaviors.length}</p>
            <p className="text-xs text-muted-foreground">tracked behaviors</p>
          </CardContent>
        </Card>

        {bopsCount > 0 && (
          <Card 
            className={cn(
              "cursor-pointer transition-colors hover:bg-muted/50 col-span-2",
            )}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                BOPS Programs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{bopsCount}</p>
              <p className="text-xs text-muted-foreground">active BOPS programs</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* BOPS Programs Section */}
      <BopsProgramsSection studentId={studentId} />

      {/* Detail View */}
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
