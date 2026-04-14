import { useState } from 'react';
import { Plus, BookOpen, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useStudentTargets, useDomains } from '@/hooks/useCurriculum';
import { useSkillPrograms } from '@/hooks/useSkillPrograms';
import { AddProgramDialog } from './AddProgramDialog';
import { ImportFromCurriculumDialog } from './ImportFromCurriculumDialog';
import { BulkImportDialog } from './BulkImportDialog';
import { ProgramHierarchyView } from './ProgramHierarchyView';
import { BopsProgramsSection } from '@/components/programming/BopsProgramsSection';
import type { SkillProgram } from '@/types/skillPrograms';

interface TargetsSubTabProps {
  studentId: string;
  studentName: string;
}

export function TargetsSubTab({ studentId, studentName }: TargetsSubTabProps) {
  const { targets, refetch: refetchTargets } = useStudentTargets(studentId);
  const { programs, loading: programsLoading, refetch: refetchPrograms } = useSkillPrograms(studentId);
  const { domains } = useDomains();

  const [showProgramDialog, setShowProgramDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [editingProgram, setEditingProgram] = useState<SkillProgram | null>(null);

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {programs.length === 0
            ? 'Organize skill targets into programs grouped by domain.'
            : `${programs.length} program${programs.length !== 1 ? 's' : ''}`}
        </p>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                Import
                <span className="text-muted-foreground">▾</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowImportDialog(true)}>
                <BookOpen className="w-4 h-4 mr-2" />
                From Curriculum Library
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowBulkImportDialog(true)}>
                <Download className="w-4 h-4 mr-2" />
                Bulk Import
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => { setEditingProgram(null); setShowProgramDialog(true); }}
          >
            <Plus className="w-3.5 h-3.5" />
            New Program
          </Button>
        </div>
      </div>

      {/* BOPS programs */}
      <BopsProgramsSection
        studentId={studentId}
        onAllocated={() => { refetchPrograms(); refetchTargets(); }}
      />

      {/* Program hierarchy */}
      {programsLoading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Loading programs…</div>
      ) : (
        <ProgramHierarchyView
          programs={programs}
          domains={domains}
          studentId={studentId}
          onRefetch={refetchPrograms}
          onEditProgram={(p) => {
            setEditingProgram(p);
            setShowProgramDialog(true);
          }}
        />
      )}

      <AddProgramDialog
        open={showProgramDialog}
        onOpenChange={(open) => {
          if (!open) { setShowProgramDialog(false); setEditingProgram(null); }
        }}
        studentId={studentId}
        editingProgram={editingProgram}
        onSuccess={refetchPrograms}
      />

      <ImportFromCurriculumDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        studentId={studentId}
        existingTargetSourceIds={targets.filter(t => t.source_id).map(t => t.source_id!)}
        onSuccess={refetchTargets}
      />

      <BulkImportDialog
        open={showBulkImportDialog}
        onOpenChange={setShowBulkImportDialog}
        studentId={studentId}
        existingTargetSourceIds={targets.filter(t => t.source_id).map(t => t.source_id!)}
        onSuccess={refetchTargets}
      />
    </div>
  );
}
