import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Edit2, Save, X, User, Mail, Phone, Calendar } from 'lucide-react';
import type { SupervisorLink } from '@/types/staffProfile';
import { format } from 'date-fns';
import { SupervisionChainWarning } from '@/components/supervision/SupervisionChainWarning';
import { AssignSupervisorDialog } from '@/components/supervision/AssignSupervisorDialog';

interface StaffOverviewTabProps {
  profile: any;
  updateProfile: (updates: Partial<any>) => Promise<boolean>;
  supervisorLinks: SupervisorLink[];
  superviseeLinks: SupervisorLink[];
}

const EMPLOYMENT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'terminated', label: 'Terminated' },
];

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'staff', label: 'Staff' },
  { value: 'viewer', label: 'Viewer' },
];

export function StaffOverviewTab({ profile, updateProfile, supervisorLinks, superviseeLinks }: StaffOverviewTabProps) {
  const [editing, setEditing] = useState(false);
  const [showAssignSupervisorDialog, setShowAssignSupervisorDialog] = useState(false);
  const [formData, setFormData] = useState({
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    display_name: profile.display_name || '',
    email: profile.email || '',
    phone: profile.phone || '',
    secondary_email: profile.secondary_email || '',
    secondary_phone: profile.secondary_phone || '',
    employment_status: profile.employment_status || 'active',
    hire_date: profile.hire_date || '',
    npi_number: profile.npi_number || '',
  });
  
  const staffName = profile.display_name || 
    `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 
    'Unknown';

  const handleSave = async () => {
    const success = await updateProfile(formData);
    if (success) {
      setEditing(false);
    }
  };

  const activeSupervisors = supervisorLinks.filter(
    l => l.status === 'active' && (!l.end_date || new Date(l.end_date) > new Date())
  );
  
  const activeSupervisees = superviseeLinks.filter(
    l => l.status === 'active' && (!l.end_date || new Date(l.end_date) > new Date())
  );

  return (
    <div className="space-y-6 mt-6">
      {/* Supervision Chain Warning */}
      <SupervisionChainWarning
        staffUserId={profile.user_id}
        credential={profile.credential}
        onAssignSupervisor={() => setShowAssignSupervisorDialog(true)}
      />
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          {!editing ? (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label>First Name</Label>
                {editing ? (
                  <Input
                    value={formData.first_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  />
                ) : (
                  <p className="text-sm mt-1">{profile.first_name || '—'}</p>
                )}
              </div>
              
              <div>
                <Label>Last Name</Label>
                {editing ? (
                  <Input
                    value={formData.last_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  />
                ) : (
                  <p className="text-sm mt-1">{profile.last_name || '—'}</p>
                )}
              </div>
              
              <div>
                <Label>Display Name</Label>
                {editing ? (
                  <Input
                    value={formData.display_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                  />
                ) : (
                  <p className="text-sm mt-1">{profile.display_name || '—'}</p>
                )}
              </div>

              <div>
                <Label>NPI Number</Label>
                {editing ? (
                  <Input
                    value={formData.npi_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, npi_number: e.target.value }))}
                    placeholder="10-digit NPI"
                  />
                ) : (
                  <p className="text-sm mt-1">{profile.npi_number || '—'}</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Primary Email
                </Label>
                {editing ? (
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                ) : (
                  <p className="text-sm mt-1">{profile.email || '—'}</p>
                )}
              </div>
              
              <div>
                <Label className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Primary Phone
                </Label>
                {editing ? (
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                ) : (
                  <p className="text-sm mt-1">{profile.phone || '—'}</p>
                )}
              </div>

              <div>
                <Label>Employment Status</Label>
                {editing ? (
                  <Select
                    value={formData.employment_status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, employment_status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_STATUSES.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={profile.employment_status === 'active' ? 'default' : 'secondary'} className="mt-1">
                    {profile.employment_status || 'Unknown'}
                  </Badge>
                )}
              </div>

              <div>
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Hire Date
                </Label>
                {editing ? (
                  <Input
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, hire_date: e.target.value }))}
                  />
                ) : (
                  <p className="text-sm mt-1">
                    {profile.hire_date ? format(new Date(profile.hire_date), 'MMM d, yyyy') : '—'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supervision Chain */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My Supervisors</CardTitle>
          </CardHeader>
          <CardContent>
            {activeSupervisors.length > 0 ? (
              <div className="space-y-3">
                {activeSupervisors.map(link => (
                  <div key={link.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">
                        {link.supervisor_profile?.display_name || 
                         `${link.supervisor_profile?.first_name || ''} ${link.supervisor_profile?.last_name || ''}`.trim() ||
                         'Unknown'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Since {format(new Date(link.start_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Badge variant={link.supervision_type === 'primary' ? 'default' : 'outline'}>
                      {link.supervision_type}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No active supervisors assigned
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">My Supervisees</CardTitle>
          </CardHeader>
          <CardContent>
            {activeSupervisees.length > 0 ? (
              <div className="space-y-3">
                {activeSupervisees.map(link => (
                  <div key={link.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">
                        {link.supervisee_profile?.display_name || 
                         `${link.supervisee_profile?.first_name || ''} ${link.supervisee_profile?.last_name || ''}`.trim() ||
                         'Unknown'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Since {format(new Date(link.start_date), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Badge variant={link.supervision_type === 'primary' ? 'default' : 'outline'}>
                      {link.supervision_type}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No supervisees assigned
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assign Supervisor Dialog */}
      <AssignSupervisorDialog
        open={showAssignSupervisorDialog}
        onOpenChange={setShowAssignSupervisorDialog}
        staffUserId={profile.user_id}
        staffName={staffName}
        onAssigned={() => {
          // Refresh the page to show updated supervision status
          window.location.reload();
        }}
      />
    </div>
  );
}
