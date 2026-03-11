import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BrainCircuit, Sparkles, TrendingUp, AlertTriangle, Heart, Lightbulb } from 'lucide-react';
import { TreatmentIntelligenceActions } from '@/components/optimization/TreatmentIntelligenceActions';

interface Props {
  intelligenceContext: any;
  snapshot: any;
  studentId: string;
}

export function IEPClinicalInsightsSection({ intelligenceContext, snapshot, studentId }: Props) {
  const navigate = useNavigate();
  const ctx = intelligenceContext || {};

  const askNovaAI = (prompt: string) => {
    const params = new URLSearchParams();
    params.set('prompt', prompt);
    params.set('clientId', studentId);
    params.set('context', 'iep_clinical_insights');
    navigate(`/nova-ai?${params.toString()}`);
  };

  const strengths: string[] = [];
  const concerns: string[] = [];
  const priorities: string[] = [];

  if (ctx.ready_to_advance_count > 0) strengths.push(`${ctx.ready_to_advance_count} targets ready to advance`);
  if (ctx.strong_replacement_behavior_count > 0) strengths.push(`${ctx.strong_replacement_behavior_count} strong replacement behaviors`);
  if (ctx.caregiver_mastered_goals > 0) strengths.push(`${ctx.caregiver_mastered_goals} caregiver goals mastered`);
  if (ctx.stalled_target_count > 0) concerns.push(`${ctx.stalled_target_count} stalled targets`);
  if (ctx.prompt_dependency_count > 0) concerns.push(`${ctx.prompt_dependency_count} prompt-dependent targets`);
  if (ctx.weak_replacement_behavior_count > 0) concerns.push(`${ctx.weak_replacement_behavior_count} weak replacement behaviors`);
  if (ctx.behavior_alert_count > 0) priorities.push(`${ctx.behavior_alert_count} behavior alerts to discuss`);
  if (ctx.programming_alert_count > 0) priorities.push(`${ctx.programming_alert_count} programming alerts`);
  if (ctx.caregiver_alert_count > 0) priorities.push(`${ctx.caregiver_alert_count} caregiver training flags`);

  const insightsSummary = [
    strengths.length > 0 ? `Strengths: ${strengths.join(', ')}` : '',
    concerns.length > 0 ? `Concerns: ${concerns.join(', ')}` : '',
    priorities.length > 0 ? `Priorities: ${priorities.join(', ')}` : '',
  ].filter(Boolean).join('. ');

  return (
    <div className="space-y-3">
      {/* Insight Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-success/20 bg-success/5">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs flex items-center gap-1.5 text-success">
              <TrendingUp className="w-3.5 h-3.5" /> Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            {strengths.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">No notable strengths flagged</p>
            ) : (
              <ul className="space-y-1">
                {strengths.map((s, i) => (
                  <li key={i} className="text-[11px] text-foreground flex items-start gap-1.5">
                    <span className="text-success mt-0.5">•</span>{s}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-warning/20 bg-warning/5">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs flex items-center gap-1.5 text-warning">
              <AlertTriangle className="w-3.5 h-3.5" /> Concerns
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            {concerns.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">No concerns flagged</p>
            ) : (
              <ul className="space-y-1">
                {concerns.map((c, i) => (
                  <li key={i} className="text-[11px] text-foreground flex items-start gap-1.5">
                    <span className="text-warning mt-0.5">•</span>{c}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs flex items-center gap-1.5 text-foreground">
              <Lightbulb className="w-3.5 h-3.5 text-primary" /> Likely Priorities
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            {priorities.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">No priorities flagged</p>
            ) : (
              <ul className="space-y-1">
                {priorities.map((p, i) => (
                  <li key={i} className="text-[11px] text-foreground flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">•</span>{p}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Caregiver Context */}
      {ctx.caregiver_total_goals > 0 && (
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <Heart className="w-4 h-4 text-accent shrink-0" />
            <div className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Caregiver Training:</span>{' '}
              {ctx.caregiver_mastered_goals}/{ctx.caregiver_total_goals} goals mastered,{' '}
              {ctx.caregiver_in_progress_goals} in progress,{' '}
              {ctx.caregiver_not_started_goals} not started
            </div>
          </CardContent>
        </Card>
      )}

      {/* Nova AI Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => askNovaAI('Generate clinical meeting insights for this student including strengths, concerns, and recommended discussion priorities based on current data.')}>
          <Sparkles className="w-3 h-3" /> Generate Meeting Insights
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => askNovaAI('Write a parent-friendly explanation of this student\'s current clinical status, strengths, and areas of focus. Use supportive, clear language.')}>
          <Heart className="w-3 h-3" /> Parent-Friendly Explanation
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => askNovaAI('Draft IEP summary language for this student covering present levels, goal progress, behavior trends, and recommended next steps.')}>
          <BrainCircuit className="w-3 h-3" /> Draft IEP Summary Language
        </Button>
      </div>

      {/* Treatment Intelligence Export Actions */}
      {insightsSummary && (
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground mb-2 font-medium">Export Clinical Insights</p>
            <TreatmentIntelligenceActions
              studentId={studentId}
              section="clinical_recommendations"
              contextText={insightsSummary}
              title="Clinical Insights Summary"
              compact={false}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
