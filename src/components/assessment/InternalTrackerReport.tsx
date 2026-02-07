import { useState, useMemo } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, Target, Copy, FileDown,
  HelpCircle, Plus, Lightbulb, Edit2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { MilestoneScore } from '@/types/curriculum';
import type { TrackerType } from './InternalTrackerEntry';
import { AFLS_MODULES, getAFLSModuleItems, getSkillAreaName, AFLS_MAX_SCORE } from '@/data/afls-items';
import { ABLLS_R_DOMAINS } from '@/data/ablls-r-items';

interface InternalTrackerReportProps {
  trackerType: TrackerType;
  scores: Record<string, MilestoneScore>;
  studentName: string;
  dateAdministered: string;
  status: 'draft' | 'final';
}

interface DomainStats {
  domain: string;
  scored: number;
  total: number;
  rawTotal: number;
  maxPossible: number;
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
}

export function InternalTrackerReport({
  trackerType, scores, studentName, dateAdministered, status,
}: InternalTrackerReportProps) {
  const label = trackerType === 'afls' ? 'AFLS' : 'ABLLS-R';
  const [editingNarrative, setEditingNarrative] = useState(false);
  const [narrative, setNarrative] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set());

  // Build domain stats using SUM(scores) / SUM(max_possible)
  const stats = useMemo(() => {
    const byDomain: Record<string, DomainStats> = {};
    let overallRaw = 0, overallMax = 0, overallScored = 0, overallTotal = 0;

    const processItems = (items: { id: string; maxScore: number }[], domainName: string) => {
      if (!byDomain[domainName]) {
        byDomain[domainName] = {
          domain: domainName, scored: 0, total: 0, rawTotal: 0,
          maxPossible: 0, masteryPercent: 0, status: 'not_scored',
        };
      }
      items.forEach(item => {
        byDomain[domainName].total++;
        overallTotal++;
        const s = scores[item.id];
        if (s?.score !== undefined && s.score !== null) {
          byDomain[domainName].scored++;
          byDomain[domainName].rawTotal += s.score;
          byDomain[domainName].maxPossible += item.maxScore;
          overallScored++;
          overallRaw += s.score;
          overallMax += item.maxScore;
        }
      });
    };

    if (trackerType === 'afls') {
      AFLS_MODULES.forEach(mod => {
        mod.skillAreas.forEach(area => {
          const items = getAFLSModuleItems(mod.id).filter(i => i.skillAreaCode === area.code);
          processItems(items, `${mod.name} – ${area.name}`);
        });
      });
    } else {
      ABLLS_R_DOMAINS.forEach(domain => {
        processItems(domain.items, domain.fullName);
      });
    }

    // Calc percentages and status
    Object.values(byDomain).forEach(d => {
      d.masteryPercent = d.maxPossible > 0 ? Math.round((d.rawTotal / d.maxPossible) * 100) : 0;
      d.status = d.scored === 0 ? 'not_scored' : d.scored === d.total ? 'complete' : 'partial';
    });

    const overallMastery = overallMax > 0 ? Math.round((overallRaw / overallMax) * 100) : 0;

    return { byDomain, overallRaw, overallMax, overallScored, overallTotal, overallMastery };
  }, [trackerType, scores]);

  // Analysis
  const analysis = useMemo(() => {
    const scored = Object.values(stats.byDomain).filter(d => d.status !== 'not_scored');
    const notScored = Object.values(stats.byDomain).filter(d => d.status === 'not_scored');
    const sorted = [...scored].sort((a, b) => b.masteryPercent - a.masteryPercent);
    const strengths = sorted.slice(0, Math.min(5, Math.ceil(sorted.length / 2)));
    const priorities = sorted.slice(-Math.min(5, Math.ceil(sorted.length / 2))).reverse();
    return { strengths, priorities, notScored };
  }, [stats]);

  // Goal recommendations
  const recommendations = useMemo(() => {
    const goals: GoalRecommendation[] = [];
    analysis.priorities.forEach(domain => {
      if (domain.masteryPercent < 50) {
        goals.push({
          id: `${domain.domain}-acq`,
          domain: domain.domain,
          title: `Acquire skills in: ${domain.domain}`,
          type: 'acquisition',
          measurement: 'percent correct',
          masteryCriteria: '80% correct across 3 sessions',
        });
      }
      if (domain.masteryPercent >= 50 && domain.masteryPercent < 80) {
        goals.push({
          id: `${domain.domain}-gen`,
          domain: domain.domain,
          title: `Generalize skills in: ${domain.domain}`,
          type: 'generalization',
          measurement: 'frequency across settings',
          masteryCriteria: 'Demonstrated across 3 settings/people',
        });
      }
      if (domain.masteryPercent >= 80) {
        goals.push({
          id: `${domain.domain}-maint`,
          domain: domain.domain,
          title: `Maintain skills in: ${domain.domain}`,
          type: 'maintenance',
          measurement: 'probe trials',
          masteryCriteria: '90% on monthly probes',
        });
      }
    });
    return goals;
  }, [analysis]);

  // Narrative
  const generatedNarrative = useMemo(() => {
    const date = format(new Date(dateAdministered), 'MMMM d, yyyy');
    const sNames = analysis.strengths.map(s => s.domain).join(', ');
    const pNames = analysis.priorities.map(p => p.domain).join(', ');
    const nsNames = analysis.notScored.map(n => n.domain).join(', ');

    let text = `At this assessment timepoint (${date}), ${studentName}'s ${label} mastery is ${stats.overallMastery}% (${stats.overallRaw} raw points / ${stats.overallMax} possible from ${stats.overallScored} scored items).`;
    if (sNames) text += ` Strengths include: ${sNames}.`;
    if (pNames) text += ` Priority areas: ${pNames}.`;
    if (nsNames) text += ` Not yet assessed: ${nsNames}.`;
    return text;
  }, [dateAdministered, studentName, label, stats, analysis]);

  useState(() => { if (!narrative) setNarrative(generatedNarrative); });

  const toggleGoal = (id: string) => {
    setSelectedGoals(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCopy = () => {
    const text = `
${label} Assessment Report - ${studentName}
Date: ${format(new Date(dateAdministered), 'MMMM d, yyyy')}
Status: ${status === 'final' ? 'Finalized' : 'Draft'}

RESULTS SUMMARY
Overall Mastery: ${stats.overallMastery}% (${stats.overallRaw}/${stats.overallMax})
Items Scored: ${stats.overallScored}/${stats.overallTotal}

DOMAIN ANALYSIS
${Object.values(stats.byDomain).map(d =>
      `${d.domain}: ${d.masteryPercent}% (${d.rawTotal}/${d.maxPossible}) — ${d.status === 'not_scored' ? 'Not Yet Scored' : d.status}`
    ).join('\n')}

INTERPRETATION
${narrative || generatedNarrative}

GOAL RECOMMENDATIONS
${recommendations.map(g => `• [${g.type.toUpperCase()}] ${g.title}\n  Mastery: ${g.masteryCriteria}`).join('\n\n')}
    `.trim();
    navigator.clipboard.writeText(text);
    toast.success('Report copied to clipboard');
  };

  const getStatusBadge = (s: 'not_scored' | 'partial' | 'complete') => {
    switch (s) {
      case 'not_scored': return <Badge variant="outline" className="text-muted-foreground">Not Yet Scored</Badge>;
      case 'partial': return <Badge variant="secondary">Partially Scored</Badge>;
      case 'complete': return <Badge className="bg-emerald-600">Fully Scored</Badge>;
    }
  };

  const getTypeColor = (t: string) => {
    switch (t) {
      case 'acquisition': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'generalization': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'maintenance': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />{label} Results & Report
          </h3>
          <p className="text-sm text-muted-foreground">
            {studentName} • {format(new Date(dateAdministered), 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopy}>
            <Copy className="w-4 h-4 mr-2" />Copy Report
          </Button>
          <Button variant="outline">
            <FileDown className="w-4 h-4 mr-2" />Export PDF
          </Button>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4">
          <div className="text-3xl font-bold text-primary">{stats.overallMastery}%</div>
          <p className="text-xs text-muted-foreground">Overall Mastery</p>
          <p className="text-xs mt-1">{stats.overallRaw}/{stats.overallMax} points</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-3xl font-bold">{stats.overallScored}</div>
          <p className="text-xs text-muted-foreground">Items Scored</p>
          <p className="text-xs mt-1">of {stats.overallTotal} total</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-3xl font-bold">{analysis.strengths.length}</div>
          <p className="text-xs text-muted-foreground">Strength Areas</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-3xl font-bold">{analysis.notScored.length}</div>
          <p className="text-xs text-muted-foreground">Not Yet Scored</p>
        </CardContent></Card>
      </div>

      {/* Domain Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Domain Analysis</CardTitle></CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain / Skill Area</TableHead>
                  <TableHead className="text-center">Raw</TableHead>
                  <TableHead className="text-center">Max</TableHead>
                  <TableHead className="text-center">Mastery %</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.values(stats.byDomain)
                  .sort((a, b) => b.masteryPercent - a.masteryPercent)
                  .map(d => (
                    <TableRow key={d.domain}>
                      <TableCell className="font-medium text-sm">{d.domain}</TableCell>
                      <TableCell className="text-center">{d.rawTotal}</TableCell>
                      <TableCell className="text-center">{d.maxPossible}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Progress value={d.masteryPercent} className="w-16 h-2" />
                          <span className="text-sm">{d.masteryPercent}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(d.status)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Interpretation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2"><Lightbulb className="w-4 h-4" />Clinical Interpretation</span>
            <Button variant="ghost" size="sm" onClick={() => setEditingNarrative(!editingNarrative)}>
              <Edit2 className="w-4 h-4 mr-1" />{editingNarrative ? 'Done' : 'Edit'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="font-medium text-emerald-700">Top Strengths</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {analysis.strengths.map(s => (
                  <Badge key={s.domain} variant="outline" className="bg-white text-xs">
                    {s.domain} ({s.masteryPercent}%)
                  </Badge>
                ))}
                {analysis.strengths.length === 0 && (
                  <span className="text-sm text-muted-foreground">Score more items to identify</span>
                )}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-amber-700">Priority Areas</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {analysis.priorities.map(p => (
                  <Badge key={p.domain} variant="outline" className="bg-white text-xs">
                    {p.domain} ({p.masteryPercent}%)
                  </Badge>
                ))}
                {analysis.priorities.length === 0 && (
                  <span className="text-sm text-muted-foreground">Score more items to identify</span>
                )}
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
                {analysis.notScored.map(d => (
                  <Badge key={d.domain} variant="outline">{d.domain}</Badge>
                ))}
              </div>
            </div>
          )}

          {editingNarrative ? (
            <Textarea
              value={narrative || generatedNarrative}
              onChange={e => setNarrative(e.target.value)}
              rows={4}
            />
          ) : (
            <p className="text-sm leading-relaxed p-3 bg-muted/30 rounded-lg">
              {narrative || generatedNarrative}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Goal Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2"><Target className="w-4 h-4" />Goal Recommendations</span>
            {recommendations.length > 0 && selectedGoals.size > 0 && (
              <Button size="sm" onClick={() => toast.success(`${selectedGoals.size} goal(s) added to plan`)}>
                <Plus className="w-4 h-4 mr-1" />Add Selected
              </Button>
            )}
          </CardTitle>
          <CardDescription>Auto-generated based on priority areas.</CardDescription>
        </CardHeader>
        <CardContent>
          {recommendations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Score more items to generate recommendations</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-3">
                {recommendations.map(goal => (
                  <div
                    key={goal.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedGoals.has(goal.id) ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => toggleGoal(goal.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedGoals.has(goal.id)}
                        onCheckedChange={() => toggleGoal(goal.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{goal.title}</span>
                          <Badge variant="outline" className={getTypeColor(goal.type)}>
                            {goal.type}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
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
