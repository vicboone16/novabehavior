import { useState, useEffect } from 'react';
import { format, isToday, isWithinInterval, addMinutes, subMinutes } from 'date-fns';
import { 
  Play, 
  Calendar, 
  Clock, 
  Link2, 
  Unlink, 
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDataStore } from '@/store/dataStore';
import { useToast } from '@/hooks/use-toast';
import type { Appointment } from '@/types/schedule';

interface SessionStartConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: {
    id: string;
    name: string;
    color: string;
  } | null;
  onConfirm: (options: {
    linkedAppointmentId?: string;
    createAppointment: boolean;
  }) => void;
}

export function SessionStartConfirmation({
  open,
  onOpenChange,
  student,
  onConfirm,
}: SessionStartConfirmationProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { currentSessionId, sessionStartTime } = useDataStore();
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [matchingAppointment, setMatchingAppointment] = useState<Appointment | null>(null);
  const [startOption, setStartOption] = useState<'link' | 'unlink' | 'create'>('link');

  // Check for matching appointments when dialog opens
  useEffect(() => {
    if (open && student && user) {
      checkForAppointments();
    }
  }, [open, student, user]);

  const checkForAppointments = async () => {
    if (!student || !user) return;
    
    setLoading(true);
    setMatchingAppointment(null);
    
    try {
      const now = new Date();
      // Look for appointments within a reasonable window (30 min before to 15 min after current time)
      const windowStart = subMinutes(now, 30);
      const windowEnd = addMinutes(now, 15);
      
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('student_id', student.id)
        .or(`staff_user_id.eq.${user.id},staff_user_ids.cs.{${user.id}}`)
        .gte('start_time', windowStart.toISOString())
        .lte('start_time', windowEnd.toISOString())
        .in('status', ['scheduled', 'pending_verification'])
        .order('start_time', { ascending: true })
        .limit(1);

      if (error) throw error;

      if (appointments && appointments.length > 0) {
        setMatchingAppointment(appointments[0] as Appointment);
        setStartOption('link');
      } else {
        setMatchingAppointment(null);
        setStartOption('create');
      }
    } catch (error) {
      console.error('Error checking appointments:', error);
      setMatchingAppointment(null);
      setStartOption('create');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!student || !user) return;
    
    setSubmitting(true);
    
    try {
      let linkedAppointmentId: string | undefined;
      
      if (startOption === 'link' && matchingAppointment) {
        // Link to existing appointment
        linkedAppointmentId = matchingAppointment.id;
        
        // Update appointment status to in_progress
        await supabase
          .from('appointments')
          .update({ status: 'in_progress' })
          .eq('id', matchingAppointment.id);
          
      } else if (startOption === 'create') {
        // Create new appointment
        const now = new Date();
        const { data: newAppt, error } = await supabase
          .from('appointments')
          .insert({
            student_id: student.id,
            staff_user_id: user.id,
            created_by: user.id,
            start_time: now.toISOString(),
            end_time: addMinutes(now, 60).toISOString(), // Default 60 min, will update on end
            duration_minutes: 60,
            status: 'in_progress',
            appointment_type: 'session',
            verification_status: 'unverified',
            verification_required: true,
          })
          .select()
          .single();

        if (error) throw error;
        linkedAppointmentId = newAppt?.id;
      }
      // If 'unlink', we don't create or link any appointment
      
      onConfirm({
        linkedAppointmentId,
        createAppointment: startOption === 'create',
      });
      
      toast({
        title: 'Session Started',
        description: `Started session for ${student.name}${linkedAppointmentId ? ' (linked to appointment)' : ''}`,
      });
      
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error starting session:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to start session',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!student) return null;

  // Check if session is already running
  const sessionAlreadyActive = !!sessionStartTime && !!currentSessionId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-primary" />
            Start Session for {student.name}?
          </DialogTitle>
          <DialogDescription>
            {sessionAlreadyActive 
              ? 'Add this student to the current session.'
              : 'Begin a new data collection session for this student.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Student Info */}
          <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${student.color}20` }}
            >
              <div 
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: student.color }}
              />
            </div>
            <div>
              <p className="font-medium">{student.name}</p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Checking for scheduled appointments...
              </span>
            </div>
          )}

          {/* Appointment Options */}
          {!loading && (
            <RadioGroup value={startOption} onValueChange={(v) => setStartOption(v as any)}>
              {matchingAppointment ? (
                <>
                  {/* Found Appointment */}
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg mb-3">
                    <div className="flex items-center gap-2 text-sm text-primary mb-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="font-medium">Scheduled appointment found</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {format(new Date(matchingAppointment.start_time), 'h:mm a')} - 
                      {format(new Date(matchingAppointment.end_time), 'h:mm a')}
                      <span>({matchingAppointment.duration_minutes} min)</span>
                    </div>
                  </div>

                  <Card className={`cursor-pointer transition-all ${startOption === 'link' ? 'ring-2 ring-primary' : ''}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value="link" id="link" className="mt-1" />
                        <Label htmlFor="link" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2 font-medium">
                            <Link2 className="w-4 h-4 text-primary" />
                            Link & Start Session
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Connect this session to the scheduled appointment (recommended)
                          </p>
                        </Label>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`cursor-pointer transition-all ${startOption === 'unlink' ? 'ring-2 ring-primary' : ''}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value="unlink" id="unlink" className="mt-1" />
                        <Label htmlFor="unlink" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2 font-medium">
                            <Unlink className="w-4 h-4" />
                            Start Without Linking
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Start session without connecting to any appointment
                          </p>
                        </Label>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <>
                  {/* No Appointment Found */}
                  <div className="p-3 bg-warning/5 border border-warning/20 rounded-lg mb-3">
                    <div className="flex items-center gap-2 text-sm text-warning">
                      <AlertCircle className="w-4 h-4" />
                      <span className="font-medium">No scheduled appointment found</span>
                    </div>
                  </div>

                  <Card className={`cursor-pointer transition-all ${startOption === 'create' ? 'ring-2 ring-primary' : ''}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value="create" id="create" className="mt-1" />
                        <Label htmlFor="create" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2 font-medium">
                            <Plus className="w-4 h-4 text-primary" />
                            Create Appointment & Start
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Create a new appointment and start session
                          </p>
                        </Label>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`cursor-pointer transition-all ${startOption === 'unlink' ? 'ring-2 ring-primary' : ''}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value="unlink" id="unlink-no-appt" className="mt-1" />
                        <Label htmlFor="unlink-no-appt" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2 font-medium">
                            <Unlink className="w-4 h-4" />
                            Start Without Appointment
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Start session without creating an appointment
                          </p>
                        </Label>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </RadioGroup>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={loading || submitting}
            className="flex-1"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-1" />
            )}
            Start Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
