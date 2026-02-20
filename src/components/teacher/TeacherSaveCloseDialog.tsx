import { useState } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Save, Calendar, FileText, Users, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TeacherSaveCloseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  dataCount: number;
  onComplete: () => void;
}

export function TeacherSaveCloseDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
  dataCount,
  onComplete,
}: TeacherSaveCloseDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [createSession, setCreateSession] = useState(false);
  const [addNote, setAddNote] = useState(false);
  const [addToCalendar, setAddToCalendar] = useState(false);
  const [sessionNote, setSessionNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleConfirm = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      let sessionId: string | undefined;

      if (createSession) {
        sessionId = crypto.randomUUID();
        const now = new Date();

        // Create a session record
        const { error: sessionError } = await supabase.from('sessions').upsert({
          id: sessionId,
          user_id: user.id,
          name: `Teacher Mode - ${studentName}`,
          start_time: now.toISOString(),
          session_length_minutes: 60,
          interval_length_seconds: 15,
          student_ids: [studentId],
          status: 'ended',
        }, { onConflict: 'id' });

        if (sessionError) throw sessionError;

        // Add session note if requested
        if (addNote && sessionNote.trim()) {
          await supabase.from('session_notes').insert({
            session_id: sessionId,
            user_id: user.id,
            student_id: studentId,
            note_type: 'therapist',
            content: sessionNote.trim(),
            status: 'draft',
          });
        }

        // Add calendar appointment if requested
        if (addToCalendar) {
          await supabase.from('appointments').insert({
            created_by: user.id,
            student_id: studentId,
            start_time: now.toISOString(),
            end_time: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
            appointment_type: 'retroactive',
            status: 'completed',
            linked_session_id: sessionId,
            title: `Teacher Mode - ${studentName}`,
            notes: 'Auto-created from Teacher Mode save',
          });
        }

        toast({
          title: 'Session Created',
          description: `Session saved for ${studentName}${addNote ? ' with note' : ''}${addToCalendar ? ' + calendar' : ''}`,
        });
      } else {
        toast({
          title: 'Data Saved',
          description: `${dataCount} entries saved for ${studentName} (no session created)`,
        });
      }

      // Reset state
      setCreateSession(false);
      setAddNote(false);
      setAddToCalendar(false);
      setSessionNote('');
      onOpenChange(false);
      onComplete();
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: 'Error saving',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            Save & Close
          </DialogTitle>
          <DialogDescription>
            Finalize data for <strong>{studentName}</strong> ({dataCount} entries today)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Create Session Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label className="text-sm font-medium">Create a Session</Label>
                <p className="text-xs text-muted-foreground">
                  Log this as a formal session in the system
                </p>
              </div>
            </div>
            <Switch checked={createSession} onCheckedChange={setCreateSession} />
          </div>

          {/* Add Note Toggle (only if session is created) */}
          {createSession && (
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Add Session Note</Label>
                </div>
                <Switch checked={addNote} onCheckedChange={setAddNote} />
              </div>
              {addNote && (
                <Textarea
                  placeholder="Enter session notes..."
                  value={sessionNote}
                  onChange={(e) => setSessionNote(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              )}
            </div>
          )}

          {/* Add to Calendar Toggle (only if session is created) */}
          {createSession && (
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">Add to Calendar</Label>
                  <p className="text-xs text-muted-foreground">
                    Create a retroactive appointment
                  </p>
                </div>
              </div>
              <Switch checked={addToCalendar} onCheckedChange={setAddToCalendar} />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            {createSession ? 'Save & Create Session' : 'Save Data Only'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
