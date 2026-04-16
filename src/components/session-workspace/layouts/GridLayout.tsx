import { Behavior } from '@/types/behavior';
import { BehaviorCard } from '../cards/BehaviorCard';

interface GridLayoutProps {
  studentId: string;
  studentColor?: string;
  behaviors: Behavior[];
  /** filter chip choice */
  showBehaviors?: boolean;
  showSkills?: boolean;
}

export function GridLayout({
  studentId,
  studentColor,
  behaviors,
  showBehaviors = true,
}: GridLayoutProps) {
  if (!showBehaviors || behaviors.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        No active behaviors. Add behaviors from the Behavior Bank or Mobile Add menu.
      </div>
    );
  }

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {behaviors.map((b) => (
        <BehaviorCard
          key={b.id}
          studentId={studentId}
          behavior={b}
          studentColor={studentColor}
        />
      ))}
    </div>
  );
}
