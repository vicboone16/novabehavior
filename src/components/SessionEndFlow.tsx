import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Square, 
  Users, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Send,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useDataStore } from '@/store/dataStore';
import { useAuth } from '@/contexts/AuthContext';
import { useMultiStudentNoteRequirements } from '@/hooks/useNoteRequirement';
import { SessionNoteBuilder } from './SessionNoteBuilder';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Student } from '@/types/behavior';

interface SessionEndFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'all' | 'single';
  singleStudentId?: string;
  onComplete: () => void;
}

type FlowStep = 'confirm' | 'note_decision' | 'note_type_select' | 'note_builder' | 'complete';

// Clinical note types per spec
export type ClinicalNoteType = 'therapist' | 'clinical' | 'parent_training' | 'assessment' | 'supervision_revision';

export const CLINICAL_NOTE_TYPE_LABELS: Record<ClinicalNoteType, string> = {
  therapist: 'Therapist (RBT)',
  clinical: 'Clinical (BCBA)',
  parent_training: 'Parent Training',
  assessment: 'Assessment',
  supervision_revision: 'Supervision Revision',
};

interface StudentNoteStatus {
  studentId: string;
  decision: 'data_only' | 'data_and_note' | 'pending';
  noteType?: ClinicalNoteType;
  noteCompleted: boolean;
}

export function SessionEndFlow({
  open,
  onOpenChange,
  mode,
  singleStudentId,
  onComplete,
}: SessionEndFlowProps) {
  const { user } = useAuth();
  const { 
    students, 
    selectedStudentIds, 
    endStudentSession,
    resetAllStudentSessionStatuses,
    currentSessionId,
    sessionStartTime,
    getStudentSessionStatus,
  } = useDataStore();

  const [step, setStep] = useState<FlowStep>('confirm');
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [studentNoteStatuses, setStudentNoteStatuses] = useState<StudentNoteStatus[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [buildingNote, setBuildingNote] = useState<string | null>(null);

  // Get the students we're ending sessions for
  const targetStudents = mode === 'all' 
    ? students.filter(s => selectedStudentIds.includes(s.id) && !getStudentSessionStatus(s.id)?.hasEnded)
    : students.filter(s => s.id === singleStudentId);

  const targetStudentIds = targetStudents.map(s => s.id);
  
  // Check note requirements for all target students
  const noteRequirements = useMultiStudentNoteRequirements(targetStudentIds);

  // Initialize student note statuses
  useEffect(() => {
    if (open && targetStudents.length > 0) {
      const initialStatuses: StudentNoteStatus[] = targetStudents.map(s => ({
        studentId: s.id,
        decision: 'pending',
        noteCompleted: false,
      }));
      setStudentNoteStatuses(initialStatuses);
      setStep('confirm');
      setCurrentStudentIndex(0);
      setBuildingNote(null);
      setDbEnded(false);
    }
  }, [open, targetStudents.length]);

  // Get students who need note decisions
  const studentsNeedingDecision = targetStudents.filter(s => {
    const status = studentNoteStatuses.find(ns => ns.studentId === s.id);
    return status?.decision === 'pending';
  });

  // Get students who chose to add notes but haven't completed them
  const studentsNeedingNotes = targetStudents.filter(s => {
    const status = studentNoteStatuses.find(ns => ns.studentId === s.id);
    return status?.decision === 'data_and_note' && !status.noteCompleted;
  });

  const currentStudent = mode === 'single' 
    ? targetStudents[0]
    : studentsNeedingDecision[0] || studentsNeedingNotes[0];

  // Track whether DB writes succeeded so we know to clean up on dialog close
  const [dbEnded, setDbEnded] = useState(false);

  const handleEndSession = async () => {
    setSubmitting(true);

    // Collect errors but don't abort — always mark session as ended locally
    const errors: string[] = [];

    try {
      const now = new Date();
      const sessionStart = sessionStartTime instanceof Date ? sessionStartTime : (sessionStartTime ? new Date(sessionStartTime) : now);
      const sessionMinutes = Math.max(0, (now.getTime() - sessionStart.getTime()) / 60000);
      
      // End sessions for all target students (local state — always succeeds)
      for (const student of targetStudents) {
        endStudentSession(student.id);
      }

      // DB writes — do best-effort, don't let one failure block the rest
      for (const student of targetStudents) {
        if (currentSessionId) {
          const sessionStatus = getStudentSessionStatus(student.id);
          const effectiveMinutes = sessionStatus?.effectiveSessionMinutes || 
            (now.getTime() - sessionStart.getTime()) / 60000;

          try {
            await supabase.from('student_session_status').upsert({
              session_id: currentSessionId,
              student_id: student.id,
              status: 'ended',
              started_at: sessionStart.toISOString(),
              ended_at: now.toISOString(),
              total_active_duration_seconds: Math.round(effectiveMinutes * 60),
            }, {
              onConflict: 'session_id,student_id',
            });
          } catch (e) {
            console.error('[SessionEnd] student_session_status upsert failed:', e);
            errors.push(`Status for ${student.name}`);
          }

          // Handle appointment linking
          try {
            const storedLinkedAppointmentId = useDataStore.getState().linkedAppointmentId;
            let appointmentToUpdate: string | null = null;
            
            if (storedLinkedAppointmentId) {
              appointmentToUpdate = storedLinkedAppointmentId;
            } else {
              const { data: existingAppointment } = await supabase
                .from('appointments')
                .select('id')
                .eq('student_id', student.id)
                .eq('linked_session_id', currentSessionId)
                .maybeSingle();
              
              if (existingAppointment) {
                appointmentToUpdate = existingAppointment.id;
              }
            }

            if (appointmentToUpdate) {
              await supabase.from('appointments')
                .update({ 
                  status: 'completed',
                  end_time: now.toISOString(),
                  duration_minutes: Math.round(effectiveMinutes),
                  linked_session_id: currentSessionId,
                })
                .eq('id', appointmentToUpdate);
            } else if (user?.id) {
              await supabase.from('appointments').insert({
                student_id: student.id,
                created_by: user.id,
                start_time: sessionStart.toISOString(),
                end_time: now.toISOString(),
                duration_minutes: Math.round(effectiveMinutes),
                status: 'completed',
                appointment_type: 'retroactive',
                linked_session_id: currentSessionId,
                notes: 'Auto-created from completed session',
              });
            }
          } catch (e) {
            console.error('[SessionEnd] appointment handling failed:', e);
            errors.push(`Appointment for ${student.name}`);
          }
        }
      }

      // Mark the parent session as completed
      if (currentSessionId && user?.id) {
        try {
          await supabase
            .from('sessions')
            .upsert(
              {
                id: currentSessionId,
                user_id: user.id,
                name: `Session - ${mode === 'all' ? `${targetStudents.length} students` : (targetStudents[0]?.name || 'Student')}`,
                start_time: sessionStart.toISOString(),
                end_time: now.toISOString(),
                session_length_minutes: Math.round(sessionMinutes),
                student_ids: targetStudentIds,
                status: 'completed',
              } as any,
              { onConflict: 'id' }
            );
        } catch (e) {
          console.error('[SessionEnd] session upsert failed:', e);
          errors.push('Session record');
        }
      }

      // Always mark as ended locally, even if some DB writes failed
      setDbEnded(true);

      if (errors.length > 0) {
        toast({
          title: 'Session ended with warnings',
          description: `Some data may not have saved: ${errors.join(', ')}. Your session data is still preserved locally.`,
          variant: 'destructive',
        });
      }

      // Move to note decision step
      setStep('note_decision');
    } catch (error) {
      console.error('Error ending session:', error);
      // Even on catastrophic failure, end the session locally to prevent stuck state
      setDbEnded(true);
      toast({
        title: 'Error',
        description: 'Failed to save session data to cloud, but session has been ended locally.',
        variant: 'destructive',
      });
      setStep('note_decision');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNoteDecision = (studentId: string, decision: 'data_only' | 'data_and_note') => {
    setStudentNoteStatuses(prev => 
      prev.map(s => s.studentId === studentId ? { ...s, decision } : s)
    );

    if (decision === 'data_and_note') {
      // Show note type selection instead of going straight to builder
      setStep('note_type_select');
    } else {
      // Check if more students need decisions
      const remaining = studentsNeedingDecision.filter(s => s.id !== studentId);
      if (remaining.length === 0) {
        // Check if any students need to write notes
        const needingNotes = studentNoteStatuses.filter(
          s => s.decision === 'data_and_note' && !s.noteCompleted
        );
        if (needingNotes.length > 0) {
          setBuildingNote(needingNotes[0].studentId);
          setStep('note_builder');
        } else {
          setStep('complete');
        }
      }
    }
  };

  const handleNoteTypeSelect = (studentId: string, noteType: ClinicalNoteType) => {
    setStudentNoteStatuses(prev =>
      prev.map(s => s.studentId === studentId ? { ...s, noteType } : s)
    );
    setBuildingNote(studentId);
    setStep('note_builder');
  };

  const handleNoteComplete = (studentId: string) => {
    setStudentNoteStatuses(prev =>
      prev.map(s => s.studentId === studentId ? { ...s, noteCompleted: true } : s)
    );

    // Check if more students need decisions or notes
    const stillNeedingDecision = studentNoteStatuses.filter(
      s => s.decision === 'pending' && s.studentId !== studentId
    );
    const stillNeedingNotes = studentNoteStatuses.filter(
      s => s.decision === 'data_and_note' && !s.noteCompleted && s.studentId !== studentId
    );

    if (stillNeedingDecision.length > 0) {
      setBuildingNote(null);
      setStep('note_decision');
    } else if (stillNeedingNotes.length > 0) {
      setBuildingNote(stillNeedingNotes[0].studentId);
    } else {
      setStep('complete');
    }
  };

  const handleNoteSkip = (studentId: string) => {
    setStudentNoteStatuses(prev =>
      prev.map(s => s.studentId === studentId ? { ...s, decision: 'data_only' } : s)
    );

    // Same logic as handleNoteComplete for flow
    handleNoteComplete(studentId);
  };

  const handleComplete = () => {
    if (mode === 'all') {
      // If ending all, also reset the session
      resetAllStudentSessionStatuses();
    }
    onComplete();
    onOpenChange(false);
  };

  const getSessionData = (studentId: string) => {
    const now = new Date();
    const sessionStart = sessionStartTime || now;
    const sessionStatus = getStudentSessionStatus(studentId);
    
    return {
      startTime: sessionStart,
      endTime: now,
      durationMinutes: sessionStatus?.effectiveSessionMinutes || 
        (now.getTime() - sessionStart.getTime()) / 60000,
      location: undefined, // Could be added if we track location
    };
  };

  const renderConfirmStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-warning/10 rounded-lg border border-warning/20">
        <AlertCircle className="w-5 h-5 text-warning shrink-0" />
        <div>
          <p className="font-medium">
            {mode === 'all' 
              ? `End session for ${targetStudents.length} student${targetStudents.length > 1 ? 's' : ''}?`
              : `End session for ${currentStudent?.name}?`
            }
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            This will stop all timers and submit the recorded data.
          </p>
        </div>
      </div>

      {targetStudents.length > 0 && (
        <div className="space-y-2">
          {targetStudents.map(student => {
            const requirement = noteRequirements.get(student.id);
            return (
              <div 
                key={student.id}
                className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: student.color }}
                  />
                  <span className="text-sm font-medium">{student.name}</span>
                </div>
                {requirement?.isRequired && (
                  <Badge variant="outline" className="text-xs">
                    <FileText className="w-3 h-3 mr-1" />
                    Note Required
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button 
          variant="destructive" 
          onClick={handleEndSession}
          disabled={submitting}
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Square className="w-4 h-4 mr-1" />
          )}
          End Session{mode === 'all' && targetStudents.length > 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );

  const renderNoteDecisionStep = () => {
    if (!currentStudent) return null;
    const requirement = noteRequirements.get(currentStudent.id);

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: currentStudent.color }}
              />
              <CardTitle className="text-base">{currentStudent.name}</CardTitle>
            </div>
            {studentsNeedingDecision.length > 1 && (
              <CardDescription>
                {studentsNeedingDecision.findIndex(s => s.id === currentStudent.id) + 1} of {studentsNeedingDecision.length} students
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {requirement?.isRequired && (
              <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-md mb-4">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <span className="text-sm text-destructive">
                  A note is required for this student
                  {requirement.requirementSource === 'role' && ' (role requirement)'}
                  {requirement.requirementSource === 'student' && ' (student setting)'}
                </span>
              </div>
            )}

            <p className="text-sm text-muted-foreground mb-4">
              Session data has been saved. Would you like to add a note?
            </p>

            <div className="flex flex-col gap-2">
              <Button 
                variant="outline" 
                className="justify-start h-auto py-3"
                onClick={() => handleNoteDecision(currentStudent.id, 'data_only')}
                disabled={requirement?.isRequired}
              >
                <Send className="w-4 h-4 mr-2" />
                <div className="text-left">
                  <div className="font-medium">Submit Data Only</div>
                  <div className="text-xs text-muted-foreground">
                    Save session data without a note
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Button>

              <Button 
                className="justify-start h-auto py-3"
                onClick={() => handleNoteDecision(currentStudent.id, 'data_and_note')}
              >
                <FileText className="w-4 h-4 mr-2" />
                <div className="text-left">
                  <div className="font-medium">Submit Data + Note</div>
                  <div className="text-xs opacity-80">
                    Add a session note with your data
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderNoteTypeSelectStep = () => {
    if (!currentStudent) return null;

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: currentStudent.color }}
              />
              <CardTitle className="text-base">{currentStudent.name}</CardTitle>
            </div>
            <CardDescription>
              Select the type of note to create
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Choose the appropriate note type for this session:
            </p>

            <div className="flex flex-col gap-2">
              {(Object.entries(CLINICAL_NOTE_TYPE_LABELS) as [ClinicalNoteType, string][]).map(([type, label]) => (
                <Button
                  key={type}
                  variant="outline"
                  className="justify-start h-auto py-3"
                  onClick={() => handleNoteTypeSelect(currentStudent.id, type)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  <div className="text-left flex-1">
                    <div className="font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground">
                      {type === 'therapist' && 'Daily session note for RBT/BT documentation'}
                      {type === 'clinical' && 'Clinical supervision and treatment planning'}
                      {type === 'parent_training' && 'Parent/caregiver training session'}
                      {type === 'assessment' && 'FBA, skills assessment, or evaluation'}
                      {type === 'supervision_revision' && 'Combined clinical + parent training'}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              ))}
            </div>

            <Button
              variant="ghost"
              className="w-full mt-3"
              onClick={() => {
                setStudentNoteStatuses(prev =>
                  prev.map(s => s.studentId === currentStudent.id ? { ...s, decision: 'data_only' } : s)
                );
                handleNoteComplete(currentStudent.id);
              }}
            >
              Skip Note
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderNoteBuilderStep = () => {
    if (!buildingNote) return null;
    const student = students.find(s => s.id === buildingNote);
    if (!student) return null;

    const requirement = noteRequirements.get(buildingNote);

    return (
      <SessionNoteBuilder
        studentId={buildingNote}
        sessionId={currentSessionId || 'unknown'}
        sessionData={getSessionData(buildingNote)}
        noteRequired={requirement?.isRequired}
        onSubmit={() => handleNoteComplete(buildingNote)}
        onCancel={() => handleNoteSkip(buildingNote)}
      />
    );
  };

  const renderCompleteStep = () => {
    const dataOnlyCount = studentNoteStatuses.filter(s => s.decision === 'data_only').length;
    const notesCount = studentNoteStatuses.filter(s => s.noteCompleted).length;

    return (
      <div className="space-y-4 text-center py-6">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Session Complete</h3>
          <p className="text-muted-foreground mt-1">
            All data has been saved successfully.
          </p>
        </div>
        <div className="flex justify-center gap-4 text-sm">
          <Badge variant="outline">
            <Users className="w-3 h-3 mr-1" />
            {targetStudents.length} student{targetStudents.length > 1 ? 's' : ''}
          </Badge>
          {notesCount > 0 && (
            <Badge variant="outline">
              <FileText className="w-3 h-3 mr-1" />
              {notesCount} note{notesCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <Button onClick={handleComplete} className="mt-4">
          Done
        </Button>
      </div>
    );
  };

  // If the dialog is closed after DB writes succeeded, always clean up
  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen && dbEnded) {
      // User closed dialog after session was ended in DB — must clean up local state
      if (mode === 'all') {
        resetAllStudentSessionStatuses();
      }
      onComplete();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'confirm' && (
              <>
                <Square className="w-5 h-5" />
                End {mode === 'all' ? 'All Sessions' : 'Session'}
              </>
            )}
            {step === 'note_decision' && (
              <>
                <FileText className="w-5 h-5" />
                Session Notes
              </>
            )}
            {step === 'note_type_select' && (
              <>
                <FileText className="w-5 h-5" />
                Select Note Type
              </>
            )}
            {step === 'note_builder' && (
              <>
                <FileText className="w-5 h-5" />
                Write Note
              </>
            )}
            {step === 'complete' && (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Complete
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {step === 'confirm' && renderConfirmStep()}
        {step === 'note_decision' && renderNoteDecisionStep()}
        {step === 'note_type_select' && renderNoteTypeSelectStep()}
        {step === 'note_builder' && renderNoteBuilderStep()}
        {step === 'complete' && renderCompleteStep()}
      </DialogContent>
    </Dialog>
  );
}
