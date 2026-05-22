import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Target, TrendingUp, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useDataStore } from '@/store/dataStore';
import { differenceInDays, startOfDay, subDays } from 'date-fns';

interface DataCompletenessWidgetProps {
  studentId: string;
  lookbackDays?: number;
}

interface BehaviorGap {
  behaviorId: string;
  behaviorName: string;
  lastDataDate: Date | null;
  daysSinceData: number | null;
  hasNoData: boolean;
}

interface SkillGap {
  targetId: string;
  targetName: string;
  lastSessionDate: Date | null;
  daysSinceSession: number | null;
  hasNoData: boolean;
  status: string;
}

export function DataCompletenessWidget({ studentId, lookbackDays = 7 }: DataCompletenessWidgetProps) {
  const students = useDataStore((s) => s.students);
  const sessions = useDataStore((s) => s.sessions);
  const frequencyEntries = useDataStore((s) => s.frequencyEntries);
  const durationEntries = useDataStore((s) => s.durationEntries);
  const intervalEntries = useDataStore((s) => s.intervalEntries);
  const abcEntries = useDataStore((s) => s.abcEntries);

  const student = students.find((s) => s.id === studentId);

  const { behaviorGaps, skillGaps, overallScore } = useMemo(() => {
    if (!student) return { behaviorGaps: [], skillGaps: [], overallScore: 0 };

    const today = startOfDay(new Date());
    const cutoff = subDays(today, lookbackDays);

    // --- Behavior gaps ---
    const bGaps: BehaviorGap[] = [];
    const activeBehaviors = student.behaviors.filter((b) => !b.isArchived && !b.isMastered);

    for (const behavior of activeBehaviors) {
      // Collect all data dates for this behavior
      const dates: Date[] = [];

      frequencyEntries
        .filter((e) => e.studentId === studentId && e.behaviorId === behavior.id && e.count > 0)
        .forEach((e) => dates.push(new Date(e.timestamp)));

      durationEntries
        .filter((e) => e.studentId === studentId && e.behaviorId === behavior.id && e.endTime)
        .forEach((e) => dates.push(new Date(e.startTime)));

      intervalEntries
        .filter((e) => e.studentId === studentId && e.behaviorId === behavior.id && !e.voided)
        .forEach((e) => dates.push(new Date(e.timestamp)));

      abcEntries
        .filter((e) => e.studentId === studentId && e.behaviorId === behavior.id)
        .forEach((e) => dates.push(new Date(e.timestamp)));

      // Also from saved sessions
      sessions.forEach((session) => {
        [...session.frequencyEntries, ...session.durationEntries, ...session.intervalEntries, ...session.abcEntries]
          .filter((e: any) => e.studentId === studentId && e.behaviorId === behavior.id)
          .forEach((e: any) => dates.push(new Date(e.timestamp || e.startTime || session.date)));
      });

      const recentDates = dates.filter((d) => d >= cutoff);
      const lastDate = dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;
      const daysSince = lastDate ? differenceInDays(today, lastDate) : null;

      bGaps.push({
        behaviorId: behavior.id,
        behaviorName: behavior.name,
        lastDataDate: lastDate,
        daysSinceData: daysSince,
        hasNoData: recentDates.length === 0,
      });
    }

    // --- Skill gaps ---
    const sGaps: SkillGap[] = [];
    const activeTargets = (student.skillTargets || []).filter(
      (t) => t.status !== 'mastered' && t.status !== 'generalization'
    );

    for (const target of activeTargets) {
      const targetSessions = (student.dttSessions || []).filter((s) => s.skillTargetId === target.id);
      const lastSession = targetSessions.length > 0
        ? targetSessions.reduce((a, b) =>
            new Date(a.date) > new Date(b.date) ? a : b
          )
        : null;

      const lastDate = lastSession ? new Date(lastSession.date) : null;
      const daysSince = lastDate ? differenceInDays(today, lastDate) : null;

      sGaps.push({
        targetId: target.id,
        targetName: target.name,
        lastSessionDate: lastDate,
        daysSinceSession: daysSince,
        hasNoData: daysSince === null || daysSince > lookbackDays,
        status: target.status,
      });
    }

    // Overall score: proportion of items with recent data
    const total = bGaps.length + sGaps.length;
    if (total === 0) return { behaviorGaps: bGaps, skillGaps: sGaps, overallScore: 100 };
    const withData = bGaps.filter((g) => !g.hasNoData).length + sGaps.filter((g) => !g.hasNoData).length;
    const score = Math.round((withData / total) * 100);

    return { behaviorGaps: bGaps, skillGaps: sGaps, overallScore: score };
  }, [student, sessions, frequencyEntries, durationEntries, intervalEntries, abcEntries, studentId, lookbackDays]);

  if (!student) return null;

  const missingBehaviors = behaviorGaps.filter((g) => g.hasNoData);
  const missingSkills = skillGaps.filter((g) => g.hasNoData);
  const staleItems = [...behaviorGaps, ...skillGaps].filter(
    (g) => !g.hasNoData && (g as any).daysSinceData !== null && (g as any).daysSinceData > 3
  );

  return (
    <Card className="text-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Data Completeness — Last {lookbackDays} Days
          <Badge
            variant="secondary"
            className={`ml-auto text-xs ${
              overallScore >= 80 ? 'bg-green-100 text-green-700' :
              overallScore >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {overallScore}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={overallScore} className="h-2" />

        {missingBehaviors.length === 0 && missingSkills.length === 0 ? (
          <div className="flex items-center gap-2 text-green-600 text-xs">
            <CheckCircle2 className="w-4 h-4" />
            All active targets have data in the last {lookbackDays} days
          </div>
        ) : (
          <>
            {missingBehaviors.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  Behaviors with no recent data ({missingBehaviors.length})
                </p>
                <div className="space-y-1">
                  {missingBehaviors.map((g) => (
                    <div key={g.behaviorId} className="flex items-center justify-between rounded-md bg-red-50 dark:bg-red-950/20 px-3 py-1.5">
                      <span className="text-xs">{g.behaviorName}</span>
                      <span className="text-xs text-muted-foreground">
                        {g.daysSinceData !== null ? `${g.daysSinceData}d ago` : 'No data ever'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {missingSkills.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Target className="w-3 h-3 text-red-500" />
                  Skill targets with no recent sessions ({missingSkills.length})
                </p>
                <div className="space-y-1">
                  {missingSkills.map((g) => (
                    <div key={g.targetId} className="flex items-center justify-between rounded-md bg-red-50 dark:bg-red-950/20 px-3 py-1.5">
                      <span className="text-xs">{g.targetName}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] capitalize">{g.status}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {g.daysSinceSession !== null ? `${g.daysSinceSession}d ago` : 'No sessions'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {staleItems.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-500" />
              Stale (3+ days since last data)
            </p>
            <div className="flex flex-wrap gap-1">
              {staleItems.map((g) => (
                <Badge key={(g as any).behaviorId || (g as any).targetId} variant="outline" className="text-[10px] border-amber-300 text-amber-700">
                  {(g as any).behaviorName || (g as any).targetName}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
