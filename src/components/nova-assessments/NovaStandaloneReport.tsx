import { useMemo } from 'react';
import {
  Brain, BarChart3, AlertTriangle, CheckCircle2, FileText,
  Users, Zap, Shield, Heart, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  useNovaAssessmentReport,
  useNovaAbrseRecommendations,
  NovaReportData,
} from '@/hooks/useNovaAssessments';

interface Props {
  sessionId: string;
  assessmentCode: string;
  onBack?: () => void;
}

export function NovaStandaloneReport({ sessionId, assessmentCode, onBack }: Props) {
  const { data: report, isLoading } = useNovaAssessmentReport(sessionId);
  const { data: abrseRecs } = useNovaAbrseRecommendations(
    assessmentCode === 'ABRSE' ? sessionId : undefined
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!report) {
    return (
      <Card className="py-12">
        <CardContent className="text-center text-sm text-muted-foreground">
          No report data available. Please score the assessment first.
        </CardContent>
      </Card>
    );
  }

  const domainResults = report.domain_results || [];
  const profiles = report.profiles || [];
  const flags = report.flags || [];

  return (
    <div className="space-y-4 max-w-4xl">
      {onBack && (
        <Button variant="outline" size="sm" onClick={onBack}>← Back</Button>
      )}

      {/* Report Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-lg">{report.assessment_name}</CardTitle>
              <CardDescription className="text-xs">
                Assessment Report • {report.assessment_code}
              </CardDescription>
            </div>
            <Badge variant="default">Report</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium">{report.administration_date}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Rater</p>
              <p className="font-medium">{report.rater_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Role</p>
              <p className="font-medium capitalize">{report.rater_role || 'N/A'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Setting</p>
              <p className="font-medium">{report.setting_name || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Clinical Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{report.summary_text}</p>
        </CardContent>
      </Card>

      {/* Domain Results */}
      {domainResults.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Domain Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {domainResults.map((d: any, i: number) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{d.domain_name || d.domain_code}</span>
                    <div className="flex items-center gap-2">
                      {d.band_label && <Badge variant="outline" className="text-[10px]">{d.band_label}</Badge>}
                      <span className="font-mono">{d.avg_score?.toFixed(2) ?? 'N/A'}</span>
                    </div>
                  </div>
                  <Progress value={d.avg_score ? (d.avg_score / 3) * 100 : 0} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profiles */}
      {profiles.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4" />
              {assessmentCode === 'NAP' ? 'Archetypes' : 'Profile Classification'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profiles.map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  <Badge variant={p.is_primary ? 'default' : 'secondary'} className="text-xs">
                    {p.is_primary ? 'Primary' : 'Secondary'}
                  </Badge>
                  <span className="text-sm font-medium">{p.profile_name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Flags */}
      {flags.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Clinical Flags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {flags.map((f: any, i: number) => (
                <Badge key={i} variant="destructive" className="text-xs">
                  {f.flag_name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ABRSE Replacement Targets */}
      {abrseRecs && abrseRecs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              Replacement Targets & Intervention Suggestions
            </CardTitle>
            <CardDescription className="text-xs">
              Items scoring ≤1 with matched replacement behaviors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {abrseRecs.filter(r => r.target_code).map((rec, i) => (
                <div key={i} className="p-3 bg-muted/30 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{rec.target_label}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">{rec.behavior_function}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <strong>Low item:</strong> {rec.item_text} (Score: {rec.raw_score})
                  </p>
                  <p className="text-xs">{rec.replacement_behavior}</p>
                  {rec.goal_template && (
                    <div className="p-2 bg-background rounded border text-xs">
                      <p className="font-medium text-[10px] text-muted-foreground mb-1">Goal Template</p>
                      <p>{rec.goal_template}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
