import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, Users, Tag, Settings, Plus, Trash2, Edit2, 
  UserCheck, School, Check, X, Loader2, ChevronDown 
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
import { useToast } from '@/hooks/use-toast';

type AppRole = 'super_admin' | 'admin' | 'staff' | 'viewer';

interface UserWithRole {
  id: string;
  email: string | null;
  display_name: string | null;
  roles: AppRole[];
  created_at: string;
}

interface Tag {
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
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  
  // Dialogs
  const [showAddTag, setShowAddTag] = useState(false);
  const [showManageAccess, setShowManageAccess] = useState<UserWithRole | null>(null);
  const [showAssignRole, setShowAssignRole] = useState<UserWithRole | null>(null);
  
  // Form state
  const [newTagName, setNewTagName] = useState('');
  const [newTagType, setNewTagType] = useState<'school' | 'site' | 'team' | 'custom'>('school');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [selectedRole, setSelectedRole] = useState<AppRole>('staff');
  const [userStudentAccess, setUserStudentAccess] = useState<StudentAccess[]>([]);
  
  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      // Check if user is admin
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
      // Load users with their roles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, email, display_name, created_at');
      
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (profiles) {
        const usersWithRoles: UserWithRole[] = profiles.map(profile => ({
          id: profile.user_id,
          email: profile.email,
          display_name: profile.display_name,
          roles: roles?.filter(r => r.user_id === profile.user_id).map(r => r.role as AppRole) || [],
          created_at: profile.created_at,
        }));
        setUsers(usersWithRoles);
      }

      // Load tags
      const { data: tagsData } = await supabase
        .from('tags')
        .select('*')
        .order('tag_type', { ascending: true });
      
      if (tagsData) {
        setTags(tagsData as Tag[]);
      }

      // Load all students (admin can see all)
      const { data: studentsData } = await supabase
        .from('students')
        .select('id, name')
        .eq('is_archived', false)
        .order('name');
      
      if (studentsData) {
        setStudents(studentsData);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  const handleAssignRole = async () => {
    if (!showAssignRole || !selectedRole) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({
          user_id: showAssignRole.id,
          role: selectedRole,
          granted_by: user?.id,
        }, { onConflict: 'user_id,role' });

      if (error) throw error;

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
        // Delete access record
        await supabase
          .from('user_student_access')
          .delete()
          .eq('user_id', showManageAccess.id)
          .eq('student_id', studentId);
      } else {
        // Upsert access record
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
      case 'super_admin': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'admin': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'staff': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'viewer': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default: return '';
    }
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
            <Button variant="outline" onClick={() => navigate('/')}>
              Back to App
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="tags" className="gap-2">
              <Tag className="w-4 h-4" />
              Tags
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage user roles and student access permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Roles</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{u.display_name || 'No name'}</p>
                              <p className="text-sm text-muted-foreground">{u.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {u.roles.length === 0 && (
                                <Badge variant="outline" className="text-xs">No roles</Badge>
                              )}
                              {u.roles.map((role) => (
                                <Badge 
                                  key={role} 
                                  variant="outline" 
                                  className={`text-xs ${getRoleBadgeColor(role)}`}
                                >
                                  {role.replace('_', ' ')}
                                  {(isSuperAdmin || (isAdmin && role !== 'super_admin')) && (
                                    <button
                                      className="ml-1 hover:text-destructive"
                                      onClick={() => handleRemoveRole(u.id, role)}
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(u.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setShowAssignRole(u)}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Role
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleManageAccess(u)}
                              >
                                <UserCheck className="w-3 h-3 mr-1" />
                                Access
                              </Button>
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

          {/* Tags Tab */}
          <TabsContent value="tags">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Tags & Groups</CardTitle>
                    <CardDescription>
                      Organize users and students by school, site, or team
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowAddTag(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Tag
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Admin Settings</CardTitle>
                <CardDescription>
                  Configure system-wide settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">More settings coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

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
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignRole(null)}>Cancel</Button>
            <Button onClick={handleAssignRole}>Assign Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
