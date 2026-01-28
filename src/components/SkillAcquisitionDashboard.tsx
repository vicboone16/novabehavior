import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Target, TrendingUp, Download, BarChart3, CheckCircle2, 
  Clock, Calendar, Filter, FileText, ChevronDown, Plus, History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { useDataStore } from '@/store/dataStore';
import { SkillTarget, DTTSession, Student } from '@/types/behavior';
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { SkillProgressCharts } from './SkillProgressCharts';
import { SkillAcquisitionExport } from './SkillAcquisitionExport';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  baseline: { label: 'Baseline', color: 'bg-slate-500' },
  acquisition: { label: 'Acquisition', color: 'bg-blue-500' },
  maintenance: { label: 'Maintenance', color: 'bg-green-500' },
  generalization: { label: 'Generalization', color: 'bg-purple-500' },
  mastered: { label: 'Mastered', color: 'bg-emerald-600' },
};

const METHOD_LABELS: Record<string, string> = {
  dtt: 'DTT',
  net: 'NET',
  task_analysis: 'Task Analysis',
  probe: 'Probe',
};

interface DateRange {
  label: string;
  start: Date;
  end: Date;
}

export function SkillAcquisitionDashboard() {
  const navigate = useNavigate();
  const { students, selectedStudentIds } = useDataStore();
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');
  const [showExport, setShowExport] = useState(false);
  const [expandedTargets, setExpandedTargets] = useState<Set<string>>(new Set());

  // Get relevant students
  const relevantStudents = useMemo(() => {
    if (selectedStudentId === 'all') {
      return students.filter(s => 
        !s.isArchived && 
        (selectedStudentIds.length === 0 || selectedStudentIds.includes(s.id))
      );
    }
    return students.filter(s => s.id === selectedStudentId && !s.isArchived);
  }, [students, selectedStudentId, selectedStudentIds]);

  // Get all skill targets from relevant students
  const allTargets = useMemo(() => {
    return relevantStudents.flatMap(student => 
      (student.skillTargets || []).map(target => ({
        ...target,
        studentName: student.name,
        studentColor: student.color,
        sessions: (student.dttSessions || []).filter(s => s.skillTargetId === target.id),
      }))
    );
  }, [relevantStudents]);

  // Filter targets by status
  const filteredTargets = useMemo(() => {
    if (selectedStatus === 'all') return allTargets;
    return allTargets.filter(t => t.status === selectedStatus);
  }, [allTargets, selectedStatus]);

  // Date range for filtering sessions
  const dateRangeObj = useMemo((): DateRange => {
    const days = parseInt(dateRange);
    return {
      label: `Last ${days} days`,
      start: subDays(new Date(), days),
      end: new Date(),
    };
  }, [dateRange]);

  // Filter sessions by date range
  const getSessionsInRange = (sessions: DTTSession[]) => {
    return sessions.filter(s => 
      isWithinInterval(new Date(s.date), {
        start: startOfDay(dateRangeObj.start),
        end: endOfDay(dateRangeObj.end),
      })
    );
  };

  // Summary statistics
  const summaryStats = useMemo(() => {
    const statusCounts = {
      baseline: 0,
      acquisition: 0,
      maintenance: 0,
      generalization: 0,
      mastered: 0,
    };

    allTargets.forEach(t => {
      if (statusCounts[t.status as keyof typeof statusCounts] !== undefined) {
        statusCounts[t.status as keyof typeof statusCounts]++;
      }
    });

    const totalSessions = allTargets.reduce((sum, t) => sum + t.sessions.length, 0);
    const avgCorrect = allTargets.length > 0 
      ? Math.round(
          allTargets.reduce((sum, t) => {
            const sessions = t.sessions;
            if (sessions.length === 0) return sum;
            return sum + sessions.reduce((s, sess) => s + sess.percentCorrect, 0) / sessions.length;
          }, 0) / allTargets.filter(t => t.sessions.length > 0).length
        ) || 0
      : 0;

    return {
      total: allTargets.length,
      ...statusCounts,
      totalSessions,
      avgCorrect,
    };
  }, [allTargets]);

  const toggleTargetExpanded = (targetId: string) => {
    setExpandedTargets(prev => {
      const next = new Set(prev);
      if (next.has(targetId)) {
        next.delete(targetId);
      } else {
        next.add(targetId);
      }
      return next;
    });
  };

  const getRecentTrend = (sessions: DTTSession[]) => {
    if (sessions.length < 2) return null;
    const sorted = [...sessions].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const recent = sorted.slice(0, 3);
    const avgRecent = recent.reduce((s, sess) => s + sess.percentCorrect, 0) / recent.length;
    const older = sorted.slice(3, 6);
    if (older.length === 0) return null;
    const avgOlder = older.reduce((s, sess) => s + sess.percentCorrect, 0) / older.length;
    return avgRecent - avgOlder;
  };

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Skill Acquisition Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            Track DTT, NET, and skill mastery progress
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select student" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {students.filter(s => !s.isArchived).map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={() => setShowExport(true)}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>

          {selectedStudentId !== 'all' && (
            <Button 
              variant="outline" 
              onClick={() => navigate(`/students/${selectedStudentId}`)}
            >
              <History className="w-4 h-4 mr-2" />
              Add Historical Data
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{summaryStats.total}</div>
            <div className="text-xs text-muted-foreground">Total Targets</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-primary">{summaryStats.acquisition}</div>
            <div className="text-xs text-muted-foreground">In Acquisition</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-accent-foreground">{summaryStats.mastered}</div>
            <div className="text-xs text-muted-foreground">Mastered</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{summaryStats.totalSessions}</div>
            <div className="text-xs text-muted-foreground">Total Sessions</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{summaryStats.avgCorrect}%</div>
            <div className="text-xs text-muted-foreground">Avg. Correct</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-secondary-foreground">{summaryStats.generalization}</div>
            <div className="text-xs text-muted-foreground">Generalizing</div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Charts */}
      <SkillProgressCharts 
        targets={filteredTargets} 
        dateRange={dateRangeObj}
      />

      {/* Targets List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skill Targets ({filteredTargets.length})</CardTitle>
          <CardDescription>
            Click a target to view detailed session history
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredTargets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No skill targets match the current filters</p>
            </div>
          ) : (
            filteredTargets.map(target => {
              const sessionsInRange = getSessionsInRange(target.sessions);
              const lastSession = sessionsInRange[sessionsInRange.length - 1];
              const trend = getRecentTrend(target.sessions);
              const isExpanded = expandedTargets.has(target.id);

              return (
                <Collapsible 
                  key={target.id}
                  open={isExpanded}
                  onOpenChange={() => toggleTargetExpanded(target.id)}
                >
                  <div className="border rounded-lg overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div 
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: target.studentColor }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm truncate">
                                {target.name}
                              </span>
                              <Badge className={`${STATUS_LABELS[target.status]?.color || 'bg-gray-500'} text-white text-xs`}>
                                {STATUS_LABELS[target.status]?.label}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {METHOD_LABELS[target.method]}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {target.studentName} 
                              {target.domain && ` • ${target.domain}`}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          {sessionsInRange.length > 0 && (
                            <div className="text-right">
                              <div className="text-sm font-medium">
                                {lastSession?.percentCorrect}%
                                {trend !== null && (
                                  <span className={`ml-1 text-xs ${trend >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                                    {trend >= 0 ? '↑' : '↓'}{Math.abs(Math.round(trend))}%
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {sessionsInRange.length} sessions
                              </div>
                            </div>
                          )}
                          <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <Separator />
                      <div className="p-3 bg-muted/30 space-y-3">
                        {/* Mastery criteria */}
                        {target.masteryCriteria && (
                          <div className="flex items-center gap-2 text-xs">
                            <CheckCircle2 className="w-3 h-3 text-primary" />
                            <span className="text-muted-foreground">Mastery:</span>
                            <span>
                              {target.masteryCriteria.percentCorrect}% correct for {target.masteryCriteria.consecutiveSessions} consecutive sessions
                            </span>
                          </div>
                        )}

                        {/* Operational definition */}
                        {target.operationalDefinition && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">Definition: </span>
                            <span>{target.operationalDefinition}</span>
                          </div>
                        )}

                        {/* Session history */}
                        <div className="space-y-2">
                          <div className="text-xs font-medium text-muted-foreground">
                            Recent Sessions
                          </div>
                          {sessionsInRange.length === 0 ? (
                            <div className="text-xs text-muted-foreground italic">
                              No sessions in selected date range
                            </div>
                          ) : (
                            <div className="grid gap-2">
                              {sessionsInRange.slice(-5).reverse().map(session => (
                                <div 
                                  key={session.id}
                                  className="flex items-center justify-between p-2 bg-background rounded border text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-3 h-3 text-muted-foreground" />
                                    <span>{format(new Date(session.date), 'MMM d, h:mm a')}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-muted-foreground">
                                      {session.trials.length} trials
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <Progress 
                                        value={session.percentCorrect} 
                                        className="w-16 h-2"
                                      />
                                      <span className="font-medium w-10 text-right">
                                        {session.percentCorrect}%
                                      </span>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {session.percentIndependent}% ind.
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Export Dialog */}
      <SkillAcquisitionExport 
        open={showExport} 
        onOpenChange={setShowExport}
        targets={filteredTargets}
        dateRange={dateRangeObj}
        students={relevantStudents}
      />
    </div>
  );
}
