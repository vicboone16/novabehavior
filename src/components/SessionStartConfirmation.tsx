import { useState, useEffect } from 'react';
import { format, addMinutes, subMinutes, startOfDay, endOfDay } from 'date-fns';
import { 
  Play, 
  Calendar, 
  Clock, 
  Link2, 
  Unlink, 
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw
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
import { useAgencyContext } from '@/hooks/useAgencyContext';
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
  const { currentAgency } = useAgencyContext();
  const { toast } = useToast();
  const { currentSessionId, sessionStartTime } = useDataStore();
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [matchingAppointment, setMatchingAppointment] = useState<Appointment | null>(null);
  const [extendedMatchAppointment, setExtendedMatchAppointment] = useState<Appointment | null>(null);
  const [inProgressAppointment, setInProgressAppointment] = useState<Appointment | null>(null);
  const [startOption, setStartOption] = useState<'continue' | 'link' | 'link-extended' | 'unlink' | 'create'>('link');
  const [adjustAppointmentTime, setAdjustAppointmentTime] = useState(false);
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
    setExtendedMatchAppointment(null);
    setInProgressAppointment(null);
    setAdjustAppointmentTime(false);
    
    try {
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      
      // First, check for an in_progress appointment for this student today
      // This handles the cross-device sync case
      const { data: inProgressAppts, error: inProgressError } = await supabase
        .from('appointments')
        .select('*')
        .eq('student_id', student.id)
        .or(`staff_user_id.eq.${user.id},staff_user_ids.cs.{${user.id}}`)
        .gte('start_time', todayStart.toISOString())
        .lte('start_time', todayEnd.toISOString())
        .eq('status', 'in_progress')
        .order('start_time', { ascending: false })
        .limit(1);

      if (inProgressError) throw inProgressError;

      if (inProgressAppts && inProgressAppts.length > 0) {
        // Found an in-progress appointment - prioritize continuing this
        setInProgressAppointment(inProgressAppts[0] as Appointment);
        setStartOption('continue');
        setLoading(false);
        return;
      }
      
      // Look for scheduled appointments in exact window (±30 min / +15 min)
      const exactWindowStart = subMinutes(now, 30);
      const exactWindowEnd = addMinutes(now, 15);
      
      const { data: exactAppointments, error: exactError } = await supabase
        .from('appointments')
        .select('*')
        .eq('student_id', student.id)
        .or(`staff_user_id.eq.${user.id},staff_user_ids.cs.{${user.id}}`)
        .gte('start_time', exactWindowStart.toISOString())
        .lte('start_time', exactWindowEnd.toISOString())
        .in('status', ['scheduled', 'pending_verification'])
        .order('start_time', { ascending: true })
        .limit(1);

      if (exactError) throw exactError;

      if (exactAppointments && exactAppointments.length > 0) {
        setMatchingAppointment(exactAppointments[0] as Appointment);
        setStartOption('link');
        setLoading(false);
        return;
      }
      
      // If no exact match, look for appointments in extended window (up to 2.5 hours back)
      // Using 150 min to account for minor timing differences and give some buffer
      const extendedWindowStart = subMinutes(now, 150); // 2.5 hours back
      
      const { data: extendedAppointments, error: extendedError } = await supabase
        .from('appointments')
        .select('*')
        .eq('student_id', student.id)
        .or(`staff_user_id.eq.${user.id},staff_user_ids.cs.{${user.id}}`)
        .gte('start_time', extendedWindowStart.toISOString())
        .lt('start_time', exactWindowStart.toISOString()) // Before the exact window
        .in('status', ['scheduled', 'pending_verification'])
        .order('start_time', { ascending: false }) // Most recent first
        .limit(1);

      if (extendedError) throw extendedError;

      if (extendedAppointments && extendedAppointments.length > 0) {
        setExtendedMatchAppointment(extendedAppointments[0] as Appointment);
        setStartOption('link-extended');
        setAdjustAppointmentTime(true); // Default to adjusting time for extended matches
        setLoading(false);
        return;
      }
      
      // No matching appointments found
      setStartOption('create');
    } catch (error) {
      console.error('Error checking appointments:', error);
      setMatchingAppointment(null);
      setExtendedMatchAppointment(null);
      setInProgressAppointment(null);
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
      
      // Generate session ID that will be used when session starts
      const newSessionId = crypto.randomUUID();
      
      if (startOption === 'continue' && inProgressAppointment) {
        // Continue with existing in-progress appointment (cross-device sync)
        linkedAppointmentId = inProgressAppointment.id;
        
        // Ensure the appointment has the linked_session_id (for retroactive linkage)
        if (!inProgressAppointment.linked_session_id) {
          await supabase
            .from('appointments')
            .update({ linked_session_id: currentSessionId || newSessionId })
            .eq('id', inProgressAppointment.id);
        }
        
        toast({
          title: 'Continuing Session',
          description: `Continuing existing session for ${student.name}`,
        });
        
      } else if (startOption === 'link' && matchingAppointment) {
        // Link to existing scheduled appointment (exact match)
        linkedAppointmentId = matchingAppointment.id;
        
        // Update appointment status to in_progress and link the session
        await supabase
          .from('appointments')
          .update({ 
            status: 'in_progress',
            linked_session_id: currentSessionId || newSessionId,
          })
          .eq('id', matchingAppointment.id);
          
      } else if (startOption === 'link-extended' && extendedMatchAppointment) {
        // Link to an appointment from extended window (requires audit)
        linkedAppointmentId = extendedMatchAppointment.id;
        const now = new Date();
        const originalStartTime = new Date(extendedMatchAppointment.start_time);
        const timeDifferenceMinutes = Math.round((now.getTime() - originalStartTime.getTime()) / 60000);
        
        // Prepare update payload
        const updatePayload: any = {
          status: 'in_progress',
          linked_session_id: currentSessionId || newSessionId,
        };
        
        // If adjusting time, update the appointment start time
        if (adjustAppointmentTime) {
          const originalDuration = extendedMatchAppointment.duration_minutes;
          updatePayload.start_time = now.toISOString();
          updatePayload.end_time = addMinutes(now, originalDuration).toISOString();
        }
        
        await supabase
          .from('appointments')
          .update(updatePayload)
          .eq('id', extendedMatchAppointment.id);
        
        // Create audit log for supervisor review
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: adjustAppointmentTime ? 'session_time_adjusted' : 'session_late_start',
          resource_type: 'appointment',
          resource_id: extendedMatchAppointment.id,
          resource_name: `Session for ${student.name}`,
          details: {
            student_id: student.id,
            student_name: student.name,
            original_start_time: extendedMatchAppointment.start_time,
            actual_start_time: now.toISOString(),
            time_difference_minutes: timeDifferenceMinutes,
            appointment_time_adjusted: adjustAppointmentTime,
            requires_supervisor_review: true,
            review_reason: adjustAppointmentTime 
              ? `Appointment start time adjusted from ${format(originalStartTime, 'h:mm a')} to ${format(now, 'h:mm a')} (${timeDifferenceMinutes} min difference)`
              : `Session started ${timeDifferenceMinutes} minutes after scheduled time without adjustment`,
          },
        });
        
        toast({
          title: 'Session Started',
          description: adjustAppointmentTime 
            ? `Appointment time updated. A supervisor review has been flagged.`
            : `Linked to earlier appointment. A supervisor review has been flagged.`,
        });
          
      } else if (startOption === 'create') {
        // Create new appointment
        const now = new Date();
        const { data: newAppt, error } = await supabase
          .from('appointments')
          .insert({
            student_id: student.id,
            staff_user_id: user.id,
            created_by: user.id,
            agency_id: currentAgency?.id || null,
            start_time: now.toISOString(),
            end_time: addMinutes(now, 60).toISOString(),
            duration_minutes: 60,
            status: 'in_progress',
            appointment_type: 'session',
            verification_status: 'unverified',
            verification_required: true,
            linked_session_id: currentSessionId || newSessionId,
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
      
      if (startOption !== 'continue' && startOption !== 'link-extended') {
        toast({
          title: 'Session Started',
          description: `Started session for ${student.name}${linkedAppointmentId ? ' (linked to appointment)' : ''}`,
        });
      }
      
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
              {inProgressAppointment ? (
                <>
                  {/* Found In-Progress Appointment - Cross-device sync case */}
                  <div className="p-3 bg-accent/50 border border-accent rounded-lg mb-3">
                    <div className="flex items-center gap-2 text-sm text-accent-foreground mb-1">
                      <RefreshCw className="w-4 h-4" />
                      <span className="font-medium">Session already in progress</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      Started at {format(new Date(inProgressAppointment.start_time), 'h:mm a')}
                      <Badge variant="outline" className="ml-1 text-xs">Active</Badge>
                    </div>
                  </div>

                  <Card className={`cursor-pointer transition-all ${startOption === 'continue' ? 'ring-2 ring-primary' : ''}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value="continue" id="continue" className="mt-1" />
                        <Label htmlFor="continue" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2 font-medium">
                            <RefreshCw className="w-4 h-4 text-primary" />
                            Continue Existing Session
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Resume the session that's already in progress (recommended)
                          </p>
                        </Label>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`cursor-pointer transition-all ${startOption === 'create' ? 'ring-2 ring-primary' : ''}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value="create" id="create-new" className="mt-1" />
                        <Label htmlFor="create-new" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2 font-medium">
                            <Plus className="w-4 h-4 text-primary" />
                            Start New Appointment
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Create a separate appointment instead
                          </p>
                        </Label>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : matchingAppointment ? (
                <>
                  {/* Found Scheduled Appointment */}
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
              ) : extendedMatchAppointment ? (
                <>
                  {/* Found appointment in extended window (up to 2 hours back) */}
                  <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg mb-3">
                    <div className="flex items-center gap-2 text-sm text-warning mb-1">
                      <AlertCircle className="w-4 h-4" />
                      <span className="font-medium">Earlier appointment found</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      Scheduled for {format(new Date(extendedMatchAppointment.start_time), 'h:mm a')}
                      <span className="text-warning">
                        ({Math.round((Date.now() - new Date(extendedMatchAppointment.start_time).getTime()) / 60000)} min ago)
                      </span>
                    </div>
                  </div>

                  <Card className={`cursor-pointer transition-all ${startOption === 'link-extended' ? 'ring-2 ring-primary' : ''}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value="link-extended" id="link-extended" className="mt-1" />
                        <Label htmlFor="link-extended" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2 font-medium">
                            <Link2 className="w-4 h-4 text-primary" />
                            Link to Earlier Appointment
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Connect to the scheduled appointment (will flag for supervisor review)
                          </p>
                          
                          {startOption === 'link-extended' && (
                            <div className="mt-3 p-2 bg-secondary/50 rounded-md">
                              <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={adjustAppointmentTime}
                                  onChange={(e) => setAdjustAppointmentTime(e.target.checked)}
                                  className="rounded border-border"
                                />
                                <span>Update appointment start time to now</span>
                              </label>
                              <p className="text-xs text-muted-foreground mt-1 ml-6">
                                {adjustAppointmentTime 
                                  ? 'Appointment will be adjusted to current time' 
                                  : 'Original scheduled time will be kept'}
                              </p>
                            </div>
                          )}
                        </Label>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`cursor-pointer transition-all ${startOption === 'create' ? 'ring-2 ring-primary' : ''}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value="create" id="create-instead" className="mt-1" />
                        <Label htmlFor="create-instead" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2 font-medium">
                            <Plus className="w-4 h-4 text-primary" />
                            Create New Appointment Instead
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Ignore the earlier appointment and create a new one
                          </p>
                        </Label>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className={`cursor-pointer transition-all ${startOption === 'unlink' ? 'ring-2 ring-primary' : ''}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value="unlink" id="unlink-extended" className="mt-1" />
                        <Label htmlFor="unlink-extended" className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-2 font-medium">
                            <Unlink className="w-4 h-4" />
                            Start Without Linking
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Start session without any appointment
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
            ) : startOption === 'continue' ? (
              <RefreshCw className="w-4 h-4 mr-1" />
            ) : (
              <Play className="w-4 h-4 mr-1" />
            )}
            {startOption === 'continue' ? 'Continue Session' : 'Start Session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
