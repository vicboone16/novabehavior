import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Target, Lightbulb } from 'lucide-react';
import type { BehaviorSummaryRow } from './types';

interface BehaviorBreakdownSummaryProps {
  rows: BehaviorSummaryRow[];
  studentName: string;
}

export function BehaviorBreakdownSummary({ rows, studentName }: BehaviorBreakdownSummaryProps) {
  const summary = useMemo(() => {
    if (rows.length === 0) return null;

    const topBehaviors = rows.slice(0, 6);
    const increasing = rows.filter(r => r.clinicalFlag === 'increasing' || r.clinicalFlag === 'spike');
    const decreasing = rows.filter(r => r.clinicalFlag === 'decreasing');

    // Data-informed FBA-style summary
    let fbaSummary = '';
    if (topBehaviors.length > 0) {
      const topName = topBehaviors[0].behaviorName;
      const topPct = topBehaviors[0].pctOfTotal;
      fbaSummary = `Behavior distribution suggests that ${topName} (${topPct}%) is the primary concern.`;

      if (topBehaviors.length > 1) {
        const secondName = topBehaviors[1].behaviorName;
        fbaSummary += ` ${secondName} appears as a secondary pattern.`;
      }

      if (increasing.length > 0) {
        fbaSummary += ` Data is consistent with an escalating pattern in ${increasing.map(r => r.behaviorName).join(', ')}.`;
      }
      if (decreasing.length > 0) {
        fbaSummary += ` Improvements noted in ${decreasing.map(r => r.behaviorName).join(', ')}.`;
      }
    }

    // Replacement skills
    const replacementSkills: string[] = [];
    if (rows.some(r => r.behaviorName.toLowerCase().includes('escape') || r.behaviorName.toLowerCase().includes('refusal') || r.behaviorName.toLowerCase().includes('noncompliance'))) {
      replacementSkills.push('Request break', 'Request help', 'Task tolerance');
    }
    if (rows.some(r => r.behaviorName.toLowerCase().includes('aggress') || r.behaviorName.toLowerCase().includes('tantrum'))) {
      replacementSkills.push('Self-regulation', 'Identify emotion', 'Use calm-down strategy');
    }
    if (rows.some(r => r.behaviorName.toLowerCase().includes('attention') || r.behaviorName.toLowerCase().includes('disruption'))) {
      replacementSkills.push('Appropriate bid for attention', 'Wait signal', 'Independent work skills');
    }
    if (replacementSkills.length === 0) {
      replacementSkills.push('Functional communication', 'Self-monitoring', 'Coping strategy use');
    }

    // Intervention focus
    const interventions: string[] = [];
    if (increasing.length > 0) interventions.push('Interrupt escalation patterns early');
    interventions.push('Reinforce replacement behaviors');
    if (topBehaviors[0]?.avgPerDay > 3) interventions.push('Reduce antecedent triggers');
    interventions.push('Monitor data trends weekly');

    return { topBehaviors, fbaSummary, replacementSkills, interventions };
  }, [rows]);

  if (!summary || rows.length === 0) return null;

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Behavior Breakdown Summary
          <Badge variant="secondary" className="text-[10px]">Data-Informed</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4">
        {/* Student Header */}
        <div>
          <p className="text-xs font-semibold text-foreground">{studentName}</p>
        </div>

        {/* Behavior Percentages */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5">Behavior %</p>
          <div className="space-y-1">
            {summary.topBehaviors.map(b => (
              <div key={b.behaviorId} className="flex items-center gap-2">
                <div className="flex-1 text-xs">{b.behaviorName}</div>
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.min(b.pctOfTotal, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium w-8 text-right">{b.pctOfTotal}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* FBA Summary */}
        {summary.fbaSummary && (
          <div className="bg-muted/40 rounded-lg p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Data-Informed Summary</p>
            <p className="text-xs text-foreground leading-relaxed">{summary.fbaSummary}</p>
          </div>
        )}

        {/* Priority Skills */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
            <Target className="w-3.5 h-3.5" /> Priority Replacement Skills
          </p>
          <div className="flex flex-wrap gap-1.5">
            {summary.replacementSkills.map((s, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">{s}</Badge>
            ))}
          </div>
        </div>

        {/* Intervention Focus */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5" /> Intervention Focus
          </p>
          <ul className="space-y-0.5">
            {summary.interventions.map((s, i) => (
              <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                <span className="text-muted-foreground mt-0.5">•</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
