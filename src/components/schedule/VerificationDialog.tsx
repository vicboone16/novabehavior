import { useState } from 'react';
import { format } from 'date-fns';
import { 
  CheckCircle2, XCircle, Clock, User, MapPin, 
  FileText, AlertCircle, CalendarCheck 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { 
  AttendanceOutcome, 
  getReasonCodesForOutcome,
  OUTCOME_LABELS,
  SERVICE_SETTING_LABELS,
} from '@/types/scheduling';
import type { Appointment } from '@/types/schedule';

interface VerificationDialogProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName?: string;
  staffName?: string;
  onVerified: () => void;
  onCreateNote?: (sessionId: string, appointmentId: string) => void;
}

type Step = 'occurred' | 'outcome' | 'note_prompt';

export function VerificationDialog({
  appointment,
  open,
  onOpenChange,
  studentName,
  staffName,
  onVerified,
  onCreateNote,
}: VerificationDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('occurred');
  const [didOccur, setDidOccur] = useState<boolean | null>(null);
  const [outcome, setOutcome] = useState<AttendanceOutcome>('canceled');
  const [reasonCode, setReasonCode] = useState('');
  const [reasonDetail, setReasonDetail] = useState('');
  const [followUpNeeded, setFollowUpNeeded] = useState(false);
  const [createdSessionId, setCreatedSessionId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  if (!appointment) return null;

  const resetState = () => {
    setStep('occurred');
    setDidOccur(null);
    setOutcome('canceled');
    setReasonCode('');
    setReasonDetail('');
    setFollowUpNeeded(false);
    setCreatedSessionId(null);
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleOccurred = async () => {
    if (!user || !appointment.student_id) return;
    setProcessing(true);

    try {
      // Create session record
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          name: `Session - ${studentName || 'Student'}`,
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          session_length_minutes: appointment.duration_minutes,
          student_ids: [appointment.student_id],
          status: 'completed',
          appointment_id: appointment.id,
          service_type: appointment.appointment_type || 'direct_therapy',
          service_setting: 'school',
          verification_source: 'appointment_verified',
          attendance_outcome: 'occurred',
          has_data: false,
          provider_id: appointment.staff_user_id,
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Update appointment
      await supabase
        .from('appointments')
        .update({
          status: 'completed',
          verification_status: 'verified_occurred',
          verified_at: new Date().toISOString(),
          verified_by: user.id,
          linked_session_id: session.id,
        })
        .eq('id', appointment.id);

      // Create attendance log
      await supabase
        .from('attendance_logs')
        .insert({
          student_id: appointment.student_id,
          appointment_id: appointment.id,
          session_id: session.id,
          date: format(new Date(appointment.start_time), 'yyyy-MM-dd'),
          outcome: 'occurred',
          marked_by_user_id: user.id,
        });

      setCreatedSessionId(session.id);
      setStep('note_prompt');
      toast({ title: 'Session Verified', description: 'Session has been marked as completed.' });
    } catch (error: any) {
      console.error('Error verifying session:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleDidNotOccur = async () => {
    if (!user || !appointment.student_id) return;
    setProcessing(true);

    try {
      // Map outcome to appointment status
      const statusMap: Record<AttendanceOutcome, string> = {
        occurred: 'completed',
        canceled: 'canceled',
        rescheduled: 'rescheduled',
        no_show: 'no_show',
        client_unavailable: 'did_not_occur',
        provider_unavailable: 'did_not_occur',
        weather: 'canceled',
        school_event: 'canceled',
        other: 'did_not_occur',
      };

      // Update appointment
      await supabase
        .from('appointments')
        .update({
          status: statusMap[outcome] || 'did_not_occur',
          verification_status: 'verified_not_occurred',
          verified_at: new Date().toISOString(),
          verified_by: user.id,
        })
        .eq('id', appointment.id);

      // Create attendance log
      await supabase
        .from('attendance_logs')
        .insert({
          student_id: appointment.student_id,
          appointment_id: appointment.id,
          date: format(new Date(appointment.start_time), 'yyyy-MM-dd'),
          outcome: outcome,
          reason_code: reasonCode || null,
          reason_detail: reasonDetail || null,
          follow_up_needed: followUpNeeded,
          marked_by_user_id: user.id,
        });

      toast({ title: 'Appointment Updated', description: `Marked as ${OUTCOME_LABELS[outcome]}` });
      onVerified();
      handleClose();
    } catch (error: any) {
      console.error('Error updating appointment:', error);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleAddNote = () => {
    if (createdSessionId && onCreateNote) {
      onCreateNote(createdSessionId, appointment.id);
    }
    onVerified();
    handleClose();
  };

  const handleSkipNote = () => {
    onVerified();
    handleClose();
  };

  const reasonCodes = getReasonCodesForOutcome(outcome);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-primary" />
            Verify Appointment
          </DialogTitle>
          <DialogDescription>
            {format(new Date(appointment.start_time), 'EEEE, MMMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>

        {/* Appointment Summary */}
        <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
          {studentName && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{studentName}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>
              {format(new Date(appointment.start_time), 'h:mm a')} - {format(new Date(appointment.end_time), 'h:mm a')}
              <span className="text-muted-foreground ml-1">({appointment.duration_minutes} min)</span>
            </span>
          </div>
          {staffName && (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Provider: {staffName}</span>
            </div>
          )}
        </div>

        {/* Step: Did session occur? */}
        {step === 'occurred' && (
          <div className="space-y-4 py-4">
            <Label className="text-base">Did this session occur?</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                onClick={() => {
                  setDidOccur(true);
                  handleOccurred();
                }}
                disabled={processing}
              >
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                <span>Yes, Occurred</span>
              </Button>
              <Button
                variant="outline"
                className="h-20 flex-col gap-2 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={() => {
                  setDidOccur(false);
                  setStep('outcome');
                }}
                disabled={processing}
              >
                <XCircle className="w-8 h-8 text-red-600" />
                <span>No, Did Not Occur</span>
              </Button>
            </div>
          </div>
        )}

        {/* Step: Select outcome reason */}
        {step === 'outcome' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>What happened?</Label>
              <RadioGroup value={outcome} onValueChange={(v) => setOutcome(v as AttendanceOutcome)}>
                {(['canceled', 'rescheduled', 'no_show', 'client_unavailable', 'provider_unavailable', 'other'] as AttendanceOutcome[]).map(o => (
                  <div key={o} className="flex items-center space-x-2">
                    <RadioGroupItem value={o} id={o} />
                    <Label htmlFor={o} className="font-normal cursor-pointer">
                      {OUTCOME_LABELS[o]}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {reasonCodes.length > 0 && (
              <div className="space-y-2">
                <Label>Reason</Label>
                <Select value={reasonCode} onValueChange={setReasonCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {reasonCodes.map(r => (
                      <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Additional Details (optional)</Label>
              <Textarea
                value={reasonDetail}
                onChange={(e) => setReasonDetail(e.target.value)}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="followup"
                checked={followUpNeeded}
                onCheckedChange={(c) => setFollowUpNeeded(!!c)}
              />
              <Label htmlFor="followup" className="font-normal cursor-pointer">
                Follow-up needed
              </Label>
            </div>
          </div>
        )}

        {/* Step: Add note prompt */}
        {step === 'note_prompt' && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-medium">Session verified successfully!</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Would you like to add a session note?
            </p>
            <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <FileText className="w-5 h-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Recommended</p>
                <p className="text-muted-foreground">
                  Session notes document clinical activities and are required for billing.
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {step === 'occurred' && (
            <Button variant="outline" onClick={handleClose} className="w-full sm:w-auto">
              Cancel
            </Button>
          )}

          {step === 'outcome' && (
            <>
              <Button variant="outline" onClick={() => setStep('occurred')}>
                Back
              </Button>
              <Button 
                onClick={handleDidNotOccur} 
                disabled={processing || (reasonCodes.length > 0 && !reasonCode)}
              >
                {processing ? 'Saving...' : 'Confirm'}
              </Button>
            </>
          )}

          {step === 'note_prompt' && (
            <>
              <Button variant="outline" onClick={handleSkipNote} className="flex-1">
                No Note
              </Button>
              <Button onClick={handleAddNote} className="flex-1">
                <FileText className="w-4 h-4 mr-2" />
                Add Note
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
