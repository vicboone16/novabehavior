import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Referral, REFERRAL_STAGES, ReferralStatus } from '@/types/referral';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { User, Phone, Mail, Calendar, FileText, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { IntakeChecklist } from './IntakeChecklist';

interface ReferralDetailPanelProps {
  referral: Referral;
  onClose: () => void;
  onUpdate: () => void;
}

export function ReferralDetailPanel({ referral, onClose, onUpdate }: ReferralDetailPanelProps) {
  const { user } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [converting, setConverting] = useState(false);

  const handleStatusChange = async (newStatus: ReferralStatus) => {
    try {
      setUpdating(true);
      const { error } = await supabase
        .from('referrals')
        .update({ status: newStatus })
        .eq('id', referral.id);

      if (error) throw error;
      toast.success(`Status updated to ${REFERRAL_STAGES.find(s => s.value === newStatus)?.label}`);
      onUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleConvertToStudent = async () => {
    if (!user?.id) return;
    
    try {
      setConverting(true);
      
      // Build the full name
      const fullName = `${referral.client_first_name} ${referral.client_last_name}`.trim();
      
      // Build background info from referral data
      const backgroundInfo = {
        parentGuardianName: referral.parent_guardian_name,
        parentGuardianPhone: referral.parent_guardian_phone,
        parentGuardianEmail: referral.parent_guardian_email,
        address: referral.client_address,
        city: referral.client_city,
        state: referral.client_state,
        zip: referral.client_zip,
        diagnosis: referral.client_diagnosis,
        fundingSource: referral.funding_source,
        referralSource: referral.source,
        referralDate: referral.referral_date,
        referralNotes: referral.notes,
      };
      
      // Create new student from referral data using correct schema
      const { data: student, error: studentError } = await supabase
        .from('students')
        .insert({
          name: fullName,
          first_name: referral.client_first_name,
          last_name: referral.client_last_name,
          display_name: fullName,
          date_of_birth: referral.client_dob,
          contact_email: referral.parent_guardian_email,
          contact_phone: referral.parent_guardian_phone,
          funding_mode: referral.funding_source === 'insurance' ? 'insurance' : 'school',
          background_info: backgroundInfo,
          user_id: user.id,
          is_archived: false,
          behaviors: [],
        })
        .select()
        .single();

      if (studentError) throw studentError;

      // Update referral to converted status
      const { error: referralError } = await supabase
        .from('referrals')
        .update({ 
          status: 'converted',
          converted_student_id: student.id,
        })
        .eq('id', referral.id);

      if (referralError) throw referralError;

      toast.success(`Successfully converted ${fullName} to a student!`);
      setShowConvertDialog(false);
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error converting to student:', error);
      toast.error('Failed to convert referral to student');
    } finally {
      setConverting(false);
    }
  };

  const stage = REFERRAL_STAGES.find(s => s.value === referral.status);

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>{referral.client_first_name} {referral.client_last_name}</span>
            <Badge className={stage?.color}>{stage?.label}</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Status Update */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Update Status</label>
            <Select
              value={referral.status}
              onValueChange={(value) => handleStatusChange(value as ReferralStatus)}
              disabled={updating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REFERRAL_STAGES.map((stage) => (
                  <SelectItem key={stage.value} value={stage.value}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Client Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Client Information</h3>
            
            {referral.client_dob && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>DOB: {new Date(referral.client_dob).toLocaleDateString()}</span>
              </div>
            )}

            {referral.client_diagnosis && (
              <div className="text-sm">
                <span className="text-muted-foreground">Diagnosis:</span> {referral.client_diagnosis}
              </div>
            )}

            {referral.client_address && (
              <div className="text-sm text-muted-foreground">
                {referral.client_address}
                {referral.client_city && `, ${referral.client_city}`}
                {referral.client_state && `, ${referral.client_state}`}
                {referral.client_zip && ` ${referral.client_zip}`}
              </div>
            )}
          </div>

          <Separator />

          {/* Parent/Guardian */}
          {referral.parent_guardian_name && (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Parent/Guardian</h3>
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>{referral.parent_guardian_name}</span>
                </div>
                {referral.parent_guardian_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{referral.parent_guardian_phone}</span>
                  </div>
                )}
                {referral.parent_guardian_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{referral.parent_guardian_email}</span>
                  </div>
                )}
              </div>
              <Separator />
            </>
          )}

          {/* Referral Source */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Referral Source</h3>
            <div className="text-sm">
              <Badge variant="outline" className="capitalize">{referral.source}</Badge>
              {referral.source_contact_name && (
                <p className="mt-2">{referral.source_contact_name}</p>
              )}
              {referral.source_contact_phone && (
                <p className="text-muted-foreground">{referral.source_contact_phone}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Intake Checklist */}
          <IntakeChecklist referralId={referral.id} />

          <Separator />

          {/* Notes */}
          {referral.notes && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Notes</h3>
              <p className="text-sm text-muted-foreground">{referral.notes}</p>
            </div>
          )}

          {/* Actions */}
          {referral.status === 'accepted' && (
            <Button onClick={() => setShowConvertDialog(true)} className="w-full gap-2">
              <ArrowRight className="w-4 h-4" />
              Convert to Student
            </Button>
          )}
        </div>
      </SheetContent>

      {/* Convert to Student Confirmation Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert Referral to Student</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <CheckCircle className="w-8 h-8 text-primary" />
              <div>
                <p className="font-medium">
                  {referral.client_first_name} {referral.client_last_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Will be added as a new student in the system
                </p>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              This will create a new student record with the referral information and mark this referral as converted.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvertDialog(false)} disabled={converting}>
              Cancel
            </Button>
            <Button onClick={handleConvertToStudent} disabled={converting}>
              {converting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Converting...
                </>
              ) : (
                'Convert to Student'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
