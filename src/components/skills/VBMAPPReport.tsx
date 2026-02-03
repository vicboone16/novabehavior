import { useState, useMemo } from 'react';
import { 
  BarChart3, TrendingUp, TrendingDown, Target, Copy, FileDown,
  CheckCircle2, AlertTriangle, HelpCircle, Plus, Lightbulb, Edit2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { StudentAssessment, MilestoneScore, CurriculumItem } from '@/types/curriculum';

interface VBMAPPReportProps {
  assessment: StudentAssessment;
  items: CurriculumItem[];
  scores: Record<string, MilestoneScore>;
  studentName: string;
  onAddGoals?: (goals: GoalRecommendation[]) => void;
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

export function VBMAPPReport({ assessment, items, scores, studentName, onAddGoals }: VBMAPPReportProps) {
  const [editingNarrative, setEditingNarrative] = useState(false);
  const [narrative, setNarrative] = useState('');
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set());

  // Calculate overall and level stats
  const stats = useMemo(() => {
    const overall = { scored: 0, total: items.length, mastered: 0, raw: 0, max: items.length };
    const byLevel: Record<string, { scored: number; total: number; mastered: number; raw: number; max: number }> = {};
    const byDomain: Record<string, DomainStats> = {};

    items.forEach(item => {
      const level = item.level || 'Unknown';
      const domain = item.domain?.name || 'Other';
      const score = scores[item.id];

      // Initialize level stats
      if (!byLevel[level]) {
        byLevel[level] = { scored: 0, total: 0, mastered: 0, raw: 0, max: 0 };
      }
      byLevel[level].total++;
      byLevel[level].max++;

      // Initialize domain stats
      if (!byDomain[domain]) {
        byDomain[domain] = {
          domain,
          scored: 0,
          total: 0,
          mastered: 0,
          emerging: 0,
          notDemonstrated: 0,
          masteryPercent: 0,
          status: 'not_scored',
        };
      }
      byDomain[domain].total++;

      // Process score
      if (score?.score !== undefined && score.score !== null) {
        overall.scored++;
        overall.raw += score.score;
        byLevel[level].scored++;
        byLevel[level].raw += score.score;
        byDomain[domain].scored++;

        if (score.score === 1) {
          overall.mastered++;
          byLevel[level].mastered++;
          byDomain[domain].mastered++;
        } else if (score.score === 0.5) {
          byDomain[domain].emerging++;
        } else if (score.score === 0) {
          byDomain[domain].notDemonstrated++;
        }
      }
    });

    // Calculate domain percentages and status
    Object.values(byDomain).forEach(d => {
      d.masteryPercent = d.scored > 0 ? Math.round((d.mastered / d.scored) * 100) : 0;
      d.status = d.scored === 0 ? 'not_scored' : d.scored === d.total ? 'complete' : 'partial';
    });

    const overallMasteryPercent = overall.scored > 0 ? Math.round((overall.mastered / overall.scored) * 100) : 0;

    return { overall, overallMasteryPercent, byLevel, byDomain };
  }, [items, scores]);

  // Identify strengths and priority areas
  const analysis = useMemo(() => {
    const scoredDomains = Object.values(stats.byDomain).filter(d => d.status !== 'not_scored');
    const notScoredDomains = Object.values(stats.byDomain).filter(d => d.status === 'not_scored');
    
    const sorted = [...scoredDomains].sort((a, b) => b.masteryPercent - a.masteryPercent);
    const strengths = sorted.slice(0, Math.min(5, Math.ceil(sorted.length / 2)));
    const priorities = sorted.slice(-Math.min(5, Math.ceil(sorted.length / 2))).reverse();

    return { strengths, priorities, notScored: notScoredDomains };
  }, [stats]);

  // Generate goal recommendations for priority domains
  const recommendations = useMemo(() => {
    const goals: GoalRecommendation[] = [];

    analysis.priorities.forEach(domain => {
      const domainItems = items.filter(i => i.domain?.name === domain.domain);
      
      // Analyze what types of items need work
      const zeros = domainItems.filter(i => scores[i.id]?.score === 0);
      const halfs = domainItems.filter(i => scores[i.id]?.score === 0.5);
      const ones = domainItems.filter(i => scores[i.id]?.score === 1);

      // Generate recommendations based on item distribution
      if (zeros.length > halfs.length) {
        // Mostly 0s - recommend acquisition targets
        zeros.slice(0, 2).forEach((item, idx) => {
          goals.push({
            id: `${domain.domain}-acq-${idx}`,
            domain: domain.domain,
            title: `Acquire: ${item.title}`,
            type: 'acquisition',
            measurement: 'percent correct',
            masteryCriteria: '80% correct across 3 consecutive sessions',
            selected: false,
          });
        });
      }
      
      if (halfs.length > 0) {
        // Has emerging skills - recommend generalization
        halfs.slice(0, 2).forEach((item, idx) => {
          goals.push({
            id: `${domain.domain}-gen-${idx}`,
            domain: domain.domain,
            title: `Generalize: ${item.title}`,
            type: 'generalization',
            measurement: 'frequency across settings',
            masteryCriteria: 'Demonstrated across 3 different settings/people',
            selected: false,
          });
        });
      }

      if (ones.length > 0 && ones.length < domainItems.length * 0.3) {
        // Few mastered - recommend maintenance
        ones.slice(0, 1).forEach((item, idx) => {
          goals.push({
            id: `${domain.domain}-maint-${idx}`,
            domain: domain.domain,
            title: `Maintain: ${item.title}`,
            type: 'maintenance',
            measurement: 'probe trials',
            masteryCriteria: '90% correct on monthly probes',
            selected: false,
          });
        });
      }
    });

    return goals;
  }, [analysis.priorities, items, scores]);

  // Generate narrative
  const generatedNarrative = useMemo(() => {
    const date = format(new Date(assessment.date_administered), 'MMMM d, yyyy');
    const strengthNames = analysis.strengths.map(s => s.domain).join(', ');
    const priorityNames = analysis.priorities.map(p => p.domain).join(', ');
    const notScoredNames = analysis.notScored.map(n => n.domain).join(', ');

    let text = `At this assessment timepoint (${date}), ${studentName}'s VB-MAPP mastery is ${stats.overallMasteryPercent}% (${stats.overall.mastered}/${stats.overall.scored} scored items mastered).`;
    
    if (strengthNames) {
      text += ` Strengths include ${strengthNames}.`;
    }
    
    if (priorityNames) {
      text += ` Priority areas for intervention include ${priorityNames}, reflecting assessed but unmet skills.`;
    }
    
    if (notScoredNames) {
      text += ` Domains not yet assessed include ${notScoredNames}.`;
    }

    return text;
  }, [assessment, studentName, stats, analysis]);

  // Set initial narrative
  useState(() => {
    if (!narrative) setNarrative(generatedNarrative);
  });

  const toggleGoalSelection = (goalId: string) => {
    setSelectedGoals(prev => {
      const next = new Set(prev);
      if (next.has(goalId)) {
        next.delete(goalId);
      } else {
        next.add(goalId);
      }
      return next;
    });
  };

  const handleCopyReport = () => {
    const reportText = `
VB-MAPP Assessment Report - ${studentName}
Date: ${format(new Date(assessment.date_administered), 'MMMM d, yyyy')}
Status: ${assessment.status === 'final' ? 'Finalized' : 'Draft'}

RESULTS SUMMARY
---------------
Overall Mastery: ${stats.overallMasteryPercent}% (${stats.overall.mastered}/${stats.overall.scored} mastered)
Total Items Scored: ${stats.overall.scored}/${stats.overall.total}

LEVEL BREAKDOWN
${Object.entries(stats.byLevel).map(([level, data]) => 
  `${level}: ${data.mastered}/${data.scored} mastered (${data.scored > 0 ? Math.round((data.mastered/data.scored)*100) : 0}%)`
).join('\n')}

DOMAIN ANALYSIS
${Object.values(stats.byDomain).map(d => 
  `${d.domain}: ${d.masteryPercent}% mastery (${d.scored}/${d.total} scored) - ${d.status === 'not_scored' ? 'Not Yet Scored' : d.status === 'complete' ? 'Fully Scored' : 'Partially Scored'}`
).join('\n')}

CLINICAL INTERPRETATION
-----------------------
${narrative || generatedNarrative}

GOAL RECOMMENDATIONS
--------------------
${recommendations.filter(g => selectedGoals.has(g.id) || selectedGoals.size === 0).map(g =>
  `• [${g.type.toUpperCase()}] ${g.title}\n  Measurement: ${g.measurement}\n  Mastery: ${g.masteryCriteria}`
).join('\n\n')}
    `.trim();

    navigator.clipboard.writeText(reportText);
    toast.success('Report copied to clipboard');
  };

  const handleAddSelectedGoals = () => {
    const selected = recommendations.filter(g => selectedGoals.has(g.id));
    if (selected.length === 0) {
      toast.error('Please select at least one goal');
      return;
    }
    onAddGoals?.(selected);
    toast.success(`${selected.length} goal(s) added to treatment plan`);
  };

  const getStatusBadge = (status: 'not_scored' | 'partial' | 'complete') => {
    switch (status) {
      case 'not_scored':
        return <Badge variant="outline" className="text-muted-foreground">Not Yet Scored</Badge>;
      case 'partial':
        return <Badge variant="secondary">Partially Scored</Badge>;
      case 'complete':
        return <Badge className="bg-emerald-600">Fully Scored</Badge>;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'acquisition':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'generalization':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'maintenance':
        return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      default:
        return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            VB-MAPP Results & Report
          </h3>
          <p className="text-sm text-muted-foreground">
            {studentName} • {format(new Date(assessment.date_administered), 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleCopyReport}>
            <Copy className="w-4 h-4 mr-2" />
            Copy Report
          </Button>
          <Button variant="outline">
            <FileDown className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-primary">{stats.overallMasteryPercent}%</div>
            <p className="text-xs text-muted-foreground">Overall Mastery</p>
            <p className="text-xs mt-1">{stats.overall.mastered}/{stats.overall.scored} mastered</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold">{stats.overall.scored}</div>
            <p className="text-xs text-muted-foreground">Items Scored</p>
            <p className="text-xs mt-1">of {stats.overall.total} total</p>
          </CardContent>
        </Card>
        {Object.entries(stats.byLevel).slice(0, 2).map(([level, data]) => (
          <Card key={level}>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold">
                {data.scored > 0 ? Math.round((data.mastered / data.scored) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">{level} Mastery</p>
              <p className="text-xs mt-1">{data.mastered}/{data.scored} mastered</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Domain Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Domain Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead className="text-center">Raw Total</TableHead>
                <TableHead className="text-center">Max</TableHead>
                <TableHead className="text-center">Mastery %</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.values(stats.byDomain)
                .sort((a, b) => b.masteryPercent - a.masteryPercent)
                .map(domain => (
                  <TableRow key={domain.domain}>
                    <TableCell className="font-medium">{domain.domain}</TableCell>
                    <TableCell className="text-center">{domain.mastered}</TableCell>
                    <TableCell className="text-center">{domain.scored}</TableCell>
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

      {/* Interpretation */}
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
            {/* Strengths & Priorities Summary */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium text-emerald-700">Top Strengths</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {analysis.strengths.map(s => (
                    <Badge key={s.domain} variant="outline" className="bg-white">
                      {s.domain} ({s.masteryPercent}%)
                    </Badge>
                  ))}
                  {analysis.strengths.length === 0 && (
                    <span className="text-sm text-muted-foreground">Score more items to identify strengths</span>
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
                    <Badge key={p.domain} variant="outline" className="bg-white">
                      {p.domain} ({p.masteryPercent}%)
                    </Badge>
                  ))}
                  {analysis.priorities.length === 0 && (
                    <span className="text-sm text-muted-foreground">Score more items to identify priorities</span>
                  )}
                </div>
              </div>
            </div>

            {/* Not Scored Domains */}
            {analysis.notScored.length > 0 && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-2 mb-2">
                  <HelpCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Domains Not Yet Assessed</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {analysis.notScored.map(d => (
                    <Badge key={d.domain} variant="outline">{d.domain}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Narrative */}
            {editingNarrative ? (
              <Textarea
                value={narrative || generatedNarrative}
                onChange={(e) => setNarrative(e.target.value)}
                rows={4}
                placeholder="Clinical interpretation..."
              />
            ) : (
              <p className="text-sm leading-relaxed p-3 bg-muted/30 rounded-lg">
                {narrative || generatedNarrative}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

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
                Add Selected to Treatment Plan
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            Auto-generated goals based on priority domains. Select goals to add to treatment plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recommendations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Score more items to generate goal recommendations</p>
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
                    onClick={() => toggleGoalSelection(goal.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedGoals.has(goal.id)}
                        onCheckedChange={() => toggleGoalSelection(goal.id)}
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
                          <p><strong>Domain:</strong> {goal.domain}</p>
                          <p><strong>Measurement:</strong> {goal.measurement}</p>
                          <p><strong>Mastery Criteria:</strong> {goal.masteryCriteria}</p>
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