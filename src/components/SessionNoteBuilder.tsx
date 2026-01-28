import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FileText, Clock, Target, AlertCircle, Check, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDataStore } from '@/store/dataStore';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type NoteType = 'quick' | 'aba_session' | 'soap' | 'consultation' | 'bcba_supervision' | 'supervision' | 'assessment';

export const NOTE_TYPE_LABELS: Record<NoteType, string> = {
  quick: 'Quick Note',
  aba_session: 'ABA Session',
  soap: 'SOAP Note',
  consultation: 'Consultation',
  bcba_supervision: 'BCBA Supervision',
  supervision: 'Supervision',
  assessment: 'Assessment',
};

interface SessionNoteBuilderProps {
  studentId: string;
  sessionId: string;
  sessionData: {
    startTime: Date;
    endTime: Date;
    durationMinutes: number;
    location?: string;
  };
  onSubmit: (noteData: NoteData) => void;
  onCancel: () => void;
  noteRequired?: boolean;
}

interface NoteData {
  noteType: NoteType;
  content: Record<string, string>;
  status: 'draft' | 'submitted';
}

interface BehaviorSummary {
  behaviorId: string;
  behaviorName: string;
  frequencyCount: number;
  durationSeconds: number;
  intervalPercentage: number;
  abcCount: number;
}

export function SessionNoteBuilder({
  studentId,
  sessionId,
  sessionData,
  onSubmit,
  onCancel,
  noteRequired = false,
}: SessionNoteBuilderProps) {
  const { user } = useAuth();
  const { students, frequencyEntries, durationEntries, intervalEntries, abcEntries } = useDataStore();
  
  const [noteType, setNoteType] = useState<NoteType>('quick');
  const [saving, setSaving] = useState(false);
  const [showAutoData, setShowAutoData] = useState(true);
  
  // Quick Note fields
  const [quickNote, setQuickNote] = useState('');
  
  // ABA Session Note fields
  const [abaFields, setAbaFields] = useState({
    sessionObjective: '',
    behaviorsObserved: '',
    interventionsUsed: '',
    studentResponse: '',
    progressNotes: '',
    recommendations: '',
    nextSessionPlan: '',
    additionalNotes: '',
  });

  // SOAP Note fields
  const [soapFields, setSoapFields] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  });

  // Consultation Note fields
  const [consultationFields, setConsultationFields] = useState({
    consultationType: '',
    attendees: '',
    topicsDiscussed: '',
    currentStrategies: '',
    staffFeedback: '',
    recommendedChanges: '',
    actionItems: '',
    followUpDate: '',
    additionalNotes: '',
  });

  // BCBA Clinical Supervision fields
  const [bcbaSupervisionFields, setBcbaSupervisionFields] = useState({
    superviseeInfo: '',
    supervisionFormat: '', // Individual, Group, etc.
    hoursProvided: '',
    topicsCovered: '',
    casesDiscussed: '',
    skillsObserved: '',
    feedbackProvided: '',
    areasForImprovement: '',
    competenciesAddressed: '',
    nextSteps: '',
    supervisorSignature: '',
  });

  // General Supervision fields
  const [supervisionFields, setSupervisionFields] = useState({
    staffMember: '',
    supervisionType: '',
    observationNotes: '',
    performanceStrengths: '',
    areasForGrowth: '',
    feedbackDiscussed: '',
    goalsSet: '',
    trainingNeeds: '',
    followUpActions: '',
  });

  // Assessment Note fields
  const [assessmentFields, setAssessmentFields] = useState({
    assessmentType: '',
    reasonForAssessment: '',
    assessmentTools: '',
    observationSummary: '',
    dataCollected: '',
    analysisResults: '',
    hypothesizedFunctions: '',
    strengthsIdentified: '',
    areasOfConcern: '',
    recommendations: '',
    nextSteps: '',
  });

  const student = students.find(s => s.id === studentId);
  
  // Calculate session data summaries
  const behaviorSummaries: BehaviorSummary[] = student?.behaviors.map(behavior => {
    const freqEntry = frequencyEntries.find(
      e => e.studentId === studentId && e.behaviorId === behavior.id && e.sessionId === sessionId
    );
    const frequencyCount = freqEntry?.count || 0;

    const durationEntriesForBehavior = durationEntries.filter(
      e => e.studentId === studentId && e.behaviorId === behavior.id && e.sessionId === sessionId
    );
    const durationSeconds = durationEntriesForBehavior.reduce((sum, e) => sum + e.duration, 0);

    const intervalEntriesForBehavior = intervalEntries.filter(
      e => e.studentId === studentId && e.behaviorId === behavior.id && e.sessionId === sessionId && !e.voided
    );
    const intervalTotal = intervalEntriesForBehavior.length;
    const intervalOccurred = intervalEntriesForBehavior.filter(e => e.occurred).length;
    const intervalPercentage = intervalTotal > 0 ? Math.round((intervalOccurred / intervalTotal) * 100) : 0;

    const abcEntriesForBehavior = abcEntries.filter(
      e => e.studentId === studentId && e.behaviorId === behavior.id && e.sessionId === sessionId
    );
    const abcCount = abcEntriesForBehavior.length;

    return {
      behaviorId: behavior.id,
      behaviorName: behavior.name,
      frequencyCount,
      durationSeconds,
      intervalPercentage,
      abcCount,
    };
  }) || [];

  const studentDttSessions = student?.dttSessions?.filter(
    s => format(new Date(s.date), 'yyyy-MM-dd') === format(sessionData.startTime, 'yyyy-MM-dd')
  ) || [];

  const skillSummaries = studentDttSessions.map(session => {
    const target = student?.skillTargets?.find(t => t.id === session.skillTargetId);
    return {
      targetName: target?.name || 'Unknown Target',
      trialsCompleted: session.trials.length,
      percentCorrect: session.percentCorrect,
      percentIndependent: session.percentIndependent,
    };
  });

  const generateBehaviorsText = () => {
    const parts: string[] = [];
    behaviorSummaries.forEach(summary => {
      const segments: string[] = [];
      if (summary.frequencyCount > 0) segments.push(`${summary.frequencyCount} occurrences`);
      if (summary.durationSeconds > 0) {
        const minutes = Math.floor(summary.durationSeconds / 60);
        const seconds = summary.durationSeconds % 60;
        segments.push(`${minutes}m ${seconds}s total duration`);
      }
      if (summary.intervalPercentage > 0) segments.push(`${summary.intervalPercentage}% of intervals`);
      if (segments.length > 0) parts.push(`${summary.behaviorName}: ${segments.join(', ')}`);
    });
    return parts.join('. ') || 'No behavior data recorded this session.';
  };

  useEffect(() => {
    const behaviorsText = generateBehaviorsText();
    setAbaFields(prev => ({ ...prev, behaviorsObserved: behaviorsText }));
    setSoapFields(prev => ({ ...prev, objective: behaviorsText }));
    setAssessmentFields(prev => ({ ...prev, dataCollected: behaviorsText }));
  }, [studentId]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const getContentForNoteType = (): Record<string, string> => {
    switch (noteType) {
      case 'quick': return { note: quickNote };
      case 'aba_session': return abaFields;
      case 'soap': return soapFields;
      case 'consultation': return consultationFields;
      case 'bcba_supervision': return bcbaSupervisionFields;
      case 'supervision': return supervisionFields;
      case 'assessment': return assessmentFields;
      default: return { note: quickNote };
    }
  };

  const handleSubmit = async (asDraft = false) => {
    setSaving(true);
    try {
      const content = getContentForNoteType();
      const noteData: NoteData = { noteType, content, status: asDraft ? 'draft' : 'submitted' };

      const { error } = await supabase.from('session_notes').insert({
        session_id: sessionId,
        student_id: studentId,
        user_id: user?.id,
        note_type: noteType,
        content: content,
        status: asDraft ? 'draft' : 'submitted',
        submitted_at: asDraft ? null : new Date().toISOString(),
        review_status: asDraft ? null : 'pending',
      });

      if (error) throw error;

      toast({
        title: asDraft ? 'Draft Saved' : 'Note Submitted',
        description: asDraft ? 'Your note has been saved as a draft.' : 'Session note has been submitted for review.',
      });

      onSubmit(noteData);
    } catch (error) {
      console.error('Error saving note:', error);
      toast({ title: 'Error', description: 'Failed to save note. Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const renderFieldInput = (
    id: string,
    label: string,
    value: string,
    onChange: (val: string) => void,
    placeholder: string,
    multiline = false,
    hint?: string
  ) => (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {multiline ? (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-1 min-h-[60px]"
        />
      ) : (
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-1"
        />
      )}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Session Note for {student?.name}
            </CardTitle>
            {noteRequired && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Required
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>{format(sessionData.startTime, 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span>{format(sessionData.startTime, 'h:mm a')} - {format(sessionData.endTime, 'h:mm a')}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <span>{sessionData.durationMinutes.toFixed(1)} min</span>
            </div>
            {sessionData.location && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span>{sessionData.location}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Summary */}
      <Collapsible open={showAutoData} onOpenChange={setShowAutoData}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Session Data Summary
                </CardTitle>
                <ChevronDown className={`w-4 h-4 transition-transform ${showAutoData ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-3">
              {behaviorSummaries.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Behavior Data</Label>
                  <div className="mt-1 space-y-1">
                    {behaviorSummaries.map(summary => (
                      <div key={summary.behaviorId} className="flex flex-wrap gap-2 text-xs">
                        <span className="font-medium">{summary.behaviorName}:</span>
                        {summary.frequencyCount > 0 && <Badge variant="outline">{summary.frequencyCount} freq</Badge>}
                        {summary.durationSeconds > 0 && <Badge variant="outline">{formatDuration(summary.durationSeconds)}</Badge>}
                        {summary.intervalPercentage > 0 && <Badge variant="outline">{summary.intervalPercentage}% intervals</Badge>}
                        {summary.abcCount > 0 && <Badge variant="outline">{summary.abcCount} ABC</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {skillSummaries.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Skill Acquisition</Label>
                  <div className="mt-1 space-y-1">
                    {skillSummaries.map((skill, idx) => (
                      <div key={idx} className="flex flex-wrap gap-2 text-xs">
                        <span className="font-medium">{skill.targetName}:</span>
                        <Badge variant="outline">{skill.trialsCompleted} trials</Badge>
                        <Badge variant="outline">{skill.percentCorrect}% correct</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Note Type Selection */}
      <Tabs value={noteType} onValueChange={(v) => setNoteType(v as NoteType)}>
        <ScrollArea className="w-full">
          <TabsList className="w-full justify-start flex-nowrap">
            {(Object.keys(NOTE_TYPE_LABELS) as NoteType[]).map(type => (
              <TabsTrigger key={type} value={type} className="text-xs whitespace-nowrap">
                {NOTE_TYPE_LABELS[type]}
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>

        {/* Quick Note */}
        <TabsContent value="quick" className="space-y-3">
          <Card><CardContent className="pt-4">
            {renderFieldInput('quick-note', 'Session Notes', quickNote, setQuickNote, 'Enter brief session notes...', true)}
          </CardContent></Card>
        </TabsContent>

        {/* ABA Session Note */}
        <TabsContent value="aba_session" className="space-y-3">
          <Card><CardContent className="pt-4 space-y-4">
            {renderFieldInput('session-objective', 'Session Objective', abaFields.sessionObjective, v => setAbaFields(p => ({ ...p, sessionObjective: v })), 'Primary focus of this session')}
            {renderFieldInput('behaviors-observed', 'Behaviors Observed', abaFields.behaviorsObserved, v => setAbaFields(p => ({ ...p, behaviorsObserved: v })), 'Describe behaviors...', true, 'Auto-populated from session data')}
            {renderFieldInput('interventions-used', 'Interventions Used', abaFields.interventionsUsed, v => setAbaFields(p => ({ ...p, interventionsUsed: v })), 'Strategies implemented', true)}
            {renderFieldInput('student-response', 'Student Response', abaFields.studentResponse, v => setAbaFields(p => ({ ...p, studentResponse: v })), 'How did the student respond?', true)}
            {renderFieldInput('progress-notes', 'Progress Notes', abaFields.progressNotes, v => setAbaFields(p => ({ ...p, progressNotes: v })), 'Progress toward goals', true)}
            {renderFieldInput('recommendations', 'Recommendations', abaFields.recommendations, v => setAbaFields(p => ({ ...p, recommendations: v })), 'Recommendations for team', true)}
            {renderFieldInput('next-session-plan', 'Next Session Plan', abaFields.nextSessionPlan, v => setAbaFields(p => ({ ...p, nextSessionPlan: v })), 'Goals for next session')}
            {renderFieldInput('additional-notes', 'Additional Notes', abaFields.additionalNotes, v => setAbaFields(p => ({ ...p, additionalNotes: v })), 'Other relevant info', true)}
          </CardContent></Card>
        </TabsContent>

        {/* SOAP Note */}
        <TabsContent value="soap" className="space-y-3">
          <Card><CardContent className="pt-4 space-y-4">
            {renderFieldInput('subjective', 'Subjective', soapFields.subjective, v => setSoapFields(p => ({ ...p, subjective: v })), 'Client/caregiver reports, concerns, observations...', true)}
            {renderFieldInput('objective', 'Objective', soapFields.objective, v => setSoapFields(p => ({ ...p, objective: v })), 'Observable, measurable data collected...', true, 'Auto-populated from session data')}
            {renderFieldInput('assessment', 'Assessment', soapFields.assessment, v => setSoapFields(p => ({ ...p, assessment: v })), 'Clinical interpretation, progress analysis...', true)}
            {renderFieldInput('plan', 'Plan', soapFields.plan, v => setSoapFields(p => ({ ...p, plan: v })), 'Next steps, treatment modifications, goals...', true)}
          </CardContent></Card>
        </TabsContent>

        {/* Consultation Note */}
        <TabsContent value="consultation" className="space-y-3">
          <Card><CardContent className="pt-4 space-y-4">
            {renderFieldInput('consultation-type', 'Consultation Type', consultationFields.consultationType, v => setConsultationFields(p => ({ ...p, consultationType: v })), 'e.g., School team meeting, Parent consultation')}
            {renderFieldInput('attendees', 'Attendees', consultationFields.attendees, v => setConsultationFields(p => ({ ...p, attendees: v })), 'List all participants')}
            {renderFieldInput('topics-discussed', 'Topics Discussed', consultationFields.topicsDiscussed, v => setConsultationFields(p => ({ ...p, topicsDiscussed: v })), 'Main discussion points', true)}
            {renderFieldInput('current-strategies', 'Current Strategies', consultationFields.currentStrategies, v => setConsultationFields(p => ({ ...p, currentStrategies: v })), 'Strategies currently in place', true)}
            {renderFieldInput('staff-feedback', 'Staff Feedback', consultationFields.staffFeedback, v => setConsultationFields(p => ({ ...p, staffFeedback: v })), 'Feedback from teachers/staff', true)}
            {renderFieldInput('recommended-changes', 'Recommended Changes', consultationFields.recommendedChanges, v => setConsultationFields(p => ({ ...p, recommendedChanges: v })), 'Suggested modifications', true)}
            {renderFieldInput('action-items', 'Action Items', consultationFields.actionItems, v => setConsultationFields(p => ({ ...p, actionItems: v })), 'Tasks and responsibilities', true)}
            {renderFieldInput('follow-up-date', 'Follow-up Date', consultationFields.followUpDate, v => setConsultationFields(p => ({ ...p, followUpDate: v })), 'Next meeting date')}
            {renderFieldInput('additional-notes', 'Additional Notes', consultationFields.additionalNotes, v => setConsultationFields(p => ({ ...p, additionalNotes: v })), 'Other relevant info', true)}
          </CardContent></Card>
        </TabsContent>

        {/* BCBA Clinical Supervision */}
        <TabsContent value="bcba_supervision" className="space-y-3">
          <Card><CardContent className="pt-4 space-y-4">
            {renderFieldInput('supervisee-info', 'Supervisee Information', bcbaSupervisionFields.superviseeInfo, v => setBcbaSupervisionFields(p => ({ ...p, superviseeInfo: v })), 'Name, credentials, supervision period')}
            {renderFieldInput('supervision-format', 'Supervision Format', bcbaSupervisionFields.supervisionFormat, v => setBcbaSupervisionFields(p => ({ ...p, supervisionFormat: v })), 'Individual, Group, Remote, etc.')}
            {renderFieldInput('hours-provided', 'Hours Provided', bcbaSupervisionFields.hoursProvided, v => setBcbaSupervisionFields(p => ({ ...p, hoursProvided: v })), 'Supervision hours this session')}
            {renderFieldInput('topics-covered', 'Topics Covered', bcbaSupervisionFields.topicsCovered, v => setBcbaSupervisionFields(p => ({ ...p, topicsCovered: v })), 'BACB task list items, concepts discussed', true)}
            {renderFieldInput('cases-discussed', 'Cases Discussed', bcbaSupervisionFields.casesDiscussed, v => setBcbaSupervisionFields(p => ({ ...p, casesDiscussed: v })), 'Client cases reviewed', true)}
            {renderFieldInput('skills-observed', 'Skills Observed', bcbaSupervisionFields.skillsObserved, v => setBcbaSupervisionFields(p => ({ ...p, skillsObserved: v })), 'Competencies demonstrated', true)}
            {renderFieldInput('feedback-provided', 'Feedback Provided', bcbaSupervisionFields.feedbackProvided, v => setBcbaSupervisionFields(p => ({ ...p, feedbackProvided: v })), 'Specific feedback given', true)}
            {renderFieldInput('areas-improvement', 'Areas for Improvement', bcbaSupervisionFields.areasForImprovement, v => setBcbaSupervisionFields(p => ({ ...p, areasForImprovement: v })), 'Skills to develop', true)}
            {renderFieldInput('competencies-addressed', 'Competencies Addressed', bcbaSupervisionFields.competenciesAddressed, v => setBcbaSupervisionFields(p => ({ ...p, competenciesAddressed: v })), 'BACB competencies covered', true)}
            {renderFieldInput('next-steps', 'Next Steps', bcbaSupervisionFields.nextSteps, v => setBcbaSupervisionFields(p => ({ ...p, nextSteps: v })), 'Goals for next supervision', true)}
          </CardContent></Card>
        </TabsContent>

        {/* Supervision Note */}
        <TabsContent value="supervision" className="space-y-3">
          <Card><CardContent className="pt-4 space-y-4">
            {renderFieldInput('staff-member', 'Staff Member', supervisionFields.staffMember, v => setSupervisionFields(p => ({ ...p, staffMember: v })), 'Name and role')}
            {renderFieldInput('supervision-type', 'Supervision Type', supervisionFields.supervisionType, v => setSupervisionFields(p => ({ ...p, supervisionType: v })), 'Observation, Performance review, Training, etc.')}
            {renderFieldInput('observation-notes', 'Observation Notes', supervisionFields.observationNotes, v => setSupervisionFields(p => ({ ...p, observationNotes: v })), 'What was observed during session', true)}
            {renderFieldInput('performance-strengths', 'Performance Strengths', supervisionFields.performanceStrengths, v => setSupervisionFields(p => ({ ...p, performanceStrengths: v })), 'Areas of strong performance', true)}
            {renderFieldInput('areas-growth', 'Areas for Growth', supervisionFields.areasForGrowth, v => setSupervisionFields(p => ({ ...p, areasForGrowth: v })), 'Skills to develop', true)}
            {renderFieldInput('feedback-discussed', 'Feedback Discussed', supervisionFields.feedbackDiscussed, v => setSupervisionFields(p => ({ ...p, feedbackDiscussed: v })), 'Key feedback points', true)}
            {renderFieldInput('goals-set', 'Goals Set', supervisionFields.goalsSet, v => setSupervisionFields(p => ({ ...p, goalsSet: v })), 'Performance goals', true)}
            {renderFieldInput('training-needs', 'Training Needs', supervisionFields.trainingNeeds, v => setSupervisionFields(p => ({ ...p, trainingNeeds: v })), 'Additional training required', true)}
            {renderFieldInput('follow-up-actions', 'Follow-up Actions', supervisionFields.followUpActions, v => setSupervisionFields(p => ({ ...p, followUpActions: v })), 'Next steps', true)}
          </CardContent></Card>
        </TabsContent>

        {/* Assessment Note */}
        <TabsContent value="assessment" className="space-y-3">
          <Card><CardContent className="pt-4 space-y-4">
            {renderFieldInput('assessment-type', 'Assessment Type', assessmentFields.assessmentType, v => setAssessmentFields(p => ({ ...p, assessmentType: v })), 'FBA, Skills assessment, Preference, etc.')}
            {renderFieldInput('reason-assessment', 'Reason for Assessment', assessmentFields.reasonForAssessment, v => setAssessmentFields(p => ({ ...p, reasonForAssessment: v })), 'Referral reason or purpose', true)}
            {renderFieldInput('assessment-tools', 'Assessment Tools', assessmentFields.assessmentTools, v => setAssessmentFields(p => ({ ...p, assessmentTools: v })), 'Tools and measures used')}
            {renderFieldInput('observation-summary', 'Observation Summary', assessmentFields.observationSummary, v => setAssessmentFields(p => ({ ...p, observationSummary: v })), 'Summary of observations', true)}
            {renderFieldInput('data-collected', 'Data Collected', assessmentFields.dataCollected, v => setAssessmentFields(p => ({ ...p, dataCollected: v })), 'Quantitative data gathered', true, 'Auto-populated from session data')}
            {renderFieldInput('analysis-results', 'Analysis Results', assessmentFields.analysisResults, v => setAssessmentFields(p => ({ ...p, analysisResults: v })), 'Interpretation of data', true)}
            {renderFieldInput('hypothesized-functions', 'Hypothesized Functions', assessmentFields.hypothesizedFunctions, v => setAssessmentFields(p => ({ ...p, hypothesizedFunctions: v })), 'For behavior: attention, escape, etc.', true)}
            {renderFieldInput('strengths-identified', 'Strengths Identified', assessmentFields.strengthsIdentified, v => setAssessmentFields(p => ({ ...p, strengthsIdentified: v })), 'Client strengths and skills', true)}
            {renderFieldInput('areas-concern', 'Areas of Concern', assessmentFields.areasOfConcern, v => setAssessmentFields(p => ({ ...p, areasOfConcern: v })), 'Priority areas for intervention', true)}
            {renderFieldInput('recommendations', 'Recommendations', assessmentFields.recommendations, v => setAssessmentFields(p => ({ ...p, recommendations: v })), 'Treatment recommendations', true)}
            {renderFieldInput('next-steps', 'Next Steps', assessmentFields.nextSteps, v => setAssessmentFields(p => ({ ...p, nextSteps: v })), 'Follow-up actions', true)}
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-between gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          <X className="w-4 h-4 mr-1" />
          {noteRequired ? 'Submit Data Only' : 'Cancel'}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSubmit(true)} disabled={saving}>
            Save Draft
          </Button>
          <Button onClick={() => handleSubmit(false)} disabled={saving}>
            <Check className="w-4 h-4 mr-1" />
            Submit Note
          </Button>
        </div>
      </div>
    </div>
  );
}
