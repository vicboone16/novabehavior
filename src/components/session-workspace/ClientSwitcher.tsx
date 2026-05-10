import { Pin, PinOff, GripVertical } from 'lucide-react';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Student } from '@/types/behavior';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ClientSwitcherProps {
  students: Student[];
  /** Either a student id, or the literal string "all" */
  activeId: string;
  onChange: (next: string) => void;
  colorFor: (studentId: string) => string;
  /** ids currently pinned for split-screen (max 2). Empty when split is off. */
  pinnedIds?: string[];
  onTogglePin?: (studentId: string) => void;
  /** Whether the device is wide enough to support pinning (>= md). */
  allowPinning?: boolean;
  /** Drag-to-reorder support (optional). When provided, tabs become draggable. */
  onReorder?: (orderedIds: string[]) => void;
}

interface ClientTabProps {
  student: Student;
  active: boolean;
  isPinned: boolean;
  pinnedCount: number;
  color: string;
  allowPinning: boolean;
  onChange: (id: string) => void;
  onTogglePin?: (id: string) => void;
  draggable: boolean;
}

function ClientTab({
  student,
  active,
  isPinned,
  pinnedCount,
  color,
  allowPinning,
  onChange,
  onTogglePin,
  draggable,
}: ClientTabProps) {
  const sortable = useSortable({ id: student.id, disabled: !draggable });
  const style = draggable
    ? {
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
        opacity: sortable.isDragging ? 0.6 : 1,
      }
    : undefined;

  return (
    <div
      ref={draggable ? sortable.setNodeRef : undefined}
      style={style}
      className="flex items-center shrink-0"
    >
      {draggable && (
        <button
          type="button"
          {...sortable.attributes}
          {...sortable.listeners}
          className="px-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
          aria-label={`Reorder ${student.name}`}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        onClick={() => onChange(student.id)}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm border transition-colors shrink-0 ${
          allowPinning ? 'rounded-l-full' : 'rounded-full'
        } ${
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
        <span className="font-medium truncate max-w-[10rem]">{student.name}</span>
      </button>
      {allowPinning && onTogglePin && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onTogglePin(student.id)}
              disabled={!isPinned && pinnedCount >= 2}
              className={`px-2 py-1.5 text-sm border border-l-0 rounded-r-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                isPinned
                  ? 'bg-accent text-accent-foreground border-accent'
                  : 'bg-background hover:bg-muted border-border'
              }`}
              aria-label={isPinned ? 'Unpin from split view' : 'Pin to split view'}
              aria-pressed={isPinned}
            >
              {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {isPinned
              ? 'Unpin from split view'
              : pinnedCount >= 2
              ? 'Split view holds 2 clients'
              : 'Pin for side-by-side'}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export function ClientSwitcher({
  students,
  activeId,
  onChange,
  colorFor,
  pinnedIds = [],
  onTogglePin,
  allowPinning = false,
  onReorder,
}: ClientSwitcherProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (students.length === 0) return null;

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id || !onReorder) return;
    const oldIndex = students.findIndex((s) => s.id === active.id);
    const newIndex = students.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(students, oldIndex, newIndex).map((s) => s.id);
    onReorder(next);
  };

  const draggable = !!onReorder && students.length > 1;

  const tabs = students.map((s) => (
    <ClientTab
      key={s.id}
      student={s}
      active={activeId === s.id}
      isPinned={pinnedIds.includes(s.id)}
      pinnedCount={pinnedIds.length}
      color={colorFor(s.id)}
      allowPinning={allowPinning}
      onChange={onChange}
      onTogglePin={onTogglePin}
      draggable={draggable}
    />
  ));

  return (
    <TooltipProvider>
      <div className="flex gap-1.5 px-3 py-2 border-b overflow-x-auto items-center">
        {draggable ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={students.map((s) => s.id)} strategy={horizontalListSortingStrategy}>
              {tabs}
            </SortableContext>
          </DndContext>
        ) : (
          tabs
        )}

        {students.length > 1 && (
          <button
            onClick={() => onChange('all')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors shrink-0 ml-1 ${
              activeId === 'all'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-muted border-border'
            }`}
          >
            <span className="font-semibold">All</span>
            <span className="text-[10px] opacity-70">({students.length})</span>
          </button>
        )}
      </div>
    </TooltipProvider>
  );
}
