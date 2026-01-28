import { useMemo } from 'react';
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { 
  TrendingUp, TrendingDown, Minus, CheckCircle2, Target, Calendar, 
  BarChart3, Activity, AlertCircle, Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SkillTarget, DTTSession } from '@/types/behavior';

interface StudentSkillsOverviewProps {
  studentName: string;
  skillTargets: SkillTarget[];
  dttSessions: DTTSession[];
  studentColor: string;
}

interface TargetWithStats extends SkillTarget {
  sessions: DTTSession[];
  totalTrials: number;
  recentTrend: 'up' | 'flat' | 'down' | null;
  trendPercentage: number;
  lastSessionDate: Date | null;
  lastPercentCorrect: number | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  baseline: { label: 'Baseline', color: 'bg-slate-500' },
  acquisition: { label: 'Acquisition', color: 'bg-blue-500' },
  maintenance: { label: 'Maintenance', color: 'bg-green-500' },
  generalization: { label: 'Generalization', color: 'bg-purple-500' },
  mastered: { label: 'Mastered', color: 'bg-emerald-600' },
};

export function StudentSkillsOverview({ 
  studentName, 
  skillTargets, 
  dttSessions, 
  studentColor 
}: StudentSkillsOverviewProps) {
  // Calculate stats for each target
  const targetsWithStats: TargetWithStats[] = useMemo(() => {
    return skillTargets.map(target => {
      const sessions = dttSessions.filter(s => s.skillTargetId === target.id);
      const totalTrials = sessions.reduce((sum, s) => sum + s.trials.length, 0);
      
      // Calculate trend over last 5 days
      const last5Days = subDays(new Date(), 5);
      const recentSessions = sessions
        .filter(s => new Date(s.date) >= last5Days)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      let recentTrend: 'up' | 'flat' | 'down' | null = null;
      let trendPercentage = 0;
      
      if (recentSessions.length >= 2) {
        const halfIndex = Math.floor(recentSessions.length / 2);
        const firstHalf = recentSessions.slice(0, halfIndex);
        const secondHalf = recentSessions.slice(halfIndex);
        
        const avgFirst = firstHalf.reduce((s, sess) => s + sess.percentCorrect, 0) / firstHalf.length;
        const avgSecond = secondHalf.reduce((s, sess) => s + sess.percentCorrect, 0) / secondHalf.length;
        
        trendPercentage = avgSecond - avgFirst;
        
        if (trendPercentage >= 5) {
          recentTrend = 'up';
        } else if (trendPercentage <= -5) {
          recentTrend = 'down';
        } else {
          recentTrend = 'flat';
        }
      }
      
      const sortedSessions = [...sessions].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const lastSession = sortedSessions[0];
      
      return {
        ...target,
        sessions,
        totalTrials,
        recentTrend,
        trendPercentage,
        lastSessionDate: lastSession ? new Date(lastSession.date) : null,
        lastPercentCorrect: lastSession?.percentCorrect ?? null,
      };
    });
  }, [skillTargets, dttSessions]);

  // Group targets by trend
  const trendingUp = targetsWithStats.filter(t => t.recentTrend === 'up' && t.status !== 'mastered');
  const trendingFlat = targetsWithStats.filter(t => t.recentTrend === 'flat' && t.status !== 'mastered');
  const trendingDown = targetsWithStats.filter(t => t.recentTrend === 'down' && t.status !== 'mastered');
  const recentlyMastered = targetsWithStats.filter(t => t.status === 'mastered');
  const inBaseline = targetsWithStats.filter(t => t.status === 'baseline');
  const noData = targetsWithStats.filter(t => t.sessions.length === 0 && t.status !== 'mastered');

  // Summary statistics
  const summaryStats = useMemo(() => {
    const mastered = targetsWithStats.filter(t => t.status === 'mastered').length;
    const openTargets = targetsWithStats.filter(t => t.status !== 'mastered').length;
    const totalSessions = dttSessions.length;
    const totalTrials = dttSessions.reduce((sum, s) => sum + s.trials.length, 0);
    
    // Calculate avg trials to mastery (for mastered targets only)
    const masteredTargets = targetsWithStats.filter(t => t.status === 'mastered');
    const avgTrialsToMastery = masteredTargets.length > 0
      ? Math.round(masteredTargets.reduce((sum, t) => sum + t.totalTrials, 0) / masteredTargets.length)
      : 0;
    
    const percentMastered = targetsWithStats.length > 0
      ? Math.round((mastered / targetsWithStats.length) * 100)
      : 0;

    return {
      openTargets,
      mastered,
      totalSessions,
      totalTrials,
      avgTrialsToMastery,
      percentMastered,
    };
  }, [targetsWithStats, dttSessions]);

  // Today's data
  const trialsToday = useMemo(() => {
    const today = startOfDay(new Date());
    return dttSessions
      .filter(s => isWithinInterval(new Date(s.date), { start: today, end: endOfDay(new Date()) }))
      .reduce((sum, s) => sum + s.trials.length, 0);
  }, [dttSessions]);

  if (skillTargets.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground font-medium">No Skill Targets</p>
          <p className="text-xs text-muted-foreground mt-1">
            Add skill targets to start tracking progress
          </p>
        </CardContent>
      </Card>
    );
  }

  const TargetTable = ({ 
    targets, 
    showTrialsToday = false 
  }: { 
    targets: TargetWithStats[]; 
    showTrialsToday?: boolean;
  }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-xs">Target</TableHead>
          <TableHead className="text-xs">Date Opened</TableHead>
          <TableHead className="text-xs text-right">Trial Count</TableHead>
          {showTrialsToday && <TableHead className="text-xs text-right">Trials Today</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {targets.map(target => {
          const targetSessionsToday = target.sessions.filter(s => 
            isWithinInterval(new Date(s.date), { start: startOfDay(new Date()), end: endOfDay(new Date()) })
          );
          const trialsToday = targetSessionsToday.reduce((sum, s) => sum + s.trials.length, 0);
          
          return (
            <TableRow key={target.id} className="text-xs">
              <TableCell className="font-medium py-2">
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground">{target.domain || 'General'}:</span>
                  <span>{target.name}</span>
                </div>
              </TableCell>
              <TableCell className="py-2">
                {format(new Date(target.createdAt), 'M-d-yyyy')}
              </TableCell>
              <TableCell className="text-right py-2">{target.totalTrials}</TableCell>
              {showTrialsToday && (
                <TableCell className="text-right py-2">{trialsToday}</TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      {/* Daily Snapshot Header */}
      <Card style={{ borderColor: `${studentColor}40` }}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">
            Daily Snapshot of {studentName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Average Trial Count per Day</p>
              <p className="text-xl font-bold">
                {summaryStats.totalSessions > 0 
                  ? Math.round(summaryStats.totalTrials / Math.max(1, summaryStats.totalSessions))
                  : 'No data available'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Targets that Need Reopening</p>
              <p className="text-xl font-bold">
                {trendingDown.length > 0 ? trendingDown.length : 'No data available'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Highest Performing Targets</p>
              <p className="text-xl font-bold">
                {trendingUp.length > 0 ? trendingUp.length : 'No data available'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Current Targets in Baseline</p>
              <p className="text-xl font-bold">
                {inBaseline.length > 0 ? inBaseline.length : 'No data available'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Targets Trending Up */}
      {trendingUp.length > 0 && (
        <Card>
          <CardHeader className="py-3 flex flex-row items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-semibold">
              Targets Trending Up: Last 5 days
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <TargetTable targets={trendingUp} showTrialsToday />
          </CardContent>
        </Card>
      )}

      {/* Targets Trending Flat */}
      {trendingFlat.length > 0 && (
        <Card>
          <CardHeader className="py-3 flex flex-row items-center gap-2">
            <Minus className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">
              Targets Trending Flat: Last 5 days
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <TargetTable targets={trendingFlat} />
          </CardContent>
        </Card>
      )}

      {/* Targets Trending Down */}
      {trendingDown.length > 0 && (
        <Card>
          <CardHeader className="py-3 flex flex-row items-center gap-2">
            <TrendingDown className="w-5 h-5 text-destructive" />
            <CardTitle className="text-base font-semibold">
              Targets Trending Down: Last 5 days
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <TargetTable targets={trendingDown} />
          </CardContent>
        </Card>
      )}

      {/* Recently Mastered */}
      <Card>
        <CardHeader className="py-3 flex flex-row items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          <CardTitle className="text-base font-semibold">
            Recently Mastered Targets
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {recentlyMastered.length > 0 ? (
            <TargetTable targets={recentlyMastered} />
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No data available.</p>
          )}
        </CardContent>
      </Card>

      {/* Lowest Performing / No Data */}
      {noData.length > 0 && (
        <Card>
          <CardHeader className="py-3 flex flex-row items-center gap-2">
            <AlertCircle className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base font-semibold">
              Targets Without Data
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <TargetTable targets={noData} />
          </CardContent>
        </Card>
      )}

      {/* Student Statistics Summary */}
      <Card className="bg-muted/30">
        <CardHeader className="py-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Student Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Avg Trials to Mastery</p>
              <p className="text-lg font-bold">{summaryStats.avgTrialsToMastery}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Avg Teaching Days to Mastery</p>
              <p className="text-lg font-bold">
                {summaryStats.mastered > 0 
                  ? Math.round(summaryStats.totalSessions / Math.max(1, summaryStats.mastered))
                  : 0}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Open Targets</p>
              <p className="text-lg font-bold">{summaryStats.openTargets}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">% of Targets Mastered</p>
              <p className="text-lg font-bold">{summaryStats.percentMastered}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">% of Targets Failed in Maintenance</p>
              <p className="text-lg font-bold">0%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Failed in Maintenance */}
      <Card>
        <CardHeader className="py-3 flex flex-row items-center gap-2">
          <Activity className="w-5 h-5 text-muted-foreground" />
          <CardTitle className="text-base font-semibold">
            Failed In Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground py-4 text-center">No data available.</p>
        </CardContent>
      </Card>
    </div>
  );
}
