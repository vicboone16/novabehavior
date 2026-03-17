import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, Users, Tag, Settings, Plus, Trash2, 
  UserCheck, School, Check, X, Loader2, ChevronDown,
  Clock, Eye, EyeOff, Lock, UserPlus, Ban, CheckCircle,
  FileText, UserCog, Award, Briefcase, KeyRound, Mail, Key, MoreHorizontal, Zap,
  Copy, Bug, Link2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { SupervisorReviewDashboard } from '@/components/admin/SupervisorReviewDashboard';
import { UserTagManager } from '@/components/admin/UserTagManager';
import { StudentTagManager } from '@/components/admin/StudentTagManager';
import { BulkStudentManager } from '@/components/admin/BulkStudentManager';
import { ApproveUserDialog } from '@/components/admin/ApproveUserDialog';
import { StaffManagement } from '@/components/admin/StaffManagement';
import { CredentialTracker } from '@/components/admin/CredentialTracker';
import { UserPermissionsManager } from '@/components/admin/UserPermissionsManager';
import { CustomRolesManager } from '@/components/admin/CustomRolesManager';
import RecruitingPage from '@/pages/Recruiting';
import { BehaviorLabAdmin } from '@/components/admin/BehaviorLabAdmin';
import { AdminInviteCodesTab } from '@/components/admin/AdminInviteCodesTab';

type AppRole = 'super_admin' | 'admin' | 'staff' | 'viewer';

interface UserWithRole {
  id: string;
  email: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  has_pin: boolean;
  is_approved: boolean;
  roles: AppRole[];
  customRoleIds: string[]; // IDs of assigned custom roles
  created_at: string;
}

interface TagType {
  id: string;
  name: string;
  tag_type: 'school' | 'site' | 'team' | 'custom';
  color: string;
}

interface StudentAccess {
  student_id: string;
  student_name: string;
  permission_level: string;
  can_view_notes: boolean;
  can_view_documents: boolean;
  can_collect_data: boolean;
  can_edit_profile: boolean;
  can_generate_reports: boolean;
}

export default function Admin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [tags, setTags] = useState<TagType[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'pending');
  
  // Dialogs
  const [showAddTag, setShowAddTag] = useState(false);
  const [showManageAccess, setShowManageAccess] = useState<UserWithRole | null>(null);
  const [showAssignRole, setShowAssignRole] = useState<UserWithRole | null>(null);
  const [showEditUser, setShowEditUser] = useState<UserWithRole | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState<UserWithRole | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<UserWithRole | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState<UserWithRole | null>(null);
  
  // Form state
  const [newTagName, setNewTagName] = useState('');
  const [newTagType, setNewTagType] = useState<'school' | 'site' | 'team' | 'custom'>('school');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [selectedRole, setSelectedRole] = useState<string>('staff');
  const [userStudentAccess, setUserStudentAccess] = useState<StudentAccess[]>([]);
  const [customRoles, setCustomRoles] = useState<{ id: string; name: string }[]>([]);
  
  // Edit user form
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  
  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      const { data: adminCheck } = await supabase.rpc('is_admin', { _user_id: user.id });
      const { data: superAdminCheck } = await supabase.rpc('is_super_admin', { _user_id: user.id });
      
      setIsAdmin(!!adminCheck);
      setIsSuperAdmin(!!superAdminCheck);
      
      if (adminCheck || superAdminCheck) {
        await loadData();
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      // Load users with their profiles, roles, custom roles, and user custom role assignments in parallel
      const [profilesRes, rolesRes, customRolesRes, userCustomRolesRes] = await Promise.all([
        supabase.from('profiles').select('user_id, email, display_name, first_name, last_name, phone, is_approved, created_at'),
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('custom_roles').select('id, name').order('name'),
        supabase.from('user_custom_roles').select('user_id, custom_role_id'),
      ]);

      setCustomRoles((customRolesRes.data as { id: string; name: string }[]) || []);
      
      if (profilesRes.data) {
        const usersWithRoles: UserWithRole[] = profilesRes.data.map(profile => ({
          id: profile.user_id,
          email: profile.email,
          display_name: profile.display_name,
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
          has_pin: false,
          is_approved: profile.is_approved ?? false,
          roles: rolesRes.data?.filter(r => r.user_id === profile.user_id).map(r => r.role as AppRole) || [],
          customRoleIds: (userCustomRolesRes.data || [])
            .filter(r => r.user_id === profile.user_id)
            .map(r => r.custom_role_id),
          created_at: profile.created_at,
        }));
        setUsers(usersWithRoles);
      }

      // Load tags
      const { data: tagsData } = await supabase.from('tags').select('*').order('tag_type', { ascending: true });
      if (tagsData) setTags(tagsData as TagType[]);

      // Load all students
      const { data: studentsData } = await supabase.from('students').select('id, name').eq('is_archived', false).order('name');
      if (studentsData) setStudents(studentsData);
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  const pendingUsers = users.filter(u => !u.is_approved);
  const approvedUsers = users.filter(u => u.is_approved);

  const handleRevokeAccess = async () => {
    if (!showRevokeConfirm) return;
    
    try {
      const { error } = await supabase.rpc('revoke_user_access', { 
        _user_id: showRevokeConfirm.id 
      });

      if (error) throw error;

      toast({ title: 'User access revoked' });
      setShowRevokeConfirm(null);
      await loadData();
    } catch (error: any) {
      toast({ title: 'Failed to revoke access', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteUser = async () => {
    if (!showDeleteConfirm) return;
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action: 'delete_user', user_id: showDeleteConfirm.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'User permanently deleted' });
      setShowDeleteConfirm(null);
      await loadData();
    } catch (error: any) {
      toast({ title: 'Failed to delete user', description: error.message, variant: 'destructive' });
    }
  };

  const handleSendPasswordReset = async (targetUser: UserWithRole) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action: 'send_password_reset', user_id: targetUser.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Password reset sent', description: `Reset email sent to ${data.email || targetUser.email}` });
    } catch (error: any) {
      toast({ title: 'Failed to send reset', description: error.message, variant: 'destructive' });
    }
  };

  const handleSendMagicLink = async (targetUser: UserWithRole) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-user', {
        body: { action: 'generate_magic_link', user_id: targetUser.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Login link sent', description: `Magic link sent to ${data.email || targetUser.email}` });
    } catch (error: any) {
      toast({ title: 'Failed to send login link', description: error.message, variant: 'destructive' });
    }
  };

  const handleAssignRole = async () => {
    if (!showAssignRole || !selectedRole) return;

    try {
      const isCustom = selectedRole.startsWith('custom:');
      if (isCustom) {
        const customRoleId = selectedRole.replace('custom:', '');
        const { error } = await (supabase as any).from('user_custom_roles').upsert(
          { user_id: showAssignRole.id, custom_role_id: customRoleId },
          { onConflict: 'user_id,custom_role_id' }
        );
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_roles').upsert(
          { user_id: showAssignRole.id, role: selectedRole as AppRole, granted_by: user?.id },
          { onConflict: 'user_id,role' }
        );
        if (error) throw error;
      }

      toast({ title: 'Role assigned successfully' });
      setShowAssignRole(null);
      await loadData();
    } catch (error: any) {
      toast({ title: 'Failed to assign role', description: error.message, variant: 'destructive' });
    }
  };

  const handleRemoveRole = async (userId: string, role: AppRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      toast({ title: 'Role removed' });
      await loadData();
    } catch (error: any) {
      toast({ title: 'Failed to remove role', description: error.message, variant: 'destructive' });
    }
  };

  const handleRemoveCustomRole = async (userId: string, customRoleId: string) => {
    try {
      const { error } = await supabase
        .from('user_custom_roles')
        .delete()
        .eq('user_id', userId)
        .eq('custom_role_id', customRoleId);

      if (error) throw error;

      toast({ title: 'Custom role removed' });
      await loadData();
    } catch (error: any) {
      toast({ title: 'Failed to remove custom role', description: error.message, variant: 'destructive' });
    }
  };

  const openEditUser = (u: UserWithRole) => {
    setShowEditUser(u);
    setEditFirstName(u.first_name || '');
    setEditLastName(u.last_name || '');
    setEditPhone(u.phone || '');
    setEditEmail(u.email || '');
    setNewPassword('');
    setNewPin('');
    setShowPin(false);
  };

  const handleUpdateUser = async () => {
    if (!showEditUser) return;

    try {
      // Update profile
      const displayName = editFirstName && editLastName 
        ? `${editFirstName} ${editLastName.charAt(0)}.`
        : editFirstName || showEditUser.display_name;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: editFirstName || null,
          last_name: editLastName || null,
          display_name: displayName,
          phone: editPhone || null,
        })
        .eq('user_id', showEditUser.id);

      if (profileError) throw profileError;

      // Update PIN if provided
      if (newPin && /^\d{6}$/.test(newPin)) {
        const { error: pinError } = await supabase.rpc('set_user_pin', {
          _user_id: showEditUser.id,
          _pin: newPin
        });
        if (pinError) {
          // Check for uniqueness error
          if (pinError.message?.includes('already in use')) {
            toast({ 
              title: 'PIN already in use', 
              description: 'This PIN is already assigned to another user. Please choose a different PIN.',
              variant: 'destructive' 
            });
            return;
          }
          throw pinError;
        }
      }

      toast({ title: 'User updated successfully' });
      setShowEditUser(null);
      await loadData();
    } catch (error: any) {
      toast({ title: 'Failed to update user', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const { error } = await supabase
        .from('tags')
        .insert({
          name: newTagName.trim(),
          tag_type: newTagType,
          color: newTagColor,
          created_by: user?.id,
        });

      if (error) throw error;

      toast({ title: 'Tag created' });
      setShowAddTag(false);
      setNewTagName('');
      await loadData();
    } catch (error: any) {
      toast({ title: 'Failed to create tag', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;

      toast({ title: 'Tag deleted' });
      await loadData();
    } catch (error: any) {
      toast({ title: 'Failed to delete tag', description: error.message, variant: 'destructive' });
    }
  };

  const loadUserStudentAccess = async (userId: string) => {
    try {
      const { data: accessData } = await supabase
        .from('user_student_access')
        .select('*')
        .eq('user_id', userId);

      const accessList: StudentAccess[] = students.map(student => {
        const existing = accessData?.find(a => a.student_id === student.id);
        return {
          student_id: student.id,
          student_name: student.name,
          permission_level: existing?.permission_level || 'none',
          can_view_notes: existing?.can_view_notes ?? true,
          can_view_documents: existing?.can_view_documents ?? true,
          can_collect_data: existing?.can_collect_data ?? true,
          can_edit_profile: existing?.can_edit_profile ?? false,
          can_generate_reports: existing?.can_generate_reports ?? true,
        };
      });

      setUserStudentAccess(accessList);
    } catch (error) {
      console.error('Error loading user student access:', error);
    }
  };

  const handleManageAccess = async (targetUser: UserWithRole) => {
    setShowManageAccess(targetUser);
    await loadUserStudentAccess(targetUser.id);
  };

  const updateStudentAccess = async (studentId: string, updates: Partial<StudentAccess>) => {
    if (!showManageAccess) return;

    try {
      const current = userStudentAccess.find(a => a.student_id === studentId);
      if (!current) return;

      const newAccess = { ...current, ...updates };

      if (newAccess.permission_level === 'none') {
        await supabase
          .from('user_student_access')
          .delete()
          .eq('user_id', showManageAccess.id)
          .eq('student_id', studentId);
      } else {
        await supabase
          .from('user_student_access')
          .upsert({
            user_id: showManageAccess.id,
            student_id: studentId,
            permission_level: newAccess.permission_level,
            can_view_notes: newAccess.can_view_notes,
            can_view_documents: newAccess.can_view_documents,
            can_collect_data: newAccess.can_collect_data,
            can_edit_profile: newAccess.can_edit_profile,
            can_generate_reports: newAccess.can_generate_reports,
            granted_by: user?.id,
          }, { onConflict: 'user_id,student_id' });
      }

      setUserStudentAccess(prev => prev.map(a => 
        a.student_id === studentId ? newAccess : a
      ));
    } catch (error) {
      console.error('Error updating access:', error);
    }
  };

  const getRoleBadgeColor = (role: AppRole) => {
    switch (role) {
      case 'super_admin': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'admin': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'staff': return 'bg-primary/10 text-primary border-primary/20';
      case 'viewer': return 'bg-muted text-muted-foreground border-border';
      default: return '';
    }
  };

  // Helper to show PIN status (we no longer have access to the hash)
  const formatPinDisplay = (hasPin: boolean) => {
    return hasPin ? '●●●●●●' : 'Not set';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin && !isSuperAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Shield className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4">You don't have permission to access this page.</p>
        <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
                <p className="text-sm text-muted-foreground">
                  {isSuperAdmin ? 'Super Admin' : 'Admin'} • Manage users, roles & access
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate('/security')}>
                <Shield className="w-4 h-4 mr-2" />
                Security Settings
              </Button>
              <Button variant="outline" onClick={() => navigate('/')}>
                Back to App
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Auth Debug Block */}
      <div className="container pt-4">
        <Card className="border-dashed border-yellow-500/50 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-600">
              <Bug className="w-4 h-4" />
              Auth Debug (Admin Only)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm font-mono">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">UID:</span>
              <span className="text-foreground">{user?.id ?? '—'}</span>
              {user?.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    navigator.clipboard.writeText(user.id);
                    toast({ title: 'Copied', description: 'User ID copied to clipboard' });
                  }}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Email:</span>
              <span className="text-foreground">{user?.email ?? '—'}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <main className="container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-6xl grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12">
            <TabsTrigger value="pending" className="gap-2 relative">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Pending</span>
              {pendingUsers.length > 0 && (
                <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {pendingUsers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="clinicians" className="gap-2">
              <Briefcase className="w-4 h-4" />
              <span className="hidden sm:inline">Clinicians</span>
            </TabsTrigger>
            <TabsTrigger value="credentials" className="gap-2">
              <Award className="w-4 h-4" />
              <span className="hidden sm:inline">Credentials</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Notes</span>
            </TabsTrigger>
            <TabsTrigger value="tags" className="gap-2">
              <Tag className="w-4 h-4" />
              <span className="hidden sm:inline">Tags</span>
            </TabsTrigger>
            <TabsTrigger value="students" className="gap-2">
              <UserCog className="w-4 h-4" />
              <span className="hidden sm:inline">Clients</span>
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-2">
              <KeyRound className="w-4 h-4" />
              <span className="hidden sm:inline">Roles</span>
            </TabsTrigger>
            <TabsTrigger value="recruiting" className="gap-2">
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Recruiting</span>
            </TabsTrigger>
            <TabsTrigger value="behavior-lab" className="gap-2">
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Lab</span>
            </TabsTrigger>
            <TabsTrigger value="invite-codes" className="gap-2">
              <Link2 className="w-4 h-4" />
              <span className="hidden sm:inline">Invites</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Pending Approvals Tab */}
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Pending Approvals</CardTitle>
                    <CardDescription>
                      Review and approve new user registrations
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {pendingUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-primary mx-auto mb-3" />
                    <p className="text-muted-foreground">No pending approvals</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Registered</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingUsers.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell>
                              <p className="font-medium">{u.display_name || 'No name'}</p>
                              {u.first_name && u.last_name && (
                                <p className="text-xs text-muted-foreground">
                                  {u.first_name} {u.last_name}
                                </p>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{u.email}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(u.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  size="sm"
                                  onClick={() => setShowApproveDialog(u)}
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Approve
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => openEditUser(u)}
                                >
                                  Edit
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <MoreHorizontal className="w-3 h-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleSendPasswordReset(u)}>
                                      <Key className="w-4 h-4 mr-2" />
                                      Send Password Reset
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSendMagicLink(u)}>
                                      <Mail className="w-4 h-4 mr-2" />
                                      Send Login Link
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => setShowDeleteConfirm(u)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete Permanently
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Clinicians Tab */}
          <TabsContent value="clinicians">
            <StaffManagement 
              onNavigateToSchedule={(userId) => {
                navigate(`/schedule?staff=${userId}`);
              }}
            />
          </TabsContent>

          {/* Credentials Tab */}
          <TabsContent value="credentials">
            <CredentialTracker showAllStaff />
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>
                      Manage user roles, tags, and permissions
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead>PIN</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvedUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{u.display_name || 'No name'}</p>
                              <p className="text-sm text-muted-foreground">{u.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {u.roles.length === 0 && u.customRoleIds.length === 0 && (
                                <Badge variant="outline" className="text-xs">No roles</Badge>
                              )}
                              {u.roles.map((role) => (
                                <Badge 
                                  key={role} 
                                  variant="outline" 
                                  className={`text-xs ${getRoleBadgeColor(role)}`}
                                >
                                  {role.replace('_', ' ')}
                                  {(isSuperAdmin || (isAdmin && role !== 'super_admin')) && u.id !== user?.id && (
                                    <button
                                      className="ml-1 hover:text-destructive"
                                      onClick={() => handleRemoveRole(u.id, role)}
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </Badge>
                              ))}
                              {u.customRoleIds.map((crId) => {
                                const cr = customRoles.find(r => r.id === crId);
                                if (!cr) return null;
                                return (
                                  <Badge key={crId} variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                                    {cr.name}
                                    {(isSuperAdmin || isAdmin) && (
                                      <button
                                        className="ml-1 hover:text-destructive"
                                        onClick={() => handleRemoveCustomRole(u.id, crId)}
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    )}
                                  </Badge>
                                );
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <UserTagManager
                              userId={u.id}
                              userName={u.display_name || u.email || 'User'}
                              availableTags={tags}
                              onTagsChange={loadData}
                            />
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {formatPinDisplay(u.has_pin)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => openEditUser(u)}
                              >
                                Edit
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleManageAccess(u)}
                              >
                                <UserCheck className="w-3 h-3 mr-1" />
                                Access
                              </Button>
                              {u.id !== user?.id && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                      <MoreHorizontal className="w-3 h-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setShowAssignRole(u)}>
                                      <Plus className="w-4 h-4 mr-2" />
                                      Assign Role
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => handleSendPasswordReset(u)}>
                                      <Key className="w-4 h-4 mr-2" />
                                      Send Password Reset
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleSendMagicLink(u)}>
                                      <Mail className="w-4 h-4 mr-2" />
                                      Send Login Link
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => setShowRevokeConfirm(u)}
                                      className="text-amber-600 focus:text-amber-600"
                                    >
                                      <Ban className="w-4 h-4 mr-2" />
                                      Revoke Access
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => setShowDeleteConfirm(u)}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete Permanently
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes Review Tab */}
          <TabsContent value="notes">
            <SupervisorReviewDashboard />
          </TabsContent>

          {/* Tags Tab */}
          <TabsContent value="tags">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tags & Groups</CardTitle>
                    <CardDescription>
                      Create tags to organize users and students by school, site, or team. Users can only access students with matching tags.
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowAddTag(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Tag
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {['school', 'site', 'team', 'custom'].map((type) => {
                    const typeTags = tags.filter(t => t.tag_type === type);
                    return (
                      <Card key={type} className="bg-secondary/30">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium capitalize flex items-center gap-2">
                            {type === 'school' && <School className="w-4 h-4" />}
                            {type === 'site' && <Tag className="w-4 h-4" />}
                            {type === 'team' && <Users className="w-4 h-4" />}
                            {type === 'custom' && <Tag className="w-4 h-4" />}
                            {type}s ({typeTags.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {typeTags.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No {type}s yet</p>
                          ) : (
                            <div className="space-y-2">
                              {typeTags.map((tag) => (
                                <div 
                                  key={tag.id}
                                  className="flex items-center justify-between p-2 bg-background rounded-md"
                                >
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: tag.color }}
                                    />
                                    <span className="text-sm">{tag.name}</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => handleDeleteTag(tag.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Students Tab - Tag Assignment & Bulk Operations */}
          <TabsContent value="students" className="space-y-6">
            <BulkStudentManager 
              availableTags={tags} 
              onDataChange={loadData}
            />
            <StudentTagManager 
              availableTags={tags} 
              onTagsChange={loadData}
            />
          </TabsContent>

          {/* Roles & Permissions Tab */}
          <TabsContent value="roles">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5" />
                  Custom Roles & Permissions
                </CardTitle>
                <CardDescription>
                  Create custom roles, configure their feature permissions, and assign them to staff members. Custom roles supplement the built-in system roles.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CustomRolesManager />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recruiting Tab */}
          <TabsContent value="recruiting">
            <RecruitingPage />
          </TabsContent>

          {/* Behavior Lab Tab */}
          <TabsContent value="behavior-lab">
            <BehaviorLabAdmin />
          </TabsContent>

          {/* Invite Codes Tab */}
          <TabsContent value="invite-codes">
            <Card>
              <CardHeader>
                <CardTitle>Non-Staff Invite Codes</CardTitle>
                <CardDescription>
                  Manage invite codes for parents, teachers, collaborators, and supervisors
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdminInviteCodesTab />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {/* User Permissions Manager */}
            <UserPermissionsManager />
            
            <Card>
              <CardHeader>
                <CardTitle>Access Control Information</CardTitle>
                <CardDescription>
                  How permissions work in this system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <h3 className="font-medium mb-2">Tag-Based Access Control</h3>
                  <p className="text-sm text-muted-foreground">
                    When you assign tags to both users and students, users will automatically be able to access students with matching tags. This allows you to organize access by school, site, or team without manually configuring individual student access for each user.
                  </p>
                </div>
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <h3 className="font-medium mb-2">Permission Hierarchy</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li><strong>Super Admin:</strong> Full system access, can manage other admins</li>
                    <li><strong>Admin:</strong> Can manage users, students, and settings</li>
                    <li><strong>Staff:</strong> Can collect data and view assigned students</li>
                    <li><strong>Viewer:</strong> View-only access to assigned students</li>
                  </ul>
                </div>
                <div className="p-4 bg-secondary/30 rounded-lg">
                  <h3 className="font-medium mb-2">Feature Permissions</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Use the Permissions Manager above to configure granular feature access for each user. Permissions can be toggled individually:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Menu/navigation access</li>
                    <li>Staff, client, and payer management</li>
                    <li>Scheduling and billing features</li>
                    <li>Reports and dashboard widgets</li>
                    <li>Settings and administration</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Approve User Dialog */}
      <ApproveUserDialog
        user={showApproveDialog}
        isOpen={!!showApproveDialog}
        onClose={() => setShowApproveDialog(null)}
        onApproved={loadData}
        availableTags={tags}
        isSuperAdmin={isSuperAdmin}
      />

      {/* Edit User Dialog */}
      <Dialog open={!!showEditUser} onOpenChange={(open) => !open && setShowEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and credentials
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  placeholder="First"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  placeholder="Last"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={editEmail}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="(555) 555-5555"
              />
            </div>
            <div className="space-y-2">
              <Label>PIN Status</Label>
              <div className="flex gap-2 items-center">
                <Input
                  value="Admin cannot view PIN status"
                  disabled
                  className="bg-muted flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={async () => {
                    if (!showEditUser) return;
                    try {
                      const { error } = await supabase
                        .from('profiles')
                        .update({ pin_hash: null })
                        .eq('user_id', showEditUser.id);
                      if (error) throw error;
                      toast({ title: 'PIN reset', description: 'User will need to set a new PIN' });
                      setShowEditUser({ ...showEditUser, has_pin: false });
                      await loadData();
                    } catch (error: any) {
                      toast({ title: 'Failed to reset PIN', description: error.message, variant: 'destructive' });
                    }
                  }}
                >
                  Reset PIN
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Reset forces the user to set a new PIN. Admins cannot view whether a PIN is set for security.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Set New PIN (6 digits)</Label>
              <Input
                type="text"
                maxLength={6}
                pattern="\d{6}"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit PIN"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to keep current PIN, or enter 6 digits to set a new one.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditUser(null)}>Cancel</Button>
            <Button onClick={handleUpdateUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Role Dialog */}
      <Dialog open={!!showAssignRole} onOpenChange={(open) => !open && setShowAssignRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Assign a role to <strong>{showAssignRole?.display_name || showAssignRole?.email}</strong>
            </p>
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
                {customRoles.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs text-muted-foreground font-medium border-t mt-1 pt-2">Custom Roles</div>
                    {customRoles.map(r => (
                      <SelectItem key={r.id} value={`custom:${r.id}`}>{r.name}</SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignRole(null)}>Cancel</Button>
            <Button onClick={handleAssignRole}>Assign Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Access Confirm Dialog */}
      <AlertDialog open={!!showRevokeConfirm} onOpenChange={(open) => !open && setShowRevokeConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke User Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke access for <strong>{showRevokeConfirm?.display_name || showRevokeConfirm?.email}</strong>? 
              They will need to be re-approved to access the application.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeAccess} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Confirm Dialog */}
      <AlertDialog open={!!showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              This will <strong>permanently delete</strong> {showDeleteConfirm?.display_name || showDeleteConfirm?.email} and all their associated data. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Tag Dialog */}
      <Dialog open={showAddTag} onOpenChange={setShowAddTag}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tag Name</Label>
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="e.g., Lincoln Elementary"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newTagType} onValueChange={(v: any) => setNewTagType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="school">School</SelectItem>
                  <SelectItem value="site">Site</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="h-10 w-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTag(false)}>Cancel</Button>
            <Button onClick={handleAddTag} disabled={!newTagName.trim()}>Create Tag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Student Access Dialog */}
      <Dialog open={!!showManageAccess} onOpenChange={(open) => !open && setShowManageAccess(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Manage Student Access for {showManageAccess?.display_name || showManageAccess?.email}
            </DialogTitle>
            <DialogDescription>
              Configure which students this user can access and what actions they can perform. Note: Users also get access to students through matching tags.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {userStudentAccess.map((access) => (
                <Collapsible key={access.student_id}>
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{access.student_name}</span>
                        <Select
                          value={access.permission_level}
                          onValueChange={(v) => updateStudentAccess(access.student_id, { permission_level: v })}
                        >
                          <SelectTrigger className="w-[120px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Access</SelectItem>
                            <SelectItem value="view">View Only</SelectItem>
                            <SelectItem value="edit">Can Edit</SelectItem>
                            <SelectItem value="full">Full Access</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {access.permission_level !== 'none' && (
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="w-4 h-4" />
                            Details
                          </Button>
                        </CollapsibleTrigger>
                      )}
                    </div>
                    <CollapsibleContent className="mt-3 pt-3 border-t">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">View Notes</Label>
                          <Switch
                            checked={access.can_view_notes}
                            onCheckedChange={(v) => updateStudentAccess(access.student_id, { can_view_notes: v })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">View Documents</Label>
                          <Switch
                            checked={access.can_view_documents}
                            onCheckedChange={(v) => updateStudentAccess(access.student_id, { can_view_documents: v })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Collect Data</Label>
                          <Switch
                            checked={access.can_collect_data}
                            onCheckedChange={(v) => updateStudentAccess(access.student_id, { can_collect_data: v })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Edit Profile</Label>
                          <Switch
                            checked={access.can_edit_profile}
                            onCheckedChange={(v) => updateStudentAccess(access.student_id, { can_edit_profile: v })}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm">Generate Reports</Label>
                          <Switch
                            checked={access.can_generate_reports}
                            onCheckedChange={(v) => updateStudentAccess(access.student_id, { can_generate_reports: v })}
                          />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setShowManageAccess(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
