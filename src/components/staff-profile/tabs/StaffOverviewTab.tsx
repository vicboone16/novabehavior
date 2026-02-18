import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit2, Save, X, User, Mail, Phone, Calendar, Shield, Building2, Plus, Trash2 } from 'lucide-react';
import type { SupervisorLink } from '@/types/staffProfile';
import { format } from 'date-fns';
import { SupervisionChainWarning } from '@/components/supervision/SupervisionChainWarning';
import { AssignSupervisorDialog } from '@/components/supervision/AssignSupervisorDialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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


export function StaffOverviewTab({ profile, updateProfile, supervisorLinks, superviseeLinks }: StaffOverviewTabProps) {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  const [editing, setEditing] = useState(false);
  const [showAssignSupervisorDialog, setShowAssignSupervisorDialog] = useState(false);
  const [formData, setFormData] = useState({
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    display_name: profile.display_name || '',
    email: profile.email || '',
    phone: profile.phone || '',
    employment_status: profile.employment_status || 'active',
    hire_date: profile.hire_date || '',
    npi_number: profile.npi_number || '',
  });

  // Role & Agency state — supports multiple roles
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [roleLoading, setRoleLoading] = useState(false);
  const [agencies, setAgencies] = useState<{ id: string; agency_id: string; agency_name: string; role: string; status: string }[]>([]);
  const [availableAgencies, setAvailableAgencies] = useState<{ id: string; name: string }[]>([]);
  const [addAgencyOpen, setAddAgencyOpen] = useState(false);
  const [selectedAgencyId, setSelectedAgencyId] = useState('');
  const [agencyRole, setAgencyRole] = useState('staff');
  const [agencyLoading, setAgencyLoading] = useState(false);
  const [customRoles, setCustomRoles] = useState<{ value: string; label: string }[]>([]);

  const BASE_ROLES = [
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'admin', label: 'Admin' },
    { value: 'staff', label: 'Staff' },
    { value: 'viewer', label: 'Viewer' },
  ];

  const loadRoleAndAgencies = useCallback(async () => {
    const [roleRes, customRoleRes, memberRes, allAgenciesRes, customRolesRes] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', profile.user_id),
      (supabase as any).from('user_custom_roles').select('custom_role_id').eq('user_id', profile.user_id),
      supabase.from('agency_memberships').select('id, agency_id, role, status, agencies(name)').eq('user_id', profile.user_id).order('created_at', { ascending: true }),
      supabase.from('agencies').select('id, name').order('name'),
      (supabase as any).from('custom_roles').select('id, name').eq('is_active', true).order('name'),
    ]);

    const baseRoles = (roleRes.data || []).map((r: any) => r.role);
    const customRoleIds = (customRoleRes.data || []).map((r: any) => `custom:${r.custom_role_id}`);
    setSelectedRoles([...baseRoles, ...customRoleIds]);

    if (memberRes.data) {
      setAgencies(memberRes.data.map((m: any) => ({
        id: m.id,
        agency_id: m.agency_id,
        agency_name: m.agencies?.name || 'Unknown',
        role: m.role,
        status: m.status,
      })));
    }
    if (allAgenciesRes.data) setAvailableAgencies(allAgenciesRes.data);
    if (customRolesRes.data) {
      setCustomRoles((customRolesRes.data as any[]).map((r: any) => ({ value: `custom:${r.id}`, label: r.name })));
    }
  }, [profile.user_id]);

  useEffect(() => { loadRoleAndAgencies(); }, [loadRoleAndAgencies]);

  const handleRoleToggle = async (roleValue: string, checked: boolean) => {
    setRoleLoading(true);
    try {
      const isCustom = roleValue.startsWith('custom:');
      if (isCustom) {
        const customRoleId = roleValue.replace('custom:', '');
        if (checked) {
          const { error } = await (supabase as any).from('user_custom_roles').insert({ user_id: profile.user_id, custom_role_id: customRoleId });
          if (error) throw error;
        } else {
          await (supabase as any).from('user_custom_roles').delete().eq('user_id', profile.user_id).eq('custom_role_id', customRoleId);
        }
      } else {
        if (checked) {
          const { error } = await supabase.from('user_roles').insert({ user_id: profile.user_id, role: roleValue as 'super_admin' | 'admin' | 'staff' | 'viewer' });
          if (error) throw error;
        } else {
          await (supabase.from('user_roles') as any).delete().eq('user_id', profile.user_id).eq('role', roleValue);
        }
      }
      setSelectedRoles(prev => checked ? [...prev, roleValue] : prev.filter(r => r !== roleValue));
      toast.success('Role updated');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update role');
    } finally {
      setRoleLoading(false);
    }
  };

  const handleAddAgency = async () => {
    if (!selectedAgencyId) { toast.error('Select an agency'); return; }
    setAgencyLoading(true);
    try {
      const { error } = await supabase.from('agency_memberships').insert({
        user_id: profile.user_id,
        agency_id: selectedAgencyId,
        role: agencyRole,
        status: 'active',
        joined_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success('Agency added');
      setAddAgencyOpen(false);
      setSelectedAgencyId('');
      setAgencyRole('staff');
      loadRoleAndAgencies();
    } catch (err) {
      console.error(err);
      toast.error('Failed to add agency');
    } finally {
      setAgencyLoading(false);
    }
  };

  const handleRemoveAgency = async (membershipId: string) => {
    try {
      await supabase.from('agency_memberships').update({ status: 'inactive' }).eq('id', membershipId);
      toast.success('Agency removed');
      loadRoleAndAgencies();
    } catch (err) {
      toast.error('Failed to remove agency');
    }
  };

  const staffName = profile.display_name ||
    `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown';

  const handleSave = async () => {
    const success = await updateProfile(formData);
    if (success) setEditing(false);
  };

  const activeSupervisors = supervisorLinks.filter(
    l => l.status === 'active' && (!l.end_date || new Date(l.end_date) > new Date())
  );
  const activeSupervisees = superviseeLinks.filter(
    l => l.status === 'active' && (!l.end_date || new Date(l.end_date) > new Date())
  );

  return (
    <div className="space-y-6 mt-6">
      <SupervisionChainWarning
        staffUserId={profile.user_id}
        credential={profile.credential}
        onAssignSupervisor={() => setShowAssignSupervisorDialog(true)}
      />

      {/* Personal Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          {!editing ? (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" /> Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" /> Save
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
                  <Input value={formData.first_name} onChange={e => setFormData(p => ({ ...p, first_name: e.target.value }))} />
                ) : <p className="text-sm mt-1">{profile.first_name || '—'}</p>}
              </div>
              <div>
                <Label>Last Name</Label>
                {editing ? (
                  <Input value={formData.last_name} onChange={e => setFormData(p => ({ ...p, last_name: e.target.value }))} />
                ) : <p className="text-sm mt-1">{profile.last_name || '—'}</p>}
              </div>
              <div>
                <Label>Display Name</Label>
                {editing ? (
                  <Input value={formData.display_name} onChange={e => setFormData(p => ({ ...p, display_name: e.target.value }))} />
                ) : <p className="text-sm mt-1">{profile.display_name || '—'}</p>}
              </div>
              <div>
                <Label>NPI Number</Label>
                {editing ? (
                  <Input value={formData.npi_number} onChange={e => setFormData(p => ({ ...p, npi_number: e.target.value }))} placeholder="10-digit NPI" />
                ) : <p className="text-sm mt-1">{profile.npi_number || '—'}</p>}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2"><Mail className="h-4 w-4" /> Primary Email</Label>
                {editing ? (
                  <Input type="email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
                ) : <p className="text-sm mt-1">{profile.email || '—'}</p>}
              </div>
              <div>
                <Label className="flex items-center gap-2"><Phone className="h-4 w-4" /> Primary Phone</Label>
                {editing ? (
                  <Input type="tel" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} />
                ) : <p className="text-sm mt-1">{profile.phone || '—'}</p>}
              </div>
              <div>
                <Label>Employment Status</Label>
                {editing ? (
                  <Select value={formData.employment_status} onValueChange={v => setFormData(p => ({ ...p, employment_status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={profile.employment_status === 'active' ? 'default' : 'secondary'} className="mt-1">
                    {profile.employment_status || 'Unknown'}
                  </Badge>
                )}
              </div>
              <div>
                <Label className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Hire Date</Label>
                {editing ? (
                  <Input type="date" value={formData.hire_date} onChange={e => setFormData(p => ({ ...p, hire_date: e.target.value }))} />
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

      {/* Role & Agency — admin only */}
      {isAdmin && (
        <div className="grid grid-cols-2 gap-6">
          {/* System Role */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                System Roles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Select one or more roles for this staff member.</p>
              <div className="space-y-2">
                {BASE_ROLES.map(r => (
                  <div key={r.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`role-${r.value}`}
                      checked={selectedRoles.includes(r.value)}
                      onCheckedChange={(checked) => handleRoleToggle(r.value, !!checked)}
                      disabled={roleLoading}
                    />
                    <label htmlFor={`role-${r.value}`} className="text-sm cursor-pointer">{r.label}</label>
                  </div>
                ))}
                {customRoles.length > 0 && (
                  <>
                    <p className="text-xs text-muted-foreground font-medium pt-1 border-t">Custom Roles</p>
                    {customRoles.map(r => (
                      <div key={r.value} className="flex items-center gap-2">
                        <Checkbox
                          id={`role-${r.value}`}
                          checked={selectedRoles.includes(r.value)}
                          onCheckedChange={(checked) => handleRoleToggle(r.value, !!checked)}
                          disabled={roleLoading}
                        />
                        <label htmlFor={`role-${r.value}`} className="text-sm cursor-pointer">{r.label}</label>
                      </div>
                    ))}
                  </>
                )}
              </div>
              {selectedRoles.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {selectedRoles.map(r => {
                    const label = BASE_ROLES.find(br => br.value === r)?.label
                      || customRoles.find(cr => cr.value === r)?.label
                      || r;
                    return <Badge key={r} variant="secondary" className="text-xs">{label}</Badge>;
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Agency Memberships */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Agency Memberships
              </CardTitle>
              <Dialog open={addAgencyOpen} onOpenChange={setAddAgencyOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                    <Plus className="h-3 w-3" /> Add
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Add to Agency</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 mt-2">
                    <div>
                      <Label>Agency</Label>
                      <Select value={selectedAgencyId} onValueChange={setSelectedAgencyId}>
                        <SelectTrigger><SelectValue placeholder="Select agency..." /></SelectTrigger>
                        <SelectContent>
                          {availableAgencies
                            .filter(a => !agencies.some(m => m.agency_id === a.id && m.status === 'active'))
                            .map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Role in Agency</Label>
                      <Select value={agencyRole} onValueChange={setAgencyRole}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddAgency} disabled={agencyLoading} className="w-full">
                      Add to Agency
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {agencies.filter(a => a.status === 'active').length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">No agency memberships</p>
              ) : (
                <div className="space-y-2">
                  {agencies.filter(a => a.status === 'active').map(m => (
                    <div key={m.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{m.agency_name}</p>
                        <Badge variant="outline" className="text-xs capitalize mt-0.5">{m.role}</Badge>
                      </div>
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveAgency(m.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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
              <p className="text-sm text-muted-foreground text-center py-4">No active supervisors assigned</p>
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
              <p className="text-sm text-muted-foreground text-center py-4">No supervisees assigned</p>
            )}
          </CardContent>
        </Card>
      </div>

      <AssignSupervisorDialog
        open={showAssignSupervisorDialog}
        onOpenChange={setShowAssignSupervisorDialog}
        staffUserId={profile.user_id}
        staffName={staffName}
        onAssigned={() => window.location.reload()}
      />
    </div>
  );
}
