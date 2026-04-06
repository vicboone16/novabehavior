import {
  Brain, BarChart3, AlertTriangle, FileText, Users, Zap, Shield, Heart, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useNovaMasterReport, useNovaAbrseRecommendations } from '@/hooks/useNovaAssessments';

interface Props {
  studentId: string;
  studentName: string;
  onBack?: () => void;
  onViewReport?: (sessionId: string, assessmentCode: string) => void;
}

const TOOL_META: Record<string, { icon: any; color: string; label: string }> = {
  sbrds: { icon: Users, color: 'text-blue-600', label: 'Social Behavior & Relational Dynamics Scale' },
  efdp: { icon: Zap, color: 'text-amber-600', label: 'Executive Functioning & Demand Profile' },
  abrse: { icon: Shield, color: 'text-emerald-600', label: 'Adaptive Behavior & Replacement Skills Engine' },
  nap: { icon: Brain, color: 'text-purple-600', label: 'Neurodivergent Archetype Profiler' },
};

export function NovaMasterReportView({ studentId, studentName, onBack, onViewReport }: Props) {
  const { data: report, isLoading } = useNovaMasterReport(studentId);
  const { data: abrseRecs } = useNovaAbrseRecommendations(report?.abrse_session_id || undefined);

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
        <CardContent className="text-center space-y-2">
          <Brain className="w-10 h-10 mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No finalized assessments found. Complete and finalize at least one Nova assessment to generate a master report.
          </p>
        </CardContent>
      </Card>
    );
  }

  const tools = [
    { key: 'sbrds', sessionId: report.sbrds_session_id, summary: report.sbrds_summary, results: report.sbrds_results },
    { key: 'efdp', sessionId: report.efdp_session_id, summary: report.efdp_summary, results: report.efdp_results },
    { key: 'abrse', sessionId: report.abrse_session_id, summary: report.abrse_summary, results: report.abrse_results },
    { key: 'nap', sessionId: report.nap_session_id, summary: report.nap_summary, results: report.nap_results },
  ];

  return (
    <div className="space-y-4 max-w-4xl">
      {onBack && (
        <Button variant="outline" size="sm" onClick={onBack}>← Back</Button>
      )}

      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Nova Master Clinical Report</CardTitle>
              <CardDescription className="text-xs">
                Integrated assessment summary for {studentName}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Master Summary */}
      {report.master_summary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Integrated Clinical Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{report.master_summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Individual Tool Summaries */}
      {tools.map(tool => {
        if (!tool.sessionId) return null;
        const meta = TOOL_META[tool.key];
        const Icon = meta.icon;
        const results = tool.results || [];
        const profiles = results.filter((r: any) => r.result_scope === 'profile' || r.result_scope === 'archetype');
        const domains = results.filter((r: any) => r.result_scope === 'domain');

        return (
          <Card key={tool.key}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${meta.color}`} />
                  {meta.label}
                </CardTitle>
                {onViewReport && tool.sessionId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => onViewReport(tool.sessionId!, tool.key.toUpperCase())}
                  >
                    View Full →
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {tool.summary && (
                <p className="text-xs leading-relaxed text-muted-foreground">{tool.summary}</p>
              )}

              {/* Profile badges */}
              {profiles.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {profiles.map((p: any, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">
                      {p.result_label}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Domain mini-scores */}
              {domains.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {domains.map((d: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs">
                      <span className="truncate">{d.result_label}</span>
                      <span className="font-mono ml-2">{d.avg_score?.toFixed(2) ?? '–'}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* ABRSE Replacement Highlights */}
      {abrseRecs && abrseRecs.filter(r => r.target_code).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              Priority Replacement Targets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-2">
              {abrseRecs.filter(r => r.target_code).slice(0, 6).map((rec, i) => (
                <div key={i} className="p-2 bg-muted/30 rounded border text-xs">
                  <p className="font-medium">{rec.target_label}</p>
                  <p className="text-muted-foreground mt-1">{rec.replacement_behavior}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
