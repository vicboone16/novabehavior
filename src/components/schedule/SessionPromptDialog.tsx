import { useState } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDataStore } from '@/store/dataStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play, Calendar, Clock, User, Video, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { Appointment, CalendarStudent, CalendarStaff } from '@/types/schedule';

interface SessionPromptDialogProps {
  appointment: Appointment | null;
  onClose: () => void;
  students: CalendarStudent[];
  staff: CalendarStaff[];
  onJoinVideo?: (appointment: Appointment) => void;
  onSendLink?: (appointment: Appointment) => void;
}

export function SessionPromptDialog({
  appointment,
  onClose,
  students,
  staff,
  onJoinVideo,
  onSendLink,
}: SessionPromptDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { deselectAllStudents, toggleStudentSelection, startSession } = useDataStore();
  const [starting, setStarting] = useState(false);

  if (!appointment) return null;

  const student = students.find(s => s.id === appointment.student_id);
  const staffMember = appointment.staff_user_id 
    ? staff.find(s => s.id === appointment.staff_user_id)
    : null;

  const handleStartSession = async () => {
    if (!appointment?.student_id) return;
    
    setStarting(true);
    try {
      // Start the session in the data store - deselect all first, then select this student
      deselectAllStudents();
      toggleStudentSelection(appointment.student_id);
      
      // Start session with the linked appointment ID
      startSession(appointment.id);

      // Update appointment status and link the session
      const { currentSessionId } = useDataStore.getState();
      await supabase
        .from('appointments')
        .update({ 
          status: 'in_progress',
          linked_session_id: currentSessionId,
        })
        .eq('id', appointment.id);

      toast({ title: 'Session started', description: `Starting session for ${student?.name}` });
      onClose();
      navigate('/'); // Go to dashboard for data collection
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setStarting(false);
    }
  };

  return (
    <Dialog open={!!appointment} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" />
            Start Session?
          </DialogTitle>
          <DialogDescription>
            {(appointment as any).is_telehealth
              ? 'This telehealth appointment is ready to begin.'
              : 'This appointment is ready to begin.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          {(appointment as any).is_telehealth && (
            <Badge variant="secondary" className="gap-1">
              <Video className="w-3 h-3" />
              Telehealth Session
            </Badge>
          )}

          <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${student?.color}20` }}
            >
              <User className="w-5 h-5" style={{ color: student?.color }} />
            </div>
            <div>
              <p className="font-medium">{student?.name}</p>
              {staffMember && (
                <p className="text-sm text-muted-foreground">with {staffMember.name}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            {format(new Date(appointment.start_time), 'EEEE, MMMM d, yyyy')}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            {format(new Date(appointment.start_time), 'h:mm a')} - {format(new Date(appointment.end_time), 'h:mm a')}
            <span>({appointment.duration_minutes} min)</span>
          </div>

          {/* Send link option for telehealth */}
          {(appointment as any).is_telehealth && onSendLink && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                onSendLink(appointment);
                onClose();
              }}
            >
              <Send className="w-4 h-4 mr-1" />
              Send Link to Parent/Participant
            </Button>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Not Now
          </Button>
          {(appointment as any).is_telehealth && onJoinVideo && (
            <Button
              variant="secondary"
              onClick={() => {
                onJoinVideo(appointment);
                onClose();
              }}
              className="flex-1"
            >
              <Video className="w-4 h-4 mr-1" />
              Join Video
            </Button>
          )}
          <Button onClick={handleStartSession} disabled={starting} className="flex-1">
            <Play className="w-4 h-4 mr-1" />
            {(appointment as any).is_telehealth ? 'Start Session + Video' : 'Start Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
