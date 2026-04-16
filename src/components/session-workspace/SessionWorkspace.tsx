import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDataStore } from '@/store/dataStore';
import { Student } from '@/types/behavior';
import { SessionStatsHeader } from './SessionStatsHeader';
import { GridLayout } from './layouts/GridLayout';
import { ListLayout } from './layouts/ListLayout';
import { SplitLayout } from './layouts/SplitLayout';
import { WorkspaceLayoutToggle, WorkspaceLayout } from './WorkspaceLayoutToggle';
import { ClientSwitcher } from './ClientSwitcher';
import { AllClientsOverview } from './AllClientsOverview';
import { QuickTallyBar } from './QuickTallyBar';
import { QuickAddFab } from './QuickAddFab';
import { EndAllSessionsButton } from '@/components/EndAllSessionsButton';
import { useWorkspacePreferences } from '@/hooks/useWorkspacePreferences';

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

function activeBehaviorsFor(student: Student) {
  return student.behaviors.filter((b) => !b.isArchived && !b.isMastered);
}

interface StudentPaneProps {
  student: Student;
  studentColor: string;
  layout: WorkspaceLayout;
  filter: FilterChip;
  withHeading?: boolean;
}

function StudentPane({ student, studentColor, layout, filter, withHeading }: StudentPaneProps) {
  const behaviors = activeBehaviorsFor(student);
  return (
    <div className="rounded-md">
      {withHeading && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: studentColor }}
            aria-hidden
          />
          <span className="font-semibold text-sm truncate">{student.name}</span>
        </div>
      )}
      {layout === 'grid' && (
        <GridLayout
          studentId={student.id}
          studentColor={studentColor}
          behaviors={behaviors}
          showBehaviors={filter !== 'skills'}
        />
      )}
      {layout === 'list' && (
        <ListLayout
          studentId={student.id}
          studentColor={studentColor}
          behaviors={behaviors}
          showBehaviors={filter !== 'skills'}
        />
      )}
      {layout === 'split' && (
        <SplitLayout
          studentId={student.id}
          studentColor={studentColor}
          behaviors={behaviors}
          showBehaviors={filter !== 'skills'}
          showSkills={filter !== 'behaviors'}
        />
      )}
      {layout !== 'split' && filter === 'skills' && (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Skill targets land in the unified workspace in the next phase.
        </div>
      )}
    </div>
  );
}

export function SessionWorkspace({ onClose }: SessionWorkspaceProps) {
  const students = useDataStore((s) => s.students);
  const selectedStudentIds = useDataStore((s) => s.selectedStudentIds);

  const activeStudentsRaw = useMemo(
    () => students.filter((s) => selectedStudentIds.includes(s.id)),
    [students, selectedStudentIds],
  );

  const { prefs, setLayout, setClientTabOrder, orderClientIds, getPinnedBehaviorIds } =
    useWorkspacePreferences();

  // Apply saved tab order to the active selection.
  const activeStudents = useMemo(() => {
    const orderedIds = orderClientIds(activeStudentsRaw.map((s) => s.id));
    const byId = new Map(activeStudentsRaw.map((s) => [s.id, s]));
    return orderedIds.map((id) => byId.get(id)!).filter(Boolean);
  }, [activeStudentsRaw, orderClientIds]);

  const [activeId, setActiveId] = useState<string>(() => activeStudents[0]?.id ?? 'all');
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<FilterChip>('all');

  const layout = prefs.layout;

  // Track viewport width (for split-screen pinning eligibility)
  const [isWide, setIsWide] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 900 : true,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setIsWide(window.innerWidth >= 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Drop pins for students no longer in the active selection.
  useEffect(() => {
    setPinnedIds((prev) => prev.filter((id) => activeStudents.some((s) => s.id === id)));
  }, [activeStudents]);

  const validActiveId = useMemo(() => {
    if (activeId === 'all') return 'all';
    return activeStudents.some((s) => s.id === activeId)
      ? activeId
      : activeStudents[0]?.id ?? 'all';
  }, [activeId, activeStudents]);

  const colorFor = (studentId: string) => {
    const idx = activeStudents.findIndex((s) => s.id === studentId);
    return STUDENT_COLORS[(idx >= 0 ? idx : 0) % STUDENT_COLORS.length];
  };

  const togglePin = (studentId: string) => {
    setPinnedIds((prev) => {
      if (prev.includes(studentId)) return prev.filter((id) => id !== studentId);
      if (prev.length >= 2) return prev;
      return [...prev, studentId];
    });
  };

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

  const showAll = validActiveId === 'all';
  const focusedStudent = !showAll
    ? activeStudents.find((s) => s.id === validActiveId) ?? null
    : null;

  const useDualPane = !showAll && isWide && pinnedIds.length === 2;

  // Quick tally bar uses the focused student (or first pinned in split mode)
  const tallyStudent = focusedStudent ?? (useDualPane
    ? activeStudents.find((s) => s.id === pinnedIds[0]) ?? null
    : null);

  return (
    <div className="rounded-lg border bg-background overflow-hidden relative">
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

      {activeStudents.length > 1 && (
        <ClientSwitcher
          students={activeStudents}
          activeId={validActiveId}
          onChange={setActiveId}
          colorFor={colorFor}
          pinnedIds={pinnedIds}
          onTogglePin={togglePin}
          allowPinning={isWide}
          onReorder={setClientTabOrder}
        />
      )}

      {/* Filter chips + layout toggle */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b">
        <div className="flex gap-1.5 flex-wrap">
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
        <div className="flex items-center gap-2">
          {useDualPane && (
            <Badge variant="secondary" className="text-[10px]">
              Split-screen · 2 clients
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">
            Phase D
          </Badge>
          <WorkspaceLayoutToggle value={layout} onChange={setLayout} />
        </div>
      </div>

      {/* Workspace body */}
      <div className="p-3 pb-24">
        {showAll && (
          <AllClientsOverview
            students={activeStudents}
            colorFor={colorFor}
            onFocusStudent={(id) => setActiveId(id)}
          />
        )}

        {!showAll && useDualPane && (
          <div className="grid grid-cols-2 gap-3">
            {pinnedIds.map((id) => {
              const s = activeStudents.find((x) => x.id === id);
              if (!s) return null;
              return (
                <StudentPane
                  key={s.id}
                  student={s}
                  studentColor={colorFor(s.id)}
                  layout={layout}
                  filter={filter}
                  withHeading
                />
              );
            })}
          </div>
        )}

        {!showAll && !useDualPane && focusedStudent && (
          <StudentPane
            student={focusedStudent}
            studentColor={colorFor(focusedStudent.id)}
            layout={layout}
            filter={filter}
          />
        )}
      </div>

      {/* Quick-tally bar (per active student, hidden on "All") */}
      {tallyStudent && (
        <QuickTallyBar
          studentId={tallyStudent.id}
          behaviors={activeBehaviorsFor(tallyStudent)}
          pinnedIds={getPinnedBehaviorIds(tallyStudent.id)}
          studentColor={colorFor(tallyStudent.id)}
        />
      )}

      {/* Quick-add FAB (uses focused student; null when on "All") */}
      <QuickAddFab studentId={focusedStudent?.id ?? null} />
    </div>
  );
}
