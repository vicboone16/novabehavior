import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, DollarSign } from 'lucide-react';
import type { ContractRate, ContractService, ContractType, ContractStatus, BillingFrequency } from '@/types/contractRates';
import { CONTRACT_TYPE_LABELS, BILLING_FREQUENCY_LABELS } from '@/types/contractRates';
import { SERVICE_TYPES } from '@/types/staffProfile';

interface ContractRateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract?: ContractRate | null;
  onSubmit: (data: Partial<ContractRate>) => Promise<boolean>;
}

const UNIT_TYPES = [
  { value: 'hour', label: 'Per Hour' },
  { value: '15min', label: 'Per 15 Minutes' },
  { value: 'session', label: 'Per Session' },
  { value: 'day', label: 'Per Day' },
];

const STATUS_OPTIONS: ContractStatus[] = ['active', 'pending', 'expired', 'terminated'];

export function ContractRateFormDialog({
  open,
  onOpenChange,
  contract,
  onSubmit,
}: ContractRateFormDialogProps) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    contract_type: 'district' as ContractType,
    organization_name: '',
    contract_number: '',
    contract_start_date: new Date().toISOString().split('T')[0],
    contract_end_date: '',
    billing_frequency: 'monthly' as BillingFrequency,
    invoice_due_days: 30,
    requires_signature: false,
    status: 'active' as ContractStatus,
    notes: '',
  });
  const [services, setServices] = useState<ContractService[]>([]);

  useEffect(() => {
    if (contract) {
      setFormData({
        contract_type: contract.contract_type,
        organization_name: contract.organization_name,
        contract_number: contract.contract_number || '',
        contract_start_date: contract.contract_start_date,
        contract_end_date: contract.contract_end_date || '',
        billing_frequency: contract.billing_frequency,
        invoice_due_days: contract.invoice_due_days,
        requires_signature: contract.requires_signature,
        status: contract.status,
        notes: contract.notes || '',
      });
      setServices(contract.services || []);
    } else {
      resetForm();
    }
  }, [contract, open]);

  const resetForm = () => {
    setFormData({
      contract_type: 'district',
      organization_name: '',
      contract_number: '',
      contract_start_date: new Date().toISOString().split('T')[0],
      contract_end_date: '',
      billing_frequency: 'monthly',
      invoice_due_days: 30,
      requires_signature: false,
      status: 'active',
      notes: '',
    });
    setServices([]);
  };

  const addService = () => {
    setServices(prev => [...prev, {
      service_type: '',
      cpt_code: '',
      rate: 0,
      unit_type: 'hour',
      description: '',
    }]);
  };

  const updateService = (index: number, updates: Partial<ContractService>) => {
    setServices(prev => prev.map((s, i) => i === index ? { ...s, ...updates } : s));
  };

  const removeService = (index: number) => {
    setServices(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.organization_name.trim()) return;

    setSaving(true);
    const success = await onSubmit({
      ...formData,
      contract_end_date: formData.contract_end_date || undefined,
      services,
    });

    setSaving(false);
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {contract ? 'Edit Contract' : 'New Contract'}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contract Type *</Label>
                <Select
                  value={formData.contract_type}
                  onValueChange={(v: ContractType) => setFormData(prev => ({ ...prev, contract_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CONTRACT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v: ContractStatus) => setFormData(prev => ({ ...prev, status: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(status => (
                      <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Organization Name *</Label>
                <Input
                  value={formData.organization_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, organization_name: e.target.value }))}
                  placeholder="e.g., Springfield School District"
                />
              </div>

              <div className="space-y-2">
                <Label>Contract Number</Label>
                <Input
                  value={formData.contract_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, contract_number: e.target.value }))}
                  placeholder="e.g., 2024-ABA-001"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={formData.contract_start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, contract_start_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.contract_end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, contract_end_date: e.target.value }))}
                />
              </div>
            </div>

            {/* Billing Settings */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Billing Frequency</Label>
                <Select
                  value={formData.billing_frequency}
                  onValueChange={(v: BillingFrequency) => setFormData(prev => ({ ...prev, billing_frequency: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BILLING_FREQUENCY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Invoice Due (days)</Label>
                <Input
                  type="number"
                  value={formData.invoice_due_days}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoice_due_days: parseInt(e.target.value) || 30 }))}
                />
              </div>

              <div className="space-y-2">
                <Label>Requires Signature</Label>
                <div className="flex items-center h-10">
                  <Switch
                    checked={formData.requires_signature}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_signature: checked }))}
                  />
                </div>
              </div>
            </div>

            {/* Services */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Service Rates</Label>
                <Button variant="outline" size="sm" onClick={addService}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Service
                </Button>
              </div>

              {services.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                  No services added. Click "Add Service" to define rates.
                </p>
              ) : (
                <div className="space-y-3">
                  {services.map((service, idx) => (
                    <div key={idx} className="p-3 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">Service {idx + 1}</Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => removeService(idx)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="col-span-2">
                          <Select
                            value={service.service_type}
                            onValueChange={(v) => updateService(idx, { service_type: v })}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Service type" />
                            </SelectTrigger>
                            <SelectContent>
                              {SERVICE_TYPES.map(t => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Input
                          placeholder="CPT Code"
                          value={service.cpt_code || ''}
                          onChange={(e) => updateService(idx, { cpt_code: e.target.value })}
                          className="h-9"
                        />
                        <Select
                          value={service.unit_type}
                          onValueChange={(v: any) => updateService(idx, { unit_type: v })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNIT_TYPES.map(t => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Rate"
                          value={service.rate || ''}
                          onChange={(e) => updateService(idx, { rate: parseFloat(e.target.value) || 0 })}
                          className="h-9 w-24"
                        />
                        <Input
                          placeholder="Description (optional)"
                          value={service.description || ''}
                          onChange={(e) => updateService(idx, { description: e.target.value })}
                          className="h-9 flex-1"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional contract notes..."
                rows={3}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.organization_name.trim() || saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              contract ? 'Update Contract' : 'Create Contract'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
