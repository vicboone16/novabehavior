import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Plus, FileCheck, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import type { ClientServiceLine } from '@/types/clientProfile';

interface ServicesAuthorizationsTabProps {
  clientId: string;
  serviceLines: ClientServiceLine[];
  onRefetch: () => void;
}

const SERVICE_TYPES = [
  'ABA Therapy',
  'Parent Training',
  'Behavior Support',
  'Consultation',
  'Assessment',
  'Social Skills Group',
  'School-Based Services',
];

const AUTHORIZATION_STATUS = [
  { value: 'not_required', label: 'Not Required', color: 'bg-muted' },
  { value: 'required', label: 'Required', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'pending', label: 'Pending', color: 'bg-orange-100 text-orange-800' },
  { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-800' },
  { value: 'expired', label: 'Expired', color: 'bg-red-100 text-red-800' },
  { value: 'denied', label: 'Denied', color: 'bg-red-100 text-red-800' },
];

export function ServicesAuthorizationsTab({ clientId, serviceLines, onRefetch }: ServicesAuthorizationsTabProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    service_type: '',
    cpt_code: '',
    requires_authorization: true,
    authorization_status: 'required',
    authorized_units: 0,
    unit_type: 'hours' as 'hours' | 'units' | 'sessions',
    start_date: '',
    end_date: '',
    notes: '',
  });

  const handleAddService = async () => {
    if (!formData.service_type) {
      toast.error('Service type is required');
      return;
    }

    try {
      const { error } = await supabase.from('client_service_lines').insert({
        client_id: clientId,
        service_type: formData.service_type,
        cpt_code: formData.cpt_code || null,
        requires_authorization: formData.requires_authorization,
        authorization_status: formData.authorization_status,
        authorized_units: formData.authorized_units || null,
        unit_type: formData.unit_type,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        notes: formData.notes || null,
        is_active: true,
        used_units: 0,
        remaining_units: formData.authorized_units || 0,
      });

      if (error) throw error;
      toast.success('Service line added');
      setIsAddDialogOpen(false);
      setFormData({
        service_type: '',
        cpt_code: '',
        requires_authorization: true,
        authorization_status: 'required',
        authorized_units: 0,
        unit_type: 'hours',
        start_date: '',
        end_date: '',
        notes: '',
      });
      onRefetch();
    } catch (error) {
      console.error('Error adding service:', error);
      toast.error('Failed to add service line');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = AUTHORIZATION_STATUS.find(s => s.value === status);
    return (
      <Badge className={statusConfig?.color || 'bg-muted'}>
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const getExpirationAlert = (endDate: string | null) => {
    if (!endDate) return null;
    const daysRemaining = differenceInDays(new Date(endDate), new Date());
    
    if (daysRemaining < 0) {
      return <Badge variant="destructive">Expired</Badge>;
    } else if (daysRemaining <= 14) {
      return (
        <Badge variant="outline" className="text-orange-600 border-orange-600">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Expires in {daysRemaining} days
        </Badge>
      );
    } else if (daysRemaining <= 30) {
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
          <Clock className="h-3 w-3 mr-1" />
          Expires in {daysRemaining} days
        </Badge>
      );
    }
    return null;
  };

  const activeServices = serviceLines.filter(s => s.is_active);
  const inactiveServices = serviceLines.filter(s => !s.is_active);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Services & Authorizations</h3>
          <p className="text-sm text-muted-foreground">
            Manage service lines and authorization tracking
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Service Line</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Service Type *</Label>
                <Select
                  value={formData.service_type}
                  onValueChange={(value) => setFormData({ ...formData, service_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>CPT Code</Label>
                <Input
                  value={formData.cpt_code}
                  onChange={(e) => setFormData({ ...formData, cpt_code: e.target.value })}
                  placeholder="e.g., 97153"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Requires Authorization</Label>
                <Switch
                  checked={formData.requires_authorization}
                  onCheckedChange={(checked) => setFormData({ ...formData, requires_authorization: checked })}
                />
              </div>

              {formData.requires_authorization && (
                <>
                  <div className="space-y-2">
                    <Label>Authorization Status</Label>
                    <Select
                      value={formData.authorization_status}
                      onValueChange={(value) => setFormData({ ...formData, authorization_status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AUTHORIZATION_STATUS.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Authorized Units</Label>
                      <Input
                        type="number"
                        value={formData.authorized_units}
                        onChange={(e) => setFormData({ ...formData, authorized_units: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit Type</Label>
                      <Select
                        value={formData.unit_type}
                        onValueChange={(value: 'hours' | 'units' | 'sessions') => 
                          setFormData({ ...formData, unit_type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hours">Hours</SelectItem>
                          <SelectItem value="units">Units</SelectItem>
                          <SelectItem value="sessions">Sessions</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddService}>Add Service</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Services */}
      <div className="grid gap-4">
        {activeServices.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No active service lines. Click "Add Service" to get started.
            </CardContent>
          </Card>
        ) : (
          activeServices.map((service) => {
            const usagePercent = service.authorized_units 
              ? (service.used_units / service.authorized_units) * 100 
              : 0;
            
            return (
              <Card key={service.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileCheck className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-base">{service.service_type}</CardTitle>
                        {service.cpt_code && (
                          <p className="text-xs text-muted-foreground">CPT: {service.cpt_code}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(service.authorization_status)}
                      {getExpirationAlert(service.end_date)}
                    </div>
                  </div>
                </CardHeader>
                {service.requires_authorization && service.authorized_units && (
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Usage: {service.used_units} / {service.authorized_units} {service.unit_type}</span>
                        <span>{Math.round(usagePercent)}%</span>
                      </div>
                      <Progress value={usagePercent} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Remaining: {service.remaining_units} {service.unit_type}</span>
                        {service.start_date && service.end_date && (
                          <span>
                            {format(new Date(service.start_date), 'MMM d')} - {format(new Date(service.end_date), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Summary Cards */}
      {activeServices.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {activeServices.filter(s => s.authorization_status === 'approved').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {activeServices.filter(s => s.authorization_status === 'pending').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {activeServices.filter(s => 
                      s.end_date && differenceInDays(new Date(s.end_date), new Date()) <= 30
                    ).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Expiring Soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
