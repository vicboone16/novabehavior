import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Shield,
  Search,
  Save,
  RotateCcw,
  User,
  Menu,
  Users,
  Calendar,
  DollarSign,
  FileText,
  Settings,
  BarChart3,
  LayoutDashboard,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getDefaultPermissionsForRole, FeaturePermissions } from '@/hooks/useFeaturePermissions';

interface UserWithPermissions {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  role: string | null;
  permissions: Partial<FeaturePermissions> | null;
}

// Permission categories for organized display
const PERMISSION_CATEGORIES = {
  menu: {
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
  general: {
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
  staff: {
    label: 'Staff Permissions',
    icon: Users,
    permissions: [
      { key: 'staff_list', label: 'Staff List' },
      { key: 'staff_info', label: 'Staff Info' },
      { key: 'staff_profile', label: 'Staff Profile' },
      { key: 'staff_personal_info', label: 'Personal Info' },
      { key: 'staff_custom_fields', label: 'Custom Fields' },
      { key: 'staff_supervisor', label: 'Supervisor' },
      { key: 'staff_qualifications', label: 'Qualifications' },
      { key: 'staff_pay_rates', label: 'Pay Rates' },
      { key: 'staff_cabinet', label: 'Staff Cabinet' },
      { key: 'add_new_staff', label: 'Add New Staff' },
      { key: 'manage_clinical_teams', label: 'Manage Clinical Teams' },
    ],
  },
  client: {
    label: 'Client Permissions',
    icon: User,
    permissions: [
      { key: 'client_list', label: 'Client List' },
      { key: 'client_info', label: 'Client Info' },
      { key: 'client_profile', label: 'Client Profile' },
      { key: 'client_personal_info', label: 'Personal Info' },
      { key: 'client_custom_fields', label: 'Custom Fields' },
      { key: 'client_contacts', label: 'Contacts' },
      { key: 'client_assignments', label: 'Assignments' },
      { key: 'client_authorization', label: 'Authorizations' },
      { key: 'client_cabinet', label: 'Client Cabinet' },
      { key: 'add_new_client', label: 'Add New Client' },
    ],
  },
  payer: {
    label: 'Payer Permissions',
    icon: DollarSign,
    permissions: [
      { key: 'payer_list', label: 'Payer List' },
      { key: 'payer_info', label: 'Payer Info' },
      { key: 'payer_profile', label: 'Payer Profile' },
      { key: 'payer_services', label: 'Payer Services' },
      { key: 'payer_cabinet', label: 'Payer Cabinet' },
      { key: 'add_new_payer', label: 'Add New Payer' },
    ],
  },
  schedule: {
    label: 'Schedule Permissions',
    icon: Calendar,
    permissions: [
      { key: 'my_schedule', label: 'My Schedule' },
      { key: 'create_appointment', label: 'Create Appointment' },
      { key: 'appointment_info', label: 'Appointment Info' },
      { key: 'cancel_appointment', label: 'Cancel Appointment' },
      { key: 'delete_appointment', label: 'Delete Appointment' },
      { key: 'schedule_verification', label: 'Verification' },
      { key: 'schedule_billing', label: 'Billing' },
      { key: 'master_availability', label: 'Master Availability' },
      { key: 'schedule_documents', label: 'Documents' },
      { key: 'other_schedule', label: 'Other Schedules' },
    ],
  },
  billing: {
    label: 'Billing / AR Permissions',
    icon: DollarSign,
    permissions: [
      { key: 'ar_manager', label: 'AR Manager' },
      { key: 'ar_post_payment', label: 'Post Payment' },
      { key: 'ar_fix_claims', label: 'Fix Claims' },
      { key: 'ar_reports', label: 'AR Reports' },
      { key: 'ar_rebill', label: 'Rebill' },
      { key: 'ar_readiness', label: 'AR Readiness' },
      { key: 'billing_generate_invoice', label: 'Generate Invoice' },
      { key: 'billing_provider_identifier', label: 'Provider Identifier' },
      { key: 'billing_verification_forms', label: 'Verification Forms' },
      { key: 'billing_payment_source', label: 'Payment Source' },
      { key: 'billing_billed_files', label: 'Billed Files' },
    ],
  },
  reports: {
    label: 'Reports Permissions',
    icon: BarChart3,
    permissions: [
      { key: 'reports_staff_list', label: 'Staff List Report' },
      { key: 'reports_client_list', label: 'Client List Report' },
      { key: 'reports_payer_list', label: 'Payer List Report' },
      { key: 'reports_appointment_list', label: 'Appointment List' },
      { key: 'reports_authorization_summary', label: 'Authorization Summary' },
      { key: 'reports_profit_loss', label: 'Profit & Loss' },
      { key: 'reports_staff_productivity', label: 'Staff Productivity' },
      { key: 'reports_user_login_history', label: 'Login History' },
      { key: 'reports_expiring_authorization', label: 'Expiring Auths' },
      { key: 'reports_appointment_billing', label: 'Appointment Billing' },
      { key: 'reports_payroll', label: 'Payroll Report' },
      { key: 'reports_payer_aging', label: 'Payer Aging' },
      { key: 'reports_client_aging', label: 'Client Aging' },
      { key: 'reports_billing_ledger', label: 'Billing Ledger' },
    ],
  },
  settings: {
    label: 'Settings Permissions',
    icon: Settings,
    permissions: [
      { key: 'settings_cancellation_types', label: 'Cancellation Types' },
      { key: 'settings_custom_lists', label: 'Custom Lists' },
      { key: 'settings_custom_fields', label: 'Custom Fields' },
      { key: 'settings_organization', label: 'Organization' },
      { key: 'settings_payroll', label: 'Payroll Settings' },
      { key: 'settings_qualifications', label: 'Qualifications' },
      { key: 'settings_services', label: 'Services' },
      { key: 'settings_security', label: 'Security' },
      { key: 'settings_system', label: 'System Settings' },
      { key: 'settings_subscription', label: 'Subscription' },
      { key: 'settings_text_reminders', label: 'Text Reminders' },
    ],
  },
  dashboard: {
    label: 'Dashboard Widgets',
    icon: LayoutDashboard,
    permissions: [
      { key: 'dashboard_active_staff', label: 'Active Staff Count' },
      { key: 'dashboard_active_clients', label: 'Active Clients Count' },
      { key: 'dashboard_active_auths', label: 'Active Authorizations' },
      { key: 'dashboard_expiring_quals', label: 'Expiring Qualifications' },
      { key: 'dashboard_incomplete_appts', label: 'Incomplete Appointments' },
      { key: 'dashboard_unbilled_appts', label: 'Unbilled Appointments' },
      { key: 'dashboard_staff_summary', label: 'Staff Summary' },
      { key: 'dashboard_aging_report', label: 'Aging Report' },
      { key: 'dashboard_billing_summary', label: 'Billing Summary' },
      { key: 'dashboard_scheduled_vs_completed', label: 'Scheduled vs Completed' },
      { key: 'dashboard_daily_appointments', label: 'Daily Appointments' },
      { key: 'dashboard_cancelled_summary', label: 'Cancelled Summary' },
      { key: 'dashboard_weekly_hours', label: 'Weekly Work Hours' },
      { key: 'dashboard_miles_driven', label: 'Miles Driven' },
    ],
  },
};

export function UserPermissionsManager() {
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null);
  const [editedPermissions, setEditedPermissions] = useState<Partial<FeaturePermissions>>({});
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      // Fetch users with their roles and permissions
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, display_name, email')
        .order('display_name');

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      // Fetch permissions
      const { data: permissions } = await supabase
        .from('feature_permissions')
        .select('*');

      const usersWithData: UserWithPermissions[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        const userPerms = permissions?.find(p => (p as any).user_id === profile.user_id);
        
        return {
          id: profile.id,
          user_id: profile.user_id,
          display_name: profile.display_name,
          email: profile.email,
          role: userRole?.role || null,
          permissions: userPerms ? { ...userPerms } : null,
        };
      });

      setUsers(usersWithData);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const openPermissionsDialog = (user: UserWithPermissions) => {
    setSelectedUser(user);
    // Initialize with existing permissions or role defaults
    if (user.permissions) {
      setEditedPermissions({ ...user.permissions });
    } else {
      const roleDefaults = getDefaultPermissionsForRole(user.role || 'viewer');
      setEditedPermissions(roleDefaults);
    }
    setDialogOpen(true);
  };

  const togglePermission = (key: string) => {
    setEditedPermissions(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  const resetToRoleDefaults = () => {
    if (!selectedUser) return;
    const roleDefaults = getDefaultPermissionsForRole(selectedUser.role || 'viewer');
    setEditedPermissions(roleDefaults);
    toast.info('Reset to role defaults');
  };

  const savePermissions = async () => {
    if (!selectedUser) return;
    
    setSaving(true);
    try {
      const { loading, ...permsToSave } = editedPermissions as any;
      
      // Check if user already has permissions
      const { data: existing } = await supabase
        .from('feature_permissions')
        .select('id')
        .eq('user_id', selectedUser.user_id)
        .maybeSingle();

      if (existing) {
        // Update
        const { error } = await supabase
          .from('feature_permissions')
          .update(permsToSave as any)
          .eq('user_id', selectedUser.user_id);
        
        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('feature_permissions')
          .insert({ user_id: selectedUser.user_id, ...permsToSave } as any);
        
        if (error) throw error;
      }

      toast.success('Permissions saved');
      setDialogOpen(false);
      loadUsers();
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      user.display_name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.role?.toLowerCase().includes(search)
    );
  });

  const getRoleBadge = (role: string | null) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      super_admin: 'destructive',
      admin: 'default',
      staff: 'secondary',
      viewer: 'outline',
    };
    return <Badge variant={variants[role || ''] || 'outline'}>{role || 'No Role'}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Loading users...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            User Permissions Manager
          </CardTitle>
          <CardDescription>
            Configure granular feature access for each user. Permissions override role defaults.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            {filteredUsers.map(user => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{user.display_name || 'Unnamed User'}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getRoleBadge(user.role)}
                  {user.permissions && (
                    <Badge variant="outline" className="text-xs">Custom Permissions</Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPermissionsDialog(user)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                </div>
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Permissions Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permissions for {selectedUser?.display_name || 'User'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Role:</span>
              {getRoleBadge(selectedUser?.role || null)}
            </div>
            <Button variant="outline" size="sm" onClick={resetToRoleDefaults}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Role Defaults
            </Button>
          </div>

          <ScrollArea className="h-[60vh] pr-4">
            <Tabs defaultValue="menu" className="w-full">
              <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
                {Object.entries(PERMISSION_CATEGORIES).map(([key, category]) => (
                  <TabsTrigger key={key} value={key} className="text-xs">
                    <category.icon className="h-3 w-3 mr-1" />
                    {category.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {Object.entries(PERMISSION_CATEGORIES).map(([key, category]) => (
                <TabsContent key={key} value={key} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {category.permissions.map(perm => (
                      <div
                        key={perm.key}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <Label htmlFor={perm.key} className="cursor-pointer">
                          {perm.label}
                        </Label>
                        <Switch
                          id={perm.key}
                          checked={!!editedPermissions[perm.key as keyof FeaturePermissions]}
                          onCheckedChange={() => togglePermission(perm.key)}
                        />
                      </div>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </ScrollArea>

          <Separator />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={savePermissions} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Permissions
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
