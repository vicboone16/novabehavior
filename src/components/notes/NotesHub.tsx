import { useState } from 'react';
import { StickyNote, FileText, Mic, ClipboardList, Stethoscope, Heart, UserCheck } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { NarrativeNotesManager } from '@/components/NarrativeNotesManager';
import { SessionNotesTab } from '@/components/session-notes';
import { TeacherSummaries } from '@/components/TeacherSummaries';
import { StaffMessageThread } from '@/components/messaging/StaffMessageThread';
import { ShareWithTeacherButton } from '@/components/messaging/ShareWithTeacherButton';
import { VoiceNoteRecorder } from '@/components/mobile/VoiceNoteRecorder';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Student } from '@/types/behavior';

interface NotesHubProps {
  student: Student;
  studentAccess: { canViewNotes: boolean; [key: string]: any };
  addNarrativeNote: (studentId: string, note: any) => void;
  updateNarrativeNote: (studentId: string, noteId: string, updates: any) => void;
  deleteNarrativeNote: (studentId: string, noteId: string) => void;
}

export function NotesHub({ student, studentAccess, addNarrativeNote, updateNarrativeNote, deleteNarrativeNote }: NotesHubProps) {
  const [activeTab, setActiveTab] = useState('session');
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Client Notes</h2>
          <p className="text-sm text-muted-foreground">All documentation for {student.name}</p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowVoiceRecorder(true)}>
          <Mic className="w-4 h-4" />
          Record Note
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex w-full gap-0.5 h-auto p-1 overflow-x-auto scrollbar-hide flex-nowrap bg-muted/50">
          <TabsTrigger value="session" className="gap-1.5 text-xs whitespace-nowrap">
            <FileText className="w-3.5 h-3.5" />
            Session
          </TabsTrigger>
          <TabsTrigger value="narrative" className="gap-1.5 text-xs whitespace-nowrap">
            <StickyNote className="w-3.5 h-3.5" />
            Narrative
          </TabsTrigger>
          <TabsTrigger value="soap" className="gap-1.5 text-xs whitespace-nowrap">
            <Stethoscope className="w-3.5 h-3.5" />
            SOAP
          </TabsTrigger>
          <TabsTrigger value="caregiver" className="gap-1.5 text-xs whitespace-nowrap">
            <Heart className="w-3.5 h-3.5" />
            Caregiver
          </TabsTrigger>
          <TabsTrigger value="supervision" className="gap-1.5 text-xs whitespace-nowrap">
            <UserCheck className="w-3.5 h-3.5" />
            Supervision
          </TabsTrigger>
          <TabsTrigger value="summaries" className="gap-1.5 text-xs whitespace-nowrap">
            <ClipboardList className="w-3.5 h-3.5" />
            Summaries
          </TabsTrigger>
        </TabsList>

        <TabsContent value="session" className="space-y-4 mt-4">
          <div className="flex items-center justify-end">
            <ShareWithTeacherButton
              studentId={student.id}
              studentName={student.name}
              variant="button"
              messageType="data_share"
              prefillSubject={`Session notes for ${student.name}`}
            />
          </div>
          <SessionNotesTab studentId={student.id} studentName={student.name} />
        </TabsContent>

        <TabsContent value="narrative" className="space-y-4 mt-4">
          <NarrativeNotesManager
            studentId={student.id}
            notes={student.narrativeNotes || []}
            behaviors={student.behaviors}
            onAddNote={(note) => addNarrativeNote(student.id, note)}
            onUpdateNote={(noteId, updates) => updateNarrativeNote(student.id, noteId, updates)}
            onDeleteNote={(noteId) => deleteNarrativeNote(student.id, noteId)}
            canViewNotes={studentAccess.canViewNotes}
          />
        </TabsContent>

        <TabsContent value="soap" className="space-y-4 mt-4">
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Stethoscope className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">SOAP Notes</p>
              <p className="text-xs text-muted-foreground mt-1">
                Structured Subjective · Objective · Assessment · Plan notes will appear here once created.
              </p>
              <Badge variant="secondary" className="mt-3 text-xs">Coming Soon</Badge>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="caregiver" className="space-y-4 mt-4">
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Heart className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">Caregiver Notes</p>
              <p className="text-xs text-muted-foreground mt-1">
                Parent training documentation and caregiver coaching notes will appear here.
              </p>
              <Badge variant="secondary" className="mt-3 text-xs">Coming Soon</Badge>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="supervision" className="space-y-4 mt-4">
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <UserCheck className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">Supervision Notes</p>
              <p className="text-xs text-muted-foreground mt-1">
                BCBA/supervisor oversight, feedback, and clinical direction notes will appear here.
              </p>
              <Badge variant="secondary" className="mt-3 text-xs">Coming Soon</Badge>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summaries" className="space-y-4 mt-4">
          <TeacherSummaries clientId={student.id} />
          <StaffMessageThread studentId={student.id} studentName={student.name} />
        </TabsContent>
      </Tabs>

      {showVoiceRecorder && (
        <VoiceNoteRecorder
          studentId={student.id}
          onClose={() => setShowVoiceRecorder(false)}
          onSave={(transcription) => {
            addNarrativeNote(student.id, {
              content: transcription,
              type: 'voice_transcription',
              timestamp: new Date().toISOString(),
            });
          }}
        />
      )}
    </div>
  );
}
