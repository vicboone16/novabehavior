import { useState, useMemo } from 'react';
import { 
  BarChart3, TrendingUp, TrendingDown, Minus, Download, FileText, 
  Calendar, Target, CheckCircle2, Clock, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { useStudentTargets, useStudentAssessments, useDomains } from '@/hooks/useCurriculum';
import type { StudentTarget } from '@/types/curriculum';

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
  const { domains } = useDomains();

  const [dateRange, setDateRange] = useState('30');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate key metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const rangeStart = subDays(now, parseInt(dateRange));

    const activeTargets = targets.filter(t => t.status === 'active');
    const masteredTargets = targets.filter(t => t.status === 'mastered');
    const recentlyMastered = masteredTargets.filter(t => 
      t.date_mastered && new Date(t.date_mastered) >= rangeStart
    );

    // Calculate mastery rate
    const totalTargetsInRange = targets.filter(t => 
      new Date(t.date_added) <= now
    ).length;
    const masteryRate = totalTargetsInRange > 0 
      ? Math.round((masteredTargets.length / totalTargetsInRange) * 100) 
      : 0;

    // Calculate average time to mastery
    const masteryTimes = masteredTargets
      .filter(t => t.date_mastered)
      .map(t => differenceInDays(new Date(t.date_mastered!), new Date(t.date_added)));
    const avgMasteryDays = masteryTimes.length > 0 
      ? Math.round(masteryTimes.reduce((a, b) => a + b, 0) / masteryTimes.length)
      : 0;

    // Domain distribution
    const domainDistribution = domains.map((domain, idx) => ({
      name: domain.name,
      active: targets.filter(t => t.domain_id === domain.id && t.status === 'active').length,
      mastered: targets.filter(t => t.domain_id === domain.id && t.status === 'mastered').length,
      total: targets.filter(t => t.domain_id === domain.id).length,
      color: DOMAIN_COLORS[idx % DOMAIN_COLORS.length],
    })).filter(d => d.total > 0);

    return {
      activeTargets: activeTargets.length,
      masteredTargets: masteredTargets.length,
      recentlyMastered: recentlyMastered.length,
      totalTargets: targets.length,
      masteryRate,
      avgMasteryDays,
      domainDistribution,
      assessmentCount: assessments.length,
    };
  }, [targets, assessments, domains, dateRange]);

  // Progress over time data
  const progressData = useMemo(() => {
    const days = parseInt(dateRange);
    const data: { date: string; mastered: number; active: number; total: number }[] = [];

    for (let i = days; i >= 0; i -= Math.max(1, Math.floor(days / 10))) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'MMM d');

      const masteredByDate = targets.filter(t => 
        t.date_mastered && new Date(t.date_mastered) <= date
      ).length;

      const activeByDate = targets.filter(t => {
        const added = new Date(t.date_added);
        if (added > date) return false;
        if (t.date_mastered && new Date(t.date_mastered) <= date) return false;
        return t.status === 'active' || t.status === 'paused';
      }).length;

      data.push({
        date: dateStr,
        mastered: masteredByDate,
        active: activeByDate,
        total: masteredByDate + activeByDate,
      });
    }

    return data;
  }, [targets, dateRange]);

  // Status distribution for pie chart
  const statusData = useMemo(() => {
    return [
      { name: 'Active', value: targets.filter(t => t.status === 'active').length, color: STATUS_COLORS.active },
      { name: 'Paused', value: targets.filter(t => t.status === 'paused').length, color: STATUS_COLORS.paused },
      { name: 'Mastered', value: targets.filter(t => t.status === 'mastered').length, color: STATUS_COLORS.mastered },
      { name: 'Discontinued', value: targets.filter(t => t.status === 'discontinued').length, color: STATUS_COLORS.discontinued },
    ].filter(d => d.value > 0);
  }, [targets]);

  // Target trend analysis
  const trendAnalysis = useMemo(() => {
    const trending: { up: StudentTarget[]; flat: StudentTarget[]; down: StudentTarget[] } = {
      up: [],
      flat: [],
      down: [],
    };

    targets.forEach(target => {
      // For now, simple heuristic based on status
      if (target.status === 'mastered') {
        trending.up.push(target);
      } else if (target.status === 'paused' || target.status === 'discontinued') {
        trending.down.push(target);
      } else {
        trending.flat.push(target);
      }
    });

    return trending;
  }, [targets]);

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

          // Active Targets
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

  if (targetsLoading || assessmentsLoading) {
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

      {/* Charts */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="domains">Domain Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Progress Over Time */}
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Progress Over Time</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setChartType(chartType === 'line' ? 'bar' : 'line')}
                  >
                    {chartType === 'line' ? <BarChart3 className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
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
        </TabsContent>

        <TabsContent value="domains" className="mt-4">
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
        </TabsContent>

        <TabsContent value="trends" className="mt-4">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
