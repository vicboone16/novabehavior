import { useState, useCallback } from 'react';
import { NovaAssessmentListView } from './NovaAssessmentListView';
import { NovaAssessmentForm } from './NovaAssessmentForm';
import { NovaStandaloneReport } from './NovaStandaloneReport';
import { NovaMasterReportView } from './NovaMasterReportView';
import { NovaMasterReportGenerator } from './NovaMasterReportGenerator';

interface Props {
  studentId: string;
  studentName: string;
  agencyId?: string;
}

type View =
  | { type: 'list' }
  | { type: 'form'; sessionId: string; assessmentCode: string; assessmentName: string; assessmentId: string }
  | { type: 'report'; sessionId: string; assessmentCode: string }
  | { type: 'master' }
  | { type: 'master-generator' };

export function NovaAssessmentsDashboard({ studentId, studentName, agencyId }: Props) {
  const [view, setView] = useState<View>({ type: 'list' });

  const handleStartSession = useCallback(
    (sessionId: string, code: string, name: string, assessmentId: string) => {
      setView({ type: 'form', sessionId, assessmentCode: code, assessmentName: name, assessmentId });
    },
    []
  );

  const handleViewReport = useCallback((sessionId: string, code: string) => {
    setView({ type: 'report', sessionId, assessmentCode: code });
  }, []);

  const handleViewMasterReport = useCallback(() => {
    setView({ type: 'master' });
  }, []);

  const handleViewMasterGenerator = useCallback(() => {
    setView({ type: 'master-generator' });
  }, []);

  const handleBack = useCallback(() => {
    setView({ type: 'list' });
  }, []);

  switch (view.type) {
    case 'form':
      return (
        <NovaAssessmentForm
          sessionId={view.sessionId}
          assessmentCode={view.assessmentCode}
          assessmentName={view.assessmentName}
          assessmentId={view.assessmentId}
          studentName={studentName}
          onViewReport={() =>
            handleViewReport(view.sessionId, view.assessmentCode)
          }
          onBack={handleBack}
        />
      );
    case 'report':
      return (
        <NovaStandaloneReport
          sessionId={view.sessionId}
          assessmentCode={view.assessmentCode}
          onBack={handleBack}
        />
      );
    case 'master':
      return (
        <NovaMasterReportView
          studentId={studentId}
          studentName={studentName}
          onBack={handleBack}
          onViewReport={handleViewReport}
        />
      );
    case 'master-generator':
      return (
        <NovaMasterReportGenerator
          studentId={studentId}
          studentName={studentName}
          agencyId={agencyId}
          onBack={handleBack}
        />
      );
    default:
      return (
        <NovaAssessmentListView
          studentId={studentId}
          studentName={studentName}
          onStartSession={handleStartSession}
          onViewReport={handleViewReport}
          onViewMasterReport={handleViewMasterReport}
          onViewMasterGenerator={handleViewMasterGenerator}
        />
      );
  }
}
