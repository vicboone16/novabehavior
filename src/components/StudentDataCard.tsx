import { Student } from '@/types/behavior';
import { FrequencyTracker } from './FrequencyTracker';
import { DurationTracker } from './DurationTracker';
import { ABCTracker } from './ABCTracker';
import { IntervalTracker } from './IntervalTracker';
import { User } from 'lucide-react';

interface StudentDataCardProps {
  student: Student;
}

export function StudentDataCard({ student }: StudentDataCardProps) {
  const frequencyBehaviors = student.behaviors.filter(b => b.type === 'frequency');
  const durationBehaviors = student.behaviors.filter(b => b.type === 'duration');
  const abcBehaviors = student.behaviors.filter(b => b.type === 'abc');
  const intervalBehaviors = student.behaviors.filter(b => b.type === 'interval');

  const hasBehaviors = student.behaviors.length > 0;

  return (
    <div className="student-card">
      {/* Header */}
      <div 
        className="flex items-center gap-3 pb-3 mb-3 border-b border-border"
        style={{ borderBottomColor: `${student.color}30` }}
      >
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${student.color}20` }}
        >
          <User className="w-5 h-5" style={{ color: student.color }} />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{student.name}</h3>
          <p className="text-xs text-muted-foreground">
            {student.behaviors.length} behaviors configured
          </p>
        </div>
      </div>

      {!hasBehaviors && (
        <p className="text-center text-muted-foreground py-6 text-sm">
          No behaviors configured for this student.
          <br />
          Use "Manage Behaviors" to add some.
        </p>
      )}

      {/* Frequency Behaviors */}
      {frequencyBehaviors.length > 0 && (
        <div className="space-y-2 mb-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Frequency
          </h4>
          {frequencyBehaviors.map(behavior => (
            <FrequencyTracker 
              key={behavior.id}
              studentId={student.id}
              behavior={behavior}
              studentColor={student.color}
            />
          ))}
        </div>
      )}

      {/* Duration Behaviors */}
      {durationBehaviors.length > 0 && (
        <div className="space-y-2 mb-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Duration
          </h4>
          {durationBehaviors.map(behavior => (
            <DurationTracker 
              key={behavior.id}
              studentId={student.id}
              behavior={behavior}
              studentColor={student.color}
            />
          ))}
        </div>
      )}

      {/* Interval Behaviors */}
      {intervalBehaviors.length > 0 && (
        <div className="space-y-2 mb-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Interval Sampling
          </h4>
          {intervalBehaviors.map(behavior => (
            <IntervalTracker 
              key={behavior.id}
              studentId={student.id}
              behavior={behavior}
              studentColor={student.color}
            />
          ))}
        </div>
      )}

      {/* ABC Behaviors */}
      {abcBehaviors.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            ABC Data
          </h4>
          {abcBehaviors.map(behavior => (
            <ABCTracker 
              key={behavior.id}
              studentId={student.id}
              behavior={behavior}
              studentColor={student.color}
            />
          ))}
        </div>
      )}
    </div>
  );
}
