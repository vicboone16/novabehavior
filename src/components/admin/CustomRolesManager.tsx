import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus, Pencil, Trash2, Shield, ChevronDown, ChevronRight, Loader2,
  Users, Calendar, DollarSign, FileText, Settings, BarChart3, LayoutDashboard,
  Menu, User
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  base_role: string;
  color: string;
  is_system: boolean;
  created_at: string;
}

interface RolePermission {
  permission_key: string;
  permission_value: boolean;
}

const PERMISSION_CATEGORIES = [
  {
    key: 'menu',
    label: 'Menu Access',
    icon: Menu,
    permissions: [
      { key: 'menu_staff', label: 'Staff Menu' },
      { key: 'menu_client', label: 'Client Menu' },
      { key: 'menu_payer', label: 'Payer Menu' },
      { key: 'menu_schedule', label: 'Schedule Menu' },
      { key: 'menu_billing', label: 'Billing Menu' },
      { key: 'menu_payroll', label: 'Payroll Menu' },
      { key: 'menu_reports', label: 'Reports Menu' },
      { key: 'menu_settings', label: 'Settings Menu' },
      { key: 'menu_forms', label: 'Forms Menu' },
    ],
  },
  {
    key: 'general',
    label: 'General Access',
    icon: Shield,
    permissions: [
      { key: 'billing_financials', label: 'Billing Financials' },
      { key: 'payroll_financials', label: 'Payroll Financials' },
      { key: 'all_staff', label: 'All Staff Access' },
      { key: 'all_clients', label: 'All Clients Access' },
      { key: 'activity_tracking', label: 'Activity Tracking' },
      { key: 'notifications', label: 'Notifications' },
    ],
  },
  {
    key: 'staff',
    label: 'Staff Permissions',
    icon: Users,
    permissions: [
      { key: 'staff_list', label: 'Staff List' },
      { key: 'staff_info', label: 'Staff Info' },
      { key: 'staff_profile', label: 'Staff Profile' },
      { key: 'staff_personal_info', label: 'Personal Info' },
      { key: 'staff_qualifications', label: 'Qualifications' },
      { key: 'staff_pay_rates', label: 'Pay Rates' },
      { key: 'staff_cabinet', label: 'Staff Cabinet' },
      { key: 'add_new_staff', label: 'Add New Staff' },
      { key: 'manage_clinical_teams', label: 'Manage Clinical Teams' },
    ],
  },
  {
    key: 'client',
    label: 'Client Permissions',
    icon: User,
    permissions: [
      { key: 'client_list', label: 'Client List' },
      { key: 'client_info', label: 'Client Info' },
      { key: 'client_profile', label: 'Client Profile' },
      { key: 'client_personal_info', label: 'Personal Info' },
      { key: 'client_contacts', label: 'Contacts' },
      { key: 'client_assignments', label: 'Assignments' },
      { key: 'client_authorization', label: 'Authorizations' },
      { key: 'client_cabinet', label: 'Client Cabinet' },
      { key: 'add_new_client', label: 'Add New Client' },
    ],
  },
  {
    key: 'schedule',
    label: 'Schedule Permissions',
    icon: Calendar,
    permissions: [
      { key: 'my_schedule', label: 'My Schedule' },
      { key: 'create_appointment', label: 'Create Appointment' },
      { key: 'appointment_info', label: 'Appointment Info' },
      { key: 'cancel_appointment', label: 'Cancel Appointment' },
      { key: 'delete_appointment', label: 'Delete Appointment' },
      { key: 'schedule_verification', label: 'Verification' },
      { key: 'master_availability', label: 'Master Availability' },
      { key: 'other_schedule', label: 'Other Schedules' },
    ],
  },
  {
    key: 'billing',
    label: 'Billing / AR Permissions',
    icon: DollarSign,
    permissions: [
      { key: 'ar_manager', label: 'AR Manager' },
      { key: 'ar_post_payment', label: 'Post Payment' },
      { key: 'ar_fix_claims', label: 'Fix Claims' },
      { key: 'ar_reports', label: 'AR Reports' },
      { key: 'ar_rebill', label: 'Rebill' },
      { key: 'billing_generate_invoice', label: 'Generate Invoice' },
      { key: 'billing_provider_identifier', label: 'Provider Identifier' },
    ],
  },
  {
    key: 'reports',
    label: 'Reports Permissions',
    icon: BarChart3,
    permissions: [
      { key: 'reports_staff_list', label: 'Staff List Report' },
      { key: 'reports_client_list', label: 'Client List Report' },
      { key: 'reports_appointment_list', label: 'Appointment List' },
      { key: 'reports_authorization_summary', label: 'Authorization Summary' },
      { key: 'reports_profit_loss', label: 'Profit & Loss' },
      { key: 'reports_staff_productivity', label: 'Staff Productivity' },
      { key: 'reports_user_login_history', label: 'Login History' },
    ],
  },
  {
    key: 'settings',
    label: 'Settings Permissions',
    icon: Settings,
    permissions: [
      { key: 'settings_organization', label: 'Organization' },
      { key: 'settings_payroll', label: 'Payroll Settings' },
      { key: 'settings_qualifications', label: 'Qualifications' },
      { key: 'settings_services', label: 'Services' },
      { key: 'settings_security', label: 'Security' },
      { key: 'settings_system', label: 'System Settings' },
    ],
  },
  {
    key: 'dashboard',
    label: 'Dashboard Widgets',
    icon: LayoutDashboard,
    permissions: [
      { key: 'dashboard_client_details', label: 'Client Details Widget' },
      { key: 'dashboard_payer_info', label: 'Payer Info Widget' },
      { key: 'dashboard_authorization_info', label: 'Authorization Widget' },
      { key: 'dashboard_billing_info', label: 'Billing Widget' },
      { key: 'dashboard_staff_activity', label: 'Staff Activity Widget' },
    ],
  },
];

const BASE_ROLE_DEFAULTS: Record<string, string[]> = {
  super_admin: PERMISSION_CATEGORIES.flatMap(c => c.permissions.map(p => p.key)),
  admin: [
    'menu_staff', 'menu_client', 'menu_payer', 'menu_schedule', 'menu_billing',
    'menu_reports', 'menu_settings', 'menu_forms', 'all_staff', 'all_clients',
    'staff_list', 'staff_info', 'staff_profile', 'add_new_staff', 'manage_clinical_teams',
    'client_list', 'client_info', 'client_profile', 'client_contacts', 'client_authorization', 'add_new_client',
    'my_schedule', 'create_appointment', 'appointment_info', 'cancel_appointment', 'master_availability',
    'ar_manager', 'billing_generate_invoice', 'reports_staff_list', 'reports_client_list',
    'reports_appointment_list', 'settings_organization', 'settings_security',
  ],
  staff: [
    'menu_client', 'menu_schedule', 'client_list', 'client_info', 'client_profile',
    'my_schedule', 'appointment_info', 'reports_client_list',
  ],
  viewer: [
    'menu_client', 'client_list', 'client_info',
  ],
};

const ROLE_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6',
];

export function CustomRolesManager() {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Record<string, boolean>>({});
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});

  // Create/edit dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formBaseRole, setFormBaseRole] = useState<string>('staff');
  const [formColor, setFormColor] = useState(ROLE_COLORS[0]);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<CustomRole | null>(null);

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    if (selectedRole) {
      loadRolePermissions(selectedRole.id);
    }
  }, [selectedRole]);

  const loadRoles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('custom_roles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      toast.error('Failed to load roles');
    } else {
      setRoles(data || []);
      if (data && data.length > 0 && !selectedRole) {
        setSelectedRole(data[0]);
      }
    }
    setLoading(false);
  };

  const loadRolePermissions = async (roleId: string) => {
    setPermissionsLoading(true);
    const { data, error } = await supabase
      .from('custom_role_permissions')
      .select('permission_key, permission_value')
      .eq('custom_role_id', roleId);

    if (!error && data) {
      const permsMap: Record<string, boolean> = {};
      // Start with base role defaults
      const role = roles.find(r => r.id === roleId);
      if (role) {
        const defaults = BASE_ROLE_DEFAULTS[role.base_role] || [];
        defaults.forEach(k => { permsMap[k] = true; });
      }
      // Override with saved permissions
      data.forEach((p: RolePermission) => {
        permsMap[p.permission_key] = p.permission_value;
      });
      setRolePermissions(permsMap);
    }
    setPermissionsLoading(false);
  };

  const handleCreateRole = () => {
    setEditingRole(null);
    setFormName('');
    setFormDescription('');
    setFormBaseRole('staff');
    setFormColor(ROLE_COLORS[0]);
    setShowCreateDialog(true);
  };

  const handleEditRole = (role: CustomRole) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormDescription(role.description || '');
    setFormBaseRole(role.base_role);
    setFormColor(role.color);
    setShowCreateDialog(true);
  };

  const handleSaveRole = async () => {
    if (!formName.trim()) {
      toast.error('Role name is required');
      return;
    }

    setSaving(true);
    try {
      if (editingRole) {
        const { error } = await supabase
          .from('custom_roles')
          .update({
            name: formName.trim(),
            description: formDescription.trim() || null,
            base_role: formBaseRole as 'super_admin' | 'admin' | 'staff' | 'viewer',
            color: formColor,
          })
          .eq('id', editingRole.id);
        if (error) throw error;
        toast.success('Role updated');
      } else {
      const insertPayload = {
            name: formName.trim(),
            description: formDescription.trim() || null,
            base_role: formBaseRole as 'super_admin' | 'admin' | 'staff' | 'viewer',
            color: formColor,
          };
        const { data, error } = await supabase
          .from('custom_roles')
          .insert([insertPayload])
          .select()
          .single();
        if (error) throw error;
        // Seed default permissions based on base role
        const defaults = BASE_ROLE_DEFAULTS[formBaseRole] || [];
        if (defaults.length > 0) {
          await supabase.from('custom_role_permissions').insert(
            defaults.map(k => ({ custom_role_id: data.id, permission_key: k, permission_value: true }))
          );
        }
      }
      setShowCreateDialog(false);
      await loadRoles();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('custom_roles').delete().eq('id', deleteTarget.id);
    if (error) {
      toast.error('Failed to delete role');
    } else {
      toast.success('Role deleted');
      if (selectedRole?.id === deleteTarget.id) setSelectedRole(null);
      await loadRoles();
    }
    setDeleteTarget(null);
  };

  const togglePermission = (key: string) => {
    setRolePermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleCategory = (categoryKey: string, value: boolean) => {
    const cat = PERMISSION_CATEGORIES.find(c => c.key === categoryKey);
    if (!cat) return;
    const updates: Record<string, boolean> = { ...rolePermissions };
    cat.permissions.forEach(p => { updates[p.key] = value; });
    setRolePermissions(updates);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      // Delete existing and re-insert all
      await supabase.from('custom_role_permissions').delete().eq('custom_role_id', selectedRole.id);
      const entries = Object.entries(rolePermissions).map(([k, v]) => ({
        custom_role_id: selectedRole.id,
        permission_key: k,
        permission_value: v,
      }));
      if (entries.length > 0) {
        const { error } = await supabase.from('custom_role_permissions').insert(entries);
        if (error) throw error;
      }
      toast.success('Permissions saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const getEnabledCount = (categoryKey: string) => {
    const cat = PERMISSION_CATEGORIES.find(c => c.key === categoryKey);
    if (!cat) return [0, 0];
    const enabled = cat.permissions.filter(p => rolePermissions[p.key]).length;
    return [enabled, cat.permissions.length];
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-280px)]">
      {/* Role List Sidebar */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Roles</h3>
          <Button size="sm" variant="outline" onClick={handleCreateRole}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            New
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="space-y-1">
              {roles.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">No roles yet. Create one to get started.</p>
              )}
              {roles.map(role => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${
                    selectedRole?.id === role.id
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-accent text-foreground'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: role.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{role.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{role.base_role.replace('_', ' ')} base</p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Permission Editor */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {!selectedRole ? (
          <Card className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Select a role to edit its permissions</p>
            </div>
          </Card>
        ) : (
          <>
            {/* Role header */}
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedRole.color }} />
                    <div>
                      <h2 className="font-semibold">{selectedRole.name}</h2>
                      <p className="text-xs text-muted-foreground">
                        {selectedRole.description || 'No description'} · Base: <span className="capitalize">{selectedRole.base_role.replace('_', ' ')}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditRole(selectedRole)}>
                      <Pencil className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(selectedRole)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Delete
                    </Button>
                    <Button size="sm" onClick={handleSavePermissions} disabled={saving}>
                      {saving ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                      Save Permissions
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Permissions */}
            {permissionsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="space-y-2 pr-2">
                  {PERMISSION_CATEGORIES.map(category => {
                    const [enabled, total] = getEnabledCount(category.key);
                    const allEnabled = enabled === total;
                    const isOpen = openCategories[category.key] ?? false;
                    const Icon = category.icon;

                    return (
                      <Collapsible
                        key={category.key}
                        open={isOpen}
                        onOpenChange={v => setOpenCategories(prev => ({ ...prev, [category.key]: v }))}
                      >
                        <Card>
                          <CollapsibleTrigger asChild>
                            <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent/50 transition-colors rounded-t-lg">
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium text-sm">{category.label}</span>
                                <Badge variant="secondary" className="text-xs">
                                  {enabled}/{total}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3">
                                <div
                                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <span>All</span>
                                  <Switch
                                    checked={allEnabled}
                                    onCheckedChange={v => toggleCategory(category.key, v)}
                                    className="scale-75"
                                  />
                                </div>
                                {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                              </div>
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <Separator />
                            <div className="px-4 py-2 grid grid-cols-2 gap-2">
                              {category.permissions.map(perm => (
                                <div key={perm.key} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-accent/50">
                                  <Label htmlFor={perm.key} className="text-xs cursor-pointer font-normal">
                                    {perm.label}
                                  </Label>
                                  <Switch
                                    id={perm.key}
                                    checked={!!rolePermissions[perm.key]}
                                    onCheckedChange={() => togglePermission(perm.key)}
                                    className="scale-75"
                                  />
                                </div>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Card>
                      </Collapsible>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Role Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
            <DialogDescription>
              {editingRole ? 'Update role details.' : 'Create a custom role and configure its permissions.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Role Name *</Label>
              <Input
                placeholder="e.g. Clinical Supervisor, Billing Specialist"
                value={formName}
                onChange={e => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                placeholder="Brief description of this role"
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Base Role (inherits default permissions)</Label>
              <Select value={formBaseRole} onValueChange={setFormBaseRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {ROLE_COLORS.map(c => (
                  <button
                    key={c}
                    className={`w-7 h-7 rounded-full transition-transform ${formColor === c ? 'ring-2 ring-offset-2 ring-foreground scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setFormColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveRole} disabled={saving || !formName.trim()}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editingRole ? 'Save Changes' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the <strong>{deleteTarget?.name}</strong> role and remove it from all assigned users. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRole} className="bg-destructive hover:bg-destructive/90">
              Delete Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
