import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2, Shield, Monitor, GraduationCap, Brain, School,
  ChevronDown, ChevronUp, Search, Save, Loader2, Users,
  Database, FileText, Eye, Edit3, BarChart2, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface StaffAccessPermissionsTabProps {
  userId: string;
}

interface Agency {
  id: string;
  name: string;
  status: string;
}

interface AgencyMembership {
  id: string;
  agency_id: string;
  user_id: string;
  role: string;
  status: string;
  is_primary: boolean | null;
}

interface AppAccess {
  id?: string;
  user_id: string;
  app_slug: string;
  role: string;
  agency_id: string | null;
  is_active: boolean;
}

interface StudentAccess {
  id?: string;
  user_id: string;
  student_id: string;
  student_name?: string;
  app_scope: string;
  can_view_notes: boolean;
  can_view_documents: boolean;
  can_collect_data: boolean;
  can_edit_profile: boolean;
  can_generate_reports: boolean;
  permission_level: string;
  is_active: boolean;
}

const APP_DEFINITIONS = [
  { slug: 'novatrack', label: 'Nova Track', icon: Monitor, description: 'Clinical ABA platform', color: 'text-blue-600' },
  { slug: 'student_connect', label: 'Student Connect', icon: GraduationCap, description: 'Supervisor portal', color: 'text-emerald-600' },
  { slug: 'behavior_decoded', label: 'Behavior Decoded', icon: Brain, description: 'Parent coaching', color: 'text-purple-600' },
  { slug: 'teacher_hub', label: 'Teacher Hub', icon: School, description: 'Teacher data collection', color: 'text-amber-600' },
];

const PERMISSION_FIELDS = [
  { field: 'can_collect_data' as const, icon: Database, label: 'Collect Data' },
  { field: 'can_view_notes' as const, icon: FileText, label: 'View Notes' },
  { field: 'can_view_documents' as const, icon: Eye, label: 'View Docs' },
  { field: 'can_edit_profile' as const, icon: Edit3, label: 'Edit Profile' },
  { field: 'can_generate_reports' as const, icon: BarChart2, label: 'Reports' },
];

const PERMISSION_PRESETS: Record<string, Partial<StudentAccess>> = {
  view: { can_view_notes: false, can_view_documents: false, can_collect_data: false, can_edit_profile: false, can_generate_reports: false },
  collect: { can_view_notes: false, can_view_documents: false, can_collect_data: true, can_edit_profile: false, can_generate_reports: false },
  standard: { can_view_notes: true, can_view_documents: true, can_collect_data: true, can_edit_profile: false, can_generate_reports: false },
  full: { can_view_notes: true, can_view_documents: true, can_collect_data: true, can_edit_profile: true, can_generate_reports: true },
};

export function StaffAccessPermissionsTab({ userId }: StaffAccessPermissionsTabProps) {
  const { userRole, user, roleLoading } = useAuth();
  const isEditingSelf = user?.id === userId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permissionCheckLoading, setPermissionCheckLoading] = useState(true);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [memberships, setMemberships] = useState<AgencyMembership[]>([]);
  const [appAccess, setAppAccess] = useState<AppAccess[]>([]);
  const [studentAccess, setStudentAccess] = useState<StudentAccess[]>([]);
  const [allStudents, setAllStudents] = useState<{ id: string; name: string; agency_id: string | null }[]>([]);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [customRoles, setCustomRoles] = useState<{ id: string; name: string }[]>([]);

  // UI state
  const [expandedAgencies, setExpandedAgencies] = useState<Set<string>>(new Set());
  const [expandedApps, setExpandedApps] = useState<Set<string>>(new Set());
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const checkCurrentUserAdminAccess = useCallback(async () => {
    if (!user) {
      setHasAdminAccess(false);
      setPermissionCheckLoading(false);
      return;
    }

    // Fast path from auth context
    if (userRole === 'admin' || userRole === 'super_admin') {
      setHasAdminAccess(true);
      setPermissionCheckLoading(false);
      return;
    }

    setPermissionCheckLoading(true);
    try {
      const [rolesRes, membershipsRes] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', user.id),
        supabase.from('agency_memberships').select('role, status').eq('user_id', user.id).eq('status', 'active'),
      ]);

      const roles = (rolesRes.data || []).map((r: any) => r.role as string);
      const hasGlobalAdminRole = roles.includes('admin') || roles.includes('super_admin');
      const hasAgencyAdminRole = (membershipsRes.data || []).some(
        (m: any) => m.role === 'owner' || m.role === 'admin'
      );

      setHasAdminAccess(hasGlobalAdminRole || hasAgencyAdminRole);
    } catch (error) {
      console.error('Failed to verify admin access:', error);
      setHasAdminAccess(false);
    } finally {
      setPermissionCheckLoading(false);
    }
  }, [user, userRole]);

  const [staffEmail, setStaffEmail] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [agenciesRes, membershipsRes, appAccessRes, studentAccessRes, studentsRes, rolesRes, customRolesRes, userCustomRolesRes, profileRes] = await Promise.all([
        supabase.from('agencies').select('id, name, status').eq('status', 'active').order('name'),
        supabase.from('agency_memberships').select('*').eq('user_id', userId),
        supabase.from('user_app_access').select('*').eq('user_id', userId),
        supabase.from('user_student_access').select('*').eq('user_id', userId),
        supabase.from('students').select('id, name, agency_id').eq('is_archived', false).order('name'),
        supabase.from('user_roles').select('role').eq('user_id', userId),
        supabase.from('custom_roles').select('id, name').order('name'),
        (supabase as any).from('user_custom_roles').select('custom_role_id').eq('user_id', userId),
        supabase.from('profiles').select('email').eq('user_id', userId).single(),
      ]);

      setAgencies(agenciesRes.data || []);
      setMemberships((membershipsRes.data || []) as AgencyMembership[]);
      setAppAccess((appAccessRes.data || []) as AppAccess[]);
      setStudentAccess((studentAccessRes.data || []).map((sa: any) => ({
        ...sa,
        student_name: '',
        is_active: true,
      })) as StudentAccess[]);
      setAllStudents((studentsRes.data || []) as { id: string; name: string; agency_id: string | null }[]);
      setStaffEmail(profileRes.data?.email || null);

      const baseRoles = (rolesRes.data || []).map((r: any) => r.role as string);
      const customRoleIds = (userCustomRolesRes.data || []).map((r: any) => `custom:${r.custom_role_id}` as string);
      setUserRoles([...baseRoles, ...customRoleIds]);
      setCustomRoles((customRolesRes.data || []) as { id: string; name: string }[]);

      // Auto-expand agencies that have memberships
      const activeAgencyIds = new Set((membershipsRes.data || []).filter((m: any) => m.status === 'active').map((m: any) => m.agency_id));
      setExpandedAgencies(activeAgencyIds);
    } catch (err: any) {
      toast.error('Failed to load access data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    checkCurrentUserAdminAccess();
  }, [checkCurrentUserAdminAccess]);

  useEffect(() => {
    if (roleLoading || permissionCheckLoading) return;

    if (!hasAdminAccess) {
      setLoading(false);
      return;
    }

    loadData();
  }, [roleLoading, permissionCheckLoading, hasAdminAccess, loadData]);

  // Helper: get student name
  const getStudentName = (studentId: string) => allStudents.find(s => s.id === studentId)?.name || 'Unknown';

  // Toggle agency membership
  const toggleAgencyMembership = (agencyId: string) => {
    const existing = memberships.find(m => m.agency_id === agencyId);
    // Prevent self-removal from owned agencies
    if (isEditingSelf && existing?.status === 'active' && existing?.role === 'owner') {
      toast.error('You cannot remove yourself as owner. Transfer ownership first.');
      return;
    }
    if (existing) {
      setMemberships(prev => prev.map(m =>
        m.agency_id === agencyId ? { ...m, status: m.status === 'active' ? 'inactive' : 'active' } : m
      ));
    } else {
      const DEMO_AGENCY_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      const activeNonDemo = prev.filter(m => m.status === 'active' && m.agency_id !== DEMO_AGENCY_ID);
      const shouldBePrimary = prev.length === 0 || (agencyId !== DEMO_AGENCY_ID && activeNonDemo.length === 0);
      // If adding a real agency and demo was primary, demote demo
      const updated = shouldBePrimary && agencyId !== DEMO_AGENCY_ID
        ? prev.map(m => m.agency_id === DEMO_AGENCY_ID ? { ...m, is_primary: false } : m)
        : prev;
      setMemberships([...updated, {
        id: '', agency_id: agencyId, user_id: userId,
        role: 'staff', status: 'active', is_primary: shouldBePrimary,
      }]);
    }
    setHasChanges(true);
  };

  // Toggle app access
  const toggleAppAccess = (agencyId: string, appSlug: string, enabled: boolean) => {
    const existing = appAccess.find(a => a.agency_id === agencyId && a.app_slug === appSlug);
    if (existing) {
      setAppAccess(prev => prev.map(a =>
        a.agency_id === agencyId && a.app_slug === appSlug ? { ...a, is_active: enabled } : a
      ));
    } else if (enabled) {
      setAppAccess(prev => [...prev, {
        user_id: userId, app_slug: appSlug, role: 'staff',
        agency_id: agencyId, is_active: true,
      }]);
    }
    setHasChanges(true);
  };

  // Change app role
  const changeAppRole = (agencyId: string, appSlug: string, role: string) => {
    setAppAccess(prev => prev.map(a =>
      a.agency_id === agencyId && a.app_slug === appSlug ? { ...a, role } : a
    ));
    setHasChanges(true);
  };

  // Toggle student access for an app
  const toggleStudentAccess = (studentId: string, appScope: string, enabled: boolean) => {
    const existing = studentAccess.find(sa => sa.student_id === studentId && sa.app_scope === appScope);
    if (existing) {
      setStudentAccess(prev => prev.map(sa =>
        sa.student_id === studentId && sa.app_scope === appScope ? { ...sa, is_active: enabled } : sa
      ));
    } else if (enabled) {
      setStudentAccess(prev => [...prev, {
        user_id: userId, student_id: studentId, app_scope: appScope,
        can_view_notes: false, can_view_documents: false, can_collect_data: false,
        can_edit_profile: false, can_generate_reports: false,
        permission_level: 'view', is_active: true,
      }]);
    }
    setHasChanges(true);
  };

  // Update student permission
  const updateStudentPerm = (studentId: string, appScope: string, field: string, value: boolean | string) => {
    setStudentAccess(prev => prev.map(sa =>
      sa.student_id === studentId && sa.app_scope === appScope ? { ...sa, [field]: value } : sa
    ));
    setHasChanges(true);
  };

  // Apply preset
  const applyPreset = (studentId: string, appScope: string, preset: string) => {
    const presetValues = PERMISSION_PRESETS[preset] || {};
    setStudentAccess(prev => prev.map(sa =>
      sa.student_id === studentId && sa.app_scope === appScope
        ? { ...sa, permission_level: preset, ...presetValues }
        : sa
    ));
    setHasChanges(true);
  };

  // Enable all students for an app
  const enableAllStudents = (agencyId: string, appSlug: string, enabled: boolean) => {
    const agencyStudents = allStudents.filter(s => s.agency_id === agencyId);
    agencyStudents.forEach(s => toggleStudentAccess(s.id, appSlug, enabled));
    setHasChanges(true);
  };

  // Full access all students
  const fullAccessAllStudents = (agencyId: string, appSlug: string) => {
    const agencyStudents = allStudents.filter(s => s.agency_id === agencyId);
    agencyStudents.forEach(s => {
      toggleStudentAccess(s.id, appSlug, true);
      applyPreset(s.id, appSlug, 'full');
    });
    setHasChanges(true);
  };

  // Toggle role
  const toggleRole = (role: string) => {
    // Prevent self-demotion from admin roles
    if (isEditingSelf && userRoles.includes(role) && (role === 'admin' || role === 'super_admin')) {
      toast.error('You cannot remove your own admin role. Ask another admin to do this.');
      return;
    }
    setUserRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
    setHasChanges(true);
  };

  // Save all changes
  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Upsert agency memberships
      for (const m of memberships) {
        if (m.id) {
          const { error } = await supabase.from('agency_memberships').update({ status: m.status, role: m.role }).eq('id', m.id);
          if (error) throw error;
        } else if (m.status === 'active') {
          const { error } = await supabase.from('agency_memberships').insert({
            agency_id: m.agency_id, user_id: userId, role: m.role,
            status: 'active', is_primary: m.is_primary,
          });
          if (error) throw error;
        }
      }

      // 2. Upsert app access
      for (const a of appAccess) {
        if (a.id) {
          const { error } = await supabase.from('user_app_access').update({ is_active: a.is_active, role: a.role }).eq('id', a.id);
          if (error) throw error;
        } else if (a.is_active) {
          const { error } = await (supabase.from('user_app_access') as any).upsert({
            user_id: userId, app_slug: a.app_slug, role: a.role,
            agency_id: a.agency_id, is_active: true, email: staffEmail,
          }, { onConflict: 'user_id,app_slug,agency_id' });
          if (error) throw error;
        }
      }

      // 2b. Ensure independent-mode app access exists for super admins
      if (userRoles.includes('super_admin')) {
        const { data: existingGlobalAccess, error: globalFetchError } = await supabase
          .from('user_app_access')
          .select('app_slug')
          .eq('user_id', userId)
          .is('agency_id', null);
        if (globalFetchError) throw globalFetchError;

        const existingSlugs = new Set((existingGlobalAccess || []).map((a: any) => a.app_slug as string));
        const missingGlobalRows = APP_DEFINITIONS
          .map(a => a.slug)
          .filter(slug => !existingSlugs.has(slug))
          .map(slug => ({ user_id: userId, app_slug: slug, role: 'owner', agency_id: null, is_active: true, email: staffEmail }));

        if (missingGlobalRows.length > 0) {
          const { error: globalInsertError } = await supabase.from('user_app_access').insert(missingGlobalRows as any);
          if (globalInsertError) throw globalInsertError;
        }
      }

      // 2c. Keep organization access aligned with active memberships/app access
      const desiredAgencyIds = Array.from(new Set([
        ...memberships.filter(m => m.status === 'active').map(m => m.agency_id),
        ...appAccess.filter(a => a.is_active && !!a.agency_id).map(a => a.agency_id as string),
      ]));

      const { data: existingAgencyAccess, error: existingAgencyAccessError } = await supabase
        .from('user_agency_access')
        .select('id, agency_id')
        .eq('user_id', userId)
        .is('client_id', null);
      if (existingAgencyAccessError) throw existingAgencyAccessError;

      const existingAgencyAccessMap = new Map((existingAgencyAccess || []).map((row: any) => [row.agency_id, row.id]));
      const agencyIdsToRemove = (existingAgencyAccess || [])
        .map((row: any) => row.agency_id as string)
        .filter((agencyId: string) => !desiredAgencyIds.includes(agencyId));

      if (agencyIdsToRemove.length > 0) {
        const { error } = await supabase
          .from('user_agency_access')
          .delete()
          .eq('user_id', userId)
          .is('client_id', null)
          .in('agency_id', agencyIdsToRemove);
        if (error) throw error;
      }

      for (const agencyId of desiredAgencyIds) {
        const membership = memberships.find(m => m.agency_id === agencyId && m.status === 'active');
        const activeAppRole = appAccess.find(a => a.agency_id === agencyId && a.is_active)?.role;
        const derivedRole = membership?.role || activeAppRole || 'staff';
        const existingId = existingAgencyAccessMap.get(agencyId);

        if (existingId) {
          const { error } = await supabase
            .from('user_agency_access')
            .update({ role: derivedRole, email: staffEmail })
            .eq('id', existingId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('user_agency_access')
            .insert({ user_id: userId, agency_id: agencyId, role: derivedRole, email: staffEmail });
          if (error) throw error;
        }
      }

      // 3. Upsert/delete student access (table does not have is_active column)
      for (const sa of studentAccess) {
        const { id, student_name, is_active, ...payload } = sa as any;

        if (id && !is_active) {
          const { error } = await supabase.from('user_student_access').delete().eq('id', id);
          if (error) throw error;
          continue;
        }

        if (id && is_active) {
          const { error } = await supabase.from('user_student_access').update(payload).eq('id', id);
          if (error) throw error;
          continue;
        }

        if (!id && is_active) {
          // Set granted_by to the current admin user
          const insertPayload = { ...payload, granted_by: user?.id || null };
          const { error } = await supabase
            .from('user_student_access')
            .upsert(insertPayload, { onConflict: 'user_id,student_id,app_scope' });
          if (error) throw error;
        }
      }

      // 4. Sync base roles safely (avoid delete-all lockout)
      const selectedBaseRoles = userRoles.filter(r => !r.startsWith('custom:'));
      const selectedCustomRoleIds = userRoles
        .filter(r => r.startsWith('custom:'))
        .map(r => r.replace('custom:', ''));

      const [existingBaseRolesRes, existingCustomRolesRes] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', userId),
        (supabase as any).from('user_custom_roles').select('custom_role_id').eq('user_id', userId),
      ]);
      if (existingBaseRolesRes.error) throw existingBaseRolesRes.error;
      if (existingCustomRolesRes.error) throw existingCustomRolesRes.error;

      const existingBaseRoles = (existingBaseRolesRes.data || []).map((r: any) => r.role as string);
      const existingCustomRoleIds = (existingCustomRolesRes.data || []).map((r: any) => r.custom_role_id as string);

      const baseRolesToAdd = selectedBaseRoles.filter(r => !existingBaseRoles.includes(r));
      const baseRolesToRemove = existingBaseRoles.filter(r => !selectedBaseRoles.includes(r));

      const customToAdd = selectedCustomRoleIds.filter(id => !existingCustomRoleIds.includes(id));
      const customToRemove = existingCustomRoleIds.filter(id => !selectedCustomRoleIds.includes(id));

      for (const role of baseRolesToAdd) {
        const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: role as 'admin' | 'staff' | 'super_admin' | 'viewer' });
        if (error) throw error;
      }

      for (const role of baseRolesToRemove) {
        const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role as 'admin' | 'staff' | 'super_admin' | 'viewer');
        if (error) throw error;
      }

      for (const customRoleId of customToAdd) {
        const { error } = await (supabase as any).from('user_custom_roles').insert({ user_id: userId, custom_role_id: customRoleId });
        if (error) throw error;
      }

      for (const customRoleId of customToRemove) {
        const { error } = await (supabase as any).from('user_custom_roles').delete().eq('user_id', userId).eq('custom_role_id', customRoleId);
        if (error) throw error;
      }

      toast.success('Access & permissions saved successfully');
      setHasChanges(false);
      loadData(); // Refresh to get server-assigned IDs
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || roleLoading || permissionCheckLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!hasAdminAccess) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Admin Access Required</h3>
          <p className="text-muted-foreground">Only admins can manage staff access and permissions.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 mt-6">
      {/* Save bar */}
      {hasChanges && (
        <div className="sticky top-0 z-10 flex items-center justify-between p-3 bg-primary/10 border border-primary/30 rounded-lg">
          <p className="text-sm font-medium text-primary">You have unsaved changes</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={saving}>
              <RefreshCw className="w-3 h-3 mr-1" /> Discard
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
              Save Changes
            </Button>
          </div>
        </div>
      )}

      {/* System Roles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            System Roles
          </CardTitle>
          <CardDescription>Select one or more roles for this user.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { value: 'staff', label: 'Staff' },
              { value: 'admin', label: 'Admin' },
              { value: 'super_admin', label: 'Super Admin' },
              { value: 'viewer', label: 'Viewer' },
              ...customRoles.map(r => ({ value: `custom:${r.id}`, label: r.name })),
            ].map(r => (
              <label key={r.value} className="flex items-center gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors">
                <Checkbox
                  checked={userRoles.includes(r.value)}
                  onCheckedChange={() => toggleRole(r.value)}
                />
                <span className="text-sm">{r.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Organization Assignments & App Access */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" />
            Organization & App Access
          </CardTitle>
          <CardDescription>Toggle organizations, configure app access and client permissions per agency.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {agencies.map(agency => {
            const membership = memberships.find(m => m.agency_id === agency.id);
            const isActive = membership?.status === 'active';
            const isExpanded = expandedAgencies.has(agency.id);
            const agencyApps = appAccess.filter(a => a.agency_id === agency.id && a.is_active);

            return (
              <div
                key={agency.id}
                className={cn(
                  "rounded-lg border transition-colors",
                  isActive ? "border-primary/30 bg-primary/5" : "border-border"
                )}
              >
                {/* Agency header */}
                <div className="flex items-center gap-3 p-3">
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => toggleAgencyMembership(agency.id)}
                    className="scale-90"
                  />
                  <button
                    type="button"
                    className="flex-1 text-left"
                    onClick={() => {
                      if (isActive) {
                        setExpandedAgencies(prev => {
                          const next = new Set(prev);
                          next.has(agency.id) ? next.delete(agency.id) : next.add(agency.id);
                          return next;
                        });
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{agency.name}</span>
                      {isActive && (
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {agencyApps.length} app{agencyApps.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </button>
                  {isActive && (
                    <Button
                      type="button" variant="ghost" size="icon" className="h-7 w-7"
                      onClick={() => setExpandedAgencies(prev => {
                        const next = new Set(prev);
                        next.has(agency.id) ? next.delete(agency.id) : next.add(agency.id);
                        return next;
                      })}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  )}
                </div>

                {/* Expanded: Apps + Client permissions */}
                {isActive && isExpanded && (
                  <div className="px-3 pb-3 space-y-2 border-t border-primary/10 pt-2">
                    {APP_DEFINITIONS.map(appDef => {
                      const appConfig = appAccess.find(a => a.agency_id === agency.id && a.app_slug === appDef.slug);
                      const isAppActive = appConfig?.is_active ?? false;
                      const appKey = `${agency.id}:${appDef.slug}`;
                      const isAppExpanded = expandedApps.has(appKey);
                      const agencyStudents = allStudents.filter(s => s.agency_id === agency.id);
                      const searchQuery = searchQueries[appKey] || '';

                      const appStudentAccess = agencyStudents.map(s => {
                        const existing = studentAccess.find(sa => sa.student_id === s.id && sa.app_scope === appDef.slug);
                        return existing || {
                          user_id: userId, student_id: s.id, student_name: s.name,
                          app_scope: appDef.slug,
                          can_view_notes: false, can_view_documents: false, can_collect_data: false,
                          can_edit_profile: false, can_generate_reports: false,
                          permission_level: 'view', is_active: false,
                        };
                      });

                      const enabledStudentCount = appStudentAccess.filter(sa => sa.is_active).length;

                      return (
                        <div
                          key={appDef.slug}
                          className={cn(
                            "rounded-md border transition-colors",
                            isAppActive ? "border-primary/20 bg-background" : "border-border/50 bg-muted/20"
                          )}
                        >
                          {/* App header */}
                          <div className="flex items-center gap-2 p-2.5">
                            <Switch
                              checked={isAppActive}
                              onCheckedChange={(v) => toggleAppAccess(agency.id, appDef.slug, v)}
                              className="scale-75"
                            />
                            <appDef.icon className={cn("w-4 h-4", isAppActive ? appDef.color : "text-muted-foreground")} />
                            <div className="flex-1 min-w-0">
                              <span className={cn("text-sm font-medium", !isAppActive && "text-muted-foreground")}>
                                {appDef.label}
                              </span>
                              <span className="text-[10px] text-muted-foreground ml-2">{appDef.description}</span>
                            </div>
                            {isAppActive && (
                              <>
                                <Select
                                  value={appConfig?.role || 'staff'}
                                  onValueChange={(v) => changeAppRole(agency.id, appDef.slug, v)}
                                >
                                  <SelectTrigger className="h-7 w-24 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="owner">Owner</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="staff">Staff</SelectItem>
                                    <SelectItem value="viewer">Viewer</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  type="button" variant="ghost" size="icon" className="h-6 w-6"
                                  onClick={() => setExpandedApps(prev => {
                                    const next = new Set(prev);
                                    next.has(appKey) ? next.delete(appKey) : next.add(appKey);
                                    return next;
                                  })}
                                >
                                  {isAppExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </Button>
                              </>
                            )}
                          </div>

                          {/* Client permissions */}
                          {isAppActive && isAppExpanded && (
                            <div className="px-2.5 pb-2.5 border-t border-border/50 pt-2 space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                  <Input
                                    className="pl-7 h-7 text-xs"
                                    placeholder="Search clients..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQueries(q => ({ ...q, [appKey]: e.target.value }))}
                                  />
                                </div>
                                <Button type="button" variant="outline" size="sm" className="text-[10px] h-6 px-2" onClick={() => enableAllStudents(agency.id, appDef.slug, true)}>All On</Button>
                                <Button type="button" variant="outline" size="sm" className="text-[10px] h-6 px-2" onClick={() => enableAllStudents(agency.id, appDef.slug, false)}>All Off</Button>
                                <Button type="button" variant="outline" size="sm" className="text-[10px] h-6 px-2" onClick={() => fullAccessAllStudents(agency.id, appDef.slug)}>Full Access All</Button>
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                {enabledStudentCount} / {agencyStudents.length} clients enabled
                              </p>

                              <ScrollArea className="max-h-48">
                                <div className="space-y-1">
                                  {appStudentAccess
                                    .filter(sa => {
                                      const name = getStudentName(sa.student_id);
                                      return !searchQuery || name.toLowerCase().includes(searchQuery.toLowerCase());
                                    })
                                    .map(sa => {
                                      const studentKey = `${appKey}:${sa.student_id}`;
                                      const isStudentExpanded = expandedStudents.has(studentKey);
                                      const name = getStudentName(sa.student_id);

                                      return (
                                        <div key={sa.student_id} className={cn("rounded-md border transition-colors", sa.is_active ? "border-primary/20 bg-primary/5" : "border-border/50")}>
                                          <div className="flex items-center gap-2 p-1.5">
                                            <Switch
                                              checked={sa.is_active}
                                              onCheckedChange={(v) => toggleStudentAccess(sa.student_id, appDef.slug, v)}
                                              className="scale-[0.65]"
                                            />
                                            <span className={cn("text-xs flex-1", !sa.is_active && "text-muted-foreground")}>{name}</span>
                                            {sa.is_active && (
                                              <Button
                                                type="button" variant="ghost" size="icon" className="h-5 w-5"
                                                onClick={() => setExpandedStudents(prev => {
                                                  const next = new Set(prev);
                                                  next.has(studentKey) ? next.delete(studentKey) : next.add(studentKey);
                                                  return next;
                                                })}
                                              >
                                                {isStudentExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                              </Button>
                                            )}
                                          </div>
                                          {sa.is_active && isStudentExpanded && (
                                            <div className="px-2 pb-2 pt-1 border-t border-primary/10 space-y-1.5">
                                              <div>
                                                <Label className="text-[10px]">Preset</Label>
                                                <Select value={sa.permission_level} onValueChange={(v) => applyPreset(sa.student_id, appDef.slug, v)}>
                                                  <SelectTrigger className="h-6 text-[10px]"><SelectValue /></SelectTrigger>
                                                  <SelectContent>
                                                    <SelectItem value="view">View Only</SelectItem>
                                                    <SelectItem value="collect">Data Collection</SelectItem>
                                                    <SelectItem value="standard">Standard</SelectItem>
                                                    <SelectItem value="full">Full Access</SelectItem>
                                                  </SelectContent>
                                                </Select>
                                              </div>
                                              <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                                {PERMISSION_FIELDS.map(({ field, icon: Icon, label }) => (
                                                  <label key={field} className="flex items-center gap-1 cursor-pointer">
                                                    <Switch
                                                      checked={Boolean((sa as any)[field])}
                                                      onCheckedChange={(v) => updateStudentPerm(sa.student_id, appDef.slug, field, v)}
                                                      className="scale-[0.6]"
                                                    />
                                                    <Icon className="w-2.5 h-2.5 text-muted-foreground" />
                                                    <span className="text-[10px]">{label}</span>
                                                  </label>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                </div>
                              </ScrollArea>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
