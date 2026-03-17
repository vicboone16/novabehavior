import { useState } from 'react';
import { StickyNote, FileText, Mic, ClipboardList } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { NarrativeNotesManager } from '@/components/NarrativeNotesManager';
import { SessionNotesTab } from '@/components/session-notes';
import { TeacherSummaries } from '@/components/TeacherSummaries';
import { StaffMessageThread } from '@/components/messaging/StaffMessageThread';
import { ShareWithTeacherButton } from '@/components/messaging/ShareWithTeacherButton';
import { VoiceNoteRecorder } from '@/components/mobile/VoiceNoteRecorder';
import { Button } from '@/components/ui/button';
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
        <TabsList className="bg-muted/50">
          <TabsTrigger value="session" className="gap-1.5 text-xs">
            <FileText className="w-3.5 h-3.5" />
            Session Notes
          </TabsTrigger>
          <TabsTrigger value="narrative" className="gap-1.5 text-xs">
            <StickyNote className="w-3.5 h-3.5" />
            Narrative
          </TabsTrigger>
          <TabsTrigger value="summaries" className="gap-1.5 text-xs">
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
