import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Referral, REFERRAL_STAGES, ReferralStatus } from '@/types/referral';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { User, Phone, Mail, Calendar, FileText, ArrowRight } from 'lucide-react';
import { IntakeChecklist } from './IntakeChecklist';

interface ReferralDetailPanelProps {
  referral: Referral;
  onClose: () => void;
  onUpdate: () => void;
}

export function ReferralDetailPanel({ referral, onClose, onUpdate }: ReferralDetailPanelProps) {
  const [updating, setUpdating] = useState(false);

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
    // This would create a new student from the referral data
    toast.info('Convert to Student feature coming soon');
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
            <Button onClick={handleConvertToStudent} className="w-full gap-2">
              <ArrowRight className="w-4 h-4" />
              Convert to Student
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
