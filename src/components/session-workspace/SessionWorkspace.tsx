import { useMemo, useState } from 'react';
import { ArrowLeft, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDataStore } from '@/store/dataStore';
import { SessionStatsHeader } from './SessionStatsHeader';
import { GridLayout } from './layouts/GridLayout';
import { EndAllSessionsButton } from '@/components/EndAllSessionsButton';

type FilterChip = 'all' | 'behaviors' | 'skills';

interface SessionWorkspaceProps {
  /** Optional close handler when embedded as an overlay/modal */
  onClose?: () => void;
}

const STUDENT_COLORS = [
  'hsl(220 80% 55%)',
  'hsl(160 70% 45%)',
  'hsl(280 70% 55%)',
  'hsl(20 85% 55%)',
  'hsl(340 75% 55%)',
  'hsl(50 85% 50%)',
];

export function SessionWorkspace({ onClose }: SessionWorkspaceProps) {
  const students = useDataStore((s) => s.students);
  const selectedStudentIds = useDataStore((s) => s.selectedStudentIds);

  const activeStudents = useMemo(
    () => students.filter((s) => selectedStudentIds.includes(s.id)),
    [students, selectedStudentIds],
  );

  const [activeStudentId, setActiveStudentId] = useState<string | null>(
    activeStudents[0]?.id ?? null,
  );
  const [filter, setFilter] = useState<FilterChip>('all');

  // Keep activeStudentId valid as selection changes
  const activeStudent =
    activeStudents.find((s) => s.id === activeStudentId) ?? activeStudents[0] ?? null;

  const studentColor = useMemo(() => {
    if (!activeStudent) return STUDENT_COLORS[0];
    const idx = activeStudents.findIndex((s) => s.id === activeStudent.id);
    return STUDENT_COLORS[idx % STUDENT_COLORS.length];
  }, [activeStudent, activeStudents]);

  const behaviors = useMemo(() => {
    if (!activeStudent) return [];
    return activeStudent.behaviors.filter((b) => !b.isArchived && !b.isMastered);
  }, [activeStudent]);

  if (activeStudents.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <LayoutGrid className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
        <h3 className="text-base font-semibold mb-1">No active session</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select one or more students to start collecting data in the unified workspace.
        </p>
        {onClose && (
          <Button variant="outline" size="sm" onClick={onClose}>
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-background overflow-hidden">
      <SessionStatsHeader
        studentIds={activeStudents.map((s) => s.id)}
        endAction={
          <div className="flex items-center gap-2">
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} className="gap-1">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Classic</span>
              </Button>
            )}
            <EndAllSessionsButton />
          </div>
        }
      />

      {/* Client switcher (only when more than one student) */}
      {activeStudents.length > 1 && (
        <div className="flex gap-1.5 px-3 py-2 border-b overflow-x-auto">
          {activeStudents.map((s, idx) => {
            const color = STUDENT_COLORS[idx % STUDENT_COLORS.length];
            const active = s.id === activeStudent?.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveStudentId(s.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors shrink-0 ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted border-border'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
                <span className="font-medium truncate max-w-[10rem]">{s.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Filter chips */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b">
        <div className="flex gap-1.5">
          {(['all', 'behaviors', 'skills'] as FilterChip[]).map((chip) => (
            <button
              key={chip}
              onClick={() => setFilter(chip)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === chip
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {chip[0].toUpperCase() + chip.slice(1)}
            </button>
          ))}
        </div>
        <Badge variant="outline" className="text-[10px]">
          Phase A · Grid
        </Badge>
      </div>

      {/* Workspace body */}
      <div className="p-3">
        {activeStudent && (
          <>
            {filter !== 'skills' && (
              <GridLayout
                studentId={activeStudent.id}
                studentColor={studentColor}
                behaviors={behaviors}
              />
            )}
            {filter === 'skills' && (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Skill targets land in the unified workspace in Phase B. Use the Skills tab for
                now.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
