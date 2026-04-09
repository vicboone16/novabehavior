import { useState, useMemo, useRef } from 'react';
import { 
  BarChart3, TrendingUp, TrendingDown, Minus, Download, FileText, 
  Calendar, Target, CheckCircle2, Clock, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, subDays, parseISO, differenceInDays } from 'date-fns';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { useStudentTargets, useStudentAssessments, useDomains } from '@/hooks/useCurriculum';
import { useUnifiedSkillData } from '@/hooks/useUnifiedSkillData';
import type { StudentTarget } from '@/types/curriculum';
import { GraphExportButton } from '@/components/shared/GraphExportButton';

interface SkillProgressReportsProps {
  studentId: string;
  studentName: string;
}

const STATUS_COLORS = {
  active: '#3b82f6',
  paused: '#eab308',
  mastered: '#22c55e',
  discontinued: '#6b7280',
};

const DOMAIN_COLORS = [
  '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', 
  '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#84cc16'
];

export function SkillProgressReports({ studentId, studentName }: SkillProgressReportsProps) {
  const { targets, loading: targetsLoading } = useStudentTargets(studentId);
  const { assessments, loading: assessmentsLoading } = useStudentAssessments(studentId);
  const { dbTargets, loading: dbLoading } = useUnifiedSkillData(studentId, studentName);
  const { domains } = useDomains();

  const [dateRange, setDateRange] = useState('30');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  
  const overviewChartRef = useRef<HTMLDivElement>(null);
  const domainChartRef = useRef<HTMLDivElement>(null);

  // Merge legacy targets with DB program targets for unified metrics
  const allTargetsMerged = useMemo(() => {
    // Convert DB targets to a compatible shape for counting
    const dbAsTargets = dbTargets.map(dt => ({
      id: dt.id,
      status: dt.status === 'mastered' ? 'mastered' as const : 
              dt.status === 'maintenance' || dt.status === 'generalization' ? 'active' as const :
              dt.status === 'baseline' ? 'active' as const : 'active' as const,
      domain_id: null as string | null,
      domain: dt.domain ? { id: '', name: dt.domain } : undefined,
      date_added: dt.createdAt.toISOString(),
      date_mastered: dt.masteredDate?.toISOString() || null,
      title: dt.name,
      priority: 'medium' as const,
      source_type: 'custom' as const,
      // Session count from trials
      _sessionCount: dt.sessions.length,
      _avgCorrect: dt.sessions.length > 0 
        ? Math.round(dt.sessions.reduce((s, sess) => s + sess.percentCorrect, 0) / dt.sessions.length)
        : 0,
    }));
    return [...targets, ...dbAsTargets];
  }, [targets, dbTargets]);

  // Calculate key metrics  
  const metrics = useMemo(() => {
    const now = new Date();
    const rangeStart = subDays(now, parseInt(dateRange));

    const activeTargets = allTargetsMerged.filter(t => t.status === 'active');
    const masteredTargets = allTargetsMerged.filter(t => t.status === 'mastered');
    const recentlyMastered = masteredTargets.filter(t => 
      t.date_mastered && new Date(t.date_mastered) >= rangeStart
    );

    const totalTargetsInRange = allTargetsMerged.filter(t => 
      new Date(t.date_added) <= now
    ).length;
    const masteryRate = totalTargetsInRange > 0 
      ? Math.round((masteredTargets.length / totalTargetsInRange) * 100) 
      : 0;

    const masteryTimes = masteredTargets
      .filter(t => t.date_mastered)
      .map(t => differenceInDays(new Date(t.date_mastered!), new Date(t.date_added)));
    const avgMasteryDays = masteryTimes.length > 0 
      ? Math.round(masteryTimes.reduce((a, b) => a + b, 0) / masteryTimes.length)
      : 0;

    // Domain distribution (merge both sources)
    const domainMap = new Map<string, { name: string; active: number; mastered: number; total: number }>();
    allTargetsMerged.forEach((t: any) => {
      const domainName = t.domain?.name || 'Other';
      if (!domainMap.has(domainName)) domainMap.set(domainName, { name: domainName, active: 0, mastered: 0, total: 0 });
      const d = domainMap.get(domainName)!;
      d.total++;
      if (t.status === 'active') d.active++;
      if (t.status === 'mastered') d.mastered++;
    });
    const domainDistribution = Array.from(domainMap.values())
      .filter(d => d.total > 0)
      .map((d, idx) => ({ ...d, color: DOMAIN_COLORS[idx % DOMAIN_COLORS.length] }));

    // DB program trial metrics
    const totalTrialSessions = dbTargets.reduce((sum, dt) => sum + dt.sessions.length, 0);
    const avgTrialCorrect = dbTargets.length > 0 && totalTrialSessions > 0
      ? Math.round(dbTargets.reduce((sum, dt) => {
          if (dt.sessions.length === 0) return sum;
          return sum + dt.sessions.reduce((s, sess) => s + sess.percentCorrect, 0) / dt.sessions.length;
        }, 0) / dbTargets.filter(dt => dt.sessions.length > 0).length)
      : 0;

    return {
      activeTargets: activeTargets.length,
      masteredTargets: masteredTargets.length,
      recentlyMastered: recentlyMastered.length,
      totalTargets: allTargetsMerged.length,
      masteryRate,
      avgMasteryDays,
      domainDistribution,
      assessmentCount: assessments.length,
      totalTrialSessions,
      avgTrialCorrect,
    };
  }, [allTargetsMerged, dbTargets, assessments, dateRange]);

  // Progress over time data (merged)
  const progressData = useMemo(() => {
    const days = parseInt(dateRange);
    const data: { date: string; mastered: number; active: number; total: number; trialSessions: number }[] = [];

    for (let i = days; i >= 0; i -= Math.max(1, Math.floor(days / 10))) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'MMM d');

      const masteredByDate = allTargetsMerged.filter(t => 
        t.date_mastered && new Date(t.date_mastered) <= date
      ).length;

      const activeByDate = allTargetsMerged.filter(t => {
        const added = new Date(t.date_added);
        if (added > date) return false;
        if (t.date_mastered && new Date(t.date_mastered) <= date) return false;
        return t.status === 'active' || (t as any).status === 'paused';
      }).length;

      // Count DB trial sessions on this date
      const dayStart = new Date(date); dayStart.setHours(0,0,0,0);
      const dayEnd = new Date(date); dayEnd.setHours(23,59,59,999);
      const trialSessions = dbTargets.reduce((sum, dt) => 
        sum + dt.sessions.filter(s => {
          const d = new Date(s.date);
          return d >= dayStart && d <= dayEnd;
        }).length, 0);

      data.push({
        date: dateStr,
        mastered: masteredByDate,
        active: activeByDate,
        total: masteredByDate + activeByDate,
        trialSessions,
      });
    }

    return data;
  }, [allTargetsMerged, dbTargets, dateRange]);

  // Status distribution for pie chart (merged)
  const statusData = useMemo(() => {
    return [
      { name: 'Active', value: allTargetsMerged.filter(t => t.status === 'active').length, color: STATUS_COLORS.active },
      { name: 'Paused', value: allTargetsMerged.filter(t => (t as any).status === 'paused').length, color: STATUS_COLORS.paused },
      { name: 'Mastered', value: allTargetsMerged.filter(t => t.status === 'mastered').length, color: STATUS_COLORS.mastered },
      { name: 'Discontinued', value: allTargetsMerged.filter(t => (t as any).status === 'discontinued').length, color: STATUS_COLORS.discontinued },
    ].filter(d => d.value > 0);
  }, [allTargetsMerged]);

  // Target trend analysis (merged)
  const trendAnalysis = useMemo(() => {
    const trending: { up: any[]; flat: any[]; down: any[] } = {
      up: [],
      flat: [],
      down: [],
    };

    // Legacy targets
    targets.forEach(target => {
      if (target.status === 'mastered') trending.up.push(target);
      else if (target.status === 'paused' || target.status === 'discontinued') trending.down.push(target);
      else trending.flat.push(target);
    });

    // DB targets (use trial data for actual trend detection)
    dbTargets.forEach(dt => {
      if (dt.status === 'mastered') {
        trending.up.push({ id: dt.id, title: dt.name, domain: dt.domain ? { name: dt.domain } : null });
      } else if (dt.sessions.length >= 2) {
        const recent = dt.sessions.slice(-3);
        const older = dt.sessions.slice(-6, -3);
        const avgRecent = recent.reduce((s, sess) => s + sess.percentCorrect, 0) / recent.length;
        const avgOlder = older.length > 0 ? older.reduce((s, sess) => s + sess.percentCorrect, 0) / older.length : avgRecent;
        if (avgRecent > avgOlder + 5) {
          trending.up.push({ id: dt.id, title: dt.name, domain: dt.domain ? { name: dt.domain } : null });
        } else if (avgRecent < avgOlder - 5) {
          trending.down.push({ id: dt.id, title: dt.name, domain: dt.domain ? { name: dt.domain } : null });
        } else {
          trending.flat.push({ id: dt.id, title: dt.name, domain: dt.domain ? { name: dt.domain } : null });
        }
      } else {
        trending.flat.push({ id: dt.id, title: dt.name, domain: dt.domain ? { name: dt.domain } : null });
      }
    });

    return trending;
  }, [targets, dbTargets]);

  // Export to Word document
  const exportToWord = async () => {
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            text: 'SKILL ACQUISITION PROGRESS REPORT',
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Student: ', bold: true }),
              new TextRun(studentName),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Report Date: ', bold: true }),
              new TextRun(format(new Date(), 'MMMM d, yyyy')),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Date Range: ', bold: true }),
              new TextRun(`Last ${dateRange} days`),
            ],
          }),
          new Paragraph({ text: '' }),
          
          // Summary Section
          new Paragraph({
            text: 'SUMMARY',
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Total Targets: ', bold: true }),
              new TextRun(String(metrics.totalTargets)),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Active Targets: ', bold: true }),
              new TextRun(String(metrics.activeTargets)),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Mastered Targets: ', bold: true }),
              new TextRun(String(metrics.masteredTargets)),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Mastery Rate: ', bold: true }),
              new TextRun(`${metrics.masteryRate}%`),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: 'Average Days to Mastery: ', bold: true }),
              new TextRun(String(metrics.avgMasteryDays)),
            ],
          }),
          new Paragraph({ text: '' }),

          // Domain Breakdown
          new Paragraph({
            text: 'DOMAIN BREAKDOWN',
            heading: HeadingLevel.HEADING_2,
          }),
          ...metrics.domainDistribution.map(d => 
            new Paragraph({
              children: [
                new TextRun({ text: `${d.name}: `, bold: true }),
                new TextRun(`${d.mastered} mastered / ${d.active} active / ${d.total} total`),
              ],
            })
          ),
          new Paragraph({ text: '' }),

          // Active Targets (legacy)
          new Paragraph({
            text: 'ACTIVE TARGETS',
            heading: HeadingLevel.HEADING_2,
          }),
          ...targets.filter(t => t.status === 'active').map(t => 
            new Paragraph({
              children: [
                new TextRun({ text: '• ', bold: true }),
                new TextRun({ text: t.title, bold: true }),
                new TextRun(t.domain ? ` (${t.domain.name})` : ''),
                t.mastery_criteria ? new TextRun({ text: ` - Mastery: ${t.mastery_criteria}`, italics: true }) : new TextRun(''),
              ],
            })
          ),

          // DB Program Targets
          ...(dbTargets.length > 0 ? [
            new Paragraph({ text: '' }),
            new Paragraph({
              text: 'SKILL PROGRAMS (Trial Data)',
              heading: HeadingLevel.HEADING_2,
            }),
            ...dbTargets.map(dt => {
              const avgCorrect = dt.sessions.length > 0
                ? Math.round(dt.sessions.reduce((s, sess) => s + sess.percentCorrect, 0) / dt.sessions.length)
                : 0;
              const avgIndependent = dt.sessions.length > 0
                ? Math.round(dt.sessions.reduce((s, sess) => s + sess.percentIndependent, 0) / dt.sessions.length)
                : 0;
              return new Paragraph({
                children: [
                  new TextRun({ text: `• ${dt.name}`, bold: true }),
                  new TextRun(dt.domain ? ` (${dt.domain})` : ''),
                  new TextRun(dt.program ? ` — ${dt.program}` : ''),
                  new TextRun({ text: ` | ${dt.sessions.length} sessions, ${avgCorrect}% correct, ${avgIndependent}% independent`, italics: true }),
                ],
              });
            }),
          ] : []),

          new Paragraph({ text: '' }),

          // Recently Mastered
          new Paragraph({
            text: 'RECENTLY MASTERED TARGETS',
            heading: HeadingLevel.HEADING_2,
          }),
          ...targets.filter(t => t.status === 'mastered').slice(0, 10).map(t => 
            new Paragraph({
              children: [
                new TextRun({ text: '✓ ', bold: true }),
                new TextRun({ text: t.title }),
                t.date_mastered ? new TextRun({ text: ` (${format(new Date(t.date_mastered), 'MMM d, yyyy')})`, italics: true }) : new TextRun(''),
              ],
            })
          ),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `skill-progress-${studentName.replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}.docx`);
  };

  if (targetsLoading || assessmentsLoading || dbLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading progress data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Skill Acquisition Progress
          </h3>
          <p className="text-sm text-muted-foreground">
            Track mastery rates, trends, and domain progress
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={exportToWord}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Target className="w-4 h-4" />
              Total Targets
            </div>
            <div className="text-2xl font-bold mt-1">{metrics.totalTargets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Clock className="w-4 h-4" />
              Active
            </div>
            <div className="text-2xl font-bold mt-1 text-blue-600">{metrics.activeTargets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <CheckCircle2 className="w-4 h-4" />
              Mastered
            </div>
            <div className="text-2xl font-bold mt-1 text-green-600">{metrics.masteredTargets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Award className="w-4 h-4" />
              Mastery Rate
            </div>
            <div className="text-2xl font-bold mt-1">{metrics.masteryRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <Calendar className="w-4 h-4" />
              Avg Days to Master
            </div>
            <div className="text-2xl font-bold mt-1">{metrics.avgMasteryDays}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <TrendingUp className="w-4 h-4" />
              Recent Mastery
            </div>
            <div className="text-2xl font-bold mt-1 text-green-600">+{metrics.recentlyMastered}</div>
          </CardContent>
        </Card>
      </div>

      {/* Overview Section */}
      <Separator className="my-2" />
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Overview</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Progress Over Time */}
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Progress Over Time</CardTitle>
                  <div className="flex items-center gap-1">
                    <GraphExportButton 
                      containerRef={overviewChartRef} 
                      filename={`progress-${studentName.replace(/\s+/g, '-')}`} 
                    />
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setChartType(chartType === 'line' ? 'bar' : 'line')}
                    >
                      {chartType === 'line' ? <BarChart3 className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]" ref={overviewChartRef}>
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'line' ? (
                      <LineChart data={progressData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={11} />
                        <YAxis fontSize={11} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="mastered" name="Mastered" stroke="#22c55e" strokeWidth={2} />
                        <Line type="monotone" dataKey="active" name="Active" stroke="#3b82f6" strokeWidth={2} />
                      </LineChart>
                    ) : (
                      <BarChart data={progressData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={11} />
                        <YAxis fontSize={11} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="mastered" name="Mastered" fill="#22c55e" />
                        <Bar dataKey="active" name="Active" fill="#3b82f6" />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Target Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

      {/* Domain Analysis Section */}
      <Separator className="my-2" />
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Domain Analysis</h3>
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Domain Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {metrics.domainDistribution.map((domain) => {
                const masteryPct = domain.total > 0 ? Math.round((domain.mastered / domain.total) * 100) : 0;
                return (
                  <div key={domain.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{domain.name}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-green-600">{domain.mastered} mastered</Badge>
                        <Badge variant="outline" className="text-blue-600">{domain.active} active</Badge>
                        <span>{masteryPct}%</span>
                      </div>
                    </div>
                    <Progress value={masteryPct} className="h-2" />
                  </div>
                );
              })}
            </CardContent>
          </Card>

      {/* Trend Analysis Section */}
      <Separator className="my-2" />
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Trend Analysis</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="border-green-200">
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Trending Up
                </CardTitle>
                <CardDescription>Mastered targets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
                {trendAnalysis.up.slice(0, 10).map(t => (
                  <div key={t.id} className="text-sm p-2 bg-green-50 rounded">
                    <div className="font-medium">{t.title}</div>
                    {t.domain && <div className="text-xs text-muted-foreground">{t.domain.name}</div>}
                  </div>
                ))}
                {trendAnalysis.up.length === 0 && (
                  <p className="text-sm text-muted-foreground">No mastered targets yet</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Minus className="w-4 h-4 text-gray-500" />
                  Trending Flat
                </CardTitle>
                <CardDescription>Active targets in progress</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
                {trendAnalysis.flat.slice(0, 10).map(t => (
                  <div key={t.id} className="text-sm p-2 bg-muted/50 rounded">
                    <div className="font-medium">{t.title}</div>
                    {t.domain && <div className="text-xs text-muted-foreground">{t.domain.name}</div>}
                  </div>
                ))}
                {trendAnalysis.flat.length === 0 && (
                  <p className="text-sm text-muted-foreground">No active targets</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-yellow-200">
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingDown className="w-4 h-4 text-yellow-600" />
                  Needs Attention
                </CardTitle>
                <CardDescription>Paused or discontinued</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
                {trendAnalysis.down.slice(0, 10).map(t => (
                  <div key={t.id} className="text-sm p-2 bg-yellow-50 rounded">
                    <div className="font-medium">{t.title}</div>
                    {t.domain && <div className="text-xs text-muted-foreground">{t.domain.name}</div>}
                  </div>
                ))}
                {trendAnalysis.down.length === 0 && (
                  <p className="text-sm text-muted-foreground">No paused targets</p>
                )}
              </CardContent>
            </Card>
          </div>
    </div>
  );
}
