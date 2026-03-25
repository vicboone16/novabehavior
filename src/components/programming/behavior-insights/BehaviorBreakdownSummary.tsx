import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Target, Lightbulb, AlertTriangle, Shield, TrendingUp, Users } from 'lucide-react';
import type { BehaviorSummaryRow } from './types';
import { generateFullSummary, type ToneProfile } from './summaryEngine';
import { useTemplateStore } from './useTemplateStore';

interface BehaviorBreakdownSummaryProps {
  rows: BehaviorSummaryRow[];
  studentName: string;
  dateRangeLabel?: string;
  totalDays?: number;
  daysWithData?: number;
  tone?: ToneProfile;
}

export function BehaviorBreakdownSummary({
  rows,
  studentName,
  dateRangeLabel = 'the selected range',
  totalDays = 30,
  daysWithData = 20,
  tone = 'clinical',
}: BehaviorBreakdownSummaryProps) {
  const enabledKeys = useTemplateStore(
    useShallow((state) => state.sections.filter((section) => section.enabled).map((section) => section.key))
  );
  const isEnabled = (key: string) => enabledKeys.includes(key);

  const summary = useMemo(() => {
    if (rows.length === 0) return null;
    return generateFullSummary({
      rows,
      studentName,
      tone,
      dateRangeLabel,
      totalDays,
      daysWithData,
    });
  }, [rows, studentName, tone, dateRangeLabel, totalDays, daysWithData]);

  if (!summary || rows.length === 0) return null;

  const confidenceBadge: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    low: { label: 'Low Confidence', variant: 'outline' },
    moderate: { label: 'Moderate Confidence', variant: 'secondary' },
    high: { label: 'High Confidence', variant: 'default' },
  };

  const funcLabel: Record<string, string> = {
    escape: 'Escape Pattern',
    attention: 'Attention Pattern',
    mixed: 'Mixed Pattern',
    automatic: 'Possible Automatic',
    unknown: 'Undetermined',
  };

  const cb = confidenceBadge[summary.confidenceTier];

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Behavior Breakdown Summary
          <Badge variant={cb.variant} className="text-[10px]">{cb.label}</Badge>
          <Badge variant="outline" className="text-[10px]">{funcLabel[summary.functionHypothesis]}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4">
        {/* Student Header */}
        {isEnabled('student_header') && (
          <div>
            <p className="text-xs font-semibold text-foreground">{studentName}</p>
            <p className="text-[10px] text-muted-foreground">{dateRangeLabel}</p>
          </div>
        )}

        {/* Behavior Percentages */}
        {isEnabled('behavior_percentages') && summary.behaviorPercentages.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Behavior %</p>
            <div className="space-y-1">
              {summary.behaviorPercentages.slice(0, 6).map(b => (
                <div key={b.behaviorId} className="flex items-center gap-2">
                  <div className="flex-1 text-xs truncate">{b.behaviorName}</div>
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(b.pct, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium w-8 text-right">{b.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data-Informed FBA Summary */}
        {isEnabled('fba_summary') && summary.fbaSummary && (
          <div className="bg-muted/40 rounded-lg p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Data-Informed Summary</p>
            <p className="text-xs text-foreground leading-relaxed">{summary.fbaSummary}</p>
          </div>
        )}

        {/* Escalation Chain */}
        {isEnabled('escalation_chain') && summary.escalationChain && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
            <p className="text-xs font-semibold text-destructive mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Escalation Pattern
            </p>
            <p className="text-xs text-foreground leading-relaxed">{summary.escalationChain}</p>
          </div>
        )}

        {/* Antecedents */}
        {isEnabled('antecedents') && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Antecedents
            </p>
            <p className="text-xs text-foreground leading-relaxed">{summary.antecedents}</p>
          </div>
        )}

        {/* Consequences */}
        {isEnabled('consequences') && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Consequences</p>
            <p className="text-xs text-foreground leading-relaxed">{summary.consequences}</p>
          </div>
        )}

        {/* Replacement Skills */}
        {isEnabled('replacement_skills') && (
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
        )}

        {/* Intervention Focus */}
        {isEnabled('intervention_focus') && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5" /> Intervention Focus
            </p>
            <ul className="space-y-0.5">
              {summary.interventionFocus.map((s, i) => (
                <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Staff Response */}
        {isEnabled('staff_response') && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Staff Response Focus
            </p>
            <div className="space-y-1">
              <div className="text-xs"><span className="font-semibold text-primary">Prevent:</span> {summary.staffResponse.prevent}</div>
              <div className="text-xs"><span className="font-semibold text-accent-foreground">Teach:</span> {summary.staffResponse.teach}</div>
              <div className="text-xs"><span className="font-semibold text-secondary-foreground">Respond:</span> {summary.staffResponse.respond}</div>
            </div>
          </div>
        )}

        {/* Reinforcement */}
        {isEnabled('reinforcement_focus') && summary.reinforcementNotes && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Reinforcement Notes
            </p>
            <p className="text-xs text-foreground leading-relaxed">{summary.reinforcementNotes}</p>
          </div>
        )}

        {/* Data Completeness */}
        {isEnabled('data_quality_note') && summary.dataCompletenessNote && (
          <div className="bg-muted/30 rounded-lg p-2">
            <p className="text-[10px] text-muted-foreground italic">{summary.dataCompletenessNote}</p>
          </div>
        )}

        {/* Trend Notes */}
        {summary.trendSummaries.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Trend Notes</p>
            <ul className="space-y-0.5">
              {summary.trendSummaries.map((t, i) => (
                <li key={i} className="text-xs text-foreground flex items-start gap-1.5">
                  <span className={`mt-0.5 ${t.type === 'increase' ? 'text-destructive' : t.type === 'decrease' ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {t.type === 'increase' ? '▲' : t.type === 'decrease' ? '▼' : '●'}
                  </span>
                  {t.text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
