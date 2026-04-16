import { useEffect, useState } from 'react';
import { Behavior } from '@/types/behavior';
import { GridLayout } from './GridLayout';

interface SplitLayoutProps {
  studentId: string;
  studentColor?: string;
  behaviors: Behavior[];
  showBehaviors?: boolean;
  showSkills?: boolean;
}

/**
 * Split layout: Skills (left) + Behaviors (right) on wide screens (>= 900px).
 * Below 900px it collapses to a stacked layout (skills first, behaviors second).
 *
 * Skill targets land in Phase B+ — for now the left column shows a placeholder
 * panel so the visual structure is complete and ready to receive `<SkillTargetCard>`s.
 */
export function SplitLayout({
  studentId,
  studentColor,
  behaviors,
  showBehaviors = true,
  showSkills = true,
}: SplitLayoutProps) {
  const [isWide, setIsWide] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 900 : true,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setIsWide(window.innerWidth >= 900);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const skillsPane = (
    <section className="rounded-md border bg-card/50 p-3 min-h-[200px]">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Skills
      </h3>
      {showSkills ? (
        <div className="text-sm text-muted-foreground py-6 text-center">
          Skill targets will appear here.
          <div className="text-xs mt-1">(Connected in the next phase)</div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground py-6 text-center">Skills hidden.</div>
      )}
    </section>
  );

  const behaviorsPane = (
    <section className="rounded-md border bg-card/50 p-3 min-h-[200px]">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Behaviors
      </h3>
      {showBehaviors ? (
        <GridLayout studentId={studentId} studentColor={studentColor} behaviors={behaviors} />
      ) : (
        <div className="text-sm text-muted-foreground py-6 text-center">Behaviors hidden.</div>
      )}
    </section>
  );

  if (!isWide) {
    return (
      <div className="flex flex-col gap-3">
        {skillsPane}
        {behaviorsPane}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {skillsPane}
      {behaviorsPane}
    </div>
  );
}
