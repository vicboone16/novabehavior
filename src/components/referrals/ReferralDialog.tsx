import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { ReferralSource, ReferralPriority } from '@/types/referral';

interface ReferralDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ReferralDialog({ open, onOpenChange, onSuccess }: ReferralDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    client_first_name: '',
    client_last_name: '',
    client_dob: '',
    client_diagnosis: '',
    parent_guardian_name: '',
    parent_guardian_email: '',
    parent_guardian_phone: '',
    source: 'other' as ReferralSource,
    source_contact_name: '',
    source_contact_phone: '',
    priority_level: 'normal' as ReferralPriority,
    funding_source: '',
    notes: '',
  });

  const handleSubmit = async () => {
    if (!user?.id) return;
    
    if (!formData.client_first_name || !formData.client_last_name) {
      toast.error('Please enter client name');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from('referrals').insert({
        ...formData,
        client_dob: formData.client_dob || null,
        created_by: user.id,
        status: 'received',
      });

      if (error) throw error;

      toast.success('Referral created successfully');
      onSuccess();
      
      // Reset form
      setFormData({
        client_first_name: '',
        client_last_name: '',
        client_dob: '',
        client_diagnosis: '',
        parent_guardian_name: '',
        parent_guardian_email: '',
        parent_guardian_phone: '',
        source: 'other',
        source_contact_name: '',
        source_contact_phone: '',
        priority_level: 'normal',
        funding_source: '',
        notes: '',
      });
    } catch (error) {
      console.error('Error creating referral:', error);
      toast.error('Failed to create referral');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Referral</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Client Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Client Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={formData.client_first_name}
                  onChange={(e) => setFormData({ ...formData, client_first_name: e.target.value })}
                  placeholder="First name"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  value={formData.client_last_name}
                  onChange={(e) => setFormData({ ...formData, client_last_name: e.target.value })}
                  placeholder="Last name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={formData.client_dob}
                  onChange={(e) => setFormData({ ...formData, client_dob: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority_level}
                  onValueChange={(value) => setFormData({ ...formData, priority_level: value as ReferralPriority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Diagnosis</Label>
              <Input
                value={formData.client_diagnosis}
                onChange={(e) => setFormData({ ...formData, client_diagnosis: e.target.value })}
                placeholder="e.g., Autism Spectrum Disorder"
              />
            </div>
          </div>

          {/* Parent/Guardian */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Parent/Guardian</h3>
            
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.parent_guardian_name}
                onChange={(e) => setFormData({ ...formData, parent_guardian_name: e.target.value })}
                placeholder="Parent/guardian name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={formData.parent_guardian_phone}
                  onChange={(e) => setFormData({ ...formData, parent_guardian_phone: e.target.value })}
                  placeholder="(555) 555-5555"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.parent_guardian_email}
                  onChange={(e) => setFormData({ ...formData, parent_guardian_email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
            </div>
          </div>

          {/* Referral Source */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Referral Source</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Source Type</Label>
                <Select
                  value={formData.source}
                  onValueChange={(value) => setFormData({ ...formData, source: value as ReferralSource })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="school">School</SelectItem>
                    <SelectItem value="physician">Physician</SelectItem>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                    <SelectItem value="self">Self</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Funding Source</Label>
                <Input
                  value={formData.funding_source}
                  onChange={(e) => setFormData({ ...formData, funding_source: e.target.value })}
                  placeholder="Insurance, School, Private Pay"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input
                  value={formData.source_contact_name}
                  onChange={(e) => setFormData({ ...formData, source_contact_name: e.target.value })}
                  placeholder="Referring person name"
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input
                  value={formData.source_contact_phone}
                  onChange={(e) => setFormData({ ...formData, source_contact_phone: e.target.value })}
                  placeholder="(555) 555-5555"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about the referral..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating...' : 'Create Referral'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
