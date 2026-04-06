import { useMemo, useState } from 'react';
import {
  Brain, Eye, Shield, Zap, Heart, Users,
  ArrowRight, Clock, CheckCircle2, FileText, Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useNovaAssessmentCatalog,
  useNovaStudentSessions,
  useCreateNovaSession,
  NovaAssessment,
} from '@/hooks/useNovaAssessments';

interface Props {
  studentId: string;
  studentName: string;
  onStartSession: (sessionId: string, assessmentCode: string, assessmentName: string, assessmentId: string) => void;
  onViewReport?: (sessionId: string, assessmentCode: string) => void;
  onViewMasterReport?: () => void;
  onViewMasterGenerator?: () => void;
}

const ASSESSMENT_META: Record<string, { icon: any; color: string; shortDesc: string }> = {
  SBRDS: {
    icon: Users,
    color: 'text-blue-600',
    shortDesc: 'Social behavior, relational safety, and energy regulation',
  },
  EFDP: {
    icon: Zap,
    color: 'text-amber-600',
    shortDesc: 'Executive functioning, demand response, and task regulation',
  },
  ABRSE: {
    icon: Shield,
    color: 'text-emerald-600',
    shortDesc: 'Replacement skills, communication, and tolerance behaviors',
  },
  NAP: {
    icon: Brain,
    color: 'text-purple-600',
    shortDesc: 'Neurodivergent archetype profiling across 7 clusters',
  },
  MCI: {
    icon: Eye,
    color: 'text-pink-600',
    shortDesc: 'Masking and camouflage behavior patterns',
  },
  PTCE: {
    icon: Heart,
    color: 'text-rose-600',
    shortDesc: 'Parent training competency and barrier assessment',
  },
};

export function NovaAssessmentListView({
  studentId,
  studentName,
  onStartSession,
  onViewReport,
  onViewMasterReport,
  onViewMasterGenerator,
}: Props) {
  const { data: catalog, isLoading: catalogLoading } = useNovaAssessmentCatalog();
  const { data: sessions, isLoading: sessionsLoading } = useNovaStudentSessions(studentId);
  const createSession = useCreateNovaSession();

  // Latest session per assessment
  const latestSessions = useMemo(() => {
    if (!sessions) return new Map<string, typeof sessions[0]>();
    const map = new Map<string, typeof sessions[0]>();
    sessions.forEach(s => {
      if (!map.has(s.assessment?.code)) {
        map.set(s.assessment?.code, s);
      }
    });
    return map;
  }, [sessions]);

  const handleStartNew = async (assessment: NovaAssessment) => {
    const session = await createSession.mutateAsync({
      assessmentId: assessment.id,
      studentId,
    });
    onStartSession(session.id, assessment.code, assessment.name, assessment.id);
  };

  const handleResumeDraft = (session: typeof sessions extends (infer T)[] ? T : never) => {
    onStartSession(
      session.id,
      session.assessment?.code || '',
      session.assessment?.name || '',
      session.assessment_id
    );
  };

  if (catalogLoading || sessionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Nova Assessments
          </h3>
          <p className="text-xs text-muted-foreground">
            Proprietary clinical instruments for {studentName}
          </p>
        </div>
        <div className="flex gap-2">
          {onViewMasterReport && (
            <Button variant="outline" size="sm" onClick={onViewMasterReport}>
              <FileText className="w-3 h-3 mr-1" />
              Master Report
            </Button>
          )}
          {onViewMasterGenerator && (
            <Button size="sm" onClick={onViewMasterGenerator}>
              <FileText className="w-3 h-3 mr-1" />
              Generate Report
            </Button>
          )}
        </div>
      </div>

      {/* Assessment Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {(catalog || []).map(assessment => {
          const meta = ASSESSMENT_META[assessment.code] || {
            icon: Brain,
            color: 'text-primary',
            shortDesc: assessment.description || '',
          };
          const Icon = meta.icon;
          const latest = latestSessions.get(assessment.code);
          const hasDraft = latest?.status === 'draft';
          const hasFinal = latest?.status === 'final';
          const statusLabel = hasFinal ? 'Final' : hasDraft ? 'Draft' : 'Not Started';
          const statusVariant = hasFinal ? 'default' : hasDraft ? 'secondary' : 'outline';

          return (
            <Card key={assessment.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${meta.color}`} />
                    <div>
                      <CardTitle className="text-sm">{assessment.name}</CardTitle>
                      <CardDescription className="text-[10px]">{assessment.code}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={statusVariant as any} className="text-xs">{statusLabel}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">{meta.shortDesc}</p>

                {latest && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Last: {new Date(latest.administration_date).toLocaleDateString()}</span>
                    {latest.rater_name && <span>• {latest.rater_name}</span>}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="default"
                    className="text-xs h-7"
                    onClick={() => handleStartNew(assessment)}
                    disabled={createSession.isPending}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Start New
                  </Button>
                  {hasDraft && latest && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-xs h-7"
                      onClick={() => handleResumeDraft(latest)}
                    >
                      <ArrowRight className="w-3 h-3 mr-1" />
                      Resume Draft
                    </Button>
                  )}
                  {hasFinal && latest && onViewReport && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => onViewReport(latest.id, assessment.code)}
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      View Report
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
