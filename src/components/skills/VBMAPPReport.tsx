import { useState, useMemo } from 'react';
import { 
  BarChart3, TrendingUp, TrendingDown, Target, Copy, FileDown,
  CheckCircle2, AlertTriangle, HelpCircle, Plus, Lightbulb, Edit2,
  Sparkles, Loader2, FileText, Minimize2, Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, Legend,
} from 'recharts';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import type { StudentAssessment, MilestoneScore, CurriculumItem } from '@/types/curriculum';

type ReportMode = 'condensed' | 'comprehensive';

interface VBMAPPReportProps {
  assessment: StudentAssessment;
  items: CurriculumItem[];
  scores: Record<string, MilestoneScore>;
  studentName: string;
  onAddGoals?: (goals: GoalRecommendation[]) => void;
  barriersScores?: Record<string, MilestoneScore>;
  transitionScores?: Record<string, MilestoneScore>;
  barriersItems?: CurriculumItem[];
  transitionItems?: CurriculumItem[];
}

interface DomainStats {
  domain: string;
  scored: number;
  total: number;
  mastered: number;
  emerging: number;
  notDemonstrated: number;
  masteryPercent: number;
  status: 'not_scored' | 'partial' | 'complete';
}

interface GoalRecommendation {
  id: string;
  domain: string;
  title: string;
  type: 'acquisition' | 'generalization' | 'maintenance';
  measurement: string;
  masteryCriteria: string;
  selected: boolean;
}

export function VBMAPPReport({ 
  assessment, items, scores, studentName, onAddGoals,
  barriersScores, transitionScores, barriersItems, transitionItems,
}: VBMAPPReportProps) {
  const [reportMode, setReportMode] = useState<ReportMode>('condensed');
  const [editingNarrative, setEditingNarrative] = useState(false);
  const [narrative, setNarrative] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set());
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNarratives, setAiNarratives] = useState<{
    domainNarratives?: Record<string, string>;
    summary?: string;
    recommendations?: string[];
  } | null>(null);

  // Calculate overall and level stats
  const stats = useMemo(() => {
    const overall = { scored: 0, total: items.length, mastered: 0, raw: 0, max: items.length };
    const byLevel: Record<string, { scored: number; total: number; mastered: number; raw: number; max: number }> = {};
    const byDomain: Record<string, DomainStats> = {};

    items.forEach(item => {
      const level = item.level || 'Unknown';
      const domain = item.domain?.name || 'Other';
      const score = scores[item.id];

      if (!byLevel[level]) byLevel[level] = { scored: 0, total: 0, mastered: 0, raw: 0, max: 0 };
      byLevel[level].total++;
      byLevel[level].max++;

      if (!byDomain[domain]) {
        byDomain[domain] = { domain, scored: 0, total: 0, mastered: 0, emerging: 0, notDemonstrated: 0, masteryPercent: 0, status: 'not_scored' };
      }
      byDomain[domain].total++;

      if (score?.score !== undefined && score.score !== null) {
        overall.scored++;
        overall.raw += score.score;
        byLevel[level].scored++;
        byLevel[level].raw += score.score;
        byDomain[domain].scored++;
        if (score.score === 1) { overall.mastered++; byLevel[level].mastered++; byDomain[domain].mastered++; }
        else if (score.score === 0.5) { byDomain[domain].emerging++; }
        else if (score.score === 0) { byDomain[domain].notDemonstrated++; }
      }
    });

    Object.values(byDomain).forEach(d => {
      d.masteryPercent = d.scored > 0 ? Math.round((d.mastered / d.scored) * 100) : 0;
      d.status = d.scored === 0 ? 'not_scored' : d.scored === d.total ? 'complete' : 'partial';
    });

    return { overall, overallMasteryPercent: overall.scored > 0 ? Math.round((overall.mastered / overall.scored) * 100) : 0, byLevel, byDomain };
  }, [items, scores]);

  // Analysis
  const analysis = useMemo(() => {
    const scoredDomains = Object.values(stats.byDomain).filter(d => d.status !== 'not_scored');
    const notScoredDomains = Object.values(stats.byDomain).filter(d => d.status === 'not_scored');
    const sorted = [...scoredDomains].sort((a, b) => b.masteryPercent - a.masteryPercent);
    const strengths = sorted.slice(0, Math.min(5, Math.ceil(sorted.length / 2)));
    const priorities = sorted.slice(-Math.min(5, Math.ceil(sorted.length / 2))).reverse();
    return { strengths, priorities, notScored: notScoredDomains };
  }, [stats]);

  // Developmental level determination
  const developmentalLevel = useMemo(() => {
    const levels = Object.entries(stats.byLevel).sort(([a], [b]) => a.localeCompare(b));
    for (let i = levels.length - 1; i >= 0; i--) {
      const [, data] = levels[i];
      if (data.scored > 0 && data.mastered / data.scored >= 0.5) {
        return levels[i][0];
      }
    }
    return levels[0]?.[0] || 'Level 1';
  }, [stats.byLevel]);

  // Chart data
  const chartData = useMemo(() => 
    Object.values(stats.byDomain)
      .filter(d => d.status !== 'not_scored')
      .map(d => ({
        domain: d.domain.length > 12 ? d.domain.slice(0, 10) + '…' : d.domain,
        fullDomain: d.domain,
        mastery: d.masteryPercent,
        emerging: d.scored > 0 ? Math.round((d.emerging / d.scored) * 100) : 0,
        notDemo: d.scored > 0 ? Math.round((d.notDemonstrated / d.scored) * 100) : 0,
      }))
  , [stats.byDomain]);

  const radarData = useMemo(() =>
    Object.values(stats.byDomain)
      .filter(d => d.status !== 'not_scored')
      .map(d => ({
        domain: d.domain.length > 10 ? d.domain.slice(0, 8) + '…' : d.domain,
        mastery: d.masteryPercent,
        fullMark: 100,
      }))
  , [stats.byDomain]);

  // Goal recommendations
  const recommendations = useMemo(() => {
    const goals: GoalRecommendation[] = [];
    analysis.priorities.forEach(domain => {
      const domainItems = items.filter(i => i.domain?.name === domain.domain);
      const zeros = domainItems.filter(i => scores[i.id]?.score === 0);
      const halfs = domainItems.filter(i => scores[i.id]?.score === 0.5);
      const ones = domainItems.filter(i => scores[i.id]?.score === 1);

      if (zeros.length > halfs.length) {
        zeros.slice(0, 2).forEach((item, idx) => {
          goals.push({ id: `${domain.domain}-acq-${idx}`, domain: domain.domain, title: `Acquire: ${item.title}`, type: 'acquisition', measurement: 'percent correct', masteryCriteria: '80% correct across 3 consecutive sessions', selected: false });
        });
      }
      if (halfs.length > 0) {
        halfs.slice(0, 2).forEach((item, idx) => {
          goals.push({ id: `${domain.domain}-gen-${idx}`, domain: domain.domain, title: `Generalize: ${item.title}`, type: 'generalization', measurement: 'frequency across settings', masteryCriteria: 'Demonstrated across 3 different settings/people', selected: false });
        });
      }
      if (ones.length > 0 && ones.length < domainItems.length * 0.3) {
        ones.slice(0, 1).forEach((item, idx) => {
          goals.push({ id: `${domain.domain}-maint-${idx}`, domain: domain.domain, title: `Maintain: ${item.title}`, type: 'maintenance', measurement: 'probe trials', masteryCriteria: '90% correct on monthly probes', selected: false });
        });
      }
    });
    return goals;
  }, [analysis.priorities, items, scores]);

  // Generated narrative
  const generatedNarrative = useMemo(() => {
    const date = format(new Date(assessment.date_administered), 'MMMM d, yyyy');
    const strengthNames = analysis.strengths.map(s => s.domain).join(', ');
    const priorityNames = analysis.priorities.map(p => p.domain).join(', ');
    const notScoredNames = analysis.notScored.map(n => n.domain).join(', ');

    let text = `The Verbal Behavior Milestones Assessment and Placement Program (VB-MAPP) was administered on ${date}. ${studentName} demonstrated an overall mastery rate of ${stats.overallMasteryPercent}%, with ${stats.overall.mastered} of ${stats.overall.scored} scored milestones mastered. The current developmental placement corresponds to ${developmentalLevel}.`;
    if (strengthNames) text += ` Areas of relative strength include ${strengthNames}.`;
    if (priorityNames) text += ` Priority areas for intervention include ${priorityNames}, reflecting assessed skills not yet in the learner's repertoire.`;
    if (notScoredNames) text += ` The following domains were not assessed at this time: ${notScoredNames}.`;
    return text;
  }, [assessment, studentName, stats, analysis, developmentalLevel]);

  useState(() => { if (!narrative) setNarrative(generatedNarrative); });

  // AI narrative generation
  const generateAINarrative = async () => {
    setAiLoading(true);
    try {
      const domainScoresArr = Object.values(stats.byDomain)
        .filter(d => d.status !== 'not_scored')
        .map(d => ({ domain: d.domain, raw: d.mastered, max: d.scored, percent: d.masteryPercent, status: d.status }));

      const { data, error } = await supabase.functions.invoke('generate-assessment-report', {
        body: {
          assessmentType: 'vbmapp',
          studentName,
          studentAge: '',
          domainScores: domainScoresArr,
          overallMastery: stats.overallMasteryPercent,
          strengths: analysis.strengths.map(s => s.domain),
          priorities: analysis.priorities.map(p => p.domain),
        },
      });

      if (error) throw error;
      setAiNarratives(data);
      if (data?.summary) setNarrative(data.summary);
      toast.success('AI narratives generated');
    } catch (err: any) {
      console.error('AI narrative error:', err);
      toast.error('Failed to generate AI narratives');
    } finally {
      setAiLoading(false);
    }
  };

  const toggleGoalSelection = (goalId: string) => {
    setSelectedGoals(prev => { const next = new Set(prev); next.has(goalId) ? next.delete(goalId) : next.add(goalId); return next; });
  };

  const handleCopyReport = () => {
    const isCondensed = reportMode === 'condensed';
    let reportText = `VB-MAPP ${isCondensed ? 'Summary' : 'Comprehensive Report'} — ${studentName}\nDate: ${format(new Date(assessment.date_administered), 'MMMM d, yyyy')}\n\n`;
    
    reportText += `RESULTS SUMMARY\nOverall Mastery: ${stats.overallMasteryPercent}% (${stats.overall.mastered}/${stats.overall.scored} mastered)\nDevelopmental Level: ${developmentalLevel}\n\n`;

    if (!isCondensed) {
      reportText += `LEVEL BREAKDOWN\n${Object.entries(stats.byLevel).map(([level, data]) => `${level}: ${data.mastered}/${data.scored} mastered (${data.scored > 0 ? Math.round((data.mastered/data.scored)*100) : 0}%)`).join('\n')}\n\n`;
      reportText += `DOMAIN ANALYSIS\n${Object.values(stats.byDomain).map(d => `${d.domain}: ${d.masteryPercent}% mastery (${d.scored}/${d.total} scored)`).join('\n')}\n\n`;
    }

    reportText += `CLINICAL INTERPRETATION\n${narrative || generatedNarrative}\n\n`;

    if (aiNarratives?.domainNarratives && !isCondensed) {
      reportText += `DOMAIN NARRATIVES\n${Object.entries(aiNarratives.domainNarratives).map(([d, n]) => `${d}:\n${n}`).join('\n\n')}\n\n`;
    }

    reportText += `RECOMMENDATIONS\n${(aiNarratives?.recommendations || recommendations.map(g => g.title)).map((r, i) => `${i+1}. ${r}`).join('\n')}\n`;

    navigator.clipboard.writeText(reportText);
    toast.success('Report copied to clipboard');
  };

  const handleAddSelectedGoals = () => {
    const selected = recommendations.filter(g => selectedGoals.has(g.id));
    if (selected.length === 0) { toast.error('Select at least one goal'); return; }
    onAddGoals?.(selected);
    toast.success(`${selected.length} goal(s) added to treatment plan`);
  };

  const getStatusBadge = (status: 'not_scored' | 'partial' | 'complete') => {
    switch (status) {
      case 'not_scored': return <Badge variant="outline" className="text-muted-foreground">Not Scored</Badge>;
      case 'partial': return <Badge variant="secondary">Partial</Badge>;
      case 'complete': return <Badge className="bg-emerald-600">Complete</Badge>;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'acquisition': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'generalization': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'maintenance': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      default: return 'bg-muted';
    }
  };

  const DOMAIN_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1', '#14b8a6', '#e11d48', '#a855f7', '#0ea5e9', '#d946ef', '#22c55e'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            VB-MAPP Results & Report
          </h3>
          <p className="text-sm text-muted-foreground">
            {studentName} • {format(new Date(assessment.date_administered), 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup type="single" value={reportMode} onValueChange={(v) => v && setReportMode(v as ReportMode)} className="bg-muted rounded-lg p-0.5">
            <ToggleGroupItem value="condensed" className="gap-1.5 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm px-3">
              <Minimize2 className="w-3.5 h-3.5" />
              Condensed
            </ToggleGroupItem>
            <ToggleGroupItem value="comprehensive" className="gap-1.5 text-xs data-[state=on]:bg-background data-[state=on]:shadow-sm px-3">
              <Maximize2 className="w-3.5 h-3.5" />
              Comprehensive
            </ToggleGroupItem>
          </ToggleGroup>
          <Button variant="outline" size="sm" onClick={generateAINarrative} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
            AI Narrative
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyReport}>
            <Copy className="w-4 h-4 mr-1" />
            Copy
          </Button>
          <Button variant="outline" size="sm">
            <FileDown className="w-4 h-4 mr-1" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4">
          <div className="text-3xl font-bold text-primary">{stats.overallMasteryPercent}%</div>
          <p className="text-xs text-muted-foreground">Overall Mastery</p>
          <p className="text-xs mt-1">{stats.overall.mastered}/{stats.overall.scored} mastered</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-3xl font-bold">{developmentalLevel}</div>
          <p className="text-xs text-muted-foreground">Developmental Level</p>
          <p className="text-xs mt-1">{stats.overall.scored}/{stats.overall.total} items scored</p>
        </CardContent></Card>
        {Object.entries(stats.byLevel).slice(0, 2).map(([level, data]) => (
          <Card key={level}><CardContent className="pt-4">
            <div className="text-3xl font-bold">{data.scored > 0 ? Math.round((data.mastered / data.scored) * 100) : 0}%</div>
            <p className="text-xs text-muted-foreground">{level} Mastery</p>
            <p className="text-xs mt-1">{data.mastered}/{data.scored} mastered</p>
          </CardContent></Card>
        ))}
      </div>

      {/* Milestones Profile Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Milestones Profile</CardTitle>
          <CardDescription>Mastery percentage by domain</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="domain" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <RTooltip formatter={(value: number, name: string) => [`${value}%`, name === 'mastery' ? 'Mastered' : name === 'emerging' ? 'Emerging' : 'Not Demonstrated']} />
                  <Bar dataKey="mastery" name="Mastered" stackId="a" radius={[0, 0, 0, 0]}>
                    {chartData.map((_, i) => <Cell key={i} fill="#10b981" />)}
                  </Bar>
                  <Bar dataKey="emerging" name="Emerging" stackId="a">
                    {chartData.map((_, i) => <Cell key={i} fill="#f59e0b" />)}
                  </Bar>
                  <Bar dataKey="notDemo" name="Not Demonstrated" stackId="a" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => <Cell key={i} fill="#ef4444" opacity={0.3} />)}
                  </Bar>
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
              {radarData.length >= 3 && (
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="domain" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Radar name="Mastery %" dataKey="mastery" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Score milestones to see the profile chart</p>
          )}
        </CardContent>
      </Card>

      {/* Domain Table — comprehensive only */}
      {reportMode === 'comprehensive' && (
        <Card>
          <CardHeader><CardTitle className="text-base">Domain Analysis</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead className="text-center">Mastered</TableHead>
                  <TableHead className="text-center">Emerging</TableHead>
                  <TableHead className="text-center">Not Demo</TableHead>
                  <TableHead className="text-center">Mastery %</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.values(stats.byDomain).sort((a, b) => b.masteryPercent - a.masteryPercent).map(domain => (
                  <TableRow key={domain.domain}>
                    <TableCell className="font-medium">{domain.domain}</TableCell>
                    <TableCell className="text-center">{domain.mastered}</TableCell>
                    <TableCell className="text-center">{domain.emerging}</TableCell>
                    <TableCell className="text-center">{domain.notDemonstrated}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Progress value={domain.masteryPercent} className="w-16 h-2" />
                        <span className="text-sm">{domain.masteryPercent}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{getStatusBadge(domain.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* AI Domain Narratives — comprehensive only */}
      {reportMode === 'comprehensive' && aiNarratives?.domainNarratives && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Domain Narratives</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(aiNarratives.domainNarratives).map(([domain, text]) => (
              <div key={domain} className="space-y-1">
                <h4 className="font-semibold text-sm">{domain}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Clinical Interpretation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Clinical Interpretation
            </span>
            <Button variant="ghost" size="sm" onClick={() => setEditingNarrative(!editingNarrative)}>
              <Edit2 className="w-4 h-4 mr-1" />
              {editingNarrative ? 'Done' : 'Edit'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Strengths & Priorities */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">Strengths</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {analysis.strengths.map(s => (
                    <Badge key={s.domain} variant="outline" className="bg-background">{s.domain} ({s.masteryPercent}%)</Badge>
                  ))}
                  {analysis.strengths.length === 0 && <span className="text-sm text-muted-foreground">Score more items</span>}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-amber-600" />
                  <span className="font-medium text-amber-700 dark:text-amber-400">Priority Areas</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {analysis.priorities.map(p => (
                    <Badge key={p.domain} variant="outline" className="bg-background">{p.domain} ({p.masteryPercent}%)</Badge>
                  ))}
                  {analysis.priorities.length === 0 && <span className="text-sm text-muted-foreground">Score more items</span>}
                </div>
              </div>
            </div>

            {analysis.notScored.length > 0 && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2 mb-2">
                  <HelpCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Not Yet Assessed</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {analysis.notScored.map(d => <Badge key={d.domain} variant="outline">{d.domain}</Badge>)}
                </div>
              </div>
            )}

            {/* Narrative */}
            {editingNarrative ? (
              <Textarea value={narrative || generatedNarrative} onChange={(e) => setNarrative(e.target.value)} rows={5} />
            ) : (
              <div className="text-sm leading-relaxed p-4 bg-muted/30 rounded-lg whitespace-pre-wrap">
                {narrative || generatedNarrative}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Recommendations */}
      {aiNarratives?.recommendations && aiNarratives.recommendations.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> AI Recommendations</CardTitle></CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2">
              {aiNarratives.recommendations.map((rec, i) => (
                <li key={i} className="text-sm leading-relaxed">{rec}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Goal Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Goal Recommendations
            </span>
            {recommendations.length > 0 && (
              <Button size="sm" onClick={handleAddSelectedGoals} disabled={selectedGoals.size === 0}>
                <Plus className="w-4 h-4 mr-1" />
                Add to Treatment Plan
              </Button>
            )}
          </CardTitle>
          <CardDescription>Auto-generated from priority domains. Select to add to treatment plan.</CardDescription>
        </CardHeader>
        <CardContent>
          {recommendations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Score more items to generate goals</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3">
                {recommendations.map(goal => (
                  <div key={goal.id} className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedGoals.has(goal.id) ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`} onClick={() => toggleGoalSelection(goal.id)}>
                    <div className="flex items-start gap-3">
                      <Checkbox checked={selectedGoals.has(goal.id)} onCheckedChange={() => toggleGoalSelection(goal.id)} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{goal.title}</span>
                          <Badge variant="outline" className={getTypeColor(goal.type)}>{goal.type}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p><strong>Domain:</strong> {goal.domain}</p>
                          <p><strong>Measurement:</strong> {goal.measurement}</p>
                          <p><strong>Mastery:</strong> {goal.masteryCriteria}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
