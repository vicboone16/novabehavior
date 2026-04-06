import { useState, useMemo } from 'react';
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
  useNovaFullNarrative,
  NovaReportData,
} from '@/hooks/useNovaAssessments';
import { NovaRecommendationPanel } from './NovaRecommendationPanel';
import { NovaGoalsPanel } from './NovaGoalsPanel';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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
  const { data: fullNarrative } = useNovaFullNarrative(sessionId);

  // Parse full narrative into sections
  const narrativeSections = useMemo(() => {
    if (!fullNarrative) return [];
    const sections: { title: string; content: string }[] = [];
    const parts = fullNarrative.split(/\n\n/);
    let currentTitle = '';
    let currentContent = '';
    for (const part of parts) {
      const lines = part.split('\n');
      const firstLine = lines[0]?.trim();
      if (['CLINICAL SUMMARY', 'DOMAIN ANALYSIS', 'PATTERN INSIGHTS', 'CLINICAL RECOMMENDATIONS',
           'ARCHETYPE ANALYSIS', 'CLINICAL FLAGS', 'REPLACEMENT SKILL PRIORITIES',
           'FIDELITY RISK', 'CULTURAL CONTEXT'].includes(firstLine)) {
        if (currentTitle) sections.push({ title: currentTitle, content: currentContent.trim() });
        currentTitle = firstLine;
        currentContent = lines.slice(1).join(' ');
      } else {
        currentContent += ' ' + part;
      }
    }
    if (currentTitle) sections.push({ title: currentTitle, content: currentContent.trim() });
    return sections;
  }, [fullNarrative]);

  const domainResults = report?.domain_results || [];
  const profiles = report?.profiles || [];
  const flags = report?.flags || [];

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

  // narrativeSections already computed above

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

      {/* Tabbed Content */}
      <Tabs defaultValue="summary" className="w-full">
        <TabsList>
          <TabsTrigger value="summary">Clinical Summary</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
