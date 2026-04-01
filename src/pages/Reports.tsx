import { SessionDataReview } from '@/components/SessionDataReview';
import { BehaviorTrendCharts } from '@/components/BehaviorTrendCharts';
import { SessionReportGenerator } from '@/components/SessionReportGenerator';
import { BehaviorGoalsManager } from '@/components/BehaviorGoalsManager';
import { ScatterplotAnalysis } from '@/components/ScatterplotAnalysis';
import { DataExportManager } from '@/components/DataExportManager';
import { ABCReportGenerator } from '@/components/ABCReportGenerator';
import { StudentComparison } from '@/components/StudentComparison';
import { EnhancedExportOptions } from '@/components/EnhancedExportOptions';
import { FBAReportGenerator } from '@/components/FBAReportGenerator';
import { BIPGenerator } from '@/components/BIPGenerator';
import { ParentFriendlyFBASummary } from '@/components/ParentFriendlyFBASummary';
import { SkillProgressReports } from '@/components/skills/SkillProgressReports';
import { ReportBrandingEditor } from '@/components/reports';
import { InsuranceReportGenerator } from '@/components/reports/InsuranceReportGenerator';
import { ReportGoalInclusionManager } from '@/components/reports/ReportGoalInclusionManager';
import { NovaAILauncher } from '@/components/nova-ai/NovaAILauncher';
import { FileText, Users, Download, BarChart3, ClipboardCheck, Shield, Heart, Target, Palette, FileBarChart, Building2, BookOpen, Brain, FilePlus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BopsReportWorkspace } from '@/components/bops/BopsReportWorkspace';
import { useGenerateBopsReport, useGenerateBopsReportForSession, useBopsSessionList } from '@/hooks/useBopsReports';
import { useCreateNydoeReport, useStudentNydoeReports } from '@/hooks/useNydoeReport';
import { useDataStore } from '@/store/dataStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function Reports() {
  const [showBrandingEditor, setShowBrandingEditor] = useState(false);
  const [bopsStudentId, setBopsStudentId] = useState<string>('');
  const [bopsSessionId, setBopsSessionId] = useState<string>('');
  const [bopsReportId, setBopsReportId] = useState<string | null>(null);
  const generateReport = useGenerateBopsReport();
  const generateForSession = useGenerateBopsReportForSession();
  const students = useDataStore(s => s.students);
  const { data: sessions } = useBopsSessionList(bopsStudentId || undefined);

  const handleGenerateBopsReport = () => {
    if (!bopsStudentId) return;
    if (bopsSessionId) {
      generateForSession.mutate(
        { studentId: bopsStudentId, sessionId: bopsSessionId },
        { onSuccess: (id) => setBopsReportId(id) },
      );
    } else {
      generateReport.mutate(
        { studentId: bopsStudentId },
        { onSuccess: (id) => setBopsReportId(id) },
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Reports & Analysis</h2>
          <p className="text-muted-foreground text-sm">
            View session history, generate reports, and analyze behavior trends
          </p>
        </div>
        <div className="flex gap-2">
          <NovaAILauncher
            context="report_generator"
            actions={[
              { label: 'Draft Report Section', prompt: 'Draft a clinical progress summary for inclusion in a report', mode: 'case_report_language' },
              { label: 'Write Progress Summary', prompt: 'Write a comprehensive clinical progress summary', mode: 'case_report_language' },
            ]}
          />
          <Button variant="outline" size="sm" onClick={() => setShowBrandingEditor(true)}>
            <Palette className="w-4 h-4 mr-1" />
            Branding
          </Button>
          <EnhancedExportOptions />
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Goal Inclusion Report — prominent placement */}
        <div className="bg-card border-2 border-primary/20 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Goal & Data Selector</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Select behavior goals, skill targets, and caregiver goals to include in reports with optional graphs, tables, and summaries
          </p>
          <ReportGoalInclusionManager />
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Session History</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Review past sessions and data collected
          </p>
          <SessionDataReview />
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Behavior Trends</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            View charts and trends over time
          </p>
          <BehaviorTrendCharts />
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Scatterplot Analysis</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Time-based behavior patterns
          </p>
          <ScatterplotAnalysis />
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Session Reports</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Generate detailed session reports
          </p>
          <SessionReportGenerator />
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Goals Overview</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage and track behavior goals
          </p>
          <BehaviorGoalsManager />
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Export Data</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Export data in various formats
          </p>
          <DataExportManager />
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Student Comparison</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Compare behavior data across students
          </p>
          <StudentComparison />
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">ABC Report</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Generate ABC data analysis reports
          </p>
          <ABCReportGenerator />
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">FBA Report</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Comprehensive FBA with recommendations
          </p>
          <FBAReportGenerator />
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">BIP Generator</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Create behavior intervention plans from FBA
          </p>
          <BIPGenerator />
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Heart className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Parent Summary</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Family-friendly FBA summary with home strategies
          </p>
          <ParentFriendlyFBASummary />
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <FileBarChart className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">White-Label Reports</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Generate branded reports for schools and districts. Open a student profile and use the White-Label Report Generator from there.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Insurance Reports</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Generate payer-specific reports (L.A. Care, CalOptima, Cigna, and more)
          </p>
          <InsuranceReportGenerator />
        </div>

        {/* BOPS Report */}
        <div className="bg-card border-2 border-primary/20 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">BOPS Behavioral Intelligence Report</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Generate an editable report workspace with section-level editing, imports, and version history
          </p>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Select value={bopsStudentId} onValueChange={(v) => { setBopsStudentId(v); setBopsSessionId(''); }}>
                <SelectTrigger className="w-[200px] h-9">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={!bopsStudentId || generateReport.isPending || generateForSession.isPending}
                onClick={handleGenerateBopsReport}
              >
                Generate Report
              </Button>
            </div>
            {bopsStudentId && sessions && sessions.length > 0 && (
              <Select value={bopsSessionId} onValueChange={setBopsSessionId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Use active session (default)" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s: any) => (
                    <SelectItem key={s.session_id} value={s.session_id}>
                      <span className="flex items-center gap-1.5">
                        {s.assessment_date ? format(new Date(s.assessment_date + 'T00:00:00'), 'MMM d, yyyy') : 'No date'}
                        {s.entry_mode === 'manual_scores' && <Badge variant="outline" className="text-[9px] h-4">Manual</Badge>}
                        {s.is_active_session && <Badge className="text-[9px] h-4 bg-primary text-primary-foreground">Active</Badge>}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {/* BOPS Report Workspace Modal */}
      {bopsReportId && (
        <Dialog open={!!bopsReportId} onOpenChange={o => !o && setBopsReportId(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
            <div className="p-4 flex-1 min-h-0 overflow-auto">
              <BopsReportWorkspace
                reportId={bopsReportId}
                studentId={bopsStudentId}
                studentName={students.find(s => s.id === bopsStudentId)?.name || 'Student'}
                onBack={() => setBopsReportId(null)}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <ReportBrandingEditor
        open={showBrandingEditor}
        onOpenChange={setShowBrandingEditor}
      />
    </div>
  );
}
